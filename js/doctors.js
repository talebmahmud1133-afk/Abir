// টাঙ্গাইল জেলা — ডাক্তার পেজ — উপজেলা ও বিশেষজ্ঞ ফিল্টার এবং কার্ড রেন্ডারিং
(function () {
  var items = window.DOCTORS_ITEMS || [];
  var upazilas = window.DOCTORS_UPAZILAS || [];
  var cats = window.DOCTORS_CATEGORIES || [];
  var lastUpdated = window.DOCTORS_LAST_UPDATED || '';

  var selectEl = document.getElementById('doctorUpazilaSelect');
  var gridEl = document.getElementById('doctorGrid');
  var catsEl = document.getElementById('doctorCats');
  var selectedCat = 'all';
  var updatedFootEl = document.getElementById('doctorUpdatedFoot');

  if (!selectEl || !gridEl) return;

  var BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  function toBn(n) {
    return String(n).replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; });
  }

  var BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  function formatBnDate(isoStr) {
    var parts = String(isoStr).split('-');
    if (parts.length !== 3) return isoStr;
    var y = parts[0], m = parseInt(parts[1], 10) - 1, d = parseInt(parts[2], 10);
    if (!BN_MONTHS[m]) return isoStr;
    return toBn(d) + ' ' + BN_MONTHS[m] + ' ' + toBn(y);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function upazilaName(key) {
    for (var i = 0; i < upazilas.length; i++) {
      if (upazilas[i][0] === key) return upazilas[i][1];
    }
    return key;
  }

  function catName(key) {
    for (var i = 0; i < cats.length; i++) {
      if (cats[i][0] === key) return cats[i][1];
    }
    return '';
  }

  // আদ্যক্ষর: "ডা."/"ডাঃ"/"ডাক্তার"/"Dr." উপসর্গ বাদ দিয়ে নামের প্রথম অক্ষর (নইলে সবার ছবির টাইলে "ড" আসত)
  function initials(name) {
    var n = String(name || '').trim().replace(/^(?:ডা\.\s*|ডাঃ\s*|ডাক্তার\s+|Dr\.\s*|Dr\s+)/i, '');
    var chars = Array.from(n || String(name || '').trim());
    return chars.length ? chars[0] : '?';
  }

  // একই নাম => সব কার্ডে একই রং (আইটেমের id-নিরপেক্ষ)
  var LOGO_COLORS = ['#167a4f', '#0B6B8C', '#d1467a', '#e08a1e', '#6d5fd6', '#0f5c3a', '#c9603c', '#0e7c86'];
  function logoColor(name) {
    var h = 0, s = String(name || '');
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return LOGO_COLORS[h % LOGO_COLORS.length];
  }

  function fallbackHtml(name) {
    // হালকা রঙের ব্যাকগ্রাউন্ড (রঙের ~১২% স্বচ্ছতা) + একই রঙের আদ্যক্ষর — ছবিওয়ালা কার্ডের পাশে ভারী লাগবে না
    var c = logoColor(name);
    return '<span class="dc-logo-fallback" style="background:' + c + '1f;color:' + c + '">' + escapeHtml(initials(name)) + '</span>';
  }

  function logoHtml(item) {
    if (item.logo) {
      // ঐচ্ছিক ছবি; লোড ব্যর্থ হলে আদ্যক্ষর টাইলে ফিরে যায়
      return '<div class="dc-logo has-img"><img src="' + escapeHtml(item.logo) + '" alt="" loading="lazy" decoding="async"></div>';
    }
    return '<div class="dc-logo" aria-hidden="true">' + fallbackHtml(item.name) + '</div>';
  }

  function formatPhone(p) {
    var d = String(p || '').replace(/\s+/g, '');
    return /^\d{11}$/.test(d) ? d.slice(0, 5) + '-' + d.slice(5) : d;
  }

  function renderOptions() {
    var html = '<option value="all">সকল উপজেলা</option>';
    upazilas.forEach(function (u) {
      html += '<option value="' + escapeHtml(u[0]) + '">' + escapeHtml(u[1]) + '</option>';
    });
    selectEl.innerHTML = html;
  }

  function renderCats() {
    if (!catsEl) return;
    var html = '<button type="button" class="dc-cat is-active" data-cat="all" aria-pressed="true">সব</button>';
    cats.forEach(function (c) {
      html += '<button type="button" class="dc-cat" data-cat="' + escapeHtml(c[0]) + '" aria-pressed="false">' + escapeHtml(c[1]) + '</button>';
    });
    catsEl.innerHTML = html;
  }

  // সক্রিয় চিপ বারে দেখানো; সক্রিয় চিপ দৃশ্যমান রাখতে শুধু বারটা স্ক্রল হয় (পেজ নয়)
  function syncCats() {
    if (!catsEl) return;
    var btns = catsEl.querySelectorAll('.dc-cat');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-cat') === selectedCat;
      btns[i].classList.toggle('is-active', on);
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on && catsEl.scrollWidth > catsEl.clientWidth) {
        var b = btns[i];
        catsEl.scrollTo({ left: b.offsetLeft - (catsEl.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' });
      }
    }
  }

  function cardHtml(item) {
    // স্ট্যাটাস ব্যাজ শুধু তখনই, যখন রেকর্ডে সত্যিই status (open / closed) আছে
    var badge = '';
    if (item.status === 'open' || item.status === 'closed') {
      var closed = item.status === 'closed';
      badge = '<span class="dc-status ' + (closed ? 'is-closed' : 'is-open') + '">' + (closed ? 'বন্ধ' : 'খোলা') + '</span>';
    }
    var name = escapeHtml(item.name);
    var mapQuery = encodeURIComponent(item.name + ', ' + item.address + ', টাঙ্গাইল');
    var mapUrl = 'https://www.google.com/maps/search/?api=1&query=' + mapQuery;
    // অনুমোদিত তথ্যের নিজস্ব Google Map লিংক থাকলে সেটাই ব্যবহার হবে (শুধু http/https)
    if (item.mapUrl && /^https?:\/\//i.test(item.mapUrl)) mapUrl = item.mapUrl;
    var hasPhone = !!item.phone;
    var cName = catName(item.category);
    var catRow = cName
      ? '<li><i class="fa-solid fa-stethoscope" aria-hidden="true"></i><span><span class="dc-lbl">বিশেষজ্ঞ:</span> ' + escapeHtml(cName) + '</span></li>'
      : '';

    var phoneRow = hasPhone
      ? '<li><i class="fa-solid fa-phone" aria-hidden="true"></i><span><span class="dc-lbl">মোবাইল:</span> ' + escapeHtml(formatPhone(item.phone)) + '</span></li>'
      : '';
    var callBtn = hasPhone
      ? '<a class="dc-btn-call" href="tel:' + escapeHtml(item.phone) + '" aria-label="কল করুন — ' + name + '"><i class="fa-solid fa-phone" aria-hidden="true"></i><span>কল করুন</span></a>'
      : '';

    return (
      '<article class="dc-card">' +
        '<div class="dc-card-main">' +
          logoHtml(item) +
          '<div class="dc-card-body">' +
            '<div class="dc-card-head">' +
              '<h3 class="dc-card-name">' + name + '</h3>' + badge +
            '</div>' +
            '<ul class="dc-card-meta">' +
              catRow +
              '<li><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span><span class="dc-lbl">উপজেলা:</span> ' + escapeHtml(upazilaName(item.upazila)) + '</span></li>' +
              '<li><i class="fa-solid fa-map-location-dot" aria-hidden="true"></i><span><span class="dc-lbl">ঠিকানা:</span> ' + escapeHtml(item.address) + '</span></li>' +
              phoneRow +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<div class="dc-card-actions">' +
          '<a class="dc-btn-map" href="' + mapUrl + '" target="_blank" rel="noopener" aria-label="Google Map — ' + name + '"><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span>Google Map</span></a>' +
          callBtn +
        '</div>' +
      '</article>'
    );
  }

  function render() {
    var selected = selectEl.value || 'all';
    // দুই ফিল্টার একসাথে কাজ করে: উপজেলা AND বিশেষজ্ঞ বিভাগ
    var filtered = items.filter(function (o) {
      return (selected === 'all' || o.upazila === selected) &&
             (selectedCat === 'all' || o.category === selectedCat);
    });

    if (!filtered.length && !window.DOCTORS_LOADED) {
      gridEl.innerHTML = '<div class="dc-empty"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><p>ডাক্তারের তালিকা লোড হচ্ছে…</p></div>';
      return;
    }
    if (!filtered.length) {
      gridEl.innerHTML =
        '<div class="dc-empty">' +
          '<i class="fa-solid fa-user-doctor" aria-hidden="true"></i>' +
          '<p>' + (selectedCat === 'all'
            ? 'এই উপজেলায় এখনো কোনো ডাক্তারের তথ্য যুক্ত হয়নি।'
            : 'এই উপজেলায় ' + escapeHtml(catName(selectedCat)) + ' বিভাগের কোনো ডাক্তারের তথ্য এখনো যুক্ত হয়নি।') + '</p>' +
          '<button type="button" class="dc-empty-btn" data-dc-show-all>সকল ডাক্তার দেখুন</button>' +
        '</div>';
      return;
    }
    gridEl.innerHTML = filtered.map(cardHtml).join('');
  }

  renderOptions();
  renderCats();
  if (updatedFootEl) updatedFootEl.textContent = formatBnDate(lastUpdated);

  gridEl.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG') return;
    var box = img.closest('.dc-logo');
    var card = img.closest('.dc-card');
    var nameEl = card && card.querySelector('.dc-card-name');
    var nm = nameEl ? nameEl.textContent : '';
    if (box) {
      box.classList.remove('has-img');
      box.setAttribute('aria-hidden', 'true');
      box.innerHTML = fallbackHtml(nm);
    }
  }, true);

  // খালি অবস্থা: এক ট্যাপে পুরো তালিকায় ফেরা (কিবোর্ড ব্যবহারকারীর জন্য ফোকাস সিলেক্টে যায়)
  gridEl.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-dc-show-all]') : null;
    if (!btn) return;
    selectEl.value = 'all';
    selectedCat = 'all';
    syncCats();
    render();
    selectEl.focus();
  });

  if (catsEl) {
    catsEl.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.dc-cat') : null;
      if (!btn) return;
      selectedCat = btn.getAttribute('data-cat') || 'all';
      syncCats();
      render();
    });
  }

  // অ্যাডমিন-অনুমোদিত তথ্য Supabase থেকে লোড হলে (doctors-submit.js) তালিকা আবার আঁকা হয়
  window.addEventListener('doctors:items-updated', render);

  selectEl.addEventListener('change', render);
  render();
})();
