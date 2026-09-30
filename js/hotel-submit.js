// টাঙ্গাইল জেলা — আবাসিক হোটেল পেজ — নতুন হোটেল জমা (Pending Review) + অনুমোদিত হোটেল লোড
// • নতুন জমা সবসময় status='pending' — অ্যাডমিন অনুমোদন না করা পর্যন্ত পাবলিক তালিকায় আসে না (RLS-ও তাই)
// • শুধু 'approved' হোটেল পড়া যায় এবং সেগুলো window.HOTELS-এ ঢোকে
(function () {
  var fab = document.getElementById('htFab');
  var backdrop = document.getElementById('htSheetBackdrop');
  var form = document.getElementById('htForm');
  if (!fab || !backdrop || !form) return;

  var upazilas = window.HOTEL_UPAZILAS || [];
  var sheet = document.getElementById('htSheet');
  var upazilaEl = document.getElementById('htfUpazila');
  var nameEl = document.getElementById('htfName');
  var addressEl = document.getElementById('htfAddress');
  var phoneEl = document.getElementById('htfPhone');
  var mapEl = document.getElementById('htfMap');
  var photoEl = document.getElementById('htfPhoto');
  var previewBox = document.getElementById('htPhotoPreview');
  var extraWrap = document.getElementById('htExtraWrap');
  var hpEl = document.getElementById('htfHp');
  var msgEl = document.getElementById('htFormMsg');
  var submitBtn = document.getElementById('htSubmit');
  var cancelBtn = document.getElementById('htCancel');
  var doneEl = document.getElementById('htDone');
  var doneBtn = document.getElementById('htDoneClose');
  var locBtn = document.getElementById('htLocBtn');
  var locNote = document.getElementById('htLocNote');

  var client = null;
  try {
    if (window.supabase && window.TANGAIL_SUPABASE) {
      client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
    }
  } catch (e) { client = null; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  upazilaEl.innerHTML = '<option value="">উপজেলা নির্বাচন করুন</option>' +
    upazilas.map(function (u) { return '<option value="' + esc(u[0]) + '">' + esc(u[1]) + '</option>'; }).join('');

  // ---------- বটম শিট ----------
  var lastFocus = null, busy = false, previewUrl = null;

  function focusables() {
    return Array.prototype.filter.call(
      sheet.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (el) { return !el.disabled && el.offsetParent !== null && !el.closest('[hidden]'); }
    );
  }
  function setMsg(t) { msgEl.textContent = t || ''; msgEl.hidden = !t; }
  function showForm() { form.hidden = false; doneEl.hidden = true; sheet.querySelector('.ht-sheet-head').hidden = false; setMsg(''); }
  function showDone() { form.hidden = true; sheet.querySelector('.ht-sheet-head').hidden = true; doneEl.hidden = false; doneBtn.focus(); }
  function showPreview(file) {
    var img = previewBox.querySelector('img');
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    if (file) { previewUrl = URL.createObjectURL(file); img.src = previewUrl; previewBox.hidden = false; }
    else { img.removeAttribute('src'); previewBox.hidden = true; }
  }
  function resetForm() { form.reset(); showPreview(null); clearAllExtras(); if (locNote) { locNote.hidden = true; locNote.textContent = ''; } }

  function openSheet() {
    lastFocus = document.activeElement;
    showForm();
    backdrop.hidden = false;
    document.body.classList.add('ht-lock');
    requestAnimationFrame(function () { backdrop.classList.add('is-open'); });
    setTimeout(function () { upazilaEl.focus(); }, 60);
  }
  function closeSheet() {
    if (busy) return;
    backdrop.classList.remove('is-open');
    document.body.classList.remove('ht-lock');
    setTimeout(function () { backdrop.hidden = true; }, 200);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  fab.addEventListener('click', openSheet);
  cancelBtn.addEventListener('click', closeSheet);
  doneBtn.addEventListener('click', closeSheet);
  backdrop.addEventListener('click', function (e) { if (e.target === backdrop) closeSheet(); });
  document.addEventListener('keydown', function (e) {
    if (backdrop.hidden) return;
    if (e.key === 'Escape') { closeSheet(); return; }
    if (e.key === 'Tab') {
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // ---------- ছবি ----------
  var PHOTO_OK = /^image\/(jpeg|png|webp|gif)$/;
  photoEl.addEventListener('change', function () {
    var f = photoEl.files && photoEl.files[0];
    setMsg('');
    if (!f) { showPreview(null); clearAllExtras(); return; }
    if (!PHOTO_OK.test(f.type)) { photoEl.value = ''; showPreview(null); clearAllExtras(); setMsg('শুধু JPG, PNG বা WebP ছবি দিন।'); return; }
    if (f.size > 8 * 1024 * 1024) { photoEl.value = ''; showPreview(null); clearAllExtras(); setMsg('ছবি ৮ MB এর বেশি হতে পারবে না।'); return; }
    showPreview(f);
  });


  // ---------- আরও ছবি (ঐচ্ছিক, সর্বোচ্চ ৪টি — প্রধান ছবিসহ মোট ৫টি) ----------
  // প্রতিটি আলাদা স্লটে; ছবি নিজের মাপেই থাকে (লাইটবক্সে পুরো ছবি দেখানোর জন্য), জমার সময় শুধু কম্প্রেস হয়।
  var extraFiles = [];   // স্লট নম্বর → File
  var extraUrls = [];    // স্লট নম্বর → প্রিভিউয়ের object URL

  function slotEl(idx) { return extraWrap ? extraWrap.querySelector('.ht-xslot[data-slot="' + idx + '"]') : null; }

  function paintSlot(idx) {
    var slot = slotEl(idx);
    if (!slot) return;
    var has = !!extraFiles[idx];
    var thumb = slot.querySelector('.ht-xthumb');
    var rm = slot.querySelector('.ht-xrm');
    slot.classList.toggle('has-photo', has);
    if (has) { thumb.src = extraUrls[idx]; thumb.hidden = false; rm.hidden = false; }
    else { thumb.removeAttribute('src'); thumb.hidden = true; rm.hidden = true; }
  }

  function clearSlot(idx) {
    if (extraUrls[idx]) URL.revokeObjectURL(extraUrls[idx]);
    extraFiles[idx] = null; extraUrls[idx] = null;
    var slot = slotEl(idx);
    var inp = slot && slot.querySelector('.ht-xfile');
    if (inp) inp.value = '';
    paintSlot(idx);
  }

  function clearAllExtras() {
    for (var i = 0; i < 4; i++) clearSlot(i);
    extraFiles = []; extraUrls = [];
  }

  function onExtraPicked(idx, inp) {
    var f = inp.files && inp.files[0];
    if (!f) { clearSlot(idx); return; }
    setMsg('');
    if (!PHOTO_OK.test(f.type)) { clearSlot(idx); setMsg('শুধু JPG, PNG বা WebP ছবি দিন।'); return; }
    if (f.size > 8 * 1024 * 1024) { clearSlot(idx); setMsg('ছবি ৮ MB এর বেশি হতে পারবে না।'); return; }
    if (extraUrls[idx]) URL.revokeObjectURL(extraUrls[idx]);
    extraFiles[idx] = f;
    extraUrls[idx] = URL.createObjectURL(f);
    paintSlot(idx);
  }

  if (extraWrap) {
    extraWrap.addEventListener('click', function (e) {
      var add = e.target.closest ? e.target.closest('.ht-xadd') : null;
      if (add) {
        if (!(photoEl.files && photoEl.files[0])) {
          setMsg('আগে প্রধান ছবি যোগ করুন — তারপর আরও ছবি দিতে পারবেন।');
          photoEl.focus();
          return;
        }
        setMsg('');
        var inp = document.getElementById('htfExtra' + add.getAttribute('data-slot'));
        if (inp) inp.click();
        return;
      }
      var rm = e.target.closest ? e.target.closest('.ht-xrm') : null;
      if (rm) clearSlot(parseInt(rm.getAttribute('data-slot'), 10));
    });
    extraWrap.addEventListener('change', function (e) {
      var inp = e.target;
      if (!inp || !inp.classList || !inp.classList.contains('ht-xfile')) return;
      onExtraPicked(parseInt(inp.closest('.ht-xslot').getAttribute('data-slot'), 10), inp);
    });
  }


  // ---------- এক ক্লিকে নিজের লোকেশন (Google Map লিংকে বসে) ----------
  function setLocNote(text, isErr) {
    locNote.textContent = text || '';
    locNote.hidden = !text;
    locNote.classList.toggle('is-err', !!isErr);
  }
  function setLocBusy(on) {
    locBtn.disabled = on;
    locBtn.querySelector('span').textContent = on ? 'লোকেশন নেওয়া হচ্ছে…' : 'আমার লোকেশন যোগ করুন';
  }
  if (locBtn) locBtn.addEventListener('click', function () {
    setLocNote('');
    if (!navigator.geolocation) { setLocNote('আপনার ব্রাউজারে লোকেশন সাপোর্ট নেই। Google Map লিংক নিজে বসান।', true); return; }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude.toFixed(6), lng = pos.coords.longitude.toFixed(6);
      mapEl.value = 'https://www.google.com/maps?q=' + lat + ',' + lng;
      mapEl.removeAttribute('aria-invalid');
      setLocBusy(false);
      setLocNote('লোকেশন যোগ হয়েছে। হোটেলে দাঁড়িয়ে থাকলে ঠিক জায়গা আসবে।');
    }, function (err) {
      setLocBusy(false);
      var t = 'লোকেশন পাওয়া যায়নি। Google Map লিংক নিজে বসান।';
      if (err && err.code === 1) t = 'লোকেশনের অনুমতি দেওয়া হয়নি। ব্রাউজার/ফোনের সেটিংসে লোকেশন চালু করে আবার চেষ্টা করুন।';
      else if (err && err.code === 3) t = 'লোকেশন পেতে বেশি সময় লাগছে। খোলা জায়গায় গিয়ে আবার চেষ্টা করুন।';
      setLocNote(t, true);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });

  // ---------- ভ্যালিডেশন ----------
  var BN = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
  function normalizePhone(v) {
    var d = String(v || '').replace(/[০-৯]/g, function (c) { return BN[c]; }).replace(/[\s\-()]/g, '');
    if (d.indexOf('+88') === 0) d = d.slice(3);
    else if (d.indexOf('88') === 0 && d.length === 13) d = d.slice(2);
    return d;
  }
  function validPhone(d) { return /^01[3-9]\d{8}$/.test(d) || /^0\d{8,10}$/.test(d); }
  function validMapUrl(v) {
    if (!v) return true;
    try { var u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:'; } catch (e) { return false; }
  }
  function markInvalid(el, text) { setMsg(text); el.setAttribute('aria-invalid', 'true'); el.focus(); }

  // ---------- ছবি কম্প্রেস + আপলোড (market-media বাকেট) ----------
  function compressImageFile(file) {
    return new Promise(function (resolve) {
      var objectUrl = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(objectUrl);
        var maxDim = 1200, w = img.width, h = img.height;
        if (w <= maxDim && h <= maxDim && file.size <= 500 * 1024) { resolve(file); return; }
        var scale = Math.min(1, maxDim / Math.max(w, h));
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          if (!blob) { resolve(file); return; }
          var out = new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
          resolve(out.size < file.size ? out : file);
        }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(objectUrl); resolve(file); };
      img.src = objectUrl;
    });
  }
  function uploadImage(file) {
    if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error('ছবি ৫ MB এর বেশি — ছোট ছবি দিন'));
    var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    var path = 'hotel/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + safeName;
    return fetch(window.TANGAIL_SUPABASE.url + '/storage/v1/object/market-media/' + path, {
      method: 'POST',
      headers: {
        apikey: window.TANGAIL_SUPABASE.key,
        Authorization: 'Bearer ' + window.TANGAIL_SUPABASE.key,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'false'
      },
      body: file
    }).then(function (res) {
      if (!res.ok) throw new Error('ছবি আপলোড ব্যর্থ হয়েছে');
      return client.storage.from('market-media').getPublicUrl(path).data.publicUrl;
    });
  }

  // ---------- জমা ----------
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    setMsg('');
    Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (el) { el.removeAttribute('aria-invalid'); });
    if (hpEl.value) { showDone(); return; }

    var upazila = upazilaEl.value, name = nameEl.value.trim(), address = addressEl.value.trim();
    var phone = normalizePhone(phoneEl.value), map = mapEl.value.trim();
    var photo = photoEl.files && photoEl.files[0];

    if (!upazila) return markInvalid(upazilaEl, 'উপজেলা নির্বাচন করুন।');
    if (!name) return markInvalid(nameEl, 'হোটেলের নাম লিখুন।');
    if (!address) return markInvalid(addressEl, 'ঠিকানা লিখুন।');
    if (!validPhone(phone)) return markInvalid(phoneEl, 'সঠিক মোবাইল নম্বর লিখুন (যেমন 01712345678)।');
    if (!validMapUrl(map)) return markInvalid(mapEl, 'Google Map লিংকটি http:// বা https:// দিয়ে শুরু হতে হবে।');
    if (!client) { setMsg('সংযোগে সমস্যা হচ্ছে। ইন্টারনেট চেক করে আবার চেষ্টা করুন।'); return; }

    busy = true;
    submitBtn.disabled = true; cancelBtn.disabled = true;
    submitBtn.textContent = photo ? 'ছবি আপলোড হচ্ছে…' : 'জমা হচ্ছে…';

    var extraToUpload = [];
    for (var xi = 0; xi < 4; xi++) if (extraFiles[xi]) extraToUpload.push(extraFiles[xi]);
    if (extraToUpload.length && !photo) { busy = false; submitBtn.disabled = false; cancelBtn.disabled = false; submitBtn.textContent = 'জমা দিন'; setMsg('আরও ছবি দিতে হলে আগে প্রধান ছবি যোগ করুন।'); photoEl.focus(); return; }

    var step = photo ? compressImageFile(photo).then(uploadImage) : Promise.resolve('');
    step.then(function (logoUrl) {
      if (!extraToUpload.length) return { main: logoUrl, extra: [] };
      return Promise.all(extraToUpload.map(function (f) { return compressImageFile(f).then(uploadImage); }))
        .then(function (urls) { return { main: logoUrl, extra: urls }; });
    }).then(function (up) {
      submitBtn.textContent = 'জমা হচ্ছে…';
      var row = {
        name: name, upazila: upazila, address: address, phone: phone,
        maps_url: map, logo_url: up.main || '', status: 'pending'
      };
      // extra_photos শুধু আরও ছবি থাকলেই পাঠানো হয়
      if (up.extra.length) row.extra_photos = up.extra;
      return client.from('hotel_offices').insert(row);
    }).then(function (res) {
      if (res && res.error) throw res.error;
      resetForm(); busy = false; showDone();
    }).catch(function (err) {
      console.error('hotel submit error:', err);
      busy = false;
      setMsg((err && err.message && /ছবি|নেটওয়ার্ক/.test(err.message)) ? err.message : 'জমা দেওয়া যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।');
    }).then(function () {
      submitBtn.disabled = false; cancelBtn.disabled = false; submitBtn.textContent = 'জমা দিন';
    });
  });

  // ---------- অনুমোদিত হোটেল লোড (RLS: শুধু status='approved') ----------
  function httpsOnly(u) { return /^https:\/\//i.test(u || '') ? u : ''; }
  function done() {
    window.HOTELS_LOADED = true;
    window.dispatchEvent(new Event('hotel:offices-updated'));
  }
  function cleanPhotoList(v) {
    if (!Array.isArray(v)) return [];
    return v.map(httpsOnly).filter(Boolean).slice(0, 4);
  }
  function fetchApproved(cols) {
    return client.from('hotel_offices')
      .select(cols)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
  }
  function loadApproved() {
    if (!client) { done(); return; }
    var BASE = 'id,name,upazila,address,phone,logo_url,maps_url,is_open';
    // extra_photos কলাম না থাকলে প্রথম কোয়েরি error দেয় — তখন কলাম ছাড়া আবার চেষ্টা, যাতে তালিকা ভেঙে না যায়
    fetchApproved(BASE + ',extra_photos')
      .then(function (res) { return (res && res.error) ? fetchApproved(BASE) : res; })
      .then(function (res) {
        var list = window.HOTELS;
        list.length = 0;
        (res && res.data ? res.data : []).forEach(function (r) {
          list.push({
            id: 'db-' + r.id, name: r.name, upazila: r.upazila, address: r.address, phone: r.phone,
            logo: httpsOnly(r.logo_url), extras: cleanPhotoList(r.extra_photos),
            mapUrl: r.maps_url || '', status: r.is_open === false ? 'closed' : 'open'
          });
        });
        done();
      }, done);
  }
  loadApproved();
})();
