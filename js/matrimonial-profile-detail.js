// টাঙ্গাইল জেলা — পাত্র-পাত্রী প্রোফাইল ডিটেইল পেজ (ধাপ ৮ + পরবর্তী/পূর্ববর্তী নেভিগেশন)
// URL-এ ?id=<profile-id> থেকে matrimonial_profiles টেবিলের status='approved' প্রোফাইল লোড করে।
// ফোন নম্বর প্রাথমিক লোডে আনা হয় না (কলামভিত্তিক select) — "যোগাযোগের অনুরোধ করুন" বাটনে
// ক্লিক করলে আলাদা কোয়েরি দিয়ে শুধু phone কলাম এনে দেখানো হয়।
//
// পরবর্তী/পূর্ববর্তী নেভিগেশন:
// matrimonial.html থেকে কোনো কার্ডে ক্লিক করলে js/matrimonial-profiles.js সেই কলামের
// (gender + filter) লোড হওয়া id-গুলোর একটা "সারি" sessionStorage-এ ('matriNavQueue') রেখে দেয়।
// এই পেজ সেই সারি পড়ে Prev/Next বাটন চালায় — পুরো পেজ রিলোড না করে fetch+re-render করে,
// এবং সারির শেষে পৌঁছালে (hasMore থাকলে) matrimonial.html-এর মতো একই অর্ডার/ফিল্টার দিয়ে
// পরের ৬টা আইডি টেনে আনে। সরাসরি লিংক/শেয়ার করা প্রোফাইলে সারি না থাকলে,
// একই জেন্ডারের ডিফল্ট ("latest") তালিকা থেকে একটা fallback সারি নিজে তৈরি করে নেয়।
// শুধুমাত্র matrimonial-profile.html-এই লোড হয়, অন্য কোনো পেজ প্রভাবিত হয় না।
(function () {
  var PUBLIC_FIELDS = 'id, profile_code, gender, full_name, age, religion, education, occupation, thana, district, photo_url, about, family_info, is_verified, view_count';
  var NAV_PAGE_SIZE = 6;
  var NAV_KEY = 'matriNavQueue';

  var loadingEl = document.getElementById('mtpLoading');
  var notFoundEl = document.getElementById('mtpNotFound');
  var contentEl = document.getElementById('mtpContent');
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
  if (!client) { showNotFound(); return; }

  function esc(s) { return (s || '').toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function set(elId, text) { var el = document.getElementById(elId); if (el) el.textContent = text; }
  function initial(name) { return (name || '').trim().charAt(0) || '?'; }

  var GENDER_LABEL = { male: 'পাত্র', female: 'পাত্রী' };

  function infoItem(icon, label, value) {
    if (!value) return '';
    return (
      '<div class="mtp-info-item"><i class="fa-solid ' + icon + '" aria-hidden="true"></i>' +
        '<div><div class="lbl">' + label + '</div><div class="val">' + esc(value) + '</div></div>' +
      '</div>'
    );
  }

  // =====================================================================
  // পরবর্তী/পূর্ববর্তী প্রোফাইল সারি (nav queue)
  // =====================================================================
  var navControlsEl = document.getElementById('mtpNavControls');
  var navCounterEl = document.getElementById('mtpNavCounter');
  var prevBtn = document.getElementById('mtpPrevBtn');
  var nextBtn = document.getElementById('mtpNextBtn');
  var bottomNextWrap = document.getElementById('mtpBottomNext');
  var bottomNextBtn = document.getElementById('mtpBottomNextBtn');
  var navEndEl = document.getElementById('mtpNavEnd');
  var transitionOverlay = document.getElementById('mtpTransitionOverlay');

  // nav = { gender, filter, ids: [...], hasMore }
  var nav = null;
  var navFetching = false;      // পরের পাতার আইডি আনার জন্য (pagination) fetch চলছে
  var transitioning = false;    // একটা প্রোফাইল থেকে আরেকটায় সরার fetch চলছে
  var fetchSeq = 0;             // একসাথে একাধিক ফেচ হলে পুরনোটা যেন নতুনটাকে ওভাররাইট না করে

  function showTransition(on) {
    transitioning = on;
    if (transitionOverlay) transitionOverlay.classList.toggle('is-active', on);
    renderNav();
  }

  function readStoredQueue() {
    try { return JSON.parse(sessionStorage.getItem(NAV_KEY) || 'null'); } catch (e) { return null; }
  }
  function persistQueue() {
    if (!nav) return;
    try { sessionStorage.setItem(NAV_KEY, JSON.stringify(nav)); } catch (e) {}
  }

  // matrimonial.html-এর js/matrimonial-profiles.js-এর buildQuery()-এর সাথে হুবহু মিল রেখে
  // (নাহলে "পরের পাতা" আনলে ক্রম বদলে যাবে)
  function buildListQuery(gender, filter, offset) {
    var q = client.from('matrimonial_profiles').select('id').eq('gender', gender).eq('status', 'approved');
    if (filter === 'verified') q = q.eq('is_verified', true);
    if (filter === 'popular') {
      q = q.order('view_count', { ascending: false }).order('created_at', { ascending: false });
    } else {
      q = q.order('is_featured', { ascending: false }).order('sort_order', { ascending: true }).order('created_at', { ascending: false });
    }
    return q.range(offset, offset + NAV_PAGE_SIZE - 1);
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
    if (navCounterEl) navCounterEl.textContent = (idx + 1) + ' / ' + nav.ids.length + (nav.hasMore ? '+' : '');

    var hasPrev = idx > 0;
    var hasNext = (idx < nav.ids.length - 1) || nav.hasMore;
    var busy = navFetching || transitioning;
    if (prevBtn) prevBtn.disabled = !hasPrev || busy;
    if (nextBtn) nextBtn.disabled = !hasNext || busy;

    if (bottomNextWrap) {
      bottomNextWrap.style.display = hasNext ? 'block' : 'none';
      if (bottomNextBtn) bottomNextBtn.disabled = busy;
    }
    // তালিকার শেষে পৌঁছালে (hasMore নেই আর) একটা বন্ধুত্বপূর্ণ শেষ-বার্তা দেখানো হয়
    if (navEndEl) navEndEl.style.display = (!hasNext && nav.ids.length > 1) ? 'flex' : 'none';
  }

  // dir: +1 (পরবর্তী) / -1 (পূর্ববর্তী) / 0 (সরাসরি লিংক, প্রথম লোড) — auto-skip লজিকের জন্য দরকার
  function navigateToId(id, dir, fallbackId) {
    showTransition(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchAndRenderProfile(id, false, dir, fallbackId, true);
  }

  function goNav(dir) {
    if (!nav || navFetching || transitioning) return;
    var idx = nav.ids.indexOf(currentId);
    if (idx === -1) return;
    var targetIdx = idx + dir;
    var fallbackId = currentId; // এই আইডি খারাপ বের হলে এখান থেকে আবার চেষ্টা হবে

    if (targetIdx >= 0 && targetIdx < nav.ids.length) {
      persistQueue();
      navigateToId(nav.ids[targetIdx], dir, fallbackId);
      return;
    }
    if (targetIdx >= nav.ids.length && nav.hasMore) {
      navFetching = true;
      renderNav();
      buildListQuery(nav.gender, nav.filter, nav.ids.length).then(function (res) {
        navFetching = false;
        var rows = (res && res.data) || [];
        rows.forEach(function (r) { if (nav.ids.indexOf(r.id) === -1) nav.ids.push(r.id); });
        nav.hasMore = rows.length === NAV_PAGE_SIZE;
        persistQueue();
        if (targetIdx < nav.ids.length) {
          navigateToId(nav.ids[targetIdx], dir, fallbackId);
        } else {
          renderNav();
        }
      }, function () {
        navFetching = false;
        renderNav();
      });
      return;
    }
    // পেছনের দিকে সারির বাইরে গেলে কিছু করার নেই
  }

  function setupNavControls() {
    if (prevBtn) prevBtn.addEventListener('click', function () { goNav(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goNav(1); });
    if (bottomNextBtn) bottomNextBtn.addEventListener('click', function () { goNav(1); });
  }
  setupNavControls();

  // কীবোর্ড (ডেস্কটপ): ← / → দিয়ে পূর্ববর্তী/পরবর্তী প্রোফাইল
  document.addEventListener('keydown', function (e) {
    if (!nav || contentEl.style.display === 'none') return;
    var activeTag = (document.activeElement && document.activeElement.tagName) || '';
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); goNav(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goNav(-1); }
  });

  // সোয়াইপ (মোবাইল): বাঁয়ে সোয়াইপ = পরবর্তী, ডানে সোয়াইপ = পূর্ববর্তী
  (function setupSwipe() {
    var startX = 0, startY = 0, active = false;
    contentEl.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      if (e.target.closest && e.target.closest('a, button, input, textarea, select')) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      active = true;
    }, { passive: true });
    contentEl.addEventListener('touchend', function (e) {
      if (!active) return;
      active = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - startX;
      var dy = t.clientY - startY;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) {
        goNav(dx < 0 ? 1 : -1);
      }
    }, { passive: true });
  })();

  // ব্রাউজারের Back/Forward বাটনে সারির সাথে সিঙ্ক রাখা
  window.addEventListener('popstate', function () {
    var idFromUrl = new URLSearchParams(window.location.search).get('id');
    if (idFromUrl && idFromUrl !== currentId) {
      showTransition(true);
      fetchAndRenderProfile(idFromUrl, false, 0, currentId, false);
    }
  });

  function ensureNavQueue(profile) {
    var stored = readStoredQueue();
    if (stored && stored.gender === profile.gender && stored.ids && stored.ids.indexOf(profile.id) !== -1) {
      nav = stored;
      renderNav();
      return;
    }
    // ফলব্যাক: সরাসরি লিংক/শেয়ার করা প্রোফাইল — একই জেন্ডারের ডিফল্ট ("সর্বশেষ") ক্রম থেকে
    // একটা নতুন সারি তৈরি করে, বর্তমান প্রোফাইলকে সবার আগে রেখে দেওয়া হয়
    nav = { gender: profile.gender, filter: 'latest', ids: [profile.id], hasMore: true };
    renderNav();
    buildListQuery(profile.gender, 'latest', 0).then(function (res) {
      var rows = (res && res.data) || [];
      var ids = rows.map(function (r) { return r.id; });
      if (ids.indexOf(profile.id) === -1) ids.unshift(profile.id);
      nav.ids = ids;
      nav.hasMore = rows.length === NAV_PAGE_SIZE;
      persistQueue();
      renderNav();
    }, function () { /* ব্যর্থ হলে শুধু বর্তমান প্রোফাইলই সারিতে থাকবে, Next/Prev নিষ্ক্রিয় থাকবে */ });
  }

  // =====================================================================
  // প্রোফাইল রেন্ডার
  // =====================================================================
  function updateShareMeta(p, desc) {
    var descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute('content', desc);
    var ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (ogTitleEl) ogTitleEl.setAttribute('content', document.title);
    var ogDescEl = document.querySelector('meta[property="og:description"]');
    if (ogDescEl) ogDescEl.setAttribute('content', desc);
    var ogImageEl = document.querySelector('meta[property="og:image"]');
    if (ogImageEl && p.photo_url) ogImageEl.setAttribute('content', p.photo_url);
  }

  function renderProfile(p) {
    document.title = p.full_name + ' — প্রোফাইল — পাত্র-পাত্রী — টাঙ্গাইল জেলা';
    set('mtpPageTitle', document.title);

    var descBits = [GENDER_LABEL[p.gender] || ''];
    if (p.age) descBits.push(p.age + ' বছর');
    if (p.education) descBits.push(p.education);
    if (p.thana) descBits.push(p.thana + ', ' + (p.district || 'টাঙ্গাইল'));
    updateShareMeta(p, descBits.join(', ') + ' — যাচাইকৃত পাত্র-পাত্রী প্রোফাইল, টাঙ্গাইল জেলা।');

    contentEl.classList.remove('mtp-male', 'mtp-female');
    contentEl.classList.add(p.gender === 'male' ? 'mtp-male' : 'mtp-female');

    var photoEl = document.getElementById('mtpPhoto');
    if (photoEl) {
      if (p.photo_url) {
        photoEl.innerHTML = '<img src="' + esc(p.photo_url) + '" alt="' + esc(p.full_name) + '">';
      } else {
        photoEl.textContent = initial(p.full_name);
      }
      if (p.is_verified) {
        photoEl.insertAdjacentHTML('beforeend', '<span class="mtp-verified-badge" title="ভেরিফাইড"><i class="fa-solid fa-check" aria-hidden="true"></i></span>');
      }
    }

    set('mtpName', p.full_name);

    var tagEl = document.getElementById('mtpTag');
    if (tagEl) {
      var bits = [];
      bits.push('<span><i class="fa-solid ' + (p.gender === 'male' ? 'fa-mars' : 'fa-venus') + '" aria-hidden="true"></i> ' + (GENDER_LABEL[p.gender] || '') + '</span>');
      if (p.age) bits.push('<span><i class="fa-solid fa-cake-candles" aria-hidden="true"></i> ' + esc(p.age) + ' বছর</span>');
      if (p.thana) bits.push('<span><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ' + esc(p.thana) + ', ' + esc(p.district || 'টাঙ্গাইল') + '</span>');
      tagEl.innerHTML = bits.join('');
    }

    set('mtpProfileId', 'প্রোফাইল আইডি: ' + (p.profile_code || '—'));

    var gridEl = document.getElementById('mtpInfoGrid');
    if (gridEl) {
      gridEl.innerHTML =
        infoItem('fa-cake-candles', 'বয়স', p.age ? (p.age + ' বছর') : '') +
        infoItem('fa-hands-praying', 'ধর্ম', p.religion) +
        infoItem('fa-graduation-cap', 'শিক্ষা', p.education) +
        infoItem('fa-briefcase', 'পেশা', p.occupation) +
        infoItem('fa-location-dot', 'থানা', p.thana) +
        infoItem('fa-map', 'জেলা', p.district || 'টাঙ্গাইল');
    }

    var aboutCard = document.getElementById('mtpAboutCard');
    if (p.about) { set('mtpAbout', p.about); aboutCard.style.display = 'block'; }
    else if (aboutCard) { aboutCard.style.display = 'none'; }

    var familyCard = document.getElementById('mtpFamilyCard');
    if (p.family_info) { set('mtpFamily', p.family_info); familyCard.style.display = 'block'; }
    else if (familyCard) { familyCard.style.display = 'none'; }

    loadingEl.style.display = 'none';
    notFoundEl.style.display = 'none';
    contentEl.style.display = 'block';

    // ভিউ কাউন্ট (best-effort, ব্যর্থ হলেও পেজের কার্যকারিতায় প্রভাব নেই)
    client.from('matrimonial_profiles').update({ view_count: (p.view_count || 0) + 1 }).eq('id', p.id).then(function () {}, function () {});

    setupContactRequest(p.id);

    // নেভিগেশন সারি বসানো/হালনাগাদ করা
    if (nav && nav.gender === p.gender && nav.ids.indexOf(p.id) !== -1) {
      renderNav();
    } else {
      ensureNavQueue(p);
    }
  }

  function setupContactRequest(profileId) {
    var pairs = [
      { lockedEl: 'mtpContactLocked', btnEl: 'mtpContactBtn', revealedEl: 'mtpContactRevealed', numEl: 'mtpPhoneNum', callEl: 'mtpCallBtn', waEl: 'mtpWhatsappBtn' },
      { lockedEl: 'mtpContactLockedSb', btnEl: 'mtpContactBtnSb', revealedEl: 'mtpContactRevealedSb', numEl: 'mtpPhoneNumSb', callEl: 'mtpCallBtnSb', waEl: 'mtpWhatsappBtnSb' }
    ];

    // প্রোফাইল বদলালে আগের "revealed" অবস্থাটা রিসেট করে দেওয়া হয় (contact তথ্য যেন ভুল প্রোফাইলে না থাকে)
    pairs.forEach(function (grp) {
      var lockedEl = document.getElementById(grp.lockedEl);
      var btnEl = document.getElementById(grp.btnEl);
      var revealedEl = document.getElementById(grp.revealedEl);
      if (lockedEl) lockedEl.style.display = '';
      if (btnEl) { btnEl.style.display = ''; btnEl.disabled = false; btnEl.innerHTML = '<i class="fa-solid fa-phone" aria-hidden="true"></i> যোগাযোগের অনুরোধ করুন'; }
      if (revealedEl) revealedEl.classList.remove('is-shown');
    });

    var revealedPhone = null;
    var fetching = false;

    function applyReveal(phone) {
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

        var waNumber = (phone || '').replace(/[^0-9]/g, '');
        if (waNumber.indexOf('0') === 0) waNumber = '88' + waNumber;
        else if (waNumber.indexOf('88') !== 0) waNumber = '88' + waNumber;

        if (numEl) numEl.textContent = phone;
        if (callEl) callEl.href = 'tel:+' + waNumber;
        if (waEl) waEl.href = 'https://wa.me/' + waNumber;
      });
    }

    function handleClick() {
      if (fetching) return;
      if (revealedPhone) { applyReveal(revealedPhone); return; }

      fetching = true;
      pairs.forEach(function (grp) {
        var btnEl = document.getElementById(grp.btnEl);
        if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> লোড হচ্ছে…'; }
      });

      client.from('matrimonial_profiles').select('phone').eq('id', profileId).eq('status', 'approved').maybeSingle()
        .then(function (res) {
          fetching = false;
          var phone = res && res.data && res.data.phone;
          if (!phone) {
            pairs.forEach(function (grp) {
              var btnEl = document.getElementById(grp.btnEl);
              if (btnEl) { btnEl.innerHTML = '<i class="fa-solid fa-phone" aria-hidden="true"></i> ফোন নম্বর যোগ করা হয়নি'; btnEl.disabled = true; }
            });
            return;
          }
          revealedPhone = phone;
          applyReveal(phone);
        })
        .catch(function () {
          fetching = false;
          pairs.forEach(function (grp) {
            var btnEl = document.getElementById(grp.btnEl);
            if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = '<i class="fa-solid fa-phone" aria-hidden="true"></i> যোগাযোগের অনুরোধ করুন'; }
          });
        });
    }

    pairs.forEach(function (grp) {
      var btnEl = document.getElementById(grp.btnEl);
      if (btnEl) {
        var clone = btnEl.cloneNode(true); // আগের ক্লিক-লিসেনার ঝেড়ে ফেলা (প্রোফাইল বদলানোর সময় ডুপ্লিকেট এড়াতে)
        btnEl.parentNode.replaceChild(clone, btnEl);
        clone.addEventListener('click', handleClick);
      }
    });
  }

  // =====================================================================
  // ডেটা ফেচ
  // =====================================================================
  // dir/fallbackId শুধু নেভিগেশনের সময় পাঠানো হয় (prev/next ক্লিকে) — প্রোফাইলটা ততক্ষণে
  // ডিলিট/আনঅ্যাপ্রুভড হয়ে গেলে fallbackId থেকে একই দিকে (dir) পরেরটায় নীরবে সরে যাওয়ার জন্য।
  function fetchAndRenderProfile(id, isFirstLoad, dir, fallbackId, pushHistory) {
    var mySeq = ++fetchSeq;
    if (isFirstLoad) {
      loadingEl.style.display = 'block';
      contentEl.style.display = 'none';
      notFoundEl.style.display = 'none';
    }
    client.from('matrimonial_profiles').select(PUBLIC_FIELDS).eq('id', id).eq('status', 'approved').maybeSingle()
      .then(function (res) {
        if (mySeq !== fetchSeq) return; // এর মধ্যে আরেকটা ফেচ শুরু হয়ে গেছে, এটা বাতিল
        var p = res && res.data;

        if (!p) {
          if (isFirstLoad || !dir) { showTransition(false); showNotFound(); return; }
          // নেভিগেট করার সময় প্রোফাইলটা পাওয়া গেল না (মুছে গেছে/অ্যাপ্রুভাল বাতিল) —
          // সারি থেকে বাদ দিয়ে চুপচাপ একই দিকে পরেরটায় চলে যাওয়া
          if (nav) {
            var badIdx = nav.ids.indexOf(id);
            if (badIdx !== -1) nav.ids.splice(badIdx, 1);
            persistQueue();
          }
          currentId = fallbackId;
          showTransition(false);
          goNav(dir);
          return;
        }

        currentId = p.id;
        if (pushHistory) {
          var url = new URL(window.location.href);
          url.searchParams.set('id', p.id);
          history.pushState({ mtpId: p.id }, '', url.toString());
        }
        renderProfile(p);
        showTransition(false);
      })
      .catch(function () {
        if (mySeq !== fetchSeq) return;
        showTransition(false);
        if (isFirstLoad) showNotFound();
      });
  }

  fetchAndRenderProfile(currentId, true, 0, null, false);
})();
