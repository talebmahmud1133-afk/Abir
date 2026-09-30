// টাঙ্গাইল জেলা — জনপ্রতিনিধি পেজ — চিপ (ধরন) ফিল্টার, উপজেলা/আসন ফিল্টার, সার্চ ও কার্ড রেন্ডারিং
// কাঠামো courier.js-এর মতো; পার্থক্য: চিপ = জনপ্রতিনিধির ধরন, প্রতিটি ধরনের কার্ডে আলাদা তথ্যের সারি।
(function () {
  var types = window.PR_TYPES || [];
  var upazilas = window.PR_UPAZILAS || [];
  var seats = window.PR_SEATS || [];
  var wardGroups = window.PR_WARD_GROUPS || [];
  var lastUpdated = window.PR_LAST_UPDATED || '';
  // ডেটা Supabase থেকে আসে (js/public-rep-submit.js): লোড শেষে window.PR_ITEMS ভরে 'pr:items-updated' ইভেন্ট যায়, তখন আবার আঁকা হয়
  var items = window.PR_ITEMS = (window.PR_ITEMS || []).slice();

  var selectEl = document.getElementById('prUpazilaSelect');
  var filterLabelEl = document.getElementById('prFilterLabel');
  var filterBarEl = document.getElementById('prFilterBar');
  var searchWrapEl = document.getElementById('prSearchWrap');
  var searchEl = document.getElementById('prSearch');
  var gridEl = document.getElementById('prGrid');
  var catsEl = document.getElementById('prCats');
  var updatedFootEl = document.getElementById('prUpdatedFoot');
  if (!selectEl || !gridEl || !catsEl) return;

  var selectedType = types.length ? types[0].key : '';

  var BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  function toBn(n) { return String(n).replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; }); }
  var BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  function formatBnDate(iso) {
    var p = String(iso).split('-');
    if (p.length !== 3) return iso;
    var m = parseInt(p[1], 10) - 1;
    return BN_MONTHS[m] ? toBn(parseInt(p[2], 10)) + ' ' + BN_MONTHS[m] + ' ' + toBn(p[0]) : iso;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function lookup(list, key) {
    for (var i = 0; i < list.length; i++) if (list[i][0] === key) return list[i][1];
    return key || '';
  }
  function typeOf(key) {
    for (var i = 0; i < types.length; i++) if (types[i].key === key) return types[i];
    return null;
  }
  function formatPhone(p) {
    var d = String(p || '').replace(/\s+/g, '');
    return /^\d{11}$/.test(d) ? d.slice(0, 5) + '-' + d.slice(5) : d;
  }

  var COLORS = ['#0F6B3D', '#0B6B8C', '#b4531f', '#6d5fd6', '#0e7c86', '#a63a6b'];
  function typeColor(key) {
    var h = 0; for (var i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return COLORS[h % COLORS.length];
  }
  // ছবি না থাকলে ধরনের ইমোজি দেখায় (কুরিয়ারে যেমন আদ্যক্ষর দেখায়)
  function fallbackHtml(t) {
    var c = typeColor(t.key);
    return '<span class="pr-logo-fallback pr-logo-emoji" style="background:' + c + '1a">' + t.emoji + '</span>';
  }
  function logoHtml(item, t) {
    if (item.photo) {
      return '<div class="pr-logo has-img"><img src="' + esc(item.photo) + '" alt="" loading="lazy" decoding="async"></div>';
    }
    return '<div class="pr-logo" aria-hidden="true">' + fallbackHtml(t) + '</div>';
  }

  // ---------- ফিল্টার বার (ধরন অনুযায়ী বদলায়) ----------
  function renderCats() {
    catsEl.innerHTML = types.map(function (t, i) {
      var on = i === 0;
      return '<button type="button" class="pr-cat' + (on ? ' is-active' : '') + '" data-cat="' + esc(t.key) + '" aria-pressed="' + on + '">' +
        '<span class="pr-cat-emoji" aria-hidden="true">' + t.emoji + '</span>' + esc(t.label) + '</button>';
    }).join('');
  }
  function syncCats() {
    var btns = catsEl.querySelectorAll('.pr-cat');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-cat') === selectedType;
      btns[i].classList.toggle('is-active', on);
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on && catsEl.scrollWidth > catsEl.clientWidth) {
        var b = btns[i];
        catsEl.scrollTo({ left: b.offsetLeft - (catsEl.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' });
      }
    }
  }
  function renderFilter() {
    var t = typeOf(selectedType);
    if (!t) return;
    var mode = t.filter;
    filterBarEl.hidden = mode === 'none';
    if (mode === 'seat') {
      filterLabelEl.textContent = 'আসন নির্বাচন করুন';
      selectEl.innerHTML = '<option value="all">সকল আসন</option>' + seats.map(function (s) {
        return '<option value="' + esc(s[0]) + '">' + esc(s[1]) + '</option>';
      }).join('');
    } else if (mode === 'upazila') {
      filterLabelEl.textContent = (t.labels && t.labels.upazila === 'পৌরসভা (উপজেলা)') ? 'পৌরসভা নির্বাচন করুন' : 'উপজেলা নির্বাচন করুন';
      selectEl.innerHTML = '<option value="all">সকল উপজেলা</option>' + upazilas.map(function (u) {
        return '<option value="' + esc(u[0]) + '">' + esc(u[1]) + '</option>';
      }).join('');
    }
    selectEl.value = 'all';
    if (t.search) {
      searchWrapEl.hidden = false;
      searchEl.placeholder = t.search;
    } else {
      searchWrapEl.hidden = true;
    }
    searchEl.value = '';
  }

  // ---------- কার্ড ----------
  function row(icon, label, value) {
    if (!value) return '';
    return '<li><i class="fa-solid ' + icon + '" aria-hidden="true"></i><span><span class="pr-lbl">' + esc(label) + ':</span> ' + esc(value) + '</span></li>';
  }

  function cardHtml(item) {
    var t = typeOf(item.type);
    if (!t) return '';
    var name = esc(item.name);
    var badge = item.demo ? '<span class="pr-status is-demo">নমুনা</span>' : '';
    var lb = t.labels || {};
    var titleTag = item.post || t.label;                     // যেমন: "চেয়ারম্যান" বা ধরনের নাম
    var rows = '';
    rows += '<li class="pr-role"><i class="fa-solid fa-award" aria-hidden="true"></i><span>' + esc(titleTag) + (item.post ? ' · ' + esc(t.label) : '') + '</span></li>';
    if (item.seat) rows += row('fa-landmark', 'আসন', lookup(seats, item.seat));
    if (item.upazila) rows += row('fa-location-dot', lb.upazila === 'পৌরসভা (উপজেলা)' ? 'পৌরসভা' : 'উপজেলা', lookup(upazilas, item.upazila));
    if (item.union) rows += row('fa-map-pin', 'ইউনিয়ন', item.union);
    if (item.ward) rows += row('fa-hashtag', 'ওয়ার্ড', toBn(item.ward) + ' নং');
    if (item.wardGroup) rows += row('fa-hashtag', 'ওয়ার্ড', lookup(wardGroups, item.wardGroup));
    if (item.party) rows += row('fa-flag', 'দল', item.party);
    if (item.address) rows += row('fa-map-location-dot', (lb.address || 'ঠিকানা').replace(/ঠিকানা$/, 'ঠিকানা'), item.address);
    if (item.phone) rows += row('fa-phone', 'মোবাইল', formatPhone(item.phone));

    var mapUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((item.address || item.name) + ', টাঙ্গাইল');
    if (item.mapUrl && /^https?:\/\//i.test(item.mapUrl)) mapUrl = item.mapUrl;
    var mapBtn = item.address
      ? '<a class="pr-btn-map" href="' + mapUrl + '" target="_blank" rel="noopener" aria-label="Google Map — ' + name + '"><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span>Google Map</span></a>' : '';
    var callBtn = item.phone
      ? '<a class="pr-btn-call" href="tel:' + esc(item.phone) + '" aria-label="কল করুন — ' + name + '"><i class="fa-solid fa-phone" aria-hidden="true"></i><span>কল করুন</span></a>' : '';

    return '<article class="pr-card">' +
      '<div class="pr-card-main">' + logoHtml(item, t) +
        '<div class="pr-card-body">' +
          '<div class="pr-card-head"><h3 class="pr-card-name">' + name + '</h3>' + badge + '</div>' +
          '<ul class="pr-card-meta">' + rows + '</ul>' +
        '</div>' +
      '</div>' +
      (mapBtn || callBtn ? '<div class="pr-card-actions' + (mapBtn && callBtn ? '' : ' is-single') + '">' + mapBtn + callBtn + '</div>' : '') +
    '</article>';
  }

  function render() {
    var t = typeOf(selectedType);
    if (!t) return;
    var sel = selectEl.value || 'all';
    var q = (searchEl.value || '').trim().toLowerCase();
    var list = items.filter(function (it) {
      if (it.type !== selectedType) return false;
      if (t.filter === 'seat' && sel !== 'all' && it.seat !== sel) return false;
      if (t.filter === 'upazila' && sel !== 'all' && it.upazila !== sel) return false;
      if (q && (String(it.name || '') + ' ' + String(it.union || '')).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    if (!list.length && window.PR_LOADING) {
      gridEl.innerHTML = '<div class="pr-empty" role="status"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><p>লোড হচ্ছে…</p></div>';
      return;
    }
    if (!list.length && window.PR_LOAD_FAILED && !items.length) {
      gridEl.innerHTML = '<div class="pr-empty" role="alert"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><p>তালিকা লোড করা যায়নি। ইন্টারনেট চেক করে পেজ রিফ্রেশ করুন।</p></div>';
      return;
    }
    if (!list.length) {
      gridEl.innerHTML = '<div class="pr-empty"><i class="fa-solid fa-users-slash" aria-hidden="true"></i>' +
        '<p>' + esc(t.label) + ' এর কোনো তথ্য এখনো যুক্ত হয়নি।</p>' +
        '<button type="button" class="pr-empty-btn" data-pr-show-all>সব দেখুন</button></div>';
      return;
    }
    gridEl.innerHTML = list.map(cardHtml).join('');
  }

  renderCats();
  renderFilter();
  if (updatedFootEl) updatedFootEl.textContent = formatBnDate(lastUpdated);

  // ছবি লোড ব্যর্থ হলে ইমোজি ফলব্যাক
  gridEl.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG') return;
    var box = img.closest('.pr-logo');
    var t = typeOf(selectedType);
    if (box && t) { box.classList.remove('has-img'); box.setAttribute('aria-hidden', 'true'); box.innerHTML = fallbackHtml(t); }
  }, true);

  gridEl.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-pr-show-all]') : null;
    if (!btn) return;
    selectEl.value = 'all'; searchEl.value = '';
    render();
  });

  catsEl.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.pr-cat') : null;
    if (!btn) return;
    selectedType = btn.getAttribute('data-cat');
    syncCats(); renderFilter(); render();
  });

  selectEl.addEventListener('change', render);
  searchEl.addEventListener('input', render);
  window.addEventListener('pr:items-updated', function () {
    items = window.PR_ITEMS || items;
    lastUpdated = window.PR_LAST_UPDATED || lastUpdated;
    if (updatedFootEl && lastUpdated) updatedFootEl.textContent = formatBnDate(lastUpdated);
    render();
  });

  // ফর্ম থেকে "যে ধরনে যোগ করছি" জানার জন্য
  window.PR_CURRENT_TYPE = function () { return selectedType; };
  render();
})();
