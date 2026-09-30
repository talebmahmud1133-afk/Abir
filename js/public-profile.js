// টাঙ্গাইল জেলা — পাবলিক প্রোফাইল পেজ + ফলো সিস্টেম + অ্যাক্টিভিটি ট্যাব (ইউজার প্রোফাইল সিস্টেম, ধাপ ৫-৮)
// URL: public-profile.html?u=<username>   (u না থাকলে লগইন করা ইউজারকে নিজের প্রোফাইলে পাঠানো হয়)
//
// ডেটা: RPC get_public_profile(p_username)   — শুধু নিরাপদ কলাম; ফোন/গ্রাম কখনোই ফেরত আসে না
//       RPC get_follow_stats(p_username)     — ফলোয়ার/ফলোয়িং সংখ্যা + বর্তমান ইউজার ফলো করছে কিনা
//       RPC get_public_activity(p_username)  — ধাপ ৭: marketplace/shop/doctor/lawyer/post এর অনুমোদিত এন্ট্রি
//         (আগের কোনো সেশনে লাইভে আগে থেকেই তৈরি ছিল, এই সেশনে শুধু পড়ে ব্যবহার করা হয়েছে — কোনো নতুন
//         মাইগ্রেশন লাগেনি। matrimony_entries ইচ্ছাকৃতভাবে এতে নেই — সংবেদনশীল ডেটা, প্রকাশ্যে দেখানো হয় না।)
//       টেবিল follows (RLS: নিজের হয়ে insert/delete; টার্গেট is_public না হলে insert আটকায়)
// সব ডাইনামিক টেক্সট textContent দিয়ে বসানো হয় (innerHTML নয়) — XSS-নিরাপদ।
(function () {
  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
  var USERNAME_RE = /^[a-z0-9_]{3,20}$/;

  function $(id) { return document.getElementById(id); }
  var loadingEl = $('ppLoading'), notFoundEl = $('ppNotFound'), cardEl = $('ppCard');
  var msgEl = $('ppMsg'), followBtn = $('ppFollowBtn');

  var uname = (new URLSearchParams(window.location.search).get('u') || '').trim().toLowerCase();
  var me = null;            // লগইন করা ইউজারের id (না থাকলে null)
  var profile = null;       // { id, username, full_name, ... }
  var stats = { followers: 0, friends: 0, status: 'none' };   // status: none | pending_sent | pending_received | accepted (RPC get_follow_stats.viewer_status)
  var busy = false;

  function toBn(n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'.charAt(d); }); }
  function setMsg(t, ok) { msgEl.textContent = t || ''; msgEl.className = 'auth-msg pp-msg' + (ok ? ' ok' : ''); }
  function showState(which) {
    loadingEl.hidden = which !== 'loading';
    notFoundEl.hidden = which !== 'notfound';
    cardEl.hidden = which !== 'card';
  }
  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var months = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
    return toBn(d.getDate()) + ' ' + months[d.getMonth()] + ' ' + toBn(d.getFullYear());
  }
  function isHttps(u) { return /^https:\/\//i.test(u || ''); }

  // ---- অ্যাক্টিভিটি ট্যাব (ধাপ ৭) ----
  var ACT_META = {
    market:  { icon: 'fa-tag',            label: 'কেনাবেচা পোস্ট', url: function (id) { return 'market-item.html?id=' + encodeURIComponent(id); } },
    shop:    { icon: 'fa-shop',           label: 'দোকান',          url: function () { return 'business-directory.html'; } },
    doctor:  { icon: 'fa-user-doctor',    label: 'ডাক্তার তালিকা',  url: function () { return 'doctors.html'; } },
    lawyer:  { icon: 'fa-scale-balanced', label: 'আইনজীবী তালিকা',  url: function (id) { return 'lawyer.html#p-' + encodeURIComponent(id); } },
    post:    { icon: 'fa-image',          label: 'পোস্ট',           url: function (id) { return 'post-view.html?id=' + encodeURIComponent(id); } }
  };
  var actListEl = $('ppActivityList'), actSectionEl = $('ppActivitySection'), actEmptyEl = $('ppActivityEmpty');

  function renderActivity(rows) {
    if (!actSectionEl) { return; }
    actListEl.innerHTML = '';
    if (!rows || !rows.length) {
      actSectionEl.hidden = false;
      actEmptyEl.hidden = false;
      return;
    }
    actEmptyEl.hidden = true;
    rows.forEach(function (row) {
      var meta = ACT_META[row.kind];
      if (!meta) { return; }
      var li = document.createElement('li');
      li.className = 'pp-act-item';

      var iconWrap = document.createElement('span');
      iconWrap.className = 'pp-act-icon';
      var icon = document.createElement('i');
      icon.className = 'fa-solid ' + meta.icon;
      icon.setAttribute('aria-hidden', 'true');
      iconWrap.appendChild(icon);

      var body = document.createElement('div');
      body.className = 'pp-act-body';

      var a = document.createElement('a');
      a.className = 'pp-act-title';
      a.href = meta.url(row.item_id);
      a.textContent = row.title || meta.label;
      body.appendChild(a);

      var metaLine = document.createElement('div');
      metaLine.className = 'pp-act-meta';
      var parts = [meta.label];
      if (row.subtitle) { parts.push(row.subtitle); }
      var d = formatDate(row.created_at);
      if (d) { parts.push(d); }
      metaLine.textContent = parts.join(' · ');
      body.appendChild(metaLine);

      li.appendChild(iconWrap);
      li.appendChild(body);
      actListEl.appendChild(li);
    });
    actSectionEl.hidden = false;
  }

  function loadActivity(username) {
    if (!actSectionEl) { return Promise.resolve(); }
    return client.rpc('get_public_activity', { p_username: username, p_limit: 30 }).then(function (r) {
      if (r.error) { actSectionEl.hidden = true; return; }
      renderActivity(r.data || []);
    }).catch(function () { actSectionEl.hidden = true; });
  }

  // ---- রেন্ডার ----
  function render(p, opts) {
    profile = p;
    var displayName = p.full_name || ('@' + p.username);
    $('ppName').textContent = displayName;
    $('ppUsername').textContent = '@' + p.username;
    document.title = displayName + ' (@' + p.username + ') — টাঙ্গাইল জেলা';

    $('ppVerified').hidden = !p.is_verified;

    var bioEl = $('ppBio');
    bioEl.textContent = p.bio || '';
    bioEl.hidden = !p.bio;
    if (p.bio && window.tzBioClamp) window.tzBioClamp(bioEl, p.bio);

    var addrEl = $('ppAddress');
    addrEl.lastElementChild.textContent = p.address_summary || '';
    addrEl.hidden = !p.address_summary;

    var joined = formatDate(p.created_at);
    $('ppJoined').lastElementChild.textContent = joined ? 'যোগ দিয়েছেন ' + joined : '';
    $('ppJoined').hidden = !joined;

    var cover = $('ppCover');
    cover.innerHTML = '';
    if (isHttps(p.cover_url)) {
      var ci = document.createElement('img');
      ci.src = p.cover_url; ci.alt = '';
      ci.onerror = function () { ci.remove(); };
      cover.appendChild(ci);
    }
    var av = $('ppAvatar');
    av.innerHTML = '';
    if (isHttps(p.avatar_url)) {
      var ai = document.createElement('img');
      ai.src = p.avatar_url; ai.alt = displayName + ' এর প্রোফাইল ছবি';
      ai.onerror = function () { ai.remove(); av.textContent = initial(displayName); };
      av.appendChild(ai);
    } else {
      av.textContent = initial(displayName);
    }

    var own = !!me && me === p.id;
    $('ppActionsOwn').hidden = !own;
    $('ppActionsOther').hidden = own;
    $('ppPrivateNote').hidden = !(own && opts && opts.privatePreview);
    setupMessageBtn(p, own);
    showState('card');
  }

  // ---- "মেসেজ" বাটন (মেসেজিং ধাপ ২খ) ----
  // গেস্ট: বাটন দেখায়, চাপলে লগইন (ফিরে আসবে এই পেজে)। লগইন করা: get_chat_state সারি ফেরত না দিলে
  // (প্রাইভেট প্রোফাইলে কোল্ড-মেসেজ নিষেধ ইত্যাদি) বাটন লুকানো থাকে; এরর হলে দেখানো হয় (chat.html নিজে বাংলা বার্তা দেবে)।
  function setupMessageBtn(p, own) {
    var btn = $('ppMsgBtn');
    if (!btn) { return; }
    btn.hidden = true;
    if (own) { return; }
    if (!me) {
      btn.href = 'login.html?next=' + encodeURIComponent('public-profile.html?u=' + encodeURIComponent(p.username));
      btn.hidden = false;
      return;
    }
    btn.href = 'chat.html?u=' + encodeURIComponent(p.username);
    client.rpc('get_chat_state', { p_username: p.username }).then(function (r) {
      var row = r.data && r.data[0];
      btn.hidden = !r.error && !row;
    }).catch(function () { btn.hidden = false; });
  }
  function initial(name) { var c = String(name || '').replace(/^@/, '').trim().charAt(0); return c ? c.toUpperCase() : '?'; }

  function renderStats() {
    $('ppFollowers').textContent = toBn(stats.followers);
    $('ppFollowing').textContent = toBn(stats.friends);
    var st = stats.status;
    var icon = 'fa-user-plus', label = 'Add Friend';
    if (st === 'accepted') { icon = 'fa-user-check'; label = 'Friend'; }
    else if (st === 'pending_sent') { icon = 'fa-user-clock'; label = 'Friend Request'; }
    else if (st === 'pending_received') { icon = 'fa-user-plus'; label = 'Accept Request'; }
    followBtn.innerHTML = '';
    var followIcon = document.createElement('i');
    followIcon.className = 'fa-solid ' + icon;
    followIcon.setAttribute('aria-hidden', 'true');
    followBtn.appendChild(followIcon);
    followBtn.appendChild(document.createTextNode(' ' + label));
    followBtn.classList.toggle('is-following', st === 'accepted');
    followBtn.classList.toggle('is-pending', st === 'pending_sent');
    followBtn.setAttribute('aria-pressed', (st === 'accepted' || st === 'pending_sent') ? 'true' : 'false');
  }

  function loadStats() {
    return client.rpc('get_follow_stats', { p_username: uname }).then(function (r) {
      var row = r.data && r.data[0];
      if (r.error || !row) { return; }
      stats.followers = Number(row.followers) || 0;
      stats.friends = Number(row.friends) || 0;
      stats.status = row.viewer_status || 'none';
      renderStats();
    });
  }

  // ---- ফ্রেন্ড রিকোয়েস্ট: পাঠানো / বাতিল / গ্রহণ / ফ্রেন্ড সরানো ----
  // বাটনের অবস্থা আসে RPC get_follow_stats-এর viewer_status থেকে:
  //   none → Add Friend (চাপলে follows-এ pending সারি; ডিফল্ট status = 'pending', পলিসি request as self)
  //   pending_sent → Friend Request (হলুদ; চাপলে নিশ্চিত করে বাতিল)
  //   pending_received → Accept Request (চাপলে RPC respond_friend_request)
  //   accepted → Friend (চাপলে নিশ্চিত করে সরানো)
  followBtn.addEventListener('click', function () {
    if (!profile || busy) { return; }
    if (!me) {   // লগইন ছাড়া — লগইনের পর এই পেজেই ফেরত
      window.location.href = 'login.html?next=' + encodeURIComponent('public-profile.html?u=' + encodeURIComponent(profile.username));
      return;
    }
    var st = stats.status;
    if (st === 'pending_sent' && !window.confirm('ফ্রেন্ড রিকোয়েস্ট বাতিল করবেন?')) { return; }
    if (st === 'accepted' && !window.confirm('ফ্রেন্ড তালিকা থেকে সরিয়ে দেবেন?')) { return; }
    busy = true; followBtn.disabled = true; setMsg('');

    var q, okMsg, nextStatus;
    if (st === 'pending_received') {
      q = client.rpc('respond_friend_request', { p_username: profile.username, p_accept: true });
      okMsg = 'আপনারা এখন ফ্রেন্ড।'; nextStatus = 'accepted';
    } else if (st === 'none') {
      // add_friend RPC — আগে অন্তত একবার ফ্রেন্ড ছিল হলে সঙ্গে সঙ্গে accepted করে (নতুন রিকোয়েস্ট/নোটিফিকেশন ছাড়াই)
      q = client.rpc('add_friend', { p_username: profile.username });
      okMsg = null; nextStatus = null;   // RPC রেজাল্ট (accepted/pending_sent) দেখে নিচে ঠিক করা হয়
    } else {
      // বাতিল (pending_sent) বা ফ্রেন্ড সরানো (accepted) — দুই দিকের যেকোনো সারি, শুধু নিজের সম্পর্কের
      q = client.from('follows').delete().or(
        'and(follower_id.eq.' + me + ',following_id.eq.' + profile.id + '),' +
        'and(follower_id.eq.' + profile.id + ',following_id.eq.' + me + ')'
      );
      okMsg = st === 'pending_sent' ? 'ফ্রেন্ড রিকোয়েস্ট বাতিল করা হয়েছে।' : 'ফ্রেন্ড তালিকা থেকে সরানো হয়েছে।';
      nextStatus = 'none';
    }

    q.then(function (r) {
      var err = r.error;
      if (err) {
        if (err.code === '42501') { setMsg('এই প্রোফাইলে এখন ফ্রেন্ড রিকোয়েস্ট পাঠানো যাচ্ছে না (সম্ভবত পাবলিক নয়)।'); }
        else if (/^rate_limited:/.test(err.message || '')) { setMsg(err.message.replace(/^rate_limited:\s*/, '')); }
        else { setMsg('সম্পন্ন করা যায়নি: ' + (err.message || 'অজানা সমস্যা')); }
        return;
      }
      if (st === 'pending_received' && r.data === false) {
        setMsg('রিকোয়েস্টটি আর নেই।');
        return loadStats();
      }
      if (st === 'none') {   // add_friend RPC রেজাল্ট: 'accepted' (আগে ফ্রেন্ড ছিল) বা 'pending_sent'
        nextStatus = r.data === 'accepted' ? 'accepted' : 'pending_sent';
        okMsg = nextStatus === 'accepted' ? 'আপনারা আবার ফ্রেন্ড হয়েছেন।' : 'ফ্রেন্ড রিকোয়েস্ট পাঠানো হয়েছে।';
      }
      stats.status = nextStatus; renderStats();   // সঙ্গে সঙ্গে রঙ/লেখা বদলায়
      return loadStats().then(function () {       // সার্ভারের আসল সংখ্যা/অবস্থা আবার এনে দেখানো
        setMsg(okMsg, true);
        try { window.dispatchEvent(new CustomEvent('tangail:friend-req-refresh')); } catch (e) { /* কিছু না */ }
      });
    }).catch(function () {
      setMsg('নেটওয়ার্ক সমস্যা — আবার চেষ্টা করুন।');
    }).finally(function () {
      busy = false; followBtn.disabled = false;
    });
  });

  // ---- লোডিং ----
  function loadProfile() {
    return client.rpc('get_public_profile', { p_username: uname }).then(function (r) {
      var row = r.data && r.data[0];
      if (!r.error && row) { render(row, { privatePreview: false }); return Promise.all([loadStats(), loadActivity(uname)]); }
      // পাবলিক রেজাল্ট নেই — নিজের প্রাইভেট প্রোফাইল হতে পারে (মালিক নিজেরটা RLS-এ পড়তে পারে)
      if (!me) { showState('notfound'); return; }
      return client.from('profiles')
        .select('id, username, full_name, bio, avatar_url, cover_url, is_verified, created_at, is_public, show_address, union_name, thana, district')
        .eq('id', me).maybeSingle().then(function (o) {
          var d = o.data;
          if (o.error || !d || String(d.username || '').toLowerCase() !== uname) { showState('notfound'); return; }
          d.address_summary = d.show_address
            ? [d.union_name, d.thana, d.district].filter(Boolean).join(', ') : null;
          render(d, { privatePreview: d.is_public === false });
          return Promise.all([loadStats(), loadActivity(uname)]);
        });
    });
  }

  showState('loading');
  client.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    me = session ? session.user.id : null;

    if (!uname) {   // ?u= নেই → নিজের প্রোফাইলে পাঠানো
      if (!me) { showState('notfound'); return; }
      return client.from('profiles').select('username').eq('id', me).maybeSingle().then(function (r) {
        var u = r.data && r.data.username;
        window.location.replace(u ? 'public-profile.html?u=' + encodeURIComponent(u) : 'profile.html#edit');
      });
    }
    if (!USERNAME_RE.test(uname)) { showState('notfound'); return; }
    return loadProfile();
  }).catch(function () { showState('notfound'); });

  client.auth.onAuthStateChange(function (event, session) {
    var newMe = session ? session.user.id : null;
    if (event === 'SIGNED_OUT' || (profile && newMe !== me)) { window.location.reload(); }
  });
})();
