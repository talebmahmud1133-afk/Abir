// টাঙ্গাইল জেলা — নিজের অ্যাক্টিভিটি টাইমলাইন (ইউজার প্রোফাইল সিস্টেম, ধাপ ৮)
// লগইন বাধ্যতামূলক (না থাকলে login.html?next=my-activity.html)।
// প্রতিটা ক্যাটাগরি টেবিল থেকে নিজের (user_id = auth.uid()) সব status (pending/approved/rejected) এর row আনা হয় —
// এই সেশনে যোগ করা "user can read own <table>" RLS পলিসিগুলোর ওপর ভিত্তি করে (matrimony_entries-এ আগে থেকেই ছিল)।
// পাবলিক প্রোফাইল পেজের get_public_activity RPC থেকে আলাদা: এখানে pending/rejected-ও দেখা যায়, শুধু approved নয়।
// সব ডাইনামিক টেক্সট textContent দিয়ে বসানো হয় — XSS-নিরাপদ।
(function () {
  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);

  function $(id) { return document.getElementById(id); }
  var loadingEl = $('maLoading'), signinEl = $('maSignin'), emptyEl = $('maEmpty'), errorEl = $('maError'), listEl = $('maList'), headingEl = $('maHeading');

  function toBn(n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'.charAt(d); }); }
  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var months = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
    return toBn(d.getDate()) + ' ' + months[d.getMonth()] + ' ' + toBn(d.getFullYear());
  }
  function showState(which) {
    loadingEl.hidden = which !== 'loading';
    signinEl.hidden = which !== 'signin';
    emptyEl.hidden = which !== 'empty';
    errorEl.hidden = which !== 'error';
    listEl.hidden = which !== 'list';
    headingEl.hidden = which !== 'list';
  }

  var STATUS_META = {
    pending:  { label: 'পর্যালোচনাধীন', cls: 'ma-badge-pending' },
    approved: { label: 'অনুমোদিত',       cls: 'ma-badge-approved' },
    rejected: { label: 'বাতিল',          cls: 'ma-badge-rejected' },
    hidden:   { label: 'লুকানো',         cls: 'ma-badge-rejected' }
  };
  var KIND_META = {
    market:    { icon: 'fa-tag',            label: 'কেনাবেচা পোস্ট',   url: 'market-item.html' },
    shop:      { icon: 'fa-shop',           label: 'দোকান',            url: 'business-directory.html' },
    courier:   { icon: 'fa-truck-fast',     label: 'কুরিয়ার অফিস',    url: 'courier.html' },
    doctor:    { icon: 'fa-user-doctor',    label: 'ডাক্তার তালিকা',    url: 'doctors.html' },
    lawyer:    { icon: 'fa-scale-balanced', label: 'আইনজীবী তালিকা',    url: 'lawyer.html' },
    technician:{ icon: 'fa-screwdriver-wrench', label: 'টেকনিশিয়ান', url: 'technician.html' },
    viral:     { icon: 'fa-location-dot',   label: 'ভাইরাল প্লেস',      url: 'viral.html' },
    nursery:   { icon: 'fa-seedling',      label: 'নার্সারি',           url: 'nursery.html' },
    matrimony: { icon: 'fa-heart',          label: 'পাত্র-পাত্রী',       url: 'matrimony.html' },
    post:      { icon: 'fa-image',          label: 'পোস্ট',             url: 'post-view.html' }
  };

  function q(table, cols, kind, mapRow) {
    return client.from(table).select(cols).eq('user_id', window.__MA_ME__)
      .order('created_at', { ascending: false }).limit(50)
      .then(function (r) {
        if (r.error || !r.data) { return []; }
        return r.data.map(function (row) {
          var item = mapRow(row);
          item.kind = kind;
          item.status = row.status || 'approved';
          item.created_at = row.created_at;
          item.id = row.id;
          return item;
        });
      }).catch(function () { return []; });
  }

  function loadAll() {
    return Promise.all([
      q('marketplace_listings', 'id,title,category,upazila,status,created_at', 'market', function (r) {
        return { title: r.title, subtitle: [r.category, r.upazila].filter(Boolean).join(' · ') };
      }),
      q('shops', 'id,name,category,upazila,status,created_at', 'shop', function (r) {
        return { title: r.name, subtitle: [r.category, r.upazila].filter(Boolean).join(' · ') };
      }),
      q('courier_offices', 'id,name,upazila,status,created_at', 'courier', function (r) {
        return { title: r.name, subtitle: r.upazila || '' };
      }),
      q('doctor_listings', 'id,name,category,upazila,status,created_at', 'doctor', function (r) {
        return { title: r.name, subtitle: [r.category, r.upazila].filter(Boolean).join(' · ') };
      }),
      q('lawyer_entries', 'id,name,office_name,upazila,status,created_at', 'lawyer', function (r) {
        return { title: r.name, subtitle: [r.office_name, r.upazila].filter(Boolean).join(' · ') };
      }),
      q('technician_entries', 'id,name,type,upazila,status,created_at', 'technician', function (r) {
        return { title: r.name, subtitle: [r.type, r.upazila].filter(Boolean).join(' · ') };
      }),
      q('viral_entries', 'id,name,type,upazila,status,created_at', 'viral', function (r) {
        return { title: r.name, subtitle: [r.type, r.upazila].filter(Boolean).join(' · ') };
      }),
      q('nursery_entries', 'id,name,type,upazila,status,created_at', 'nursery', function (r) {
        return { title: r.name, subtitle: [r.type, r.upazila].filter(Boolean).join(' · ') };
      }),
      q('matrimony_entries', 'id,name,type,upazila,status,created_at', 'matrimony', function (r) {
        return { title: r.name, subtitle: [r.type, r.upazila].filter(Boolean).join(' · ') };
      }),
      q('posts', 'id,content,status,created_at', 'post', function (r) {
        return { title: (r.content || '').slice(0, 80), subtitle: '' };
      })
    ]).then(function (groups) {
      var all = [].concat.apply([], groups);
      all.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
      return all;
    });
  }

  function render(items) {
    if (!items.length) { showState('empty'); return; }
    listEl.innerHTML = '';
    items.forEach(function (item) {
      var km = KIND_META[item.kind];
      var sm = STATUS_META[item.status] || STATUS_META.pending;
      var li = document.createElement('li');
      li.className = 'ma-item';

      var iconWrap = document.createElement('span');
      iconWrap.className = 'ma-icon';
      var icon = document.createElement('i');
      icon.className = 'fa-solid ' + km.icon;
      icon.setAttribute('aria-hidden', 'true');
      iconWrap.appendChild(icon);

      var body = document.createElement('div');
      body.className = 'ma-body';

      var titleRow = document.createElement('div');
      titleRow.className = 'ma-title-row';
      var title = document.createElement('span');
      title.className = 'ma-title';
      title.textContent = item.title || km.label;
      var badge = document.createElement('span');
      badge.className = 'ma-badge ' + sm.cls;
      badge.textContent = sm.label;
      titleRow.appendChild(title);
      titleRow.appendChild(badge);

      var metaLine = document.createElement('div');
      metaLine.className = 'ma-meta';
      var parts = [km.label];
      if (item.subtitle) { parts.push(item.subtitle); }
      var d = formatDate(item.created_at);
      if (d) { parts.push(d); }
      metaLine.textContent = parts.join(' · ');

      body.appendChild(titleRow);
      body.appendChild(metaLine);

      if (item.status === 'approved') {
        var a = document.createElement('a');
        a.className = 'ma-link';
        a.href = item.kind === 'market' ? (km.url + '?id=' + encodeURIComponent(item.id))
          : (item.kind === 'lawyer' || item.kind === 'technician' || item.kind === 'viral' || item.kind === 'nursery') ? (km.url + '#p-' + encodeURIComponent(item.id))
          : item.kind === 'post' ? (km.url + '?id=' + encodeURIComponent(item.id))
          : km.url;
        a.textContent = 'দেখুন';
        body.appendChild(a);
      }

      li.appendChild(iconWrap);
      li.appendChild(body);
      listEl.appendChild(li);
    });
    showState('list');
  }

  showState('loading');
  client.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (!session) { showState('signin'); return; }
    window.__MA_ME__ = session.user.id;
    return loadAll().then(render);
  }).catch(function () { showState('error'); });
})();
