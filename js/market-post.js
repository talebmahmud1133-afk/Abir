// টাঙ্গাইল জেলা — কেনাবেচা মডিউল: পোস্ট করার পেজ লজিক
// টেবিল: marketplace_listings | স্টোরেজ বাকেট: market-media
(function () {
  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);

  var CATEGORIES = [
    { slug: 'mobile',      label: 'মোবাইল' },
    { slug: 'motorcycle',  label: 'মোটরসাইকেল' },
    { slug: 'car',         label: 'গাড়ি' },
    { slug: 'house-land',  label: 'বাড়ি/জমি' },
    { slug: 'electronics', label: 'ইলেকট্রনিক্স' },
    { slug: 'furniture',   label: 'ফার্নিচার' },
    { slug: 'clothing',    label: 'পোশাক' },
    { slug: 'agriculture', label: 'কৃষি' },
    { slug: 'other',       label: 'অন্যান্য' }
  ];

  var UPAZILAS = [
    'টাঙ্গাইল সদর', 'মির্জাপুর', 'দেলদুয়ার', 'বাসাইল', 'কালিহাতী', 'ঘাটাইল',
    'গোপালপুর', 'মধুপুর', 'ধনবাড়ী', 'ভূঞাপুর', 'নাগরপুর', 'সখীপুর'
  ];

  var MAX_IMAGES = 3;
  var slots = [null, null, null]; // File objects
  var currentUser = null;

  var catSelect = document.getElementById('mpCategory');
  var upazilaSelect = document.getElementById('mpUpazila');
  var imgPicker = document.getElementById('mpImgPicker');
  var fileInput = document.getElementById('mpFileInput');
  var form = document.getElementById('mpForm');
  var submitBtn = document.getElementById('mpSubmitBtn');
  var msgEl = document.getElementById('mpMsg');
  var progressWrap = document.getElementById('mpProgressWrap');
  var progressBar = document.getElementById('mpProgressBar');
  var progressText = document.getElementById('mpProgressText');
  var activeSlotIndex = 0;

  catSelect.innerHTML = '<option value="">ক্যাটাগরি নির্বাচন করুন</option>' +
    CATEGORIES.map(function (c) { return '<option value="' + c.slug + '">' + c.label + '</option>'; }).join('');
  upazilaSelect.innerHTML = '<option value="">উপজেলা নির্বাচন করুন</option>' +
    UPAZILAS.map(function (u) { return '<option value="' + u + '">' + u + '</option>'; }).join('');

  client.auth.getSession().then(function (res) {
    currentUser = res.data && res.data.session && res.data.session.user;
  });
  client.auth.onAuthStateChange(function (event, session) {
    currentUser = session && session.user;
  });

  function setMsg(text, ok) {
    msgEl.textContent = text || '';
    msgEl.className = 'auth-msg' + (ok ? ' ok' : '');
  }

  // ---------- ছবি স্লট রেন্ডার ----------
  function renderSlots() {
    imgPicker.innerHTML = slots.map(function (file, i) {
      if (file) {
        return '<div class="bs-img-slot" data-idx="' + i + '">' +
          '<img src="' + file.__previewUrl + '" alt="ছবি ' + (i + 1) + '">' +
          '<span class="bs-img-remove" data-remove="' + i + '"><i class="fa-solid fa-xmark" aria-hidden="true"></i></span>' +
        '</div>';
      }
      return '<div class="bs-img-slot" data-idx="' + i + '">' +
        '<i class="fa-solid fa-camera" aria-hidden="true"></i><span>' + (i === 0 ? 'ছবি যোগ করুন (আবশ্যক)' : 'ছবি যোগ করুন') + '</span>' +
      '</div>';
    }).join('');
  }
  renderSlots();

  imgPicker.addEventListener('click', function (e) {
    var removeBtn = e.target.closest('[data-remove]');
    if (removeBtn) {
      e.stopPropagation();
      var ri = Number(removeBtn.getAttribute('data-remove'));
      if (slots[ri] && slots[ri].__previewUrl) URL.revokeObjectURL(slots[ri].__previewUrl);
      slots[ri] = null;
      renderSlots();
      return;
    }
    var slot = e.target.closest('.bs-img-slot');
    if (!slot) return;
    activeSlotIndex = Number(slot.getAttribute('data-idx'));
    fileInput.click();
  });

  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMsg('শুধুমাত্র ছবি ফাইল যুক্ত করা যাবে।'); return; }
    setMsg('');
    file.__previewUrl = URL.createObjectURL(file);
    slots[activeSlotIndex] = file;
    renderSlots();
  });

  // ---------- বড় ছবি ছোট করে কম্প্রেস করা ----------
  function compressImageFile(file) {
    return new Promise(function (resolve) {
      var objectUrl = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(objectUrl);
        var maxDim = 1600;
        var w = img.width, h = img.height;
        if (w <= maxDim && h <= maxDim && file.size <= 700 * 1024) { resolve(file); return; }
        var scale = Math.min(1, maxDim / Math.max(w, h));
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          if (!blob) { resolve(file); return; }
          var newName = file.name.replace(/\.\w+$/, '') + '.jpg';
          var compressed = new File([blob], newName, { type: 'image/jpeg' });
          resolve(compressed.size < file.size ? compressed : file);
        }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(objectUrl); resolve(file); };
      img.src = objectUrl;
    });
  }

  // ---------- Supabase Storage-এ XHR দিয়ে আপলোড (প্রোগ্রেস ট্র্যাক করার জন্য) ----------
  function uploadImage(file, onProgress) {
    var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    var path = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + safeName;
    // লগইন করা ইউজারের টোকেনে আপলোড → ফাইলের owner = ইউজার, তাই লিস্টিং মুছলে সে নিজেই ছবি মুছতে পারে
    // (market_media_owner_delete পলিসি); anon কী দিলে owner ফাঁকা থাকত, শুধু অ্যাডমিন মুছতে পারত।
    return client.auth.getSession().then(function (r) {
      return (r && r.data && r.data.session && r.data.session.access_token) || window.TANGAIL_SUPABASE.key;
    }, function () { return window.TANGAIL_SUPABASE.key; }).then(function (token) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      var endpoint = window.TANGAIL_SUPABASE.url + '/storage/v1/object/market-media/' + path;
      xhr.open('POST', endpoint, true);
      xhr.setRequestHeader('apikey', window.TANGAIL_SUPABASE.key);
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.setRequestHeader('x-upsert', 'false');
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = function (e) {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(client.storage.from('market-media').getPublicUrl(path).data.publicUrl);
        } else {
          reject(new Error('ছবি আপলোড ব্যর্থ (' + xhr.status + ')'));
        }
      };
      xhr.onerror = function () { reject(new Error('নেটওয়ার্ক সমস্যা হয়েছে')); };
      xhr.send(file);
    });
    });
  }

  function showProgress(pct) {
    progressWrap.hidden = false;
    progressBar.style.width = pct + '%';
    progressText.textContent = pct.toLocaleString('bn-BD') + '%';
  }
  function hideProgress() { progressWrap.hidden = true; progressBar.style.width = '0%'; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var title = document.getElementById('mpTitle').value.trim();
    var price = document.getElementById('mpPrice').value.trim();
    var category = catSelect.value;
    var upazila = upazilaSelect.value;
    var phone = document.getElementById('mpPhone').value.trim();
    var description = document.getElementById('mpDescription').value.trim();
    var files = slots.filter(Boolean);

    if (!files.length) { setMsg('অন্তত ১টি ছবি যুক্ত করুন।'); return; }
    if (!title) { setMsg('পণ্যের নাম লিখুন।'); return; }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) { setMsg('সঠিক দাম লিখুন।'); return; }
    if (!category) { setMsg('ক্যাটাগরি নির্বাচন করুন।'); return; }
    if (!upazila) { setMsg('উপজেলা নির্বাচন করুন।'); return; }
    if (!phone || phone.replace(/\D/g, '').length < 11) { setMsg('সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন।'); return; }
    if (!description) { setMsg('পণ্যের বিবরণ লিখুন।'); return; }

    submitBtn.disabled = true;
    setMsg('ছবি প্রস্তুত করা হচ্ছে…', true);

    var uploadedUrls = [];
    var chain = Promise.resolve();
    files.forEach(function (file, i) {
      chain = chain.then(function () {
        return compressImageFile(file).then(function (processed) {
          setMsg('ছবি আপলোড হচ্ছে (' + (i + 1) + '/' + files.length + ')…', true);
          showProgress(0);
          return uploadImage(processed, showProgress);
        }).then(function (url) { uploadedUrls.push(url); });
      });
    });

    chain.then(function () {
      hideProgress();
      setMsg('পোস্ট জমা দেওয়া হচ্ছে…', true);
      return client.from('marketplace_listings').insert({
        user_id: currentUser ? currentUser.id : null,
        title: title,
        price: Number(price),
        category: category,
        upazila: upazila,
        phone: phone.replace(/\D/g, ''),
        description: description,
        images: uploadedUrls,
        status: 'approved'
      }).select();
    }).then(function (res) {
      submitBtn.disabled = false;
      if (res.error) {
        console.error('marketplace_listings insert error:', res.error);
        var detail = res.error.message || res.error.code || '';
        setMsg('পোস্ট করতে সমস্যা হয়েছে, একটু পর আবার চেষ্টা করুন।' + (detail ? ' (' + detail + ')' : ''));
        return;
      }
      var added = res.data && res.data[0];
      setMsg('আপনার পোস্ট প্রকাশিত হয়েছে!', true);
      setTimeout(function () {
        window.location.href = added ? ('market-item.html?id=' + added.id) : 'buy-sell.html';
      }, 900);
    }).catch(function (err) {
      submitBtn.disabled = false;
      hideProgress();
      setMsg((err && err.message) || 'আপলোড করতে সমস্যা হয়েছে, একটু পর আবার চেষ্টা করুন।');
    });
  });
})();
