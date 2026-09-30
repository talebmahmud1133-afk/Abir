// টাঙ্গাইল জেলা — আবাসিক হোটেল পেজ — উপজেলা ফিল্টার ও কার্ড রেন্ডারিং
(function () {
  var hotels = window.HOTELS || [];
  var upazilas = window.HOTEL_UPAZILAS || [];
  var selectEl = document.getElementById('hotelUpazilaSelect');
  var gridEl = document.getElementById('hotelGrid');
  if (!selectEl || !gridEl) return;

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function upazilaName(key) {
    for (var i = 0; i < upazilas.length; i++) if (upazilas[i][0] === key) return upazilas[i][1];
    return key;
  }
  var COLORS = ['#167a4f', '#0B6B8C', '#d1467a', '#e08a1e', '#6d5fd6', '#0f5c3a', '#c9603c', '#0e7c86'];
  function logoColor(name) {
    var h = 0, s = String(name || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return COLORS[h % COLORS.length];
  }
  var BN_D = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  function toBn(n) { return String(n).replace(/[0-9]/g, function (d) { return BN_D[+d]; }); }
  // আরও ছবি (ঐচ্ছিক): থাকলে কার্ডের ছবিতে ছোট ব্যাজ; ছবিতে ক্লিক করলে লাইটবক্সে সবগুলো দেখা ও জুম করা যায়
  function extraList(h) {
    return (h.extras || []).filter(function (u) { return /^https?:\/\//i.test(u); }).slice(0, 4);
  }
  function logoHtml(h) {
    if (h.logo) {
      var ex = extraList(h);
      var attr = ex.length ? ' data-extra="' + escapeHtml(JSON.stringify(ex)) + '"' : '';
      var badge = ex.length ? '<span class="ht-photo-count" aria-hidden="true"><i class="fa-regular fa-images"></i>' + toBn(ex.length + 1) + '</span>' : '';
      return '<div class="ht-logo has-img"' + attr + '><img src="' + escapeHtml(h.logo) + '" alt="" loading="lazy" decoding="async">' + badge + '</div>';
    }
    var c = logoColor(h.name), ch = Array.from(String(h.name || '').trim())[0] || '?';
    return '<div class="ht-logo" aria-hidden="true"><span class="ht-logo-fallback" style="background:' + c + '1f;color:' + c + '">' + escapeHtml(ch) + '</span></div>';
  }
  function formatPhone(p) {
    var d = String(p || '').replace(/\s+/g, '');
    return /^\d{11}$/.test(d) ? d.slice(0, 5) + '-' + d.slice(5) : d;
  }

  function renderOptions() {
    var html = '<option value="all">সকল উপজেলা</option>';
    upazilas.forEach(function (u) { html += '<option value="' + escapeHtml(u[0]) + '">' + escapeHtml(u[1]) + '</option>'; });
    selectEl.innerHTML = html;
  }

  function cardHtml(h) {
    var name = escapeHtml(h.name);
    var badge = (h.status === 'open' || h.status === 'closed')
      ? '<span class="ht-status ' + (h.status === 'closed' ? 'is-closed' : 'is-open') + '">' + (h.status === 'closed' ? 'বন্ধ' : 'খোলা') + '</span>' : '';
    var mapUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(h.name + ', ' + h.address + ', টাঙ্গাইল');
    if (h.mapUrl && /^https?:\/\//i.test(h.mapUrl)) mapUrl = h.mapUrl;
    var hasPhone = !!h.phone;
    var phoneRow = hasPhone
      ? '<li><i class="fa-solid fa-phone" aria-hidden="true"></i><span><span class="ht-lbl">মোবাইল:</span> ' + escapeHtml(formatPhone(h.phone)) + '</span></li>' : '';
    var callBtn = hasPhone
      ? '<a class="ht-btn-call" href="tel:' + escapeHtml(h.phone) + '" aria-label="কল করুন — ' + name + '"><i class="fa-solid fa-phone" aria-hidden="true"></i><span>কল করুন</span></a>' : '';
    return '<article class="ht-card"><div class="ht-card-main">' + logoHtml(h) +
      '<div class="ht-card-body"><div class="ht-card-head"><h3 class="ht-card-name">' + name + '</h3>' + badge + '</div>' +
      '<ul class="ht-card-meta">' +
        '<li><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span><span class="ht-lbl">উপজেলা:</span> ' + escapeHtml(upazilaName(h.upazila)) + '</span></li>' +
        '<li><i class="fa-solid fa-map-location-dot" aria-hidden="true"></i><span><span class="ht-lbl">ঠিকানা:</span> ' + escapeHtml(h.address) + '</span></li>' +
        phoneRow +
      '</ul></div></div>' +
      '<div class="ht-card-actions"><a class="ht-btn-map" href="' + mapUrl + '" target="_blank" rel="noopener" aria-label="Google Map — ' + name + '"><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span>Google Map</span></a>' + callBtn + '</div></article>';
  }

  function render() {
    var sel = selectEl.value || 'all';
    var list = hotels.filter(function (h) { return sel === 'all' || h.upazila === sel; });
    if (!list.length && !window.HOTELS_LOADED) {
      gridEl.innerHTML = '<div class="ht-empty"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><p>হোটেলের তালিকা লোড হচ্ছে…</p></div>';
      return;
    }
    if (!list.length) {
      gridEl.innerHTML = '<div class="ht-empty"><i class="fa-solid fa-hotel" aria-hidden="true"></i>' +
        '<p>এই উপজেলায় এখনো কোনো আবাসিক হোটেলের তথ্য যুক্ত হয়নি।</p>' +
        (sel !== 'all' && hotels.length ? '<button type="button" class="ht-empty-btn" data-ht-show-all>সকল হোটেল দেখুন</button>' : '') + '</div>';
      return;
    }
    gridEl.innerHTML = list.map(cardHtml).join('');
  }

  gridEl.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG') return;
    var box = img.closest('.ht-logo'), card = img.closest('.ht-card');
    var n = card && card.querySelector('.ht-card-name');
    if (box) { var c = logoColor(n ? n.textContent : ''); box.classList.remove('has-img');
      box.innerHTML = '<span class="ht-logo-fallback" style="background:' + c + '1f;color:' + c + '">' + escapeHtml(Array.from(n ? n.textContent : '?')[0] || '?') + '</span>'; }
  }, true);
  gridEl.addEventListener('click', function (e) {
    if (!(e.target.closest && e.target.closest('[data-ht-show-all]'))) return;
    selectEl.value = 'all'; render(); selectEl.focus();
  });
  window.addEventListener('hotel:offices-updated', render);
  selectEl.addEventListener('change', render);
  renderOptions();
  render();
})();
