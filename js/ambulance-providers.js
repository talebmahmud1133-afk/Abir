// টাঙ্গাইল অ্যাম্বুলেন্স সার্ভিস — সার্ভিস প্রোভাইডার পেজ লজিক
(function () {
  var PAGE_SIZE = 6;
  var state = {
    query: '',
    upazila: '',
    type: '',
    shown: 0,
  };

  var listEl = document.getElementById('ambProviderList');
  var emptyEl = document.getElementById('ambProviderEmpty');
  var loadingEl = document.getElementById('ambProviderLoading');
  var sentinel = document.getElementById('ambProviderSentinel');
  var countEl = document.getElementById('ambProviderCount');
  var searchInput = document.getElementById('ambSearchInput');
  var upazilaSelect = document.getElementById('ambUpazilaFilter');
  var typeSelect = document.getElementById('ambTypeFilter');

  if (!listEl || !window.AMB_DRIVERS) return;

  // ---- Supabase থেকে অনুমোদিত (approved) প্রোভাইডার লোড করে ডেমো তালিকার সাথে যোগ করা ----
  function avatarFor(name) {
    var initial = (name || '').trim().charAt(0) || '?';
    return 'https://ui-avatars.com/api/?background=159a48&color=fff&bold=true&name=' + encodeURIComponent(initial);
  }
  function mapDbRow(r) {
    return {
      id: r.id,
      name: r.name,
      phone: r.phone,
      upazilaId: r.upazila_id,
      upazila: r.upazila,
      typeId: r.type_id,
      type: r.type,
      rating: Number(r.rating) || 5.0,
      reviews: r.reviews || 0,
      jobs: r.jobs || 0,
      years: r.years || 0,
      online: !!r.online,
      distanceKm: Number(r.distance_km) || 3.0,
      avatar: r.avatar || avatarFor(r.name),
      vehicleNo: r.vehicle_no || '',
      address: r.address || '',
      notes: r.notes || ''
    };
  }
  var favClient = (window.supabase && window.TANGAIL_SUPABASE)
    ? window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key)
    : null;
  if (favClient) {
    favClient.from('ambulance_providers').select('*').eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) return;
        var live = res.data.map(mapDbRow);
        window.AMB_DRIVERS = live.concat(window.AMB_DRIVERS);
        render(true);
      });
  }

  // ---- পছন্দের (ফেভারিট) ড্রাইভার ----
  var favoriteIds = {};
  var favUserId = null;

  function loadFavorites() {
    if (!favClient) return;
    favClient.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (!session) return;
      favUserId = session.user.id;
      favClient.from('ambulance_favorite_drivers').select('driver_id').eq('user_id', favUserId)
        .then(function (r) {
          if (r.error || !r.data) return;
          r.data.forEach(function (row) { favoriteIds[row.driver_id] = true; });
          render(true);
        });
    });
  }
  loadFavorites();

  function applyFavoriteState(driverId, isFav) {
    document.querySelectorAll('[data-fav="' + driverId + '"]').forEach(function (el) {
      if (el.classList.contains('amb-fav-btn')) {
        el.classList.toggle('is-active', isFav);
      } else if (el.id === 'modalFavBtn') {
        el.classList.toggle('amb-btn-red', isFav);
        el.classList.toggle('amb-btn-outline', !isFav);
        el.innerHTML = '<i class="fa-solid fa-heart" aria-hidden="true"></i> ' + (isFav ? 'পছন্দ থেকে সরান' : 'পছন্দে যোগ করুন');
      }
    });
  }

  function toggleFavorite(d, btn) {
    if (!favClient) return;
    if (!favUserId) {
      window.location.href = 'login.html?next=' + encodeURIComponent('ambulance.html?tab=provider');
      return;
    }
    var isFav = !!favoriteIds[d.id];
    if (btn) btn.disabled = true;
    var req = isFav
      ? favClient.from('ambulance_favorite_drivers').delete().eq('user_id', favUserId).eq('driver_id', d.id)
      : favClient.from('ambulance_favorite_drivers').upsert({
          user_id: favUserId,
          driver_id: d.id,
          driver_name: d.name,
          driver_phone: d.phone,
          driver_upazila: d.upazila,
          driver_type: d.type,
          driver_avatar: d.avatar
        }, { onConflict: 'user_id,driver_id' });
    req.then(function (res) {
      if (res.error) return;
      if (isFav) { delete favoriteIds[d.id]; } else { favoriteIds[d.id] = true; }
      applyFavoriteState(d.id, !isFav);
    }).finally(function () { if (btn) btn.disabled = false; });
  }

  // ---- ফিল্টার অপশন বসানো ----
  window.AMB_UPAZILAS.forEach(function (u) {
    var opt = document.createElement('option');
    opt.value = u[0]; opt.textContent = u[1];
    upazilaSelect.appendChild(opt);
  });
  window.AMB_TYPES.forEach(function (t) {
    var opt = document.createElement('option');
    opt.value = t[0]; opt.textContent = t[1];
    typeSelect.appendChild(opt);
  });

  // ---- URL থেকে ?upazila= প্রি-সিলেক্ট ----
  var params = new URLSearchParams(window.location.search);
  var presetUpazila = params.get('upazila');
  if (presetUpazila) {
    upazilaSelect.value = presetUpazila;
    state.upazila = presetUpazila;
  }

  function getFiltered() {
    var q = state.query.trim().toLowerCase();
    return window.AMB_DRIVERS.filter(function (d) {
      if (state.upazila && d.upazilaId !== state.upazila) return false;
      if (state.type && d.typeId !== state.type) return false;
      if (q && d.name.toLowerCase().indexOf(q) === -1 && d.phone.indexOf(q) === -1) return false;
      return true;
    }).sort(function (a, b) {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return b.rating - a.rating;
    });
  }

  function starString(rating) {
    var full = Math.round(rating);
    var out = '';
    for (var i = 0; i < 5; i++) out += '<i class="fa-solid fa-star" aria-hidden="true" style="' + (i < full ? '' : 'opacity:.25') + '"></i>';
    return out;
  }

  function cardHTML(d) {
    return (
      '<article class="amb-provider-card" data-id="' + d.id + '">' +
        '<div class="amb-provider-top">' +
          '<div class="amb-provider-avatar">' +
            '<img src="' + d.avatar + '" alt="' + d.name + '" loading="lazy">' +
            '<span class="amb-status-dot ' + (d.online ? 'online' : 'offline') + '"></span>' +
            '<button type="button" class="amb-fav-btn' + (favoriteIds[d.id] ? ' is-active' : '') + '" data-fav="' + d.id + '" aria-label="পছন্দের তালিকায় যোগ/বাদ দিন" title="পছন্দের তালিকায় যোগ/বাদ দিন"><i class="fa-solid fa-heart" aria-hidden="true"></i></button>' +
          '</div>' +
          '<div class="amb-provider-info">' +
            '<h3>' + d.name + '</h3>' +
            '<div class="amb-provider-rating">' + starString(d.rating) + ' <span>' + d.rating.toFixed(1) + ' (' + d.reviews + ' রিভিউ)</span></div>' +
            '<div class="amb-provider-meta">' +
              '<span><i class="fa-solid fa-location-dot"></i>' + d.upazila + ' থানা</span>' +
              '<span><i class="fa-solid fa-phone"></i>' + d.phone + '</span>' +
              '<span><i class="fa-solid fa-user-clock"></i>' + d.years + ' বছর</span>' +
            '</div>' +
          '</div>' +
          '<span class="amb-badge ' + (d.online ? 'amb-badge-online' : 'amb-badge-offline') + '"><i class="fa-solid fa-circle" style="font-size:6px"></i> ' + (d.online ? 'Online' : 'Offline') + '</span>' +
        '</div>' +
        '<div class="amb-provider-tags">' +
          '<span class="amb-tag">' + d.type + '</span>' +
          '<span class="amb-tag">' + d.jobs + ' সম্পন্ন কাজ</span>' +
          '<button type="button" class="amb-tag amb-tag-btn" data-view="' + d.id + '">প্রোফাইল দেখুন</button>' +
        '</div>' +
        '<div class="amb-provider-actions">' +
          '<a class="amb-icon-btn amb-call" href="tel:' + d.phone + '" onclick="event.stopPropagation()"><i class="fa-solid fa-phone"></i> কল করুন</a>' +
          '<a class="amb-icon-btn amb-whatsapp" href="https://wa.me/88' + d.phone + '" target="_blank" rel="noopener" onclick="event.stopPropagation()"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>' +
        '</div>' +
      '</article>'
    );
  }

  function render(reset) {
    var filtered = getFiltered();
    if (reset) {
      state.shown = 0;
      listEl.innerHTML = '';
    }
    var next = filtered.slice(state.shown, state.shown + PAGE_SIZE);
    next.forEach(function (d) {
      listEl.insertAdjacentHTML('beforeend', cardHTML(d));
    });
    state.shown += next.length;

    countEl.textContent = filtered.length ? ('মোট ' + filtered.length.toLocaleString('bn-BD') + ' জন সার্ভিস প্রোভাইডার পাওয়া গেছে') : '';
    emptyEl.style.display = filtered.length ? 'none' : 'block';
    loadingEl.style.display = state.shown < filtered.length ? 'flex' : 'none';
  }

  function loadMore() {
    var filtered = getFiltered();
    if (state.shown >= filtered.length) return;
    render(false);
  }

  // ---- ইভেন্ট বাইন্ডিং ----
  var searchTimer;
  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      state.query = searchInput.value;
      render(true);
    }, 200);
  });
  upazilaSelect.addEventListener('change', function () {
    state.upazila = upazilaSelect.value;
    render(true);
  });
  typeSelect.addEventListener('change', function () {
    state.type = typeSelect.value;
    render(true);
  });

  // ---- ইনফিনিট স্ক্রল ----
  if ('IntersectionObserver' in window && sentinel) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) loadMore();
      });
    }, { rootMargin: '200px' });
    io.observe(sentinel);
  }

  // ---- প্রোফাইল ডিটেইল পেজ (ambulance-provider-detail.html) — কার্ডে ক্লিক করলে ----
  // বর্তমানে যতগুলো ফিল্টার/সার্চ মিলিয়ে তালিকায় দেখা যাচ্ছে ঠিক সেই ক্রম-সহ একটা
  // "ন্যাভ-কিউ" sessionStorage-এ রেখে দেওয়া হয়, যাতে ডিটেইল পেজে Prev/Next বাটন
  // দিয়ে এই একই তালিকার মধ্যে ব্রাউজ করা যায় — এখানে সব ডেটা (ডেমো + লাইভ) আগে
  // থেকেই মেমোরিতে আছে বলে ডিটেইল পেজে আলাদা করে Supabase কল লাগে না।
  var NAV_KEY = 'ambProviderNavQueue';
  function buildAndStoreNavQueue() {
    var ids = getFiltered().map(function (d) { return d.id; });
    var providers = {};
    window.AMB_DRIVERS.forEach(function (d) { providers[d.id] = d; });
    var payload = { ids: ids, providers: providers };
    try { sessionStorage.setItem(NAV_KEY, JSON.stringify(payload)); } catch (e) {}
    return payload;
  }
  function goToDetail(id) {
    buildAndStoreNavQueue();
    window.location.href = 'ambulance-provider-detail.html?id=' + encodeURIComponent(id);
  }

  listEl.addEventListener('click', function (e) {
    var favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      var fd = window.AMB_DRIVERS.find(function (x) { return x.id === favBtn.getAttribute('data-fav'); });
      if (fd) toggleFavorite(fd, favBtn);
      return;
    }
    var viewBtn = e.target.closest('[data-view]');
    if (viewBtn) { goToDetail(viewBtn.getAttribute('data-view')); return; }
    // কার্ডের অন্য কোথাও ক্লিক করলেও (কল/হোয়াটসঅ্যাপ লিংক ছাড়া) ডিটেইল পেজে যাবে
    var card = e.target.closest('.amb-provider-card');
    if (card && !e.target.closest('a, button')) { goToDetail(card.getAttribute('data-id')); }
  });

  render(true);
})();
