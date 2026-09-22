// টাঙ্গাইল জেলা — ফেভারিট ক্যাটাগরি
// • হোম পেজের প্রতিটি ক্যাটাগরি কার্ডে ♡ চিহ্ন যোগ করে; চাপলে ফেভারিটে যায় / ফেভারিট থেকে সরে (আবার চাপলে)।
// • প্রোফাইল পেজে (#pfFavGrid থাকলে) "ফেভারিট ক্যাটাগরি" দেখায়।
// সংরক্ষণ: ব্রাউজারে (localStorage) সবসময়; লগইন করা থাকলে Supabase-এর favorite_categories টেবিলেও
// (supabase/favorite-categories.sql চালানো থাকলে) — তাই ফোন/ব্রাউজার বদলালেও ফেভারিট থাকে।
// টেবিল না থাকলে বা নেট না থাকলে চুপচাপ শুধু লোকাল সংরক্ষণে চলে, কিছু ভাঙে না।
// supabase-js, js/supabase-config.js ও (থাকলে) js/i18n.js-এর পরে যোগ করতে হবে।
(function () {
  // key = কার্ডের শিরোনামের ভাষা-কী (index.html-এর data-i18n); h = লিংক; c = রঙের ক্লাস; i = আইকন; n = ডিফল্ট বাংলা নাম
  var CATS = [
    { k: "cat.emergency.title", h: "ambulance.html", c: "cat-emergency", i: "fa-truck-medical", n: "অ্যাম্বুলেন্স" },
    { k: "cat.fireService.title", h: "fire-service.html", c: "cat-emergency", i: "fa-fire", n: "ফায়ার সার্ভিস" },
    { k: "cat.police.title", h: "police.html", c: "cat-emergency", i: "fa-shield-halved", n: "থানা-পুলিশ" },
    { k: "cat.hospitals.title", h: "hospitals.html", c: "cat-medical", i: "fa-hospital", n: "হাসপাতাল" },
    { k: "cat.doctors.title", h: "doctors.html", c: "cat-medical", i: "fa-user-doctor", n: "ডাক্তার" },
    { k: "cat.diagnostic.title", h: "diagnostic.html", c: "cat-medical", i: "fa-microscope", n: "ডায়াগনস্টিক" },
    { k: "cat.bloodDonors.title", h: "blood-donors.html", c: "cat-blood", i: "fa-droplet", n: "রক্তদান" },
    { k: "cat.emergencyNumbers.title", h: "emergency.html", c: "cat-emergency", i: "fa-phone-volume", n: "জরুরি নাম্বার" },
    { k: "cat.help.title", h: "help.html", c: "cat-help", i: "fa-handshake", n: "সহায়তা" },
    { k: "cat.businessDirectory.title", h: "business-directory.html", c: "cat-work", i: "fa-store", n: "দোকান" },
    { k: "cat.buySell.title", h: "buy-sell.html", c: "cat-market", i: "fa-cart-shopping", n: "ক্রয় ও বিক্রয়" },
    { k: "cat.restaurants.title", h: "restaurants.html", c: "cat-food", i: "fa-utensils", n: "রেস্টুরেন্ট" },
    { k: "cat.houseRent.title", h: "house-rent.html", c: "cat-property", i: "fa-house", n: "বাসা ভাড়া" },
    { k: "cat.flatLand.title", h: "flat-land.html", c: "cat-property", i: "fa-city", n: "ফ্ল্যাট ও জমি" },
    { k: "cat.carRent.title", h: "transport.html", c: "cat-transport", i: "fa-car", n: "গাড়ি ভাড়া" },
    { k: "cat.mechanic.title", h: "mechanic.html", c: "cat-repair", i: "fa-screwdriver-wrench", n: "মিস্ত্রি/বুয়া" },
    { k: "cat.busSchedule.title", h: "bus-schedule.html", c: "cat-transport", i: "fa-bus", n: "বাসের সময়সূচি" },
    { k: "cat.trainSchedule.title", h: "train-schedule.html", c: "cat-transport", i: "fa-train", n: "ট্রেনের সময়সূচি" },
    { k: "cat.parlourSalon.title", h: "parlour-salon.html", c: "cat-beauty", i: "fa-scissors", n: "পার্লার ও সেলুন" },
    { k: "cat.jobs.title", h: "jobs.html", c: "cat-work", i: "fa-briefcase", n: "চাকরি" },
    { k: "cat.teachersSchools.title", h: "teacher-module.html", c: "cat-education", i: "fa-graduation-cap", n: "ছাত্র-শিক্ষক" },
    { k: "cat.eduInstitute.title", h: "teachers-schools.html", c: "cat-education", i: "fa-school", n: "শিক্ষা প্রতিষ্ঠান" },
    { k: "cat.electricityOffice.title", h: "electricity-office.html", c: "cat-utility", i: "fa-bolt", n: "বিদ্যুৎ অফিস" },
    { k: "cat.courier.title", h: "courier.html", c: "cat-logistics", i: "fa-box", n: "কুরিয়ার সার্ভিস" },
    { k: "cat.transport.title", h: "transport.html", c: "cat-transport", i: "fa-plane", n: "ভ্রমণ" },
    { k: "cat.houseboat.title", h: "houseboat.html", c: "cat-travel", i: "fa-ship", n: "হাউসবোট" },
    { k: "cat.hotel.title", h: "hotel.html", c: "cat-travel", i: "fa-hotel", n: "হোটেল" },
    { k: "cat.touristSpot.title", h: "tourist-spot.html", c: "cat-travel", i: "fa-map-location-dot", n: "দর্শনীয় স্থান" },
    { k: "cat.matrimonial.title", h: "matrimony.html", c: "cat-personal", i: "fa-heart", n: "পাত্র-পাত্রী" },
    { k: "cat.legalHelp.title", h: "lawyer.html", c: "cat-legal", i: "fa-scale-balanced", n: "আইনজীবী" },
    { k: "cat.entrepreneur.title", h: "business-directory.html", c: "cat-work", i: "fa-user-tie", n: "উদ্যোক্তা" },
    { k: "cat.nursery.title", h: "nursery.html", c: "cat-nature", i: "fa-seedling", n: "নার্সারি" },
    { k: "cat.publicRep.title", h: "public-representative.html", c: "cat-gov", i: "fa-landmark", n: "জনপ্রতিনিধি" },
    { k: "cat.websiteLinks.title", h: "website-links.html", c: "cat-web", i: "fa-globe", n: "ওয়েবসাইট" },
    { k: "cat.incomeExpense.title", h: "income-expense.html", c: "cat-finance", i: "fa-sack-dollar", n: "আয়-ব্যয়" },
    { k: "cat.handloom.title", h: "handloom.html", c: "cat-heritage", i: "fa-shirt", n: "তাঁত ও কারুশিল্প" }
  ];
  var BY_KEY = {};
  CATS.forEach(function (c) { BY_KEY[c.k] = c; });

  var LS_KEY = 'tz_fav_cats_v1';
  var client = null;
  var uid = null;
  // state.owner: 'guest' বা লগইন করা ইউজারের id; state.dirty: লোকালে এমন পরিবর্তন আছে যা এখনো সার্ভারে যায়নি
  var state = { owner: 'guest', keys: [], dirty: false };

  function readCache() {
    try {
      var o = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (o && typeof o.owner === 'string' && Array.isArray(o.keys)) {
        return { owner: o.owner, keys: o.keys.filter(function (k) { return BY_KEY[k]; }), dirty: !!o.dirty };
      }
    } catch (e) { /* ignore */ }
    return { owner: 'guest', keys: [], dirty: false };
  }
  function writeCache() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  function emit() {
    document.dispatchEvent(new CustomEvent('tz:fav-changed'));
  }

  if (window.supabase && window.TANGAIL_SUPABASE) {
    client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
  }

  // ---- সেশন + সার্ভারের সাথে মেলানো ----
  var ready = new Promise(function (resolve) {
    var cache = readCache();
    if (!client) { state = cache; resolve(); return; }
    client.auth.getSession().then(function (res) {
      var session = res && res.data && res.data.session;
      uid = session && session.user ? session.user.id : null;

      if (!uid) {
        // লগআউট অবস্থায় আগের ইউজারের ফেভারিট দেখানো/মেশানো হবে না
        state = cache.owner === 'guest' ? cache : { owner: 'guest', keys: [], dirty: false };
        writeCache();
        resolve();
        return;
      }
      // অন্য ইউজারের লোকাল ক্যাশ বাতিল; গেস্ট অবস্থায় বাছাই করা ফেভারিট এই ইউজার পাবে
      if (cache.owner !== uid && cache.owner !== 'guest') { cache = { owner: uid, keys: [], dirty: false }; }
      var localOnlyCandidates = (cache.owner === 'guest' || cache.dirty) ? cache.keys : [];

      return client.from('favorite_categories').select('cat_key').order('created_at', { ascending: true }).then(function (r) {
        if (r.error) {
          // টেবিল নেই / অফলাইন — লোকালেই চলবে; পরে সার্ভার পেলে মেলানো হবে
          state = { owner: uid, keys: cache.keys, dirty: cache.keys.length > 0 || cache.dirty };
          writeCache();
          resolve();
          return;
        }
        var server = (r.data || []).map(function (x) { return x.cat_key; }).filter(function (k) { return BY_KEY[k]; });
        var extra = localOnlyCandidates.filter(function (k) { return server.indexOf(k) < 0; });
        state = { owner: uid, keys: server.concat(extra), dirty: false };
        writeCache();
        resolve();
        if (extra.length) {
          client.from('favorite_categories')
            .upsert(extra.map(function (k) { return { user_id: uid, cat_key: k }; }), { onConflict: 'user_id,cat_key', ignoreDuplicates: true })
            .then(function (ins) { if (ins.error) { state.dirty = true; writeCache(); } });
        }
        emit();
      });
    }).catch(function () {
      // নেট/সেশন সমস্যা — অন্য কারও ক্যাশ না দেখিয়ে নিজের (বা গেস্টের) লোকাল ক্যাশ দিয়ে চালানো
      var mine = cache.owner === 'guest' || cache.owner === uid;
      state = mine ? cache : { owner: uid || 'guest', keys: [], dirty: false };
      resolve();
    });
  });

  function has(key) { return state.keys.indexOf(key) > -1; }

  function toggle(key) {
    if (!BY_KEY[key]) { return false; }
    var add = !has(key);
    if (add) { state.keys.push(key); } else { state.keys.splice(state.keys.indexOf(key), 1); }
    writeCache();
    emit();
    if (client && uid) {
      var req = add
        ? client.from('favorite_categories').insert({ user_id: uid, cat_key: key })
        : client.from('favorite_categories').delete().eq('user_id', uid).eq('cat_key', key);
      req.then(function (r) {
        if (r.error && !(add && r.error.code === '23505')) { state.dirty = true; writeCache(); }
      });
    }
    return add;
  }

  function lang() { return (window.TZ_I18N && window.TZ_I18N.current === 'en') ? 'en' : 'bn'; }
  function label(cat) {
    var t = window.TZ_I18N && window.TZ_I18N.t ? window.TZ_I18N.t(cat.k) : null;
    return t || cat.n;
  }
  function el(tag, cls) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    return e;
  }

  // ---- ♡ বাটন (হোম ও প্রোফাইল দুই জায়গাতেই একই) ----
  function paintHeart(btn) {
    var on = has(btn.getAttribute('data-fav'));
    btn.classList.toggle('is-fav', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', lang() === 'en'
      ? (on ? 'Remove from favorites' : 'Add to favorites')
      : (on ? 'ফেভারিট থেকে সরান' : 'ফেভারিটে যোগ করুন'));
    var i = btn.querySelector('i');
    if (i) { i.className = (on ? 'fa-solid' : 'fa-regular') + ' fa-heart'; }
  }
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = el('div', 'tz-fav-toast');
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }
  function makeHeart(key) {
    var b = el('span', 'cat-fav');
    b.setAttribute('role', 'button');
    b.setAttribute('tabindex', '0');
    b.setAttribute('data-fav', key);
    b.appendChild(el('i', 'fa-regular fa-heart'));
    function act(e) {
      // কার্ডটা লিংক (<a>) — ♡ চাপলে পেজ খুলবে না
      e.preventDefault();
      e.stopPropagation();
      var added = toggle(key);
      if (b.isConnected && b.closest('#homeCatGrid')) {
        toast(lang() === 'en'
          ? (added ? 'Added to favorites — see it in Profile' : 'Removed from favorites')
          : (added ? 'ফেভারিটে যোগ হয়েছে — প্রোফাইলে দেখুন' : 'ফেভারিট থেকে সরানো হয়েছে'));
      }
    }
    b.addEventListener('click', act);
    b.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { act(e); }
    });
    paintHeart(b);
    return b;
  }

  // ---- হোম পেজ ----
  function initHome() {
    var grid = document.getElementById('homeCatGrid');
    if (!grid) { return; }
    Array.prototype.forEach.call(grid.querySelectorAll('.cat-card'), function (card) {
      var h3 = card.querySelector('h3[data-i18n]');
      var key = h3 && h3.getAttribute('data-i18n');
      if (!key || !BY_KEY[key] || card.querySelector('.cat-fav')) { return; }
      card.appendChild(makeHeart(key));
    });
  }

  // ---- প্রোফাইল পেজ ----
  function renderProfile() {
    var grid = document.getElementById('pfFavGrid');
    var empty = document.getElementById('pfFavEmpty');
    if (!grid) { return; }
    grid.innerHTML = '';
    var shown = 0;
    state.keys.forEach(function (k) {
      var cat = BY_KEY[k];
      if (!cat) { return; }
      var a = el('a', 'cat-card ' + cat.c);
      a.href = cat.h;
      var ic = el('div', 'cat-icon');
      var sp = el('span', 'cat-icon-fa');
      sp.appendChild(el('i', 'fa-solid ' + cat.i));
      ic.appendChild(sp);
      a.appendChild(ic);
      var h3 = el('h3');
      h3.setAttribute('data-i18n', cat.k);
      h3.textContent = label(cat);
      a.appendChild(h3);
      a.appendChild(makeHeart(k));
      grid.appendChild(a);
      shown++;
    });
    if (empty) {
      empty.hidden = shown > 0;
      if (!shown) {
        empty.innerHTML = '';
        empty.appendChild(document.createTextNode('এখনো কোনো ফেভারিট ক্যাটাগরি নেই। হোম পেজে ক্যাটাগরির ♡ চিহ্নে চাপ দিন। '));
        var go = el('a');
        go.href = 'index.html';
        go.textContent = 'হোমে যান';
        empty.appendChild(go);
      }
    }
  }

  function repaintAll() {
    Array.prototype.forEach.call(document.querySelectorAll('.cat-fav'), paintHeart);
  }

  document.addEventListener('tz:fav-changed', function () {
    // প্রোফাইলে ♡ চেপে সরালে কার্ডটাও তালিকা থেকে চলে যাবে; বাকি জায়গায় শুধু ♡ রং বদলাবে
    if (document.getElementById('pfFavGrid')) { renderProfile(); }
    repaintAll();
  });
  document.addEventListener('tz:i18n-applied', function () {
    repaintAll();
    if (document.getElementById('pfFavGrid')) { renderProfile(); }
  });

  ready.then(function () {
    initHome();
    renderProfile();
    repaintAll();
  });

  window.TZ_FAV = { ready: ready, has: has, toggle: toggle, list: function () { return state.keys.slice(); }, categories: CATS };
})();
