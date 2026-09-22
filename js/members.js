// টাঙ্গাইল জেলা — সদস্য ডিরেক্টরি (ইউজার প্রোফাইল সিস্টেম, ধাপ ৯)
// URL: members.html
//
// ডেটা: RPC list_public_members(p_search, p_limit, p_offset)
//   — শুধু পাবলিক প্রোফাইলের সদস্য; ফোন/ইমেইল/গ্রাম কখনোই ফেরত আসে না।
//   — শুধু লগইন করা ইউজার কল করতে পারে (supabase/members-schema.sql), তাই লগইন ছাড়া login.html-এ পাঠানো হয়।
// সব ডাইনামিক টেক্সট textContent দিয়ে বসানো হয় (innerHTML নয়) — XSS-নিরাপদ।
(function () {
  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
  var USERNAME_RE = /^[a-z0-9_]{3,20}$/;
  var PAGE = 24;

  function $(id) { return document.getElementById(id); }
  var searchEl = $('mbSearch'), statusEl = $('mbStatus'), listEl = $('mbList'), moreBtn = $('mbMore');
  var loadingEl = $('mbLoading'), emptyEl = $('mbEmpty'), errorEl = $('mbError');

  var term = '';        // এখন যে শব্দে খোঁজা হচ্ছে
  var offset = 0;       // এ পর্যন্ত কতজন এসেছে
  var shown = 0;        // পর্দায় কতজন
  var reqId = 0;        // দেরিতে আসা পুরনো রেসপন্স বাদ দিতে
  var loading = false;
  var timer = null;

  function toBn(n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'.charAt(d); }); }
  function isHttps(u) { return /^https:\/\//i.test(u || ''); }
  function initial(name) { var c = String(name || '').replace(/^@/, '').trim().charAt(0); return c ? c.toUpperCase() : '?'; }

  function showState(which) {
    loadingEl.hidden = which !== 'loading';
    emptyEl.hidden = which !== 'empty';
    errorEl.hidden = which !== 'error';
    listEl.hidden = which !== 'list';
    if (which !== 'list') { moreBtn.hidden = true; }
  }

  function buildCard(m) {
    var uname = String(m.username || '').toLowerCase();
    if (!USERNAME_RE.test(uname)) { return null; }
    var displayName = m.full_name || ('@' + uname);

    var li = document.createElement('li');
    var a = document.createElement('a');
    a.className = 'mb-card';
    a.href = 'public-profile.html?u=' + encodeURIComponent(uname);

    var avWrap = document.createElement('div');
    avWrap.className = 'mb-avatar-wrap';

    var av = document.createElement('div');
    av.className = 'mb-avatar';
    av.setAttribute('aria-hidden', 'true');
    if (isHttps(m.avatar_url)) {
      var img = document.createElement('img');
      img.src = m.avatar_url; img.alt = ''; img.loading = 'lazy';
      img.onerror = function () { img.remove(); av.textContent = initial(displayName); };
      av.appendChild(img);
    } else {
      av.textContent = initial(displayName);
    }
    avWrap.appendChild(av);

    if (m.is_online) {
      var dot = document.createElement('span');
      dot.className = 'mb-online-dot';
      dot.setAttribute('role', 'img');
      dot.setAttribute('aria-label', 'অনলাইনে আছে');
      dot.title = 'অনলাইনে আছে';
      avWrap.appendChild(dot);
    }

    var body = document.createElement('div');
    body.className = 'mb-body';

    var nameRow = document.createElement('div');
    nameRow.className = 'mb-name';
    var nameSpan = document.createElement('span');
    nameSpan.textContent = displayName;
    nameRow.appendChild(nameSpan);
    if (m.is_verified) {
      var ic = document.createElement('i');
      ic.className = 'fa-solid fa-circle-check';
      ic.setAttribute('role', 'img');
      ic.setAttribute('aria-label', 'যাচাইকৃত সদস্য');
      ic.title = 'যাচাইকৃত সদস্য';
      nameRow.appendChild(ic);
    }
    body.appendChild(nameRow);

    var un = document.createElement('div');
    un.className = 'mb-user';
    un.textContent = '@' + uname;
    body.appendChild(un);

    if (m.bio) {
      var bio = document.createElement('p');
      bio.className = 'mb-bio';
      bio.textContent = m.bio;
      body.appendChild(bio);
    }

    var meta = document.createElement('div');
    meta.className = 'mb-meta';
    if (m.address_summary) {
      var ad = document.createElement('span');
      var ai = document.createElement('i');
      ai.className = 'fa-solid fa-location-dot'; ai.setAttribute('aria-hidden', 'true');
      ad.appendChild(ai);
      ad.appendChild(document.createTextNode(m.address_summary));
      meta.appendChild(ad);
    }
    var fo = document.createElement('span');
    var fi = document.createElement('i');
    fi.className = 'fa-solid fa-user-group'; fi.setAttribute('aria-hidden', 'true');
    fo.appendChild(fi);
    fo.appendChild(document.createTextNode(toBn(Number(m.followers) || 0) + ' ফলোয়ার'));
    meta.appendChild(fo);
    body.appendChild(meta);

    a.appendChild(avWrap);
    a.appendChild(body);
    li.appendChild(a);
    return li;
  }

  function setStatus() {
    if (!shown) { statusEl.hidden = true; statusEl.textContent = ''; return; }
    statusEl.textContent = term
      ? '"' + term + '" খুঁজে ' + toBn(shown) + ' জন সদস্য দেখানো হচ্ছে'
      : toBn(shown) + ' জন সদস্য দেখানো হচ্ছে';
    statusEl.hidden = false;
  }

  // reset = true হলে নতুন খোঁজ (তালিকা খালি করে শুরু); false হলে "আরও দেখান"
  function load(reset) {
    if (loading && !reset) { return; }
    var my = ++reqId;
    loading = true;
    if (reset) {
      offset = 0; shown = 0; listEl.innerHTML = '';
      statusEl.hidden = true;
      showState('loading');
    } else {
      moreBtn.disabled = true;
    }
    // PAGE+১ চাওয়া হয় — বাড়তি একজন এলে বোঝা যায় আরও আছে
    return client.rpc('list_public_members', { p_search: term || null, p_limit: PAGE + 1, p_offset: offset }).then(function (r) {
      if (my !== reqId) { return; }
      if (r.error) { throw r.error; }
      var rows = r.data || [];
      var hasMore = rows.length > PAGE;
      if (hasMore) { rows = rows.slice(0, PAGE); }
      offset += rows.length;

      rows.forEach(function (m) {
        var li = buildCard(m);
        if (li) { listEl.appendChild(li); shown += 1; }
      });

      if (!shown) {
        $('mbEmptyText').textContent = term ? 'অন্য নাম বা ইউজারনেম দিয়ে খুঁজে দেখুন।' : 'এখনো কোনো সদস্যের প্রোফাইল পাবলিক নেই।';
        showState('empty');
        statusEl.hidden = true;
      } else {
        showState('list');
        moreBtn.hidden = !hasMore;
        setStatus();
      }
    }).catch(function (err) {
      if (my !== reqId) { return; }
      // ফাংশন লাইভে নেই / অনুমতি নেই — পরিষ্কার বার্তা, কাঁচা ইংরেজি এরর নয়
      $('mbErrorText').textContent = 'কিছুক্ষণ পর আবার চেষ্টা করুন।';
      if (shown) {
        moreBtn.hidden = false;   // আগের তালিকা থাকলে সেটা রেখে শুধু বাটন আবার চালু
        statusEl.textContent = 'আরও সদস্য লোড করা যায়নি — আবার চেষ্টা করুন।';
        statusEl.hidden = false;
      } else {
        showState('error');
      }
      if (window.console && err) { console.warn('list_public_members:', err.code || '', err.message || ''); }
    }).finally(function () {
      if (my === reqId) { loading = false; moreBtn.disabled = false; }
    });
  }

  // ---- ইভেন্ট ----
  searchEl.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      var v = searchEl.value.trim();
      if (v === term) { return; }
      term = v;
      load(true);
    }, 350);
  });
  searchEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); var v = searchEl.value.trim(); if (v !== term) { term = v; load(true); } }
  });
  moreBtn.addEventListener('click', function () { load(false); });
  $('mbRetry').addEventListener('click', function () { load(true); });

  // ---- শুরু: লগইন বাধ্যতামূলক ----
  showState('loading');
  client.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (!session) {
      window.location.replace('login.html?next=' + encodeURIComponent('members.html'));
      return;
    }
    return load(true);
  }).catch(function () { showState('error'); });

  client.auth.onAuthStateChange(function (event) {
    if (event === 'SIGNED_OUT') { window.location.replace('login.html?next=' + encodeURIComponent('members.html')); }
  });
})();
