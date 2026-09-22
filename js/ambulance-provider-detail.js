// টাঙ্গাইল অ্যাম্বুলেন্স সার্ভিস — প্রোভাইডার প্রোফাইল ডিটেইল পেজ
// URL-এ ?id=<provider-id> থেকে প্রোফাইল লোড করে।
//
// ডেটা উৎস (দুই ধরনের হতে পারে, তাই দুই ধাপে খোঁজা হয়):
//   ১) sessionStorage-এ 'ambProviderNavQueue' — ambulance.html/ambulance-providers.html-এ
//      কোনো কার্ডে ক্লিক করলে js/ambulance-providers.js এই মুহূর্তে ফিল্টার করা
//      তালিকার সব প্রোভাইডারের সম্পূর্ণ তথ্য (ডেমো + লাইভ, দুটোই) এখানে রেখে দেয় —
//      তাই এখান থেকে পেলে আর নতুন করে নেটওয়ার্ক কল লাগে না, Prev/Next-ও সাথে সাথে কাজ করে।
//   ২) সরাসরি লিংক/শেয়ার করা প্রোফাইলে (queue-তে না থাকলে) Supabase থেকে
//      সরাসরি ওই id দিয়ে fetch করা হয় (শুধু status='approved' লাইভ প্রোভাইডারদের
//      জন্যই কাজ করবে — ডেমো প্রোভাইডার ডাটাবেসে নেই বলে তাদের সরাসরি লিংক
//      শেয়ার করা যায় না, এটা প্রত্যাশিত)।
(function () {
  var NAV_KEY = 'ambProviderNavQueue';

  var loadingEl = document.getElementById('ambdLoading');
  var notFoundEl = document.getElementById('ambdNotFound');
  var contentEl = document.getElementById('ambdContent');
  if (!loadingEl || !contentEl) return;

  function showNotFound() {
    loadingEl.style.display = 'none';
    contentEl.style.display = 'none';
    notFoundEl.style.display = 'block';
  }

  var currentId = new URLSearchParams(window.location.search).get('id');
  if (!currentId) { showNotFound(); return; }

  var client = (window.supabase && window.TANGAIL_SUPABASE)
    ? window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key)
    : null;

  function esc(s) { return (s || '').toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function set(elId, html) { var el = document.getElementById(elId); if (el) el.innerHTML = html; }
  function initial(name) { return (name || '').trim().charAt(0) || '?'; }
  function starString(rating) {
    var full = Math.round(rating || 0);
    var out = '';
    for (var i = 0; i < 5; i++) out += '<i class="fa-solid fa-star" aria-hidden="true" style="' + (i < full ? '' : 'opacity:.25') + '"></i>';
    return out;
  }
  function mapDbRow(r) {
    return {
      id: r.id, name: r.name, phone: r.phone,
      upazilaId: r.upazila_id, upazila: r.upazila,
      typeId: r.type_id, type: r.type,
      rating: Number(r.rating) || 5.0, reviews: r.reviews || 0,
      jobs: r.jobs || 0, years: r.years || 0,
      online: !!r.online, distanceKm: Number(r.distance_km) || 3.0,
      avatar: r.avatar || ('https://ui-avatars.com/api/?background=159a48&color=fff&bold=true&name=' + encodeURIComponent((r.name || '').charAt(0) || '?')),
      vehicleNo: r.vehicle_no || '', address: r.address || '', notes: r.notes || ''
    };
  }

  function infoItem(icon, label, value) {
    if (!value && value !== 0) return '';
    return (
      '<div class="ambd-info-item"><i class="fa-solid ' + icon + '" aria-hidden="true"></i>' +
        '<div><div class="lbl">' + label + '</div><div class="val">' + esc(String(value)) + '</div></div>' +
      '</div>'
    );
  }

  // =====================================================================
  // ন্যাভ-কিউ (Prev/Next)
  // =====================================================================
  var navControlsEl = document.getElementById('ambdNavControls');
  var navCounterEl = document.getElementById('ambdNavCounter');
  var prevBtn = document.getElementById('ambdPrevBtn');
  var nextBtn = document.getElementById('ambdNextBtn');
  var bottomNextWrap = document.getElementById('ambdBottomNext');
  var bottomNextBtn = document.getElementById('ambdBottomNextBtn');
  var navEndEl = document.getElementById('ambdNavEnd');

  var nav = null; // { ids: [...], providers: { id: {...} } }

  function readQueue() {
    try { return JSON.parse(sessionStorage.getItem(NAV_KEY) || 'null'); } catch (e) { return null; }
  }

  function renderNav() {
    if (!nav || !navControlsEl) return;
    var idx = nav.ids.indexOf(currentId);
    if (idx === -1) {
      navControlsEl.style.display = 'none';
      if (bottomNextWrap) bottomNextWrap.style.display = 'none';
      if (navEndEl) navEndEl.style.display = 'none';
      return;
    }
    navControlsEl.style.display = 'flex';
    if (navCounterEl) navCounterEl.textContent = (idx + 1) + ' / ' + nav.ids.length;

    var hasPrev = idx > 0;
    var hasNext = idx < nav.ids.length - 1;
    if (prevBtn) prevBtn.disabled = !hasPrev;
    if (nextBtn) nextBtn.disabled = !hasNext;
    if (bottomNextWrap) bottomNextWrap.style.display = hasNext ? 'block' : 'none';
    if (navEndEl) navEndEl.style.display = (!hasNext && nav.ids.length > 1) ? 'flex' : 'none';
  }

  function goNav(dir) {
    if (!nav) return;
    var idx = nav.ids.indexOf(currentId);
    if (idx === -1) return;
    var targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= nav.ids.length) return;
    var targetId = nav.ids[targetIdx];
    var d = nav.providers[targetId];
    if (!d) return;
    currentId = targetId;
    var url = new URL(window.location.href);
    url.searchParams.set('id', targetId);
    history.pushState({ ambdId: targetId }, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderProfile(d);
  }

  if (prevBtn) prevBtn.addEventListener('click', function () { goNav(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { goNav(1); });
  if (bottomNextBtn) bottomNextBtn.addEventListener('click', function () { goNav(1); });

  window.addEventListener('popstate', function () {
    var idFromUrl = new URLSearchParams(window.location.search).get('id');
    if (!idFromUrl || idFromUrl === currentId) return;
    if (nav && nav.providers[idFromUrl]) {
      currentId = idFromUrl;
      renderProfile(nav.providers[idFromUrl]);
    } else {
      currentId = idFromUrl;
      loadingEl.style.display = 'block';
      contentEl.style.display = 'none';
      notFoundEl.style.display = 'none';
      fetchFromSupabase(idFromUrl);
    }
  });

  // কীবোর্ড (ডেস্কটপ)
  document.addEventListener('keydown', function (e) {
    if (!nav || contentEl.style.display === 'none') return;
    var activeTag = (document.activeElement && document.activeElement.tagName) || '';
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); goNav(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goNav(-1); }
  });

  // সোয়াইপ (মোবাইল)
  (function setupSwipe() {
    var startX = 0, startY = 0, active = false;
    contentEl.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      if (e.target.closest && e.target.closest('a, button, input, textarea, select')) return;
      startX = e.touches[0].clientX; startY = e.touches[0].clientY; active = true;
    }, { passive: true });
    contentEl.addEventListener('touchend', function (e) {
      if (!active) return;
      active = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - startX, dy = t.clientY - startY;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) goNav(dx < 0 ? 1 : -1);
    }, { passive: true });
  })();

  // ব্যাক বাটন
  var backBtn = document.getElementById('ambdBack');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      if (window.history.length > 1) window.history.back();
      else window.location.href = 'ambulance.html';
    });
  }

  // =====================================================================
  // ফেভারিট
  // =====================================================================
  var favBtn = document.getElementById('ambdFavBtn');
  var favUserId = null;
  var isFav = false;
  function loadFavoriteState(d) {
    if (!client || !favBtn) return;
    client.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (!session) return;
      favUserId = session.user.id;
      client.from('ambulance_favorite_drivers').select('id').eq('user_id', favUserId).eq('driver_id', d.id).maybeSingle()
        .then(function (r) {
          isFav = !!(r && r.data);
          favBtn.classList.toggle('is-active', isFav);
        });
    });
  }
  function setupFavoriteButton(d) {
    if (!favBtn) return;
    var clone = favBtn.cloneNode(true);
    favBtn.parentNode.replaceChild(clone, favBtn);
    favBtn = clone;
    isFav = false;
    favBtn.classList.remove('is-active');
    favBtn.addEventListener('click', function () {
      if (!client) return;
      if (!favUserId) { window.location.href = 'login.html?next=ambulance.html'; return; }
      favBtn.disabled = true;
      var req = isFav
        ? client.from('ambulance_favorite_drivers').delete().eq('user_id', favUserId).eq('driver_id', d.id)
        : client.from('ambulance_favorite_drivers').upsert({
            user_id: favUserId, driver_id: d.id, driver_name: d.name, driver_phone: d.phone,
            driver_upazila: d.upazila, driver_type: d.type, driver_avatar: d.avatar
          }, { onConflict: 'user_id,driver_id' });
      req.then(function (res) {
        if (res.error) return;
        isFav = !isFav;
        favBtn.classList.toggle('is-active', isFav);
      }).finally(function () { favBtn.disabled = false; });
    });
    loadFavoriteState(d);
  }

  // =====================================================================
  // কন্টাক্ট রিভিল
  // =====================================================================
  function setupContactReveal(d) {
    var pairs = [
      { lockedEl: 'ambdContactLocked', btnEl: 'ambdContactBtn', revealedEl: 'ambdContactRevealed', numEl: 'ambdPhoneNum', callEl: 'ambdCallBtn', waEl: 'ambdWhatsappBtn' },
      { lockedEl: 'ambdContactLockedSb', btnEl: 'ambdContactBtnSb', revealedEl: 'ambdContactRevealedSb', numEl: 'ambdPhoneNumSb', callEl: 'ambdCallBtnSb', waEl: 'ambdWhatsappBtnSb' }
    ];
    pairs.forEach(function (grp) {
      var lockedEl = document.getElementById(grp.lockedEl);
      var btnEl = document.getElementById(grp.btnEl);
      var revealedEl = document.getElementById(grp.revealedEl);
      if (lockedEl) lockedEl.style.display = '';
      if (btnEl) {
        var clone = btnEl.cloneNode(true);
        btnEl.parentNode.replaceChild(clone, btnEl);
        clone.style.display = '';
        clone.disabled = false;
      }
      if (revealedEl) revealedEl.classList.remove('is-shown');
    });

    function applyReveal() {
      var waNumber = (d.phone || '').replace(/[^0-9]/g, '');
      if (waNumber.indexOf('88') !== 0) waNumber = '88' + waNumber;
      pairs.forEach(function (grp) {
        var lockedEl = document.getElementById(grp.lockedEl);
        var btnEl = document.getElementById(grp.btnEl);
        var revealedEl = document.getElementById(grp.revealedEl);
        var numEl = document.getElementById(grp.numEl);
        var callEl = document.getElementById(grp.callEl);
        var waEl = document.getElementById(grp.waEl);
        if (lockedEl) lockedEl.style.display = 'none';
        if (btnEl) btnEl.style.display = 'none';
        if (revealedEl) revealedEl.classList.add('is-shown');
        if (numEl) numEl.textContent = d.phone;
        if (callEl) callEl.href = 'tel:+' + waNumber;
        if (waEl) waEl.href = 'https://wa.me/' + waNumber;
      });
    }
    pairs.forEach(function (grp) {
      var btnEl = document.getElementById(grp.btnEl);
      if (btnEl) btnEl.addEventListener('click', applyReveal);
    });
  }

  // =====================================================================
  // রেন্ডার
  // =====================================================================
  function renderProfile(d) {
    document.title = d.name + ' — প্রোভাইডার প্রোফাইল — টাঙ্গাইল অ্যাম্বুলেন্স সার্ভিস';
    set('ambdPageTitle', esc(document.title));

    var descEl = document.querySelector('meta[name="description"]');
    var desc = d.name + ' — ' + (d.type || '') + ', ' + (d.upazila || '') + ' থানা — যাচাইকৃত অ্যাম্বুলেন্স সার্ভিস প্রোভাইডার।';
    if (descEl) descEl.setAttribute('content', desc);

    var photoEl = document.getElementById('ambdPhoto');
    if (photoEl) {
      if (d.avatar) photoEl.innerHTML = '<img src="' + esc(d.avatar) + '" alt="' + esc(d.name) + '">';
      else photoEl.textContent = initial(d.name);
      photoEl.insertAdjacentHTML('beforeend', '<span class="ambd-status-dot ' + (d.online ? 'online' : 'offline') + '" title="' + (d.online ? 'Online' : 'Offline') + '"></span>');
    }

    set('ambdName', esc(d.name));
    set('ambdRating', starString(d.rating) + ' <span>' + (Number(d.rating) || 0).toFixed(1) + ' (' + (d.reviews || 0) + ' রিভিউ)</span>');

    var bits = [];
    bits.push('<span><i class="fa-solid fa-truck-medical" aria-hidden="true"></i> ' + esc(d.type || '') + '</span>');
    if (d.upazila) bits.push('<span><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ' + esc(d.upazila) + ' থানা</span>');
    bits.push('<span class="amb-badge ' + (d.online ? 'amb-badge-online' : 'amb-badge-offline') + '"><i class="fa-solid fa-circle" style="font-size:6px"></i> ' + (d.online ? 'Online' : 'Offline') + '</span>');
    set('ambdTag', bits.join(''));

    set('ambdInfoGrid',
      infoItem('fa-briefcase', 'অভিজ্ঞতা', d.years ? (d.years + ' বছর') : '') +
      infoItem('fa-check-double', 'সম্পন্ন কাজ', d.jobs) +
      infoItem('fa-route', 'দূরত্ব', d.distanceKm ? (d.distanceKm + ' কিমি') : '') +
      infoItem('fa-truck-medical', 'অ্যাম্বুলেন্স টাইপ', d.type) +
      infoItem('fa-location-dot', 'থানা', d.upazila) +
      infoItem('fa-id-card', 'গাড়ির নম্বর', d.vehicleNo) +
      infoItem('fa-map-pin', 'সার্ভিস এলাকা', d.address)
    );

    var aboutCard = document.getElementById('ambdAboutCard');
    if (d.notes) { set('ambdAbout', esc(d.notes)); aboutCard.style.display = 'block'; }
    else if (aboutCard) { aboutCard.style.display = 'none'; }

    loadingEl.style.display = 'none';
    notFoundEl.style.display = 'none';
    contentEl.style.display = 'block';

    setupContactReveal(d);
    setupFavoriteButton(d);
    renderNav();
  }

  // =====================================================================
  // ডেটা ফেচ
  // =====================================================================
  function fetchFromSupabase(id) {
    if (!client) { showNotFound(); return; }
    client.from('ambulance_providers').select('*').eq('id', id).eq('status', 'approved').maybeSingle()
      .then(function (res) {
        var row = res && res.data;
        if (!row) { showNotFound(); return; }
        var d = mapDbRow(row);
        nav = { ids: [d.id], providers: {} };
        nav.providers[d.id] = d;
        renderProfile(d);
      })
      .catch(function () { showNotFound(); });
  }

  var queue = readQueue();
  if (queue && queue.providers && queue.providers[currentId]) {
    nav = queue;
    renderProfile(queue.providers[currentId]);
  } else {
    fetchFromSupabase(currentId);
  }
})();
