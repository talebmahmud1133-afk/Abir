// টাঙ্গাইল জেলা — জনপ্রতিনিধি পেজ — নতুন তথ্য যোগের বটম শিট (ধরন অনুযায়ী আলাদা ফর্ম)
// জমা: window.PR_SUBMIT (js/public-rep-submit.js) ছবি আপলোড করে public_representatives টেবিলে status='pending' insert করে।
//    অ্যাডমিন অনুমোদন না করা পর্যন্ত পাবলিক তালিকায় আসে না।
(function () {
  var fab = document.getElementById('prFab');
  var backdrop = document.getElementById('prSheetBackdrop');
  var form = document.getElementById('prForm');
  if (!fab || !backdrop || !form) return;

  var types = window.PR_TYPES || [];
  var upazilas = window.PR_UPAZILAS || [];
  var seats = window.PR_SEATS || [];
  var wards = window.PR_WARDS || [];
  var wardGroups = window.PR_WARD_GROUPS || [];

  var sheet = document.getElementById('prSheet');
  var titleEl = document.getElementById('prSheetTitle');
  var typeEl = document.getElementById('prfType');
  var fieldsEl = document.getElementById('prFields');
  var photoEl = document.getElementById('prfPhoto');
  var previewBox = document.getElementById('prPhotoPreview');
  var hpEl = document.getElementById('prfHp');
  var msgEl = document.getElementById('prFormMsg');
  var submitBtn = document.getElementById('prSubmit');
  var cancelBtn = document.getElementById('prCancel');
  var doneEl = document.getElementById('prDone');
  var doneBtn = document.getElementById('prDoneClose');
  var photoEditBtn = document.getElementById('prPhotoEdit');

  var cropBackdrop = document.getElementById('prCropBackdrop');
  var cropBox = document.getElementById('prCrop');
  var cropViewport = document.getElementById('prCropViewport');
  var cropImg = document.getElementById('prCropImg');
  var cropZoomEl = document.getElementById('prCropZoom');
  var cropZoomInBtn = document.getElementById('prCropZoomIn');
  var cropZoomOutBtn = document.getElementById('prCropZoomOut');
  var cropCancelBtn = document.getElementById('prCropCancel');
  var cropOkBtn = document.getElementById('prCropOk');
  var cropOpen = false;
  var pickedFile = null;
  var croppedFile = null;
  var busy = false;
  var lastFocus = null;
  var previewUrl = null;

  var PHOTO_OK = /^image\/(jpeg|png|webp|gif)$/;
  var CROP_MAX_ZOOM = 3.2;
  var CROP_OUT = 800;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function typeOf(key) { for (var i = 0; i < types.length; i++) if (types[i].key === key) return types[i]; return null; }
  function opts(list, ph) {
    return '<option value="">' + esc(ph) + '</option>' + list.map(function (x) { return '<option value="' + esc(x[0]) + '">' + esc(x[1]) + '</option>'; }).join('');
  }

  // ---------- ধরন অনুযায়ী ফিল্ড আঁকা ----------
  var DEFAULT_LABELS = {
    seat: 'সংসদীয় আসন', post: 'পদবী', upazila: 'উপজেলা', union: 'ইউনিয়নের নাম', ward: 'ওয়ার্ড নম্বর',
    wardGroup: 'ওয়ার্ড (তিনটি ওয়ার্ডের জন্য একজন)', name: 'নাম', party: 'রাজনৈতিক দল', phone: 'মোবাইল নম্বর',
    address: 'ঠিকানা', map: 'Google Map লিংক'
  };
  var PLACEHOLDER = {
    union: 'যেমন: ইউনিয়নের নাম', name: 'পুরো নাম', party: 'যেমন: দলের নাম', phone: '01XXXXXXXXX',
    address: 'যেমন: কার্যালয়ের ঠিকানা', map: 'https://maps.google.com/…'
  };
  function fieldHtml(key, t) {
    var req = t.req.indexOf(key) !== -1;
    var lb = (t.labels && t.labels[key]) || DEFAULT_LABELS[key];
    var mark = req ? ' <span class="pr-req" aria-hidden="true">*</span>' : ' <span class="pr-opt">(ঐচ্ছিক)</span>';
    var id = 'prf_' + key, ctl;
    if (key === 'seat') ctl = '<select id="' + id + '"' + (req ? ' required' : '') + '>' + opts(seats, 'আসন নির্বাচন করুন') + '</select>';
    else if (key === 'post') ctl = '<select id="' + id + '"' + (req ? ' required' : '') + '>' + opts((t.posts || []).map(function (p) { return [p, p]; }), 'পদবী নির্বাচন করুন') + '</select>';
    else if (key === 'upazila') ctl = '<select id="' + id + '"' + (req ? ' required' : '') + '>' + opts(upazilas, (t.labels && t.labels.upazila ? 'পৌরসভা' : 'উপজেলা') + ' নির্বাচন করুন') + '</select>';
    else if (key === 'ward') ctl = '<select id="' + id + '"' + (req ? ' required' : '') + '>' + opts(wards, 'ওয়ার্ড নির্বাচন করুন') + '</select>';
    else if (key === 'wardGroup') ctl = '<select id="' + id + '"' + (req ? ' required' : '') + '>' + opts(wardGroups, 'ওয়ার্ড নির্বাচন করুন') + '</select>';
    else if (key === 'phone') ctl = '<input id="' + id + '" type="tel" inputmode="tel" maxlength="20" autocomplete="off" placeholder="' + PLACEHOLDER.phone + '"' + (req ? ' required' : '') + '>';
    else if (key === 'map') ctl = '<input id="' + id + '" type="url" inputmode="url" maxlength="500" autocomplete="off" placeholder="' + PLACEHOLDER.map + '">';
    else ctl = '<input id="' + id + '" type="text" maxlength="' + (key === 'address' ? 300 : 120) + '" autocomplete="off" placeholder="' + esc(key === 'address' ? 'যেমন: ' + lb : (PLACEHOLDER[key] || '')) + '"' + (req ? ' required' : '') + '>';
    return '<div class="pr-field"><label for="' + id + '">' + esc(lb) + mark + '</label>' + ctl + '</div>';
  }
  function renderFields(typeKey) {
    var t = typeOf(typeKey);
    if (!t) { fieldsEl.innerHTML = ''; return; }
    titleEl.textContent = t.formTitle;
    // ছবি ফিল্ড আলাদা (নিচে স্ট্যাটিক), তাই এখানে বাদ
    fieldsEl.innerHTML = t.fields.filter(function (k) { return k !== 'photo'; }).map(function (k) { return fieldHtml(k, t); }).join('');
  }

  typeEl.innerHTML = types.map(function (t) { return '<option value="' + esc(t.key) + '">' + t.emoji + ' ' + esc(t.label) + '</option>'; }).join('');
  typeEl.addEventListener('change', function () { renderFields(typeEl.value); setMsg(''); });

  // ---------- বটম শিট ----------
  function focusables() {
    return Array.prototype.filter.call(
      sheet.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (el) { return !el.disabled && el.offsetParent !== null && !el.closest('[hidden]'); });
  }
  function setMsg(text) { msgEl.textContent = text || ''; msgEl.hidden = !text; }
  function showForm() { form.hidden = false; doneEl.hidden = true; sheet.querySelector('.pr-sheet-head').hidden = false; setMsg(''); }
  function showDone() { form.hidden = true; sheet.querySelector('.pr-sheet-head').hidden = true; doneEl.hidden = false; doneBtn.focus(); }

  function openSheet() {
    lastFocus = document.activeElement;
    var cur = (window.PR_CURRENT_TYPE && window.PR_CURRENT_TYPE()) || (types[0] && types[0].key);
    typeEl.value = cur;            // যে চিপ খোলা আছে, ফর্ম সেই ধরনেই খোলে
    renderFields(cur);
    showForm();
    backdrop.hidden = false;
    document.body.classList.add('pr-lock');
    requestAnimationFrame(function () { backdrop.classList.add('is-open'); });
    setTimeout(function () { typeEl.focus(); }, 60);
  }
  function closeSheet() {
    if (busy) return;
    backdrop.classList.remove('is-open');
    document.body.classList.remove('pr-lock');
    setTimeout(function () { backdrop.hidden = true; }, 200);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function resetForm() {
    form.reset();
    pickedFile = null; croppedFile = null;
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
    if (e.key === 'Tab') {
      var f = focusables(); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // ---------- ছবি বাছা → জুম/সরিয়ে বসানো → প্রিভিউ ----------
  function showPreview(file) {
    var img = previewBox.querySelector('img');
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    if (file) { previewUrl = URL.createObjectURL(file); img.src = previewUrl; previewBox.hidden = false; }
    else { img.removeAttribute('src'); previewBox.hidden = true; }
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
    if (!PHOTO_OK.test(f.type)) { photoEl.value = ''; pickedFile = null; croppedFile = null; showPreview(null); setMsg('শুধু JPG, PNG বা WebP ছবি দিন।'); return; }
    if (f.size > 8 * 1024 * 1024) { photoEl.value = ''; pickedFile = null; croppedFile = null; showPreview(null); setMsg('ছবি ৮ MB এর বেশি হতে পারবে না।'); return; }
    pickedFile = f; croppedFile = null;
    startCropFlow(f, photoEl);
  });
  if (photoEditBtn) photoEditBtn.addEventListener('click', function () { if (pickedFile) startCropFlow(pickedFile, photoEditBtn); });

  // ---------- ভ্যালিডেশন ----------
  var BN = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
  function normalizePhone(v) {
    var d = String(v || '').replace(/[০-৯]/g, function (c) { return BN[c]; }).replace(/[\s\-()]/g, '');
    if (d.indexOf('+88') === 0) d = d.slice(3); else if (d.indexOf('88') === 0 && d.length === 13) d = d.slice(2);
    return d;
  }
  function validPhone(d) { return /^01[3-9]\d{8}$/.test(d) || /^0\d{8,10}$/.test(d); }
  function validMapUrl(v) { if (!v) return true; try { var u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:'; } catch (e) { return false; } }
  function markInvalid(el, text) { setMsg(text); el.setAttribute('aria-invalid', 'true'); el.focus(); }

  var ERR = {
    seat: 'সংসদীয় আসন নির্বাচন করুন।', post: 'পদবী নির্বাচন করুন।', upazila: 'উপজেলা / পৌরসভা নির্বাচন করুন।',
    union: 'ইউনিয়নের নাম লিখুন।', ward: 'ওয়ার্ড নম্বর নির্বাচন করুন।', wardGroup: 'ওয়ার্ড নির্বাচন করুন।',
    name: 'নাম লিখুন।', address: 'ঠিকানা লিখুন।'
  };

  // ---------- জমা (ভ্যালিডেশন → PR_SUBMIT) ----------
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    setMsg('');
    Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (el) { el.removeAttribute('aria-invalid'); });
    if (hpEl.value) { showDone(); return; }

    var t = typeOf(typeEl.value); if (!t) return;
    var data = { type: t.key };
    for (var i = 0; i < t.fields.length; i++) {
      var k = t.fields[i]; if (k === 'photo') continue;
      var el = document.getElementById('prf_' + k); if (!el) continue;
      var v = el.value.trim();
      if (k === 'phone') {
        v = normalizePhone(v);
        if (!validPhone(v)) return markInvalid(el, 'সঠিক মোবাইল নম্বর লিখুন (যেমন 01712345678)।');
      } else if (k === 'map') {
        if (!validMapUrl(v)) return markInvalid(el, 'Google Map লিংকটি http:// বা https:// দিয়ে শুরু হতে হবে।');
      } else if (t.req.indexOf(k) !== -1 && !v) {
        return markInvalid(el, (t.labels && t.labels[k] && k === 'address') ? t.labels[k] + ' লিখুন।' : (ERR[k] || 'তথ্য পূরণ করুন।'));
      }
      data[k] = v;
    }
    if (photoEl.files && photoEl.files[0] && !croppedFile) return markInvalid(photoEl, 'ছবিটা বসানোর ধাপ শেষ করুন, অথবা ছবি বাদ দিন।');

    if (typeof window.PR_SUBMIT !== 'function') { setMsg('সংযোগে সমস্যা হচ্ছে। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।'); return; }

    busy = true;
    submitBtn.disabled = true; cancelBtn.disabled = true;
    var submitLabel = submitBtn.textContent;
    submitBtn.textContent = croppedFile ? 'ছবি আপলোড হচ্ছে…' : 'জমা হচ্ছে…';

    window.PR_SUBMIT(data, croppedFile).then(function () {
      resetForm();
      busy = false;
      showDone();
    }).catch(function (err) {
      console.error('public-rep submit error:', err);
      busy = false;
      setMsg((err && err.message && /ছবি|সংযোগ|ইন্টারনেট/.test(err.message)) ? err.message : 'জমা দেওয়া যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।');
    }).then(function () {
      submitBtn.disabled = false; cancelBtn.disabled = false;
      submitBtn.textContent = submitLabel;
    });
  });
})();
