// টাঙ্গাইল জেলা — কেনাবেচা মডিউল: প্রোডাক্ট বিস্তারিত পেজ লজিক
(function () {
  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);

  var CATEGORY_LABELS = {
    'mobile': 'মোবাইল', 'motorcycle': 'মোটরসাইকেল', 'car': 'গাড়ি',
    'house-land': 'বাড়ি/জমি', 'electronics': 'ইলেকট্রনিক্স', 'furniture': 'ফার্নিচার',
    'clothing': 'পোশাক', 'agriculture': 'কৃষি', 'other': 'অন্যান্য'
  };

  var wrapEl = document.getElementById('bsDetailWrap');
  var params = new URLSearchParams(window.location.search);
  var itemId = params.get('id');

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatPrice(n) {
    var num = Math.round(Number(n) || 0);
    return '৳ ' + num.toLocaleString('bn-BD');
  }

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('bn-BD', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function waLink(phone, title) {
    var digits = String(phone || '').replace(/\D/g, '');
    if (digits.indexOf('0') === 0) digits = '88' + digits;
    else if (digits.indexOf('880') !== 0) digits = '880' + digits;
    var text = encodeURIComponent('আপনার পোস্ট করা "' + title + '" পণ্যটি নিয়ে জানতে চাচ্ছি।');
    return 'https://wa.me/' + digits + '?text=' + text;
  }

  function renderError(msg) {
    wrapEl.innerHTML = '<div class="bs-state-msg" style="padding:70px 16px;"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>' + escapeHtml(msg) + '</div>';
  }

  function render(item) {
    document.title = item.title + ' — কেনাবেচা — টাঙ্গাইল জেলা';
    var images = (item.images && item.images.length) ? item.images : null;
    var sliderInner = images
      ? images.map(function (src) { return '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(item.title) + '" loading="lazy">'; }).join('')
      : '<div class="bs-no-img"><i class="fa-solid fa-image" aria-hidden="true"></i></div>';
    var counter = images && images.length > 1 ? '<div class="bs-detail-counter" id="bsDetailCounter">১/' + images.length.toLocaleString('bn-BD') + '</div>' : '';
    var phone = escapeHtml(item.phone || '');

    wrapEl.innerHTML =
      '<div class="bs-detail-slider">' +
        '<div class="bs-detail-track" id="bsDetailTrack">' + sliderInner + '</div>' +
        counter +
      '</div>' +
      '<h1 class="bs-detail-title">' + escapeHtml(item.title) + '</h1>' +
      '<div class="bs-detail-price">' + formatPrice(item.price) + '</div>' +
      '<div class="bs-detail-meta-row">' +
        '<span><i class="fa-solid fa-tag" aria-hidden="true"></i>' + escapeHtml(CATEGORY_LABELS[item.category] || item.category) + '</span>' +
        '<span><i class="fa-solid fa-location-dot" aria-hidden="true"></i>' + escapeHtml(item.upazila || '') + '</span>' +
        '<span><i class="fa-regular fa-calendar" aria-hidden="true"></i>' + formatDate(item.created_at) + '</span>' +
      '</div>' +
      (item.description ? '<div class="bs-detail-section-title">বিবরণ</div><div class="bs-detail-desc">' + escapeHtml(item.description) + '</div>' : '') +
      '<div class="bs-sticky-actions">' +
        '<a class="bs-call-btn" href="tel:' + phone + '"><i class="fa-solid fa-phone" aria-hidden="true"></i> কল করুন</a>' +
        '<a class="bs-wa-btn" href="' + waLink(item.phone, item.title) + '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> WhatsApp</a>' +
      '</div>';

    if (images && images.length > 1) {
      var track = document.getElementById('bsDetailTrack');
      var counterEl = document.getElementById('bsDetailCounter');
      track.addEventListener('scroll', function () {
        var idx = Math.round(track.scrollLeft / track.clientWidth) + 1;
        counterEl.textContent = idx.toLocaleString('bn-BD') + '/' + images.length.toLocaleString('bn-BD');
      });
    }
  }

  if (!itemId) {
    renderError('পণ্যটি খুঁজে পাওয়া যায়নি।');
    return;
  }

  client.from('marketplace_listings').select('*').eq('id', itemId).eq('status', 'approved').maybeSingle()
    .then(function (res) {
      if (res.error || !res.data) {
        renderError('পণ্যটি খুঁজে পাওয়া যায়নি অথবা মুছে ফেলা হয়েছে।');
        return;
      }
      render(res.data);
    });
})();
