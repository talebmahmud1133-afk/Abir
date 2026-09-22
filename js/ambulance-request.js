// টাঙ্গাইল অ্যাম্বুলেন্স সার্ভিস — রিকোয়েস্ট ফর্ম + লাইভ ফিড লজিক
(function () {
  var STORAGE_KEY = 'ambRequests';
  var listEl = document.getElementById('ambRequestList');
  var emptyEl = document.getElementById('ambRequestEmpty');
  var tabBtns = document.querySelectorAll('.amb-tab');
  var form = document.getElementById('ambRequestForm');
  if (!listEl || !window.AMB_REQUESTS_SEED) return;

  var state = { tab: 'new' };

  // ---- লোড / সেভ (লোকাল স্টোরেজে ডেমো পারসিস্টেন্স) ----
  function loadRequests() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return window.AMB_REQUESTS_SEED.slice();
  }
  function saveRequests(list) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }

  var requests = loadRequests();

  // ---- লগইন করা থাকলে রিকোয়েস্টটা Supabase-এ (আমার রিকোয়েস্ট হিস্ট্রি হিসেবে) সেভ হবে ----
  // লগইন না থাকলে এই অংশ চুপচাপ স্কিপ হয়ে যায় — ফর্ম আগের মতোই লোকাল ডেমো ফিডে কাজ করে।
  var reqSupaClient = (window.supabase && window.TANGAIL_SUPABASE)
    ? window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key)
    : null;

  // ---- অ্যাডমিন কিনা যাচাই (গ্রহণ/সম্পন্ন বাটন শুধু অ্যাডমিন দেখতে পাবেন) ----
  var isAdmin = false;
  function checkAdmin() {
    if (!reqSupaClient) return;
    reqSupaClient.rpc('is_admin').then(function (res) {
      if (!res.error && res.data) { isAdmin = true; render(); }
    });
  }

  // ---- শেয়ার্ড লাইভ ফিড: Supabase থেকে সবার রিকোয়েস্ট লোড করে ডেমো ফিডের সাথে যোগ করা ----
  function mapServiceRow(r) {
    return {
      id: r.id,
      patientName: r.patient_name,
      phone: r.phone,
      pickup: r.pickup,
      destination: r.destination,
      level: r.level,
      typeId: r.type_id,
      type: r.type_label,
      datetime: r.date_label,
      notes: r.notes || '',
      distanceKm: Number(r.distance_km) || 3.0,
      status: r.status,
      createdAt: new Date(r.created_at).getTime(),
      isLive: true
    };
  }
  function loadLiveRequests() {
    if (!reqSupaClient) return;
    reqSupaClient.from('ambulance_service_requests').select('*')
      .order('created_at', { ascending: false })
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) return;
        requests = res.data.map(mapServiceRow).concat(requests);
        render();
      });
  }

  function syncRequestToHistory(r) {
    if (!reqSupaClient) return;
    reqSupaClient.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (!session) return; // অতিথি হিসেবে সাবমিট করলে হিস্ট্রি সেভ হবে না
      reqSupaClient.from('ambulance_requests').insert({
        user_id: session.user.id,
        patient_name: r.patientName,
        phone: r.phone,
        pickup: r.pickup,
        destination: r.destination,
        level: r.level,
        type_id: r.typeId,
        type_label: r.type,
        notes: r.notes,
        date_label: r.datetime,
        distance_km: r.distanceKm,
        status: 'new'
      }); // ব্যর্থ হলেও ফর্মের বাকি কাজে সমস্যা নেই — চুপচাপ উপেক্ষা করা হয়
    });
  }

  // ---- শেয়ার্ড লাইভ ফিডে (সবাই দেখতে পাবে এমন) রিকোয়েস্টটা সেভ করা — অতিথি/লগইন যেকোনো অবস্থাতেই ----
  function syncRequestToServiceFeed(r, localId) {
    if (!reqSupaClient) return;
    reqSupaClient.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      reqSupaClient.from('ambulance_service_requests').insert({
        user_id: session ? session.user.id : null,
        patient_name: r.patientName,
        phone: r.phone,
        pickup: r.pickup,
        destination: r.destination,
        level: r.level,
        type_id: r.typeId,
        type_label: r.type,
        notes: r.notes,
        date_label: r.datetime,
        distance_km: r.distanceKm,
        status: 'new'
      }).select().single().then(function (ins) {
        if (ins.error || !ins.data) return; // ব্যর্থ হলেও লোকাল ডেমো এন্ট্রি থেকেই যাবে
        // লাইভ রো-এর আসল id দিয়ে লোকাল কপিটা প্রতিস্থাপন — যাতে অ্যাডমিন পরে এটা গ্রহণ/সম্পন্ন করতে পারেন
        var local = requests.find(function (x) { return x.id === localId; });
        if (local) {
          local.id = ins.data.id;
          local.isLive = true;
          saveRequests(requests);
          render();
        }
      });
    });
  }

  // ---- ফিল্টার সিলেক্ট বসানো (রিকোয়েস্ট টাইপ) ----
  var typeSelect = document.getElementById('reqType');
  var levelSelect = document.getElementById('reqLevel');
  if (typeSelect && window.AMB_TYPES) {
    window.AMB_TYPES.forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = t[0]; opt.textContent = t[1];
      typeSelect.appendChild(opt);
    });
  }
  if (levelSelect && window.AMB_LEVELS) {
    window.AMB_LEVELS.forEach(function (l) {
      var opt = document.createElement('option');
      opt.value = l[0]; opt.textContent = l[1];
      levelSelect.appendChild(opt);
    });
    levelSelect.addEventListener('change', function () {
      levelSelect.classList.remove('amb-level-critical', 'amb-level-serious', 'amb-level-normal');
      if (levelSelect.value) levelSelect.classList.add('amb-level-' + levelSelect.value);
    });
  }

  // ---- ডেট/টাইম ডিফল্ট ----
  var dateInput = document.getElementById('reqDate');
  var timeInput = document.getElementById('reqTime');
  if (dateInput) {
    var d = new Date();
    dateInput.value = d.toISOString().slice(0, 10);
  }
  if (timeInput) {
    var t = new Date(Date.now() + 30 * 60 * 1000);
    timeInput.value = ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2);
  }

  // ---- GPS অটো লোকেশন ----
  var gpsBtn = document.getElementById('reqGpsBtn');
  var pickupInput = document.getElementById('reqPickup');
  if (gpsBtn && pickupInput) {
    gpsBtn.addEventListener('click', function () {
      if (!('geolocation' in navigator)) {
        alert('আপনার ব্রাউজারে জিপিএস লোকেশন সমর্থিত নয়।');
        return;
      }
      gpsBtn.classList.add('is-busy');
      navigator.geolocation.getCurrentPosition(function (pos) {
        gpsBtn.classList.remove('is-busy');
        pickupInput.value = 'বর্তমান অবস্থান (' + pos.coords.latitude.toFixed(4) + ', ' + pos.coords.longitude.toFixed(4) + ')';
      }, function () {
        gpsBtn.classList.remove('is-busy');
        alert('লোকেশন খুঁজে পাওয়া যায়নি। ম্যানুয়ালি লিখুন।');
      });
    });
  }

  // ---- আপেক্ষিক সময় ----
  function timeAgo(ts) {
    var diff = Date.now() - ts;
    var min = Math.floor(diff / 60000);
    if (min < 1) return 'এইমাত্র';
    if (min < 60) return min.toLocaleString('bn-BD') + ' মিনিট আগে';
    var hr = Math.floor(min / 60);
    if (hr < 24) return hr.toLocaleString('bn-BD') + ' ঘণ্টা আগে';
    var day = Math.floor(hr / 24);
    return day.toLocaleString('bn-BD') + ' দিন আগে';
  }

  var LEVEL_LABEL = { critical: 'জরুরি', serious: 'গুরুতর', normal: 'সাধারণ' };

  function badgeHTML(r) {
    if (r.status === 'completed') {
      return '<span class="amb-emg-badge completed"><i class="fa-solid fa-circle"></i> সম্পন্ন</span>';
    }
    return '<span class="amb-emg-badge ' + r.level + '"><i class="fa-solid fa-circle"></i> ' + LEVEL_LABEL[r.level] + '</span>';
  }

  function actionsHTML(r) {
    var mapsUrl = 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(r.pickup) + '&destination=' + encodeURIComponent(r.destination) + '&travelmode=driving';
    var callBtn = '<a class="amb-icon-btn amb-call" href="tel:' + r.phone + '"><i class="fa-solid fa-phone"></i> কল করুন</a>';
    var navBtn = '<a class="amb-icon-btn amb-nav" href="' + mapsUrl + '" target="_blank" rel="noopener" aria-label="গুগল ম্যাপ নেভিগেশন"><i class="fa-solid fa-diamond-turn-right"></i></a>';
    var midBtn = '';
    if (r.status === 'new') {
      midBtn = isAdmin
        ? '<button type="button" class="amb-icon-btn amb-accept" data-accept="' + r.id + '"><i class="fa-solid fa-check"></i> গ্রহণ করুন</button>'
        : '<span class="amb-icon-btn" style="pointer-events:none;color:var(--amb-ink-faint)"><i class="fa-solid fa-hourglass-half"></i> অপেক্ষমান</span>';
    } else if (r.status === 'ongoing') {
      midBtn = isAdmin
        ? '<button type="button" class="amb-icon-btn amb-complete" data-complete="' + r.id + '"><i class="fa-solid fa-flag-checkered"></i> সম্পন্ন করুন</button>'
        : '<span class="amb-icon-btn" style="pointer-events:none;color:var(--amb-ink-faint)"><i class="fa-solid fa-truck-medical"></i> চলমান</span>';
    } else {
      midBtn = '<span class="amb-icon-btn" style="pointer-events:none;color:var(--amb-ink-faint)"><i class="fa-solid fa-check-double"></i> সম্পন্ন হয়েছে</span>';
    }
    return '<div class="amb-request-actions">' + callBtn + midBtn + navBtn + '</div>';
  }

  function cardHTML(r) {
    return (
      '<article class="amb-request-card" data-id="' + r.id + '">' +
        '<div class="amb-request-top">' +
          badgeHTML(r) +
          '<span class="amb-request-time">' + timeAgo(r.createdAt) + '</span>' +
        '</div>' +
        '<div class="amb-request-patient">' + r.patientName + ' <span>&middot; ' + r.phone + '</span></div>' +
        '<div class="amb-request-route"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ' + r.pickup + ' <i class="fa-solid fa-arrow-right-long" aria-hidden="true"></i> ' + r.destination + '</div>' +
        '<div class="amb-request-meta">' +
          '<span><i class="fa-solid fa-truck-medical"></i> ' + r.type + '</span>' +
          '<span><i class="fa-solid fa-route"></i> ' + r.distanceKm + ' কিমি দূরে</span>' +
          '<span><i class="fa-regular fa-calendar"></i> ' + r.datetime + '</span>' +
        '</div>' +
        (r.notes ? '<div class="amb-request-notes"><i class="fa-regular fa-note-sticky" aria-hidden="true"></i>&nbsp; ' + r.notes + '</div>' : '') +
        actionsHTML(r) +
      '</article>'
    );
  }

  function counts() {
    var c = { new: 0, ongoing: 0, completed: 0 };
    requests.forEach(function (r) { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }

  function updateTabCounts() {
    var c = counts();
    tabBtns.forEach(function (btn) {
      var key = btn.getAttribute('data-tab');
      var countEl = btn.querySelector('.amb-tab-count');
      if (countEl) countEl.textContent = '(' + (c[key] || 0).toLocaleString('bn-BD') + ')';
    });
  }

  function render() {
    var filtered = requests.filter(function (r) { return r.status === state.tab; })
      .sort(function (a, b) { return b.createdAt - a.createdAt; });
    listEl.innerHTML = filtered.map(cardHTML).join('');
    emptyEl.style.display = filtered.length ? 'none' : 'block';
    updateTabCounts();
  }

  // ---- ট্যাব সুইচিং ----
  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabBtns.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      state.tab = btn.getAttribute('data-tab');
      render();
    });
  });

  // ---- গ্রহণ / সম্পন্ন বাটন (শুধু অ্যাডমিন) ----
  // এই বাটনগুলো নিজেই শুধু isAdmin হলে রেন্ডার হয়, তবু নিরাপত্তার জন্য এখানেও
  // চেক রাখা হলো, আর লাইভ (Supabase) রো হলে সার্ভার-সাইড RLS (is_admin())
  // ছাড়া update সফলও হবে না।
  function applyStatus(id, newStatus) {
    var r = requests.find(function (x) { return x.id === id; });
    if (!r) return;
    if (r.isLive && reqSupaClient) {
      reqSupaClient.from('ambulance_service_requests').update({ status: newStatus }).eq('id', id)
        .then(function (res) {
          if (res.error) { alert('এই কাজটি করার অনুমতি আপনার নেই।'); return; }
          r.status = newStatus; saveRequests(requests); render();
        });
    } else {
      r.status = newStatus; saveRequests(requests); render();
    }
  }
  listEl.addEventListener('click', function (e) {
    if (!isAdmin) return;
    var acceptBtn = e.target.closest('[data-accept]');
    var completeBtn = e.target.closest('[data-complete]');
    if (acceptBtn) applyStatus(acceptBtn.getAttribute('data-accept'), 'ongoing');
    if (completeBtn) applyStatus(completeBtn.getAttribute('data-complete'), 'completed');
  });

  // ---- ফর্ম সাবমিট ----
  if (form) {
    var successEl = document.getElementById('reqSuccess');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('reqPatientName').value.trim();
      var phone = document.getElementById('reqPhone').value.trim();
      var pickup = document.getElementById('reqPickup').value.trim();
      var destination = document.getElementById('reqDestination').value.trim();
      var level = levelSelect.value;
      var typeId = typeSelect.value;
      var typeLabel = typeSelect.options[typeSelect.selectedIndex] ? typeSelect.options[typeSelect.selectedIndex].textContent : '';
      var notes = document.getElementById('reqNotes').value.trim();
      var dateVal = dateInput.value;
      var timeVal = timeInput.value;

      if (!name || !phone || !pickup || !destination || !level || !typeId) {
        alert('অনুগ্রহ করে (*) চিহ্নিত সব ঘর পূরণ করুন।');
        return;
      }

      var dateLabel = dateVal ? new Date(dateVal + 'T00:00:00').toLocaleDateString('bn-BD', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
      var newReq = {
        id: 'req' + Date.now(),
        patientName: name,
        phone: phone,
        pickup: pickup,
        destination: destination,
        level: level,
        typeId: typeId,
        type: typeLabel,
        datetime: dateLabel + (timeVal ? ', ' + timeVal : ''),
        notes: notes,
        distanceKm: (Math.random() * 10 + 1.5).toFixed(1),
        status: 'new',
        createdAt: Date.now()
      };
      requests.unshift(newReq);
      saveRequests(requests);
      syncRequestToHistory(newReq);
      syncRequestToServiceFeed(newReq, newReq.id);

      form.reset();
      if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
      levelSelect.classList.remove('amb-level-critical', 'amb-level-serious', 'amb-level-normal');

      if (successEl) {
        successEl.classList.add('is-visible');
        setTimeout(function () { successEl.classList.remove('is-visible'); }, 4000);
      }

      tabBtns.forEach(function (b) { b.classList.remove('is-active'); });
      var newTabBtn = document.querySelector('.amb-tab[data-tab="new"]');
      if (newTabBtn) newTabBtn.classList.add('is-active');
      state.tab = 'new';
      render();

      var feedEl = document.getElementById('ambRequestFeedTop');
      if (feedEl) feedEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  render();
  checkAdmin();
  loadLiveRequests();
})();
