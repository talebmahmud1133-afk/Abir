// টাঙ্গাইল জেলা — ডাক্তার পেজ — নতুন তথ্য জমা (Pending Review) + অনুমোদিত তথ্য লোড
// • নতুন জমা সবসময় status='pending' — অ্যাডমিন অনুমোদন (approved) না করা পর্যন্ত পাবলিক তালিকায় আসে না
//   (Supabase RLS-ও শুধু pending ইনসার্ট অনুমতি দেয়)
// • শুধু 'approved' তথ্য পড়া যায় (RLS) এবং সেগুলো ডেমো তালিকার সাথে যোগ হয়
(function () {
  var fab = document.getElementById('dcFab');
  var backdrop = document.getElementById('dcSheetBackdrop');
  var form = document.getElementById('dcForm');
  if (!fab || !backdrop || !form) return;

  var categories = window.DOCTORS_CATEGORIES || [];
  var upazilas = window.DOCTORS_UPAZILAS || [];

  var sheet = document.getElementById('dcSheet');
  var categoryEl = document.getElementById('dcfCategory');
  var upazilaEl = document.getElementById('dcfUpazila');
  var nameEl = document.getElementById('dcfName');
  var addressEl = document.getElementById('dcfAddress');
  var phoneEl = document.getElementById('dcfPhone');
  var mapEl = document.getElementById('dcfMap');
  var photoEl = document.getElementById('dcfPhoto');
  var previewBox = document.getElementById('dcPhotoPreview');
  var hpEl = document.getElementById('dcfHp');
  var msgEl = document.getElementById('dcFormMsg');
  var submitBtn = document.getElementById('dcSubmit');
  var cancelBtn = document.getElementById('dcCancel');
  var doneEl = document.getElementById('dcDone');
  var doneBtn = document.getElementById('dcDoneClose');
  var photoEditBtn = document.getElementById('dcPhotoEdit');

  // ছবি বসানোর (crop) ডায়ালগ
  var cropBackdrop = document.getElementById('dcCropBackdrop');
  var cropBox = document.getElementById('dcCrop');
  var cropViewport = document.getElementById('dcCropViewport');
  var cropImg = document.getElementById('dcCropImg');
  var cropZoomEl = document.getElementById('dcCropZoom');
  var cropZoomInBtn = document.getElementById('dcCropZoomIn');
  var cropZoomOutBtn = document.getElementById('dcCropZoomOut');
  var cropCancelBtn = document.getElementById('dcCropCancel');
  var cropOkBtn = document.getElementById('dcCropOk');
  var cropOpen = false;          // ক্রপ ডায়ালগ খোলা থাকলে নিচের শিটের Esc/Tab হ্যান্ডলার থেমে থাকে
  var pickedFile = null;         // ব্যবহারকারীর বাছা আসল ছবি (আবার "ছবি ঠিক করুন" চাপলে এটাই খোলে)
  var croppedFile = null;        // ক্রপ করা ছবি (৪:৫ অনুপাতে) — জমা দেওয়ার সময় এটাই আপলোড হয়

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

  // ---------- ড্রপডাউন ----------
  categoryEl.innerHTML = '<option value="">বিশেষজ্ঞ বিভাগ নির্বাচন করুন</option>' +
    categories.map(function (c) { return '<option value="' + esc(c[0]) + '">' + esc(c[1]) + '</option>'; }).join('') +
    '<option value="other">অন্যান্য</option>';
  upazilaEl.innerHTML = '<option value="">উপজেলা নির্বাচন করুন</option>' +
    upazilas.map(function (u) { return '<option value="' + esc(u[0]) + '">' + esc(u[1]) + '</option>'; }).join('');

  // ---------- বটম শিট খোলা/বন্ধ ----------
  var lastFocus = null;
  var busy = false;

  function focusables() {
    return Array.prototype.filter.call(
      sheet.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (el) { return !el.disabled && el.offsetParent !== null && !el.closest('[hidden]'); }
    );
  }

  function openSheet() {
    lastFocus = document.activeElement;
    showForm();
    backdrop.hidden = false;
    document.body.classList.add('dc-lock');
    // পরের ফ্রেমে ক্লাস যোগ করলে স্লাইড-ইন অ্যানিমেশন চলে
    requestAnimationFrame(function () { backdrop.classList.add('is-open'); });
    setTimeout(function () { categoryEl.focus(); }, 60);
  }

  function closeSheet() {
    if (busy) return;
    backdrop.classList.remove('is-open');
    document.body.classList.remove('dc-lock');
    setTimeout(function () { backdrop.hidden = true; }, 200);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function showForm() {
    form.hidden = false;
    doneEl.hidden = true;
    sheet.querySelector('.dc-sheet-head').hidden = false;
    setMsg('');
  }

  function showDone() {
    form.hidden = true;
    sheet.querySelector('.dc-sheet-head').hidden = true;
    doneEl.hidden = false;
    doneBtn.focus();
  }

  function setMsg(text) {
    msgEl.textContent = text || '';
    msgEl.hidden = !text;
  }

  function resetForm() {
    form.reset();
    pickedFile = null;
    croppedFile = null;
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    previewBox.hidden = true;
    previewBox.querySelector('img').removeAttribute('src');
  }

  fab.addEventListener('click', openSheet);
  cancelBtn.addEventListener('click', closeSheet);
  doneBtn.addEventListener('click', closeSheet);
  backdrop.addEventListener('click', function (e) { if (e.target === backdrop) closeSheet(); });
  document.addEventListener('keydown', function (e) {
    if (backdrop.hidden || cropOpen) return;
    if (e.key === 'Escape') { closeSheet(); return; }
    if (e.key === 'Tab') { // ফোকাস শিটের ভেতরেই আটকে রাখা
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // ---------- ছবি বাছা → জুম/সরিয়ে বসানো → প্রিভিউ ----------
  var previewUrl = null;
  var PHOTO_OK = /^image\/(jpeg|png|webp|gif)$/;
  var CROP_MAX_ZOOM = 3.2;   // স্লাইডারের max (320) এর সাথে মিল
  var CROP_OUT = 800;        // আউটপুট ছবির প্রস্থ ৮০০, উচ্চতা ক্রপ ফ্রেমের অনুপাতে (৪:৫ ধরে ~৮০০×১০০০) — কার্ডে বড় করে দেখানোর জন্য যথেষ্ট

  function showPreview(file) {
    var img = previewBox.querySelector('img');
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    if (file) {
      previewUrl = URL.createObjectURL(file);
      img.src = previewUrl;
      previewBox.hidden = false;
    } else {
      img.removeAttribute('src');
      previewBox.hidden = true;
    }
  }

  // ফাইল নিয়ে ক্রপ ডায়ালগ খোলে; ঠিক আছে চাপলে ক্রপ করা File, বাতিলে null দেয়
  function openCropper(file, returnFocusEl) {
    return new Promise(function (resolve) {
      var objectUrl = URL.createObjectURL(file);
      var natW = 0, natH = 0, vpW = 0, vpH = 0, baseScale = 1;
      var zoom = 1, scale = 1, tx = 0, ty = 0;
      var pointers = {}, dragStart = null, pinchStart = null;
      var ready = false, finished = false;

      function clampPos() {
        tx = Math.max(Math.min(0, vpW - natW * scale), Math.min(0, tx));
        ty = Math.max(Math.min(0, vpH - natH * scale), Math.min(0, ty));
      }
      function apply() { cropImg.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')'; }
      // ফ্রেমের (cx, cy) বিন্দু জায়গায় রেখে জুম
      function setZoom(z, cx, cy) {
        if (!ready) return;
        z = Math.max(1, Math.min(CROP_MAX_ZOOM, z));
        var ix = (cx - tx) / scale, iy = (cy - ty) / scale;
        zoom = z; scale = baseScale * zoom;
        tx = cx - ix * scale; ty = cy - iy * scale;
        clampPos(); apply();
        cropZoomEl.value = String(Math.round(zoom * 100));
      }
      // ডায়ালগ দেখানোর পরই মাপ নিতে হয় (লুকানো অবস্থায় মাপ ০ আসে)
      function measure() {
        vpW = cropViewport.clientWidth; vpH = cropViewport.clientHeight;
        if (!vpW || !vpH || !natW || !natH) return false;
        baseScale = Math.max(vpW / natW, vpH / natH);   // ছবি সবসময় ফ্রেম ভরে রাখে
        return true;
      }
      function vpPoint(x, y) { var r = cropViewport.getBoundingClientRect(); return { x: x - r.left, y: y - r.top }; }
      function dist() {
        var ids = Object.keys(pointers), a = pointers[ids[0]], b = pointers[ids[1]];
        return Math.hypot(a.x - b.x, a.y - b.y);
      }

      function onDown(e) {
        if (!ready) return;
        try { cropViewport.setPointerCapture(e.pointerId); } catch (err) {}
        pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        cropViewport.classList.add('dragging');
        var n = Object.keys(pointers).length;
        if (n === 1) { dragStart = { x: e.clientX, y: e.clientY, tx: tx, ty: ty }; pinchStart = null; }
        else if (n === 2) { dragStart = null; pinchStart = { d: dist(), zoom: zoom }; }
        e.preventDefault();
      }
      function onMove(e) {
        if (!pointers[e.pointerId]) return;
        pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        var n = Object.keys(pointers).length;
        if (n === 1 && dragStart) {
          tx = dragStart.tx + (e.clientX - dragStart.x);
          ty = dragStart.ty + (e.clientY - dragStart.y);
          clampPos(); apply();
        } else if (n >= 2 && pinchStart && pinchStart.d > 0) {
          var ids = Object.keys(pointers), a = pointers[ids[0]], b = pointers[ids[1]];
          var c = vpPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
          setZoom(pinchStart.zoom * (dist() / pinchStart.d), c.x, c.y);
        }
        e.preventDefault();
      }
      function onUp(e) {
        delete pointers[e.pointerId];
        var n = Object.keys(pointers).length;
        if (n === 0) { cropViewport.classList.remove('dragging'); dragStart = null; pinchStart = null; }
        else if (n === 1) {
          var id = Object.keys(pointers)[0];
          dragStart = { x: pointers[id].x, y: pointers[id].y, tx: tx, ty: ty }; pinchStart = null;
        }
      }
      function onWheel(e) {
        if (!ready) return;
        e.preventDefault();
        var c = vpPoint(e.clientX, e.clientY);
        setZoom(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), c.x, c.y);
      }
      function onSlider() { setZoom(parseFloat(cropZoomEl.value) / 100, vpW / 2, vpH / 2); }
      function onZoomIn() { setZoom(zoom + 0.2, vpW / 2, vpH / 2); }
      function onZoomOut() { setZoom(zoom - 0.2, vpW / 2, vpH / 2); }
      function onResize() {
        if (!ready) return;
        var cx = (vpW / 2 - tx) / scale, cy = (vpH / 2 - ty) / scale;
        if (!measure()) return;
        scale = baseScale * zoom;
        tx = vpW / 2 - cx * scale; ty = vpH / 2 - cy * scale;
        clampPos(); apply();
      }
      // Esc = শুধু এই ডায়ালগ বন্ধ (নিচের শিট নয়); Tab = ফোকাস ডায়ালগের ভেতরেই
      function onKey(e) {
        if (e.key === 'Escape') { e.stopPropagation(); onCancel(); return; }
        if (e.key === 'Tab') {
          var f = Array.prototype.filter.call(
            cropBox.querySelectorAll('button, input'),
            function (el) { return !el.disabled && el.offsetParent !== null; });
          if (!f.length) return;
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }

      function cleanup(result) {
        if (finished) return;
        finished = true;
        cropOpen = false;
        cropBackdrop.classList.remove('is-open');
        setTimeout(function () { cropBackdrop.hidden = true; }, 200);
        cropViewport.classList.remove('dragging');
        cropViewport.removeEventListener('pointerdown', onDown);
        cropViewport.removeEventListener('pointermove', onMove);
        cropViewport.removeEventListener('pointerup', onUp);
        cropViewport.removeEventListener('pointercancel', onUp);
        cropViewport.removeEventListener('wheel', onWheel);
        cropZoomEl.removeEventListener('input', onSlider);
        cropZoomInBtn.removeEventListener('click', onZoomIn);
        cropZoomOutBtn.removeEventListener('click', onZoomOut);
        cropCancelBtn.removeEventListener('click', onCancel);
        cropOkBtn.removeEventListener('click', onOk);
        window.removeEventListener('resize', onResize);
        document.removeEventListener('keydown', onKey, true);
        cropImg.onload = null; cropImg.onerror = null;
        cropImg.removeAttribute('src');
        URL.revokeObjectURL(objectUrl);
        if (returnFocusEl && returnFocusEl.focus) returnFocusEl.focus();
        resolve(result);
      }
      function onCancel() { cleanup(null); }
      function onOk() {
        if (!ready) return;
        var canvas = document.createElement('canvas');
        canvas.width = CROP_OUT; canvas.height = Math.round(CROP_OUT * vpH / vpW);
        var ctx = canvas.getContext('2d');
        // ফ্রেমে এখন যেটুকু দেখা যাচ্ছে, মূল ছবির ঠিক সেই অংশটুকু কেটে নেওয়া হয়
        ctx.drawImage(cropImg, -tx / scale, -ty / scale, vpW / scale, vpH / scale, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          if (!blob) { cleanup(null); return; }
          var base = (file.name || 'photo').replace(/\.[a-zA-Z0-9]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_') || 'photo';
          cleanup(new File([blob], base + '-crop.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.9);
      }

      cropViewport.addEventListener('pointerdown', onDown);
      cropViewport.addEventListener('pointermove', onMove);
      cropViewport.addEventListener('pointerup', onUp);
      cropViewport.addEventListener('pointercancel', onUp);
      cropViewport.addEventListener('wheel', onWheel, { passive: false });
      cropZoomEl.addEventListener('input', onSlider);
      cropZoomInBtn.addEventListener('click', onZoomIn);
      cropZoomOutBtn.addEventListener('click', onZoomOut);
      cropCancelBtn.addEventListener('click', onCancel);
      cropOkBtn.addEventListener('click', onOk);
      window.addEventListener('resize', onResize);
      document.addEventListener('keydown', onKey, true);

      cropImg.onerror = function () {
        setMsg('এই ছবিটা খোলা যায়নি। অনুগ্রহ করে JPG, PNG বা WebP ছবি দিন।');
        cleanup(null);
      };
      cropImg.onload = function () {
        natW = cropImg.naturalWidth; natH = cropImg.naturalHeight;
        cropImg.style.width = natW + 'px'; cropImg.style.height = natH + 'px';
        // আগে ডায়ালগ দেখাই, তারপর মাপ নিই — নইলে ফ্রেমের মাপ ০ আসে ও ছবি দেখা যায় না
        cropOpen = true;
        cropBackdrop.hidden = false;
        requestAnimationFrame(function () { cropBackdrop.classList.add('is-open'); });
        (function init() {
          if (finished) return;
          if (!measure()) { requestAnimationFrame(init); return; }
          ready = true;
          zoom = 1; scale = baseScale;
          tx = (vpW - natW * scale) / 2; ty = (vpH - natH * scale) / 2;
          clampPos(); apply();
          cropZoomEl.value = '100';
          cropOkBtn.focus();
        })();
      };
      cropImg.src = objectUrl;
    });
  }

  function startCropFlow(file, returnFocusEl) {
    openCropper(file, returnFocusEl).then(function (result) {
      if (!result) {
        // বাতিল: আগে থেকে ক্রপ করা ছবি থাকলে সেটাই থাকে; না থাকলে ছবি বাছা মুছে যায়
        if (!croppedFile) { pickedFile = null; photoEl.value = ''; showPreview(null); }
        return;
      }
      croppedFile = result;
      showPreview(croppedFile);
    });
  }

  photoEl.addEventListener('change', function () {
    var f = photoEl.files && photoEl.files[0];
    if (!f) { pickedFile = null; croppedFile = null; showPreview(null); return; }
    setMsg('');
    // Supabase market-media বাকেট শুধু JPG/PNG/WebP/GIF নেয়
    if (!PHOTO_OK.test(f.type)) {
      photoEl.value = ''; pickedFile = null; croppedFile = null; showPreview(null);
      setMsg('শুধু JPG, PNG বা WebP ছবি দিন।');
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      photoEl.value = ''; pickedFile = null; croppedFile = null; showPreview(null);
      setMsg('ছবি ৮ MB এর বেশি হতে পারবে না।');
      return;
    }
    pickedFile = f;
    croppedFile = null;
    startCropFlow(f, photoEl);
  });

  // প্রিভিউয়ের পাশের বাটন: একই ছবি আবার জুম/সরিয়ে ঠিক করা
  if (photoEditBtn) photoEditBtn.addEventListener('click', function () {
    if (pickedFile) startCropFlow(pickedFile, photoEditBtn);
  });

  // ---------- ভ্যালিডেশন ----------
  var BN = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
  function normalizePhone(v) {
    var d = String(v || '').replace(/[০-৯]/g, function (c) { return BN[c]; }).replace(/[\s\-()]/g, '');
    if (d.indexOf('+88') === 0) d = d.slice(3);
    else if (d.indexOf('88') === 0 && d.length === 13) d = d.slice(2);
    return d;
  }
  function validPhone(d) { return /^01[3-9]\d{8}$/.test(d) || /^0\d{8,10}$/.test(d); } // মোবাইল বা ল্যান্ডলাইন

  function validMapUrl(v) {
    if (!v) return true;
    try { var u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:'; } catch (e) { return false; }
  }

  function markInvalid(el, text) {
    setMsg(text);
    el.setAttribute('aria-invalid', 'true');
    el.focus();
  }

  // ---------- ছবি কম্প্রেস + আপলোড (দোকান ফর্মের মতোই market-media বাকেটে) ----------
  function compressImageFile(file) {
    return new Promise(function (resolve) {
      var objectUrl = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(objectUrl);
        var maxDim = 1200;
        var w = img.width, h = img.height;
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
    var path = 'doctors/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + safeName;
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

    if (hpEl.value) { showDone(); return; } // বট — চুপচাপ উপেক্ষা

    var category = categoryEl.value, upazila = upazilaEl.value;
    var name = nameEl.value.trim(), address = addressEl.value.trim();
    var phone = normalizePhone(phoneEl.value), map = mapEl.value.trim();
    var photo = croppedFile; // জুম/সরিয়ে বসানো ছবি, ৪:৫ অনুপাতে (থাকলে)

    if (!category) return markInvalid(categoryEl, 'বিশেষজ্ঞ বিভাগ নির্বাচন করুন।');
    if (!upazila) return markInvalid(upazilaEl, 'উপজেলা নির্বাচন করুন।');
    if (!name) return markInvalid(nameEl, 'নাম লিখুন।');
    if (!address) return markInvalid(addressEl, 'ঠিকানা লিখুন।');
    if (!validPhone(phone)) return markInvalid(phoneEl, 'সঠিক মোবাইল নম্বর লিখুন (যেমন 01712345678)।');
    if (!validMapUrl(map)) return markInvalid(mapEl, 'Google Map লিংকটি http:// বা https:// দিয়ে শুরু হতে হবে।');
    if (photoEl.files && photoEl.files[0] && !photo) return markInvalid(photoEl, 'ছবিটা বসানোর ধাপ শেষ করুন, অথবা ছবি বাদ দিন।');
    if (!client) { setMsg('সংযোগে সমস্যা হচ্ছে। ইন্টারনেট চেক করে আবার চেষ্টা করুন।'); return; }

    busy = true;
    submitBtn.disabled = true; cancelBtn.disabled = true;
    submitBtn.textContent = photo ? 'ছবি আপলোড হচ্ছে…' : 'জমা হচ্ছে…';

    var step = photo
      ? compressImageFile(photo).then(uploadImage)
      : Promise.resolve('');

    step.then(function (logoUrl) {
      submitBtn.textContent = 'জমা হচ্ছে…';
      return client.from('doctor_listings').insert({
        name: name,
        upazila: upazila,
        address: address,
        phone: phone,
        category: category === 'other' ? '' : category,
        maps_url: map,
        logo_url: logoUrl || '',
        status: 'pending' // সবসময় Pending Review
      });
    }).then(function (res) {
      if (res && res.error) throw res.error;
      resetForm();
      busy = false;
      showDone();
    }).catch(function (err) {
      console.error('doctors submit error:', err);
      busy = false;
      setMsg((err && err.message && /ছবি|নেটওয়ার্ক/.test(err.message)) ? err.message : 'জমা দেওয়া যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।');
    }).then(function () {
      submitBtn.disabled = false; cancelBtn.disabled = false;
      submitBtn.textContent = 'জমা দিন';
    });
  });

  // ---------- অনুমোদিত তথ্য লোড (RLS: শুধু status='approved'; ডেমো সারিও এখানেই, is_demo=true) ----------
  function httpsOnly(u) { return /^https:\/\//i.test(u || '') ? u : ''; }

  function done() {
    window.DOCTORS_LOADED = true;
    window.dispatchEvent(new Event('doctors:items-updated'));
  }

  function loadApproved() {
    if (!client) { done(); return; }
    client.from('doctor_listings')
      .select('id,name,upazila,address,phone,category,logo_url,maps_url,is_open,is_demo')
      .eq('status', 'approved')
      .order('is_demo', { ascending: true })      // আসল তথ্য আগে, ডেমো পরে
      .order('created_at', { ascending: false })
      .then(function (res) {
        var list = window.DOCTORS_ITEMS;
        list.length = 0;
        (res && res.data ? res.data : []).forEach(function (r) {
          list.push({
            id: 'db-' + r.id,
            name: r.name,
            upazila: r.upazila,
            address: r.address,
            phone: r.phone,
            category: r.category || '',
            logo: httpsOnly(r.logo_url),
            mapUrl: r.maps_url || '',
            status: r.is_open === false ? 'closed' : 'open',
            demo: !!r.is_demo
          });
        });
        done();
      }, done);
  }
  loadApproved();
})();
