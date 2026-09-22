// টাঙ্গাইল জেলা — কমিউনিটি ওভারভিউ ফিড (ইউজার প্রোফাইল সিস্টেম, ধাপ ১০)
// URL: community.html   (লগইন লাগে না — ফিডের আইটেমগুলো এমনিতেই ক্যাটাগরি পেজে পাবলিক)
//
// ডেটা: RPC get_community_feed(p_limit)
//   — marketplace/shop/doctor/lawyer/post এর শুধু approved (ডেমো বাদ) এন্ট্রি, সব সদস্যের মিলিয়ে, নতুন আগে।
//   — মালিকের ইউজারনেম/নাম শুধু তার প্রোফাইল পাবলিক হলে আসে, নইলে null। matrimony ইচ্ছাকৃতভাবে নেই।
//   — ফাংশনের SQL: supabase/community-schema.sql
// সব ডাইনামিক টেক্সট textContent দিয়ে বসানো হয় (innerHTML নয়) — XSS-নিরাপদ।
(function () {
  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
  var USERNAME_RE = /^[a-z0-9_]{3,20}$/;
  var LIMIT = 30;

  function $(id) { return document.getElementById(id); }
  var loadingEl = $('cmLoading'), emptyEl = $('cmEmpty'), errorEl = $('cmError'), listEl = $('cmList');

  // public-profile.js-এর ACT_META-র সাথে একই লিংক-নিয়ম
  var KIND = {
    market: { icon: 'fa-tag',            label: 'কেনাবেচা',  url: function (id) { return 'market-item.html?id=' + encodeURIComponent(id); } },
    shop:   { icon: 'fa-shop',           label: 'দোকান',     url: function () { return 'business-directory.html'; } },
    doctor: { icon: 'fa-user-doctor',    label: 'ডাক্তার',    url: function () { return 'doctors.html'; } },
    lawyer: { icon: 'fa-scale-balanced', label: 'আইনজীবী',   url: function (id) { return 'lawyer.html#p-' + encodeURIComponent(id); } },
    post:   { icon: 'fa-image',          label: 'পোস্ট',      url: function (id) { return 'post-view.html?id=' + encodeURIComponent(id); } }
  };

  function toBn(n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'.charAt(d); }); }
  function isHttps(u) { return /^https:\/\//i.test(u || ''); }
  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var months = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
    return toBn(d.getDate()) + ' ' + months[d.getMonth()] + ' ' + toBn(d.getFullYear());
  }
  function formatPrice(p) {
    var n = Number(p);
    if (p === null || p === undefined || p === '' || !isFinite(n) || n <= 0) { return ''; }
    return '৳ ' + toBn(n.toLocaleString('en-US'));
  }

  function showState(which) {
    loadingEl.hidden = which !== 'loading';
    emptyEl.hidden = which !== 'empty';
    errorEl.hidden = which !== 'error';
    listEl.hidden = which !== 'list';
  }

  function buildItem(row) {
    var meta = KIND[row.kind];
    if (!meta) { return null; }

    var li = document.createElement('li');
    li.className = 'cm-item';

    var icon = document.createElement('span');
    icon.className = 'cm-icon';
    var ii = document.createElement('i');
    ii.className = 'fa-solid ' + meta.icon;
    ii.setAttribute('aria-hidden', 'true');
    icon.appendChild(ii);

    var body = document.createElement('div');
    body.className = 'cm-body';

    var kind = document.createElement('div');
    kind.className = 'cm-kind';
    kind.textContent = meta.label;
    body.appendChild(kind);

    var a = document.createElement('a');
    a.className = 'cm-link';
    a.href = meta.url(row.item_id);
    a.textContent = row.title || meta.label;
    body.appendChild(a);

    if (row.subtitle) {
      var sub = document.createElement('div');
      sub.className = 'cm-sub2';
      sub.textContent = row.subtitle;
      body.appendChild(sub);
    }
    var price = formatPrice(row.price);
    if (price) {
      var pr = document.createElement('div');
      pr.className = 'cm-price';
      pr.textContent = price;
      body.appendChild(pr);
    }

    var foot = document.createElement('div');
    foot.className = 'cm-foot';
    var uname = String(row.owner_username || '').toLowerCase();
    if (USERNAME_RE.test(uname)) {
      var ow = document.createElement('a');
      ow.className = 'cm-owner';
      ow.href = 'public-profile.html?u=' + encodeURIComponent(uname);
      ow.textContent = row.owner_name || ('@' + uname);
      foot.appendChild(ow);
    }
    var when = formatDate(row.created_at);
    if (when) {
      var t = document.createElement('span');
      t.textContent = when;
      foot.appendChild(t);
    }
    if (foot.childNodes.length) { body.appendChild(foot); }

    li.appendChild(icon);
    li.appendChild(body);

    if (isHttps(row.image_url)) {
      var th = document.createElement('div');
      th.className = 'cm-thumb';
      var img = document.createElement('img');
      img.src = row.image_url; img.alt = ''; img.loading = 'lazy';
      img.onerror = function () { th.remove(); };
      th.appendChild(img);
      li.appendChild(th);
    }
    return li;
  }

  var reqId = 0;
  function load() {
    var my = ++reqId;
    showState('loading');
    return client.rpc('get_community_feed', { p_limit: LIMIT }).then(function (r) {
      if (my !== reqId) { return; }
      if (r.error) { throw r.error; }
      listEl.innerHTML = '';
      var n = 0;
      (r.data || []).forEach(function (row) {
        var li = buildItem(row);
        if (li) { listEl.appendChild(li); n += 1; }
      });
      showState(n ? 'list' : 'empty');
    }).catch(function (err) {
      if (my !== reqId) { return; }
      showState('error');
      if (window.console && err) { console.warn('get_community_feed:', err.code || '', err.message || ''); }
    });
  }

  $('cmRetry').addEventListener('click', load);
  load();
})();
