// টাঙ্গাইল জেলা — কুরিয়ার সার্ভিস পেজ — উপজেলা ফিল্টার ও কার্ড রেন্ডারিং
(function () {
  var offices = window.COURIER_OFFICES || [];
  var upazilas = window.COURIER_UPAZILAS || [];
  var companies = window.COURIER_COMPANIES || [];
  var lastUpdated = window.COURIER_LAST_UPDATED || '';

  var selectEl = document.getElementById('courierUpazilaSelect');
  var gridEl = document.getElementById('courierGrid');
  var catsEl = document.getElementById('courierCats');
  var selectedCompany = 'all';
  var totalEl = document.getElementById('courierTotalCount');
  var updatedTopEl = document.getElementById('courierUpdatedTop');
  var updatedFootEl = document.getElementById('courierUpdatedFoot');

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

  function companyName(key) {
    for (var i = 0; i < companies.length; i++) {
      if (companies[i][0] === key) return companies[i][1];
    }
    return '';
  }

  function initials(name) {
    var chars = Array.from(String(name || '').trim());
    return chars.length ? chars[0] : '?';
  }

  // Same company => same colour on every card (brand-like), independent of office id
  var LOGO_COLORS = ['#167a4f', '#0B6B8C', '#d1467a', '#e08a1e', '#6d5fd6', '#0f5c3a', '#c9603c', '#0e7c86'];
  function logoColor(name) {
    var h = 0, s = String(name || '');
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return LOGO_COLORS[h % LOGO_COLORS.length];
  }

  function fallbackHtml(name) {
    // হালকা রঙের ব্যাকগ্রাউন্ড (রঙের ~১২% স্বচ্ছতা) + একই রঙের আদ্যক্ষর — ছবিওয়ালা কার্ডের পাশে ভারী লাগবে না
    var c = logoColor(name);
    return '<span class="cr-logo-fallback" style="background:' + c + '1f;color:' + c + '">' + escapeHtml(initials(name)) + '</span>';
  }

  function logoHtml(office) {
    if (office.logo) {
      // optional company logo image; falls back to the initials tile if it fails to load
      return '<div class="cr-logo has-img"><img src="' + escapeHtml(office.logo) + '" alt="" loading="lazy" decoding="async"></div>';
    }
    return '<div class="cr-logo" aria-hidden="true">' + fallbackHtml(office.name) + '</div>';
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
    var html = '<button type="button" class="cr-cat is-active" data-cat="all" aria-pressed="true">সব</button>';
    companies.forEach(function (c) {
      html += '<button type="button" class="cr-cat" data-cat="' + escapeHtml(c[0]) + '" aria-pressed="false">' + escapeHtml(c[1]) + '</button>';
    });
    catsEl.innerHTML = html;
  }

  // reflect selectedCompany on the bar; keep the active chip visible (scrolls the bar only, not the page)
  function syncCats() {
    if (!catsEl) return;
    var btns = catsEl.querySelectorAll('.cr-cat');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-cat') === selectedCompany;
      btns[i].classList.toggle('is-active', on);
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on && catsEl.scrollWidth > catsEl.clientWidth) {
        var b = btns[i];
        catsEl.scrollTo({ left: b.offsetLeft - (catsEl.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' });
      }
    }
  }

  function cardHtml(office) {
    // Status badge is shown only when the record actually has a status (open / closed)
    var badge = '';
    if (office.status === 'open' || office.status === 'closed') {
      var closed = office.status === 'closed';
      badge = '<span class="cr-status ' + (closed ? 'is-closed' : 'is-open') + '">' + (closed ? 'বন্ধ' : 'খোলা') + '</span>';
    }
    var name = escapeHtml(office.name);
    var mapQuery = encodeURIComponent(office.name + ', ' + office.address + ', টাঙ্গাইল');
    var mapUrl = 'https://www.google.com/maps/search/?api=1&query=' + mapQuery;
    // অনুমোদিত অফিসের নিজস্ব Google Map লিংক থাকলে সেটাই ব্যবহার হবে (শুধু http/https)
    if (office.mapUrl && /^https?:\/\//i.test(office.mapUrl)) mapUrl = office.mapUrl;
    var hasPhone = !!office.phone;
    var coName = companyName(office.company);
    var companyRow = coName
      ? '<li><i class="fa-solid fa-truck-fast" aria-hidden="true"></i><span><span class="cr-lbl">কুরিয়ার:</span> ' + escapeHtml(coName) + '</span></li>'
      : '';

    var phoneRow = hasPhone
      ? '<li><i class="fa-solid fa-phone" aria-hidden="true"></i><span><span class="cr-lbl">মোবাইল:</span> ' + escapeHtml(formatPhone(office.phone)) + '</span></li>'
      : '';
    var callBtn = hasPhone
      ? '<a class="cr-btn-call" href="tel:' + escapeHtml(office.phone) + '" aria-label="কল করুন — ' + name + '"><i class="fa-solid fa-phone" aria-hidden="true"></i><span>কল করুন</span></a>'
      : '';

    return (
      '<article class="cr-card">' +
        '<div class="cr-card-main">' +
          logoHtml(office) +
          '<div class="cr-card-body">' +
            '<div class="cr-card-head">' +
              '<h3 class="cr-card-name">' + name + '</h3>' + badge +
            '</div>' +
            '<ul class="cr-card-meta">' +
              companyRow +
              '<li><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span><span class="cr-lbl">উপজেলা:</span> ' + escapeHtml(upazilaName(office.upazila)) + '</span></li>' +
              '<li><i class="fa-solid fa-map-location-dot" aria-hidden="true"></i><span><span class="cr-lbl">ঠিকানা:</span> ' + escapeHtml(office.address) + '</span></li>' +
              phoneRow +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<div class="cr-card-actions">' +
          '<a class="cr-btn-map" href="' + mapUrl + '" target="_blank" rel="noopener" aria-label="Google Map — ' + name + '"><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span>Google Map</span></a>' +
          callBtn +
        '</div>' +
      '</article>'
    );
  }

  function render() {
    var selected = selectEl.value || 'all';
    // both filters work together: upazila AND company
    var filtered = offices.filter(function (o) {
      return (selected === 'all' || o.upazila === selected) &&
             (selectedCompany === 'all' || o.company === selectedCompany);
    });

    if (totalEl) totalEl.textContent = toBn(offices.length) + 'টি';

    if (!filtered.length && !window.COURIER_LOADED) {
      gridEl.innerHTML = '<div class="cr-empty"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><p>অফিসের তালিকা লোড হচ্ছে…</p></div>';
      return;
    }
    if (!filtered.length) {
      gridEl.innerHTML =
        '<div class="cr-empty">' +
          '<i class="fa-solid fa-box-open" aria-hidden="true"></i>' +
          '<p>' + (selectedCompany === 'all'
            ? 'এই উপজেলায় এখনো কোনো কুরিয়ার অফিসের তথ্য যুক্ত হয়নি।'
            : 'এই উপজেলায় ' + escapeHtml(companyName(selectedCompany)) + ' এর কোনো অফিসের তথ্য এখনো যুক্ত হয়নি।') + '</p>' +
          '<button type="button" class="cr-empty-btn" data-cr-show-all>সকল অফিস দেখুন</button>' +
        '</div>';
      return;
    }
    gridEl.innerHTML = filtered.map(cardHtml).join('');
  }

  renderOptions();
  renderCats();
  var bnDate = formatBnDate(lastUpdated);
  if (updatedTopEl) updatedTopEl.textContent = bnDate;
  if (updatedFootEl) updatedFootEl.textContent = bnDate;

  gridEl.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG') return;
    var box = img.closest('.cr-logo');
    var card = img.closest('.cr-card');
    var nameEl = card && card.querySelector('.cr-card-name');
    var nm = nameEl ? nameEl.textContent : '';
    if (box) {
      box.classList.remove('has-img');
      box.setAttribute('aria-hidden', 'true');
      box.innerHTML = fallbackHtml(nm);
    }
  }, true);

  // empty state: one tap back to the full list (focus moves to the selector for keyboard users)
  gridEl.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-cr-show-all]') : null;
    if (!btn) return;
    selectEl.value = 'all';
    selectedCompany = 'all';
    syncCats();
    render();
    selectEl.focus();
  });

  if (catsEl) {
    catsEl.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.cr-cat') : null;
      if (!btn) return;
      selectedCompany = btn.getAttribute('data-cat') || 'all';
      syncCats();
      render();
    });
  }

  // অ্যাডমিন-অনুমোদিত অফিস Supabase থেকে লোড হলে (courier-submit.js) তালিকা আবার আঁকা হয়
  window.addEventListener('courier:offices-updated', render);

  selectEl.addEventListener('change', render);
  render();
})();
