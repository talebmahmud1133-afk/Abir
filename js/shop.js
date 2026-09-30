// টাঙ্গাইল জেলা — দোকান ডিরেক্টরি মডিউল: ব্রাউজ পেজ লজিক
// টেবিল: shops (কলাম: id, name, category, owner_name, phone, whatsapp,
// address, upazila, maps_url, website, facebook, description, hours,
// logo_url, cover_url, images, rating, reviews, verified, status, created_at)
(function () {
  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
  var CATEGORIES = window.TZ_SHOP.CATEGORIES;
  var catMeta = window.TZ_SHOP.catMeta;
  var SAMPLE_SHOPS = window.TZ_SHOP.SAMPLE_SHOPS;
  var SHOW_SAMPLE_SHOPS = window.TZ_SHOP.SHOW_SAMPLE_SHOPS !== false;

  var PAGE_SIZE = 12;

  var catBarEl = document.getElementById('shopCatBar');
  var gridEl = document.getElementById('shopGrid');
  var countEl = document.getElementById('shopCount');
  var loadMoreWrap = document.getElementById('shopLoadMoreWrap');
  var loadMoreBtn = document.getElementById('shopLoadMoreBtn');

  var currentCat = 'all';
  var currentOffset = 0;
  var currentTotal = 0;
  var loading = false;
  var usingSampleData = false;
  var samplesAppended = false;

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // শুধু http/https ছবির লিংক গ্রহণ করে (এস্কেপ করা অবস্থায় ফেরত দেয়)
  function safeUrl(u) {
    u = String(u || '').trim();
    return /^https?:\/\//i.test(u) ? escapeHtml(u) : '';
  }

  // লিংক ঠিক করে: http/https থাকলে যেমন আছে; স্কিম না থাকলে https:// যোগ; অন্য কোনো স্কিম
  // (javascript: ইত্যাদি) হলে বাতিল। এস্কেপ করা অবস্থায় ফেরত দেয়।
  function normUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return escapeHtml(u);
    if (/^[a-z][a-z0-9+.\-]*:/i.test(u)) return '';
    return escapeHtml('https://' + u.replace(/^\/+/, ''));
  }

  function digitsOnly(phone) { return String(phone || '').replace(/\D/g, ''); }

  function waLink(phone, name) {
    var digits = digitsOnly(phone);
    if (!digits) return '';
    if (digits.indexOf('0') === 0) digits = '88' + digits;
    else if (digits.indexOf('880') !== 0) digits = '880' + digits;
    var text = encodeURIComponent('"' + name + '" নিয়ে জানতে চাচ্ছি।');
    return 'https://wa.me/' + digits + '?text=' + text;
  }

  function mapsLink(item) {
    var saved = normUrl(item.maps_url || item.maps);
    if (saved) return saved;
    var q = encodeURIComponent((item.name || '') + ' ' + (item.upazila || '') + ' টাঙ্গাইল');
    return 'https://www.google.com/maps/search/?api=1&query=' + q;
  }

  function starsHtml(rating) {
    return '<i class="fa-solid fa-star" aria-hidden="true"></i> ' + Number(rating || 0).toFixed(1);
  }

  // ---------- ক্যাটাগরি বার রেন্ডার ----------
  function renderCatBar() {
    catBarEl.innerHTML = CATEGORIES.map(function (c) {
      return '<button type="button" class="shop-cat-chip' + (c.slug === currentCat ? ' active' : '') + '" data-slug="' + c.slug + '">' +
        '<span>' + escapeHtml(c.label) + '</span></button>';
    }).join('');
  }
  catBarEl.addEventListener('click', function (e) {
    var chip = e.target.closest('.shop-cat-chip');
    if (!chip) return;
    var slug = chip.getAttribute('data-slug');
    if (slug === currentCat) return;
    currentCat = slug;
    renderCatBar();
    loadShops(true);
  });

  // ---------- কার্ড / স্কেলিটন / এম্পটি স্টেট HTML ----------
  function skeletonHtml(count) {
    var out = '';
    for (var i = 0; i < count; i++) {
      out += '<div class="shop-skel"><div class="shop-skel-img"></div><div class="shop-skel-logo"></div>' +
        '<div class="shop-skel-line"></div><div class="shop-skel-line short"></div></div>';
    }
    return out;
  }

  function cardHtml(item) {
    var cm = catMeta(item.category);
    var phone = escapeHtml(item.phone || '');
    var wa = waLink(item.whatsapp || item.phone, item.name);
    var website = normUrl(item.website);
    var shopLink = website || normUrl(item.facebook);
    var name = escapeHtml(item.name);
    var iconHtml = '<i class="fa-solid ' + cm.icon + '" aria-hidden="true"></i>';

    // ব্যানার (cover_url): কার্ডের উপরের বড় ছবি। ছবি না থাকলে/লোড না হলে ক্যাটাগরির রঙিন ব্যাকগ্রাউন্ড + আইকন।
    var cover = safeUrl(item.cover_url);
    var coverImg = cover
      ? '<img class="shop-card-cover" src="' + cover + '" alt="' + name + '" loading="lazy" onerror="this.remove()">'
      : '';

    // প্রোফাইল ছবি (logo_url): ব্যানারের নিচে গোল করে ওভারল্যাপ করা। না থাকলে ক্যাটাগরি আইকন।
    var logo = safeUrl(item.logo_url);
    var logoImg = logo
      ? '<img src="' + logo + '" alt="" loading="lazy" onerror="this.remove()">'
      : '';

    var verifiedHtml = item.verified
      ? '<span class="shop-verified"><i class="fa-solid fa-circle-check" aria-hidden="true"></i>যাচাইকৃত</span>'
      : '';

    var hasRating = Number(item.rating) > 0;
    var ratingHtml = hasRating
      ? '<span class="shop-rating-chip">' + Number(item.rating).toFixed(1) +
        (item.reviews ? ' <span class="count">(' + Number(item.reviews).toLocaleString('bn-BD') + ')</span>' : '') + '</span>'
      : '<span class="shop-rating-chip is-new">নতুন</span>';

    var actions = '<a class="shop-call-btn" href="tel:' + phone + '"><i class="fa-solid fa-phone" aria-hidden="true"></i> কল করুন</a>' +
      '<a class="shop-map-btn" href="' + mapsLink(item) + '" target="_blank" rel="noopener"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> লোকেশন</a>';
    if (wa) actions += '<a class="shop-wa-btn shop-icon-btn" href="' + wa + '" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i></a>';
    if (website) actions += '<a class="shop-web-btn shop-icon-btn" href="' + website + '" target="_blank" rel="noopener" aria-label="ওয়েবসাইট"><i class="fa-solid fa-globe" aria-hidden="true"></i></a>';

    var place = escapeHtml(item.upazila || '') + ', টাঙ্গাইল';

    return '' +
      '<article class="shop-card" data-id="' + item.id + '">' +
        '<div class="shop-card-img cat-' + cm.slug + '">' +
          '<span class="shop-card-bgicon">' + iconHtml + '</span>' + coverImg + verifiedHtml + ratingHtml +
        '</div>' +
        '<div class="shop-card-head">' +
          '<div class="shop-card-logo cat-' + cm.slug + '">' + iconHtml + logoImg + '</div>' +
          '<div class="shop-card-headtext">' +
            '<h3 class="shop-card-title">' + (shopLink
              ? '<a class="shop-card-title-link" href="' + shopLink + '" target="_blank" rel="noopener">' + name +
                '<i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>'
              : name) + '</h3>' +
            '<span class="shop-card-cat">' + escapeHtml(cm.label) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="shop-card-body">' +
          '<div class="shop-card-meta"><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span>' + place + '</span></div>' +
          '<div class="shop-card-meta"><i class="fa-solid fa-phone" aria-hidden="true"></i><span>' + phone + '</span></div>' +
        '</div>' +
        '<div class="shop-card-actions">' + actions + '</div>' +
      '</article>';
  }

  function emptyHtml() {
    return '<div class="shop-state-msg"><i class="fa-regular fa-folder-open" aria-hidden="true"></i>এই ক্যাটাগরিতে এখনো কোনো দোকান যুক্ত করা হয়নি।<br>প্রথম দোকানটি আপনিই যুক্ত করুন!</div>';
  }

  function errorHtml() {
    return '<div class="shop-state-msg"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>দোকান লোড করতে সমস্যা হয়েছে। একটু পর আবার চেষ্টা করুন।</div>';
  }

  function updateCount(n) {
    if (!countEl) return;
    countEl.innerHTML = '<i class="fa-solid fa-store" aria-hidden="true"></i>সব দোকান (' + Number(n || 0).toLocaleString('bn-BD') + 'টি)';
  }

  // ---------- ডেমো ডেটায় ক্যাটাগরি ফিল্টার (Supabase-এ কোনো অনুমোদিত দোকান না পাওয়া গেলে) ----------
  function filterSampleData() {
    if (!SHOW_SAMPLE_SHOPS) return [];
    var items = SAMPLE_SHOPS.slice();
    if (currentCat !== 'all') items = items.filter(function (s) { return s.category === currentCat; });
    return items;
  }

  // বাস্তব দোকান না থাকলে (বা লোড ব্যর্থ হলে) শুধু নমুনা দোকান দেখায়
  function renderSample() {
    usingSampleData = true;
    var items = filterSampleData();
    updateCount(items.length);
    gridEl.innerHTML = items.length ? items.map(cardHtml).join('') : emptyHtml();
    loadMoreWrap.style.display = 'none';
  }

  // সব বাস্তব দোকান দেখানো হয়ে গেলে, নমুনা দোকানগুলো একবারই শেষে যোগ করে
  function appendSamplesIfDone() {
    if (samplesAppended || currentOffset < currentTotal) return;
    samplesAppended = true;
    var samples = filterSampleData();
    if (samples.length) gridEl.insertAdjacentHTML('beforeend', samples.map(cardHtml).join(''));
  }

  // ---------- ডেটা লোড (Supabase, ব্যর্থ/খালি হলে ডেমো ডেটায় ফলব্যাক) ----------
  function loadShops(reset) {
    if (loading) return;
    loading = true;
    if (reset) {
      currentOffset = 0;
      samplesAppended = false;
      gridEl.innerHTML = skeletonHtml(PAGE_SIZE);
      loadMoreWrap.style.display = 'none';
    } else {
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = 'লোড হচ্ছে…';
    }

    var query = client.from('shops').select('*', { count: 'exact' }).eq('status', 'approved');
    if (currentCat !== 'all') query = query.eq('category', currentCat);
    query = query.order('created_at', { ascending: false });

    query.range(currentOffset, currentOffset + PAGE_SIZE - 1).then(function (res) {
      loading = false;
      if (res.error || !res.data || !res.data.length) {
        if (reset) renderSample();
        else { loadMoreBtn.disabled = false; loadMoreBtn.textContent = 'আরও দেখুন'; }
        return;
      }
      usingSampleData = false;
      var items = res.data;
      currentTotal = typeof res.count === 'number' ? res.count : items.length;

      if (reset) {
        gridEl.innerHTML = items.map(cardHtml).join('');
      } else {
        gridEl.insertAdjacentHTML('beforeend', items.map(cardHtml).join(''));
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'আরও দেখুন';
      }
      currentOffset += items.length;
      updateCount(currentTotal + filterSampleData().length);
      appendSamplesIfDone();
      loadMoreWrap.style.display = (currentOffset < currentTotal) ? 'block' : 'none';
    }).catch(function () {
      loading = false;
      if (reset) renderSample();
    });
  }

  // ---------- ছবি ফুল-স্ক্রিনে দেখা (ব্যানার / প্রোফাইল ছবিতে ট্যাপ করলে) ----------
  var lightbox = null;
  var lightboxImg = null;
  var lightboxCaption = null;

  function buildLightbox() {
    lightbox = document.createElement('div');
    lightbox.className = 'shop-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'ছবি');
    lightbox.innerHTML =
      '<button type="button" class="shop-lightbox-close" aria-label="বন্ধ করুন"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
      '<img class="shop-lightbox-img" alt="">' +
      '<div class="shop-lightbox-caption"></div>';
    document.body.appendChild(lightbox);
    lightboxImg = lightbox.querySelector('.shop-lightbox-img');
    lightboxCaption = lightbox.querySelector('.shop-lightbox-caption');

    // ছবির বাইরে (কালো অংশে) বা ✕ বাটনে ট্যাপ করলে বন্ধ
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightboxImg) return;
      closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
    });
    // ফোনের ব্যাক বাটনে চাপলে পেজ থেকে বেরিয়ে না গিয়ে শুধু ছবি বন্ধ হবে
    window.addEventListener('popstate', function () {
      if (lightbox.classList.contains('open')) hideLightbox();
    });
  }

  function hideLightbox() {
    lightbox.classList.remove('open');
    document.body.classList.remove('shop-lightbox-open');
    lightboxImg.removeAttribute('src');
  }

  function openLightbox(src, caption) {
    if (!lightbox) buildLightbox();
    lightboxImg.src = src;
    lightboxImg.alt = caption || '';
    lightboxCaption.textContent = caption || '';
    lightbox.classList.add('open');
    document.body.classList.add('shop-lightbox-open');
    try { history.pushState({ shopLightbox: true }, ''); } catch (err) {}
  }

  function closeLightbox() {
    if (history.state && history.state.shopLightbox) history.back(); // popstate → hideLightbox()
    else hideLightbox();
  }

  gridEl.addEventListener('click', function (e) {
    var img = e.target.closest('.shop-card-cover, .shop-card-logo img');
    if (!img) return;
    var card = img.closest('.shop-card');
    var titleEl = card && card.querySelector('.shop-card-title');
    openLightbox(img.currentSrc || img.src, titleEl ? titleEl.textContent : '');
  });

  loadMoreBtn.addEventListener('click', function () { loadShops(false); });

  renderCatBar();
  loadShops(true);
})();
