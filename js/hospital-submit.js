// টাঙ্গাইল জেলা — হাসপাতাল পেজ (hospital.html) — Supabase সংযোগ (ধাপ ৪-এ যুক্ত হবে), অনুমোদিত এন্ট্রি লোড, "+" ফ্লোটিং বাটন ও bottom-sheet ফর্ম
// নির্বাচিত ধরন (সরকারি/বেসরকারি হাসপাতাল, মেডিকেল কলেজ, উপজেলা স্বাস্থ্য কমপ্লেক্স, ডায়াগনস্টিক, চক্ষু, ডেন্টাল, বিশেষায়িত, মাতৃ ও শিশু, কমিউনিটি ক্লিনিক ইত্যাদি) অনুযায়ী ফিল্ড js/hospital-data.js এর
// HP_TYPES[].form (+ over) ও HP_FORM_FIELDS থেকে ডাইনামিক্যালি বসে। বাংলা ভ্যালিডেশন, honeypot, ছবি
// ক্রপ+কম্প্রেস — কুরিয়ার মডিউল (js/courier-submit.js) থেকে প্যাটার্ন কপি করা।
// • নতুন জমা সবসময় status='pending' (টেবিল hospital_entries; RLS-ও শুধু pending ইনসার্ট অনুমতি দেবে) —
//   অ্যাডমিন অনুমোদন (approved) না করা পর্যন্ত পাবলিক তালিকায় আসে না
// • শুধু 'approved' এন্ট্রি পড়া যায় (RLS); সেগুলো window.HP_PROFILES-এ বসে ও 'hospital:profiles-updated' ইভেন্ট যায়
//   (কোনো স্ট্যাটিক ডেমো নেই — অ্যাডমিন থেকে মুছলে পাবলিক পেজ থেকেও সাথে সাথে মুছে যায়)
// • ছবি: market-media বাকেটের hospital/ ফোল্ডারে (কুরিয়ারের মতো)
// • কলাম-তালিকা (লোডার ও ফর্ম-জমা দুটোর জন্য) js/hospital-data.js-এর HP_DB_TEXT_COLS / HP_DB_NUM_COLS থেকে আসে —
//   এখানে ফিল্ডের নাম হার্ডকোড নেই।
// ---------- Supabase ক্লায়েন্ট + অনুমোদিত এন্ট্রি লোড ----------
(function () {
  var client = null;
  try {
    if (window.supabase && window.TANGAIL_SUPABASE) {
      client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
    }
  } catch (e) { client = null; }
  window.HP_SB = client; // নিচের ফর্ম-কোড একই ক্লায়েন্ট ব্যবহার করে

  window.HP_LOADING = true;
  window.HP_LOADED = false;
  window.HP_LOAD_FAILED = false;

  function httpsOnly(u) { return /^https:\/\//i.test(u || '') ? u : ''; }

  function finish(failed) {
    window.HP_LOAD_FAILED = failed === true;
    window.HP_LOADING = false;
    window.HP_LOADED = true;
    window.dispatchEvent(new Event('hospital:profiles-updated'));
  }

  var TEXT_COLS = window.HP_DB_TEXT_COLS || [];
  var NUM_COLS = window.HP_DB_NUM_COLS || [];
  var COLS = ['id', 'type'].concat(TEXT_COLS, NUM_COLS, ['phone_public', 'photo_url', 'is_demo']).join(',');

  function fetchApproved(cols) {
    return client.from('hospital_entries')
      .select(cols)
      .eq('status', 'approved')
      .order('is_demo', { ascending: true })      // আসল এন্ট্রি আগে, ডেমো পরে
      .order('created_at', { ascending: false })
      .limit(500);
  }

  // extra_photos: আরও ছবির লিংক (সর্বোচ্চ ৪টি, শুধু https)
  function cleanPhotoList(v) {
    if (!Array.isArray(v)) return [];
    return v.map(httpsOnly).filter(Boolean).slice(0, 4);
  }

  function loadApproved() {
    if (!client) { finish(true); return; }
    // extra_photos / is_verified কলাম টেবিলে না থাকলে প্রথম কোয়েরি error দেয় — তখন কলাম ছাড়া আবার চেষ্টা করি, যাতে তালিকা ভেঙে না যায়
    fetchApproved(COLS + ',extra_photos,is_verified')
      .then(function (res) { return (res && res.error) ? fetchApproved(COLS) : res; })
      .then(function (res) {
        if (!res || res.error || !res.data) { window.HP_PROFILES = []; finish(true); return; } // লোড ব্যর্থ হলে খালি তালিকা + "লোড করা যায়নি" বার্তা
        var rows = res.data.map(function (r) {
          var o = { id: 'db-' + r.id, type: r.type };
          TEXT_COLS.forEach(function (k) { o[k] = r[k] || ''; });
          NUM_COLS.forEach(function (k) { o[k] = r[k]; });
          o.phone_public = r.phone_public === true;
          o.phone = o.phone_public ? (r.phone || '') : '';   // সম্মতি ছাড়া নম্বর ক্লায়েন্টে রাখা হয় না
          o.maps_url = (window.HP_isMapsUrl && window.HP_isMapsUrl(r.maps_url)) ? r.maps_url : '';   // শুধু গুগল ম্যাপের https লিংক
          o.photo_url = httpsOnly(r.photo_url);
          o.extra_photos = cleanPhotoList(r.extra_photos);
          o.is_verified = r.is_verified === true;
          o.is_demo = !!r.is_demo;
          return o;
        });
        // শুধু DB-র approved এন্ট্রি: আসল আগে, (অ্যাডমিনের যোগ করা) ডেমো পরে। DB-তে কিছু না থাকলে তালিকা খালি — স্ট্যাটিক ডেমো নেই।
        var real = rows.filter(function (r) { return !r.is_demo; });
        var dbDemo = rows.filter(function (r) { return r.is_demo; });
        window.HP_PROFILES = real.concat(dbDemo);
        finish();
      }, function () { window.HP_PROFILES = []; finish(true); });
  }
  loadApproved();
})();

(function () {
  var client = window.HP_SB || null;
  var types = window.HP_TYPES || [];
  var fieldDefs = window.HP_FORM_FIELDS || {};
  var upazilas = window.HP_UPAZILAS || [];

  var fab = document.getElementById('hpFab');
  var backdrop = document.getElementById('hpSheetBackdrop');
  var sheet = document.getElementById('hpSheet');
  var form = document.getElementById('hpForm');
  if (!fab || !backdrop || !sheet || !form || !types.length) return;

  var typeSelect = document.getElementById('hpfType');
  var dynWrap = document.getElementById('hpDynamicFields');
  var hpEl = document.getElementById('hpfHp');
  var msgEl = document.getElementById('hpFormMsg');
  var submitBtn = document.getElementById('hpSubmit');
  var cancelBtn = document.getElementById('hpCancel');
  var doneEl = document.getElementById('hpDone');
  var doneBtn = document.getElementById('hpDoneClose');

  // ক্রপ ডায়ালগ
  var cropBackdrop = document.getElementById('hpCropBackdrop');
  var cropBox = document.getElementById('hpCrop');
  var cropViewport = document.getElementById('hpCropViewport');
  var cropImg = document.getElementById('hpCropImg');
  var cropZoomEl = document.getElementById('hpCropZoom');
  var cropZoomInBtn = document.getElementById('hpCropZoomIn');
  var cropZoomOutBtn = document.getElementById('hpCropZoomOut');
  var cropCancelBtn = document.getElementById('hpCropCancel');
  var cropOkBtn = document.getElementById('hpCropOk');
  var cropOpen = false;
  var pickedFile = null;
  var croppedFile = null;
  var previewUrl = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // ফিল্ডের সংজ্ঞা = HP_FORM_FIELDS[key] + এই চিপের নিজস্ব over[key] (label / required ইত্যাদি বদল)
  function defFor(t, key) {
    var base = fieldDefs[key];
    if (!base) return null;
    var o = t && t.over && t.over[key];
    if (!o) return base;
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    Object.keys(o).forEach(function (k) { out[k] = o[k]; });
    return out;
  }
  function typeOf(key) {
    for (var i = 0; i < types.length; i++) if (types[i].key === key) return types[i];
    return null;
  }

  // ---------- টাইপ ড্রপডাউন ----------
  typeSelect.innerHTML = types.map(function (t) {
    return '<option value="' + esc(t.key) + '">' + esc(t.label) + '</option>';
  }).join('');

  // ---------- ডাইনামিক ফিল্ড রেন্ডার ----------
  function optionsHtml(def) {
    if (def.options === 'HP_UPAZILAS') {
      return '<option value="">উপজেলা নির্বাচন করুন</option>' +
        upazilas.map(function (u) { return '<option value="' + esc(u[0]) + '">' + esc(u[1]) + '</option>'; }).join('');
    }
    var list = def.options || [];
    return '<option value="">নির্বাচন করুন</option>' +
      list.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('');
  }

  function fieldHtml(t, key) {
    var def = defFor(t, key);
    if (!def) return '';
    var id = 'hpf_' + key;
    var reqMark = def.required ? ' <span class="hp-req" aria-hidden="true">*</span>' : ' <span class="hp-opt">(ঐচ্ছিক)</span>';

    if (def.type === 'select') {
      return '<div class="hp-field"><label for="' + id + '">' + esc(def.label) + reqMark + '</label>' +
        '<select id="' + id + '" data-key="' + key + '"' + (def.required ? ' required' : '') + '>' + optionsHtml(def) + '</select></div>';
    }
    if (def.type === 'textarea') {
      return '<div class="hp-field"><label for="' + id + '">' + esc(def.label) + reqMark + '</label>' +
        '<textarea id="' + id + '" data-key="' + key + '" maxlength="' + (def.maxlen || 500) + '"' + (def.required ? ' required' : '') + '></textarea></div>';
    }
    if (def.type === 'number') {
      return '<div class="hp-field"><label for="' + id + '">' + esc(def.label) + reqMark + '</label>' +
        '<input type="number" id="' + id + '" data-key="' + key + '" inputmode="numeric"' +
        (def.min != null ? ' min="' + def.min + '"' : '') + (def.max != null ? ' max="' + def.max + '"' : '') +
        (def.required ? ' required' : '') + '>' +
        (def.msg ? '<p class="hp-hint">' + esc(def.msg) + '</p>' : '') + '</div>';
    }
    if (def.type === 'checkbox') {
      return '<div class="hp-field hp-field-check" id="' + id + 'Wrap">' +
        '<label><input type="checkbox" id="' + id + '" data-key="' + key + '"' + (def.required ? ' required' : '') + '><span>' + esc(def.label) + reqMark + '</span></label></div>';
    }
    if (def.type === 'file') {
      return '<div class="hp-field"><label for="' + id + '">' + esc(def.label) + '</label>' +
        '<input type="file" id="' + id + '" data-key="' + key + '" accept="' + esc(def.accept || 'image/jpeg,image/png,image/webp,image/gif') + '" class="hp-file">' +
        '<div class="hp-photo-preview" id="' + id + 'Preview" hidden>' +
          '<img alt="নির্বাচিত ছবির প্রিভিউ">' +
          '<button type="button" class="hp-photo-edit" id="' + id + 'Edit"><i class="fa-solid fa-crop-simple" aria-hidden="true"></i><span>ছবি ঠিক করুন</span></button>' +
        '</div></div>';
    }
    if (def.type === 'photos') {
      var slots = '';
      var nSlots = def.max || 4;
      var accept = esc(def.accept || 'image/jpeg,image/png,image/webp,image/gif');
      var BNS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      for (var s = 0; s < nSlots; s++) {
        var bnN = String(s + 1).replace(/[0-9]/g, function (d) { return BNS[+d]; });
        slots += '<div class="hp-xslot" data-slot="' + s + '">' +
          '<input type="file" class="hp-xfile" id="' + id + '_' + s + '" accept="' + accept + '" hidden>' +
          '<button type="button" class="hp-xadd" data-slot="' + s + '" aria-label="আরও ছবি ' + bnN + ' যোগ করুন"><i class="fa-solid fa-plus" aria-hidden="true"></i><span>ছবি ' + bnN + '</span></button>' +
          '<img class="hp-xthumb" alt="আরও ছবি ' + bnN + ' এর প্রিভিউ" hidden>' +
          '<button type="button" class="hp-xrm" data-slot="' + s + '" aria-label="আরও ছবি ' + bnN + ' সরান" hidden><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
        '</div>';
      }
      return '<div class="hp-field hp-xfield" id="' + id + '" data-max="' + nSlots + '">' +
        '<span class="hp-xlabel">' + esc(def.label) + ' <span class="hp-opt">— সর্বোচ্চ ' + String(nSlots).replace(/[0-9]/g, function (d) { return BNS[+d]; }) + 'টি</span></span>' +
        '<p class="hp-xhint">প্রধান ছবিতে ক্লিক করলে এই ছবিগুলোও দেখা যাবে। (আগে প্রধান ছবি দিন)</p>' +
        '<div class="hp-xgrid">' + slots + '</div></div>';
    }
    // text / tel / url (default)
    var inputType = def.type === 'tel' ? 'tel' : (def.type === 'url' ? 'url' : 'text');
    return '<div class="hp-field"><label for="' + id + '">' + esc(def.label) + reqMark + '</label>' +
      '<input type="' + inputType + '" id="' + id + '" data-key="' + key + '"' +
      (inputType === 'tel' ? ' inputmode="tel"' : (inputType === 'url' ? ' inputmode="url" placeholder="https://maps.app.goo.gl/…"' : '')) +
      (def.maxlen ? ' maxlength="' + def.maxlen + '"' : '') + ' autocomplete="off"' +
      (def.required ? ' required' : '') + '></div>';
  }

  var photoEl = null, previewBox = null, photoEditBtn = null;

  function renderFields(typeKey) {
    var t = typeOf(typeKey) || types[0];
    // ছবি স্টেট রিসেট (ফিল্ড বদলালে আগের ছবি রাখা ঠিক না — ভিন্ন ফর্ম)
    pickedFile = null; croppedFile = null;
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    clearAllExtras();

    dynWrap.innerHTML = t.form.map(function (k) { return fieldHtml(t, k); }).join('');
    bindExtras();

    // ফাইল ফিল্ড থাকলে হ্যান্ডেল বসাও
    var fileKey = null;
    t.form.forEach(function (k) { if (fieldDefs[k] && fieldDefs[k].type === 'file') fileKey = k; });
    photoEl = fileKey ? document.getElementById('hpf_' + fileKey) : null;
    previewBox = fileKey ? document.getElementById('hpf_' + fileKey + 'Preview') : null;
    photoEditBtn = fileKey ? document.getElementById('hpf_' + fileKey + 'Edit') : null;

    if (photoEl) {
      photoEl.addEventListener('change', onPhotoChange);
    }
    if (photoEditBtn) {
      photoEditBtn.addEventListener('click', function () {
        if (pickedFile) startCropFlow(pickedFile, photoEditBtn);
      });
    }
  }

  typeSelect.addEventListener('change', function () { renderFields(typeSelect.value); setMsg(''); });

  // ---------- বটম শিট খোলা/বন্ধ ----------
  var lastFocus = null;
  var busy = false;

  function focusables() {
    return Array.prototype.filter.call(
      sheet.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (el) { return !el.disabled && el.offsetParent !== null && !el.closest('[hidden]'); }
    );
  }

  function initialType() {
    var activeChip = document.querySelector('#hospitalCats .hp-cat.is-active');
    var cat = activeChip ? activeChip.getAttribute('data-cat') : 'all';
    return (cat && cat !== 'all' && typeOf(cat)) ? cat : types[0].key;
  }

  function openSheet() {
    lastFocus = document.activeElement;
    var t0 = initialType();
    typeSelect.value = t0;
    renderFields(t0);
    showForm();
    backdrop.hidden = false;
    document.body.classList.add('hp-lock');
    requestAnimationFrame(function () { backdrop.classList.add('is-open'); });
    setTimeout(function () { typeSelect.focus(); }, 60);
  }

  function closeSheet() {
    if (busy) return;
    backdrop.classList.remove('is-open');
    document.body.classList.remove('hp-lock');
    setTimeout(function () { backdrop.hidden = true; }, 200);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function showForm() {
    form.hidden = false;
    doneEl.hidden = true;
    sheet.querySelector('.hp-sheet-head').hidden = false;
    setMsg('');
  }
  function showDone() {
    form.hidden = true;
    sheet.querySelector('.hp-sheet-head').hidden = true;
    doneEl.hidden = false;
    doneBtn.focus();
  }
  function setMsg(text) {
    msgEl.textContent = text || '';
    msgEl.hidden = !text;
  }

  function resetForm() {
    form.reset();
    pickedFile = null; croppedFile = null;
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    if (previewBox) { previewBox.hidden = true; var img = previewBox.querySelector('img'); if (img) img.removeAttribute('src'); }
    clearAllExtras();
  }

  fab.addEventListener('click', openSheet);
  cancelBtn.addEventListener('click', closeSheet);
  doneBtn.addEventListener('click', closeSheet);
  backdrop.addEventListener('click', function (e) { if (e.target === backdrop) closeSheet(); });
  document.addEventListener('keydown', function (e) {
    if (backdrop.hidden || cropOpen) return;
    if (e.key === 'Escape') { closeSheet(); return; }
    if (e.key === 'Tab') {
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // ---------- ছবি বাছা → জুম/সরিয়ে বসানো → প্রিভিউ ----------
  var PHOTO_OK = /^image\/(jpeg|png|webp|gif)$/;
  var CROP_MAX_ZOOM = 3.2;
  var CROP_OUT = 800;

  function showPreview(file) {
    if (!previewBox) return;
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
      function setZoom(z, cx, cy) {
        if (!ready) return;
        z = Math.max(1, Math.min(CROP_MAX_ZOOM, z));
        var ix = (cx - tx) / scale, iy = (cy - ty) / scale;
        zoom = z; scale = baseScale * zoom;
        tx = cx - ix * scale; ty = cy - iy * scale;
        clampPos(); apply();
        cropZoomEl.value = String(Math.round(zoom * 100));
      }
      function measure() {
        vpW = cropViewport.clientWidth; vpH = cropViewport.clientHeight;
        if (!vpW || !vpH || !natW || !natH) return false;
        baseScale = Math.max(vpW / natW, vpH / natH);
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
        if (!croppedFile) { pickedFile = null; if (photoEl) photoEl.value = ''; showPreview(null); }
        return;
      }
      croppedFile = result;
      showPreview(croppedFile);
    });
  }

  function onPhotoChange() {
    var f = photoEl.files && photoEl.files[0];
    if (!f) { pickedFile = null; croppedFile = null; showPreview(null); return; }
    setMsg('');
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
  }

  // ---------- আরও ছবি (ঐচ্ছিক, সর্বোচ্চ ৪টি) ----------
  // প্রধান ছবির মতো ক্রপ হয় না — ছবি নিজের মাপেই থাকে (লাইটবক্সে পুরো ছবি দেখানোর জন্য); জমার সময় শুধু কম্প্রেস হয়।
  var extraFiles = [];      // স্লট নম্বর → File
  var extraUrls = [];       // স্লট নম্বর → প্রিভিউয়ের object URL

  function slotEl(idx) {
    return dynWrap.querySelector('.hp-xslot[data-slot="' + idx + '"]');
  }

  function paintSlot(idx) {
    var slot = slotEl(idx);
    if (!slot) return;
    var has = !!extraFiles[idx];
    var thumb = slot.querySelector('.hp-xthumb');
    var rm = slot.querySelector('.hp-xrm');
    slot.classList.toggle('has-photo', has);
    if (has) { thumb.src = extraUrls[idx]; thumb.hidden = false; rm.hidden = false; }
    else { thumb.removeAttribute('src'); thumb.hidden = true; rm.hidden = true; }
  }

  function clearSlot(idx) {
    if (extraUrls[idx]) { URL.revokeObjectURL(extraUrls[idx]); }
    extraFiles[idx] = null; extraUrls[idx] = null;
    var slot = slotEl(idx);
    var inp = slot && slot.querySelector('.hp-xfile');
    if (inp) inp.value = '';
    paintSlot(idx);
  }

  function clearAllExtras() {
    for (var i = 0; i < extraUrls.length; i++) { if (extraUrls[i]) URL.revokeObjectURL(extraUrls[i]); }
    extraFiles = []; extraUrls = [];
  }

  function onExtraPicked(idx, inp) {
    var f = inp.files && inp.files[0];
    if (!f) { clearSlot(idx); return; }
    setMsg('');
    if (!PHOTO_OK.test(f.type)) {
      clearSlot(idx); setMsg('শুধু JPG, PNG বা WebP ছবি দিন।'); return;
    }
    if (f.size > 8 * 1024 * 1024) {
      clearSlot(idx); setMsg('ছবি ৮ MB এর বেশি হতে পারবে না।'); return;
    }
    if (extraUrls[idx]) URL.revokeObjectURL(extraUrls[idx]);
    extraFiles[idx] = f;
    extraUrls[idx] = URL.createObjectURL(f);
    paintSlot(idx);
  }

  function bindExtras() {
    var wrap = document.getElementById('hpf_photos');
    if (!wrap) return;
    wrap.addEventListener('click', function (e) {
      var add = e.target.closest ? e.target.closest('.hp-xadd') : null;
      if (add) {
        if (!croppedFile) {
          setMsg('আগে প্রধান ছবি যোগ করুন — তারপর আরও ছবি দিতে পারবেন।');
          if (photoEl) photoEl.focus();
          return;
        }
        setMsg('');
        var inp = wrap.querySelector('#hpf_photos_' + add.getAttribute('data-slot'));
        if (inp) inp.click();
        return;
      }
      var rm = e.target.closest ? e.target.closest('.hp-xrm') : null;
      if (rm) clearSlot(parseInt(rm.getAttribute('data-slot'), 10));
    });
    wrap.addEventListener('change', function (e) {
      var inp = e.target;
      if (!inp || !inp.classList || !inp.classList.contains('hp-xfile')) return;
      var slot = inp.closest('.hp-xslot');
      onExtraPicked(parseInt(slot.getAttribute('data-slot'), 10), inp);
    });
  }

  // ---------- ভ্যালিডেশন ----------
  var BN = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
  function normalizePhone(v) {
    var d = String(v || '').replace(/[০-৯]/g, function (c) { return BN[c]; }).replace(/[\s\-()]/g, '');
    if (d.indexOf('+88') === 0) d = d.slice(3);
    else if (d.indexOf('88') === 0 && d.length === 13) d = d.slice(2);
    return d;
  }
  function toBnDigits(v) {
    return String(v || '').replace(/[০-৯]/g, function (c) { return BN[c]; });
  }

  function markInvalid(el, wrapEl, text) {
    setMsg(text);
    if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); }
    if (wrapEl) wrapEl.classList.add('is-invalid');
  }

  // ---------- ছবি কম্প্রেস + আপলোড (market-media বাকেট, কুরিয়ারের মতো) ----------
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
    var path = 'hospital/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + safeName;
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

  // ফর্মের ডাটা → টেবিলের কলাম (শুধু তালিকাভুক্ত কলাম যায়; খালি ঐচ্ছিক ফিল্ড বাদ; status সবসময় pending)
  var DB_COLS = ['type'].concat(window.HP_DB_TEXT_COLS || [], window.HP_DB_NUM_COLS || []);
  function buildRow(data, photoUrl, extraPhotoUrls) {
    var row = {};
    DB_COLS.forEach(function (k) {
      var v = data[k];
      if (v === undefined || v === null || v === '') return;
      row[k] = v;
    });
    row.phone_public = data.phone_consent === true;
    row.photo_url = photoUrl || '';
    // extra_photos শুধু আরও ছবি থাকলেই পাঠানো হয় — তাই কলাম যোগ করার SQL না চালানো থাকলেও ছবি ছাড়া জমা আগের মতো চলে
    if (extraPhotoUrls && extraPhotoUrls.length) row.extra_photos = extraPhotoUrls;
    row.status = 'pending';   // সবসময় Pending Review
    row.is_demo = false;
    return row;
  }

  // ---------- জমা ----------
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    setMsg('');
    Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (el) { el.removeAttribute('aria-invalid'); });
    Array.prototype.forEach.call(form.querySelectorAll('.hp-field-check.is-invalid'), function (el) { el.classList.remove('is-invalid'); });

    if (hpEl.value) { showDone(); return; } // বট — চুপচাপ উপেক্ষা

    var t = typeOf(typeSelect.value) || types[0];
    var data = { type: t.key };

    for (var i = 0; i < t.form.length; i++) {
      var key = t.form[i];
      var def = defFor(t, key);
      if (!def) continue;
      var el = document.getElementById('hpf_' + key);
      if (!el) continue;

      if (def.type === 'photos') {
        var extraList = extraFiles.filter(Boolean).slice(0, def.max || 4);
        if (extraList.length && !croppedFile) {
          return markInvalid(photoEl, null, 'আরও ছবি দিতে হলে আগে প্রধান ছবি যোগ করুন।');
        }
        data[key] = extraList;
        continue;
      }
      if (def.type === 'checkbox') {
        var wrap = document.getElementById('hpf_' + key + 'Wrap');
        if (def.required && !el.checked) return markInvalid(el, wrap, def.msg || (esc(def.label) + ' প্রয়োজন।'));
        data[key] = el.checked;
        continue;
      }
      if (def.type === 'file') {
        if (photoEl && photoEl.files && photoEl.files[0] && !croppedFile) {
          return markInvalid(photoEl, null, 'ছবিটা বসানোর ধাপ শেষ করুন, অথবা ছবি বাদ দিন।');
        }
        data[key] = croppedFile || null;
        continue;
      }

      var raw = el.value;
      var val = (typeof raw === 'string') ? raw.trim() : raw;

      if (def.type === 'number') {
        if (!val && def.required) return markInvalid(el, null, def.label + ' লিখুন।');
        if (val) {
          var num = parseInt(toBnDigits(val), 10);
          if (isNaN(num) || (def.min != null && num < def.min) || (def.max != null && num > def.max)) {
            return markInvalid(el, null, def.msg || (def.label + ' ঠিকভাবে দিন।'));
          }
          val = num;
        }
      } else if (def.type === 'tel') {
        if (!val && def.required) return markInvalid(el, null, def.label + ' লিখুন।');
        if (val) {
          var norm = normalizePhone(val);
          if (def.pattern && !new RegExp(def.pattern).test(norm)) return markInvalid(el, null, def.msg || 'সঠিক মোবাইল নম্বর দিন (যেমন 01712345678)।');
          val = norm;
        }
      } else if (def.type === 'select') {
        if (def.required && !val) return markInvalid(el, null, def.label + ' নির্বাচন করুন।');
      } else if (def.type === 'url') {
        if (!val && def.required) return markInvalid(el, null, def.label + ' লিখুন।');
        if (val && !(window.HP_isMapsUrl && window.HP_isMapsUrl(val))) return markInvalid(el, null, def.msg || 'সঠিক লিংক দিন।');
      } else {
        if (def.required && !val) return markInvalid(el, null, def.label + ' লিখুন।');
        if (def.maxlen && val.length > def.maxlen) return markInvalid(el, null, def.label + ' সর্বোচ্চ ' + def.maxlen + ' অক্ষর হতে পারবে।');
      }
      data[key] = val;
    }

    if (!client) { setMsg('সংযোগে সমস্যা হচ্ছে। ইন্টারনেট চেক করে আবার চেষ্টা করুন।'); return; }

    busy = true;
    submitBtn.disabled = true; cancelBtn.disabled = true;
    var extraToUpload = data.photos || [];
    submitBtn.textContent = (data.photo || extraToUpload.length) ? 'ছবি আপলোড হচ্ছে…' : 'জমা হচ্ছে…';

    var step = data.photo
      ? compressImageFile(data.photo).then(uploadImage)
      : Promise.resolve('');

    step.then(function (photoUrl) {
      // আরও ছবি: প্রতিটা কম্প্রেস করে আপলোড (একসাথে)
      if (!extraToUpload.length) return { main: photoUrl, extra: [] };
      return Promise.all(extraToUpload.map(function (f) {
        return compressImageFile(f).then(uploadImage);
      })).then(function (urls) { return { main: photoUrl, extra: urls }; });
    }).then(function (up) {
      submitBtn.textContent = 'জমা হচ্ছে…';
      return client.from('hospital_entries').insert(buildRow(data, up.main, up.extra));
    }).then(function (res) {
      if (res && res.error) throw res.error;
      resetForm();
      busy = false;
      showDone();
    }).catch(function (err) {
      console.error('hospital submit error:', err);
      busy = false;
      setMsg((err && err.message && /ছবি|নেটওয়ার্ক/.test(err.message)) ? err.message : 'জমা দেওয়া যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।');
    }).then(function () {
      submitBtn.disabled = false; cancelBtn.disabled = false;
      submitBtn.textContent = 'জমা দিন';
    });
  });
})();
