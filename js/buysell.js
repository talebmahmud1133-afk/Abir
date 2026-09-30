// টাঙ্গাইল জেলা — কেনাবেচা (Buy & Sell) মডিউল: ব্রাউজ পেজ লজিক
// টেবিল: marketplace_listings | স্টোরেজ বাকেট: market-media
(function () {
  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);

  // ক্যাটাগরি তালিকা — slug টি marketplace_listings.category কলামের মান হিসেবে সংরক্ষিত হয়
  // 'all' একটি বিশেষ slug — এটি কোনো category কলামের মান নয়, বরং সব ক্যাটাগরির
  // পোস্ট একসাথে দেখানোর জন্য ব্যবহৃত হয় (নিচে loadProducts()-এ হ্যান্ডল করা হয়েছে)
  var CATEGORIES = [
    { slug: 'all',         label: 'সব',             icon: 'fa-layer-group' },
    { slug: 'mobile',      label: 'মোবাইল',        icon: 'fa-mobile-screen-button' },
    { slug: 'motorcycle',  label: 'মোটরসাইকেল',    icon: 'fa-motorcycle' },
    { slug: 'car',         label: 'গাড়ি',          icon: 'fa-car' },
    { slug: 'house-land',  label: 'বাড়ি/জমি',      icon: 'fa-house' },
    { slug: 'electronics', label: 'ইলেকট্রনিক্স',   icon: 'fa-laptop' },
    { slug: 'furniture',   label: 'ফার্নিচার',      icon: 'fa-couch' },
    { slug: 'clothing',    label: 'পোশাক',          icon: 'fa-shirt' },
    { slug: 'agriculture', label: 'কৃষি',           icon: 'fa-wheat-awn' },
    { slug: 'other',       label: 'অন্যান্য',        icon: 'fa-box' }
  ];

  var PAGE_SIZE = 12;

  var catBarEl = document.getElementById('bsCatBar');
  var gridEl = document.getElementById('bsGrid');
  var loadMoreWrap = document.getElementById('bsLoadMoreWrap');
  var loadMoreBtn = document.getElementById('bsLoadMoreBtn');

  var currentCat = CATEGORIES[0].slug;
  var currentOffset = 0;
  var currentTotal = 0;
  var loading = false;

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
    return new Date(iso).toLocaleDateString('bn-BD', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function waLink(phone, title) {
    var digits = String(phone || '').replace(/\D/g, '');
    if (digits.indexOf('0') === 0) digits = '88' + digits;
    else if (digits.indexOf('880') !== 0) digits = '880' + digits;
    var text = encodeURIComponent('আপনার পোস্ট করা "' + title + '" পণ্যটি নিয়ে জানতে চাচ্ছি।');
    return 'https://wa.me/' + digits + '?text=' + text;
  }

  // ---------- ক্যাটাগরি বার রেন্ডার ----------
  function renderCatBar() {
    catBarEl.innerHTML = CATEGORIES.map(function (c) {
      return '<button type="button" class="bs-cat-chip' + (c.slug === currentCat ? ' active' : '') + '" data-slug="' + c.slug + '">' +
        '<span>' + escapeHtml(c.label) + '</span></button>';
    }).join('');
  }

  catBarEl.addEventListener('click', function (e) {
    var chip = e.target.closest('.bs-cat-chip');
    if (!chip) return;
    var slug = chip.getAttribute('data-slug');
    if (slug === currentCat) return;
    currentCat = slug;
    renderCatBar();
    loadProducts(true);
  });

  // ---------- কার্ড / স্কেলিটন / এম্পটি স্টেট HTML ----------
  function skeletonHtml(count) {
    var out = '';
    for (var i = 0; i < count; i++) {
      out += '<div class="bs-skel"><div class="bs-skel-img"></div><div class="bs-skel-line"></div><div class="bs-skel-line short"></div></div>';
    }
    return out;
  }

  function cardHtml(item) {
    var img = (item.images && item.images[0]) ? item.images[0] : null;
    var imgHtml = img
      ? '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(item.title) + '" loading="lazy">'
      : '<div class="bs-no-img"><i class="fa-solid fa-image" aria-hidden="true"></i></div>';
    var phone = escapeHtml(item.phone || '');
    return '' +
      '<article class="bs-card" data-id="' + item.id + '">' +
        '<a class="bs-card-img-wrap" href="market-item.html?id=' + item.id + '">' + imgHtml + '</a>' +
        '<a class="bs-card-body" href="market-item.html?id=' + item.id + '">' +
          '<div class="bs-card-title">' + escapeHtml(item.title) + '</div>' +
          '<div class="bs-card-price">' + formatPrice(item.price) + '</div>' +
          '<div class="bs-card-meta"><i class="fa-solid fa-location-dot" aria-hidden="true"></i>' + escapeHtml(item.upazila || '') + '</div>' +
          '<div class="bs-card-meta"><i class="fa-regular fa-calendar" aria-hidden="true"></i>' + formatDate(item.created_at) + '</div>' +
        '</a>' +
        '<div class="bs-card-actions">' +
          '<a class="bs-call-btn" href="tel:' + phone + '"><i class="fa-solid fa-phone" aria-hidden="true"></i> কল করুন</a>' +
          '<a class="bs-wa-btn" href="' + waLink(item.phone, item.title) + '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> WhatsApp</a>' +
        '</div>' +
      '</article>';
  }

  function emptyHtml() {
    return '<div class="bs-state-msg"><i class="fa-regular fa-folder-open" aria-hidden="true"></i>এই ক্যাটাগরিতে এখনো কোনো পণ্য পোস্ট করা হয়নি।<br>প্রথম পোস্টটি আপনিই করুন!</div>';
  }

  function errorHtml() {
    return '<div class="bs-state-msg"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>পণ্য লোড করতে সমস্যা হয়েছে। একটু পর আবার চেষ্টা করুন।</div>';
  }

  // ---------- ডেটা লোড ----------
  function loadProducts(reset) {
    if (loading) return;
    loading = true;
    if (reset) {
      currentOffset = 0;
      gridEl.innerHTML = skeletonHtml(PAGE_SIZE);
      loadMoreWrap.style.display = 'none';
    } else {
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = 'লোড হচ্ছে…';
    }

    var query = client.from('marketplace_listings')
      .select('*', { count: 'exact' })
      .eq('status', 'approved');
    if (currentCat !== 'all') query = query.eq('category', currentCat);
    query
      .order('created_at', { ascending: false })
      .range(currentOffset, currentOffset + PAGE_SIZE - 1)
      .then(function (res) {
        loading = false;
        if (res.error) {
          console.error('marketplace_listings select error:', res.error);
          if (reset) gridEl.innerHTML = errorHtml();
          return;
        }
        var items = res.data || [];
        currentTotal = typeof res.count === 'number' ? res.count : items.length;

        if (reset) {
          if (!items.length) { gridEl.innerHTML = emptyHtml(); loadMoreWrap.style.display = 'none'; return; }
          gridEl.innerHTML = items.map(cardHtml).join('');
        } else {
          gridEl.insertAdjacentHTML('beforeend', items.map(cardHtml).join(''));
          loadMoreBtn.disabled = false;
          loadMoreBtn.textContent = 'আরও দেখুন';
        }

        currentOffset += items.length;
        loadMoreWrap.style.display = (currentOffset < currentTotal) ? 'block' : 'none';
      });
  }

  loadMoreBtn.addEventListener('click', function () { loadProducts(false); });

  renderCatBar();
  loadProducts(true);
})();
