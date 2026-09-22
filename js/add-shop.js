// টাঙ্গাইল জেলা — দোকান ডিরেক্টরি মডিউল: দোকান যুক্ত করার ফর্ম লজিক
// টেবিল: shops | স্টোরেজ বাকেট: market-media (বিদ্যমান বাকেট পুনর্ব্যবহার করা হয়েছে)
// নতুন দোকান সবসময় status='pending' নিয়ে জমা হয় — অ্যাডমিন অনুমোদনের পর
// সেটি 'approved' হয়ে দোকান ডিরেক্টরিতে (business-directory.html) দেখা যায়।
(function () {
  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
  var CATEGORIES = window.TZ_SHOP.CATEGORIES.filter(function (c) { return c.slug !== 'all'; });

  var UPAZILAS = [
    'টাঙ্গাইল সদর', 'মির্জাপুর', 'দেলদুয়ার', 'বাসাইল', 'কালিহাতী', 'ঘাটাইল',
    'গোপালপুর', 'মধুপুর', 'ধনবাড়ী', 'ভূঞাপুর', 'নাগরপুর', 'সখীপুর'
  ];

  var slots = [null, null]; // [0]=প্রোফাইল ছবি (logo), [1]=ব্যানার (cover) — ক্রপ করা ফাইল
  var origFiles = [null, null]; // ক্রপের আগের মূল ছবি (পরে আবার জুম/অবস্থান ঠিক করার জন্য)
  var currentUser = null;
  var activeSlotIndex = 0;

  var catSelect = document.getElementById('shopCategory');
  var upazilaSelect = document.getElementById('shopUpazila');
  var imgPicker = document.getElementById('shopImgPicker');
  var fileInput = document.getElementById('shopFileInput');
  var form = document.getElementById('shopForm');
  var submitBtn = document.getElementById('shopSubmitBtn');
  var msgEl = document.getElementById('shopMsg');
  var progressWrap = document.getElementById('shopProgressWrap');
  var progressBar = document.getElementById('shopProgressBar');
  var progressText = document.getElementById('shopProgressText');

  var SLOT_META = [
    { label: 'প্রোফাইল ছবি', icon: 'fa-image', aspect: 1, outWidth: 600, shape: 'circle', title: 'প্রোফাইল ছবি সাজান', file: 'profile.jpg' },
    { label: 'ব্যানার', icon: 'fa-panorama', aspect: 2, outWidth: 1200, shape: 'rect', title: 'ব্যানার সাজান', file: 'banner.jpg' }
  ];

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

  // ---------- ছবি স্লট রেন্ডার (প্রোফাইল ছবি / ব্যানার) ----------
  function renderSlots() {
    imgPicker.innerHTML = slots.map(function (file, i) {
      var wide = i === 1 ? ' style="width:192px"' : '';
      if (file) {
        return '<div class="shop-img-slot" data-idx="' + i + '"' + wide + '>' +
          '<img src="' + file.__previewUrl + '" alt="' + SLOT_META[i].label + '">' +
          '<span class="shop-img-remove" data-remove="' + i + '" title="সরান"><i class="fa-solid fa-xmark" aria-hidden="true"></i></span>' +
          '<span class="shop-img-adjust" data-adjust="' + i + '" title="জুম/অবস্থান ঠিক করুন"><i class="fa-solid fa-crop-simple" aria-hidden="true"></i></span>' +
        '</div>';
      }
      return '<div class="shop-img-slot" data-idx="' + i + '"' + wide + '>' +
        '<i class="fa-solid ' + SLOT_META[i].icon + '" aria-hidden="true"></i><span>' + SLOT_META[i].label + '</span>' +
      '</div>';
    }).join('');
  }
  renderSlots();

  // ক্রপ এডিটর (জুম ইন/আউট + টেনে বসানো) খুলে ফলাফল স্লটে বসানো
  function cropIntoSlot(idx, file) {
    var meta = SLOT_META[idx];
    window.TZCropper.open({
      file: file, aspect: meta.aspect, outWidth: meta.outWidth, shape: meta.shape, title: meta.title, quality: 0.85
    }).then(function (prepared) {
      var out = new File([prepared.blob], meta.file, { type: 'image/jpeg' });
      if (slots[idx] && slots[idx].__previewUrl) URL.revokeObjectURL(slots[idx].__previewUrl);
      out.__previewUrl = URL.createObjectURL(out);
      slots[idx] = out;
      origFiles[idx] = file;
      renderSlots();
    }).catch(function (err) {
      if (err && err.cancelled) return;
      setMsg(err && err.message ? err.message : 'ছবি প্রসেস করা যায়নি।');
    });
  }

  imgPicker.addEventListener('click', function (e) {
    var removeBtn = e.target.closest('[data-remove]');
    if (removeBtn) {
      e.stopPropagation();
      var ri = Number(removeBtn.getAttribute('data-remove'));
      if (slots[ri] && slots[ri].__previewUrl) URL.revokeObjectURL(slots[ri].__previewUrl);
      slots[ri] = null;
      origFiles[ri] = null;
      renderSlots();
      return;
    }
    var adjustBtn = e.target.closest('[data-adjust]');
    if (adjustBtn) {
      e.stopPropagation();
      var ai = Number(adjustBtn.getAttribute('data-adjust'));
      if (origFiles[ai]) cropIntoSlot(ai, origFiles[ai]);
      return;
    }
    var slot = e.target.closest('.shop-img-slot');
    if (!slot) return;
    activeSlotIndex = Number(slot.getAttribute('data-idx'));
    fileInput.click();
  });

  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMsg('শুধুমাত্র ছবি ফাইল যুক্ত করা যাবে।'); return; }
    if (file.size > 8 * 1024 * 1024) { setMsg('ছবির সাইজ ৮ এমবি-র বেশি হওয়া যাবে না।'); return; }
    setMsg('');
    cropIntoSlot(activeSlotIndex, file);
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
    var path = 'shops/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + safeName;
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      var endpoint = window.TANGAIL_SUPABASE.url + '/storage/v1/object/market-media/' + path;
      xhr.open('POST', endpoint, true);
      xhr.setRequestHeader('apikey', window.TANGAIL_SUPABASE.key);
      xhr.setRequestHeader('Authorization', 'Bearer ' + window.TANGAIL_SUPABASE.key);
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
  }

  function showProgress(pct) {
    progressWrap.hidden = false;
    progressBar.style.width = pct + '%';
    progressText.textContent = pct.toLocaleString('bn-BD') + '%';
  }
  function hideProgress() { progressWrap.hidden = true; progressBar.style.width = '0%'; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var name = document.getElementById('shopName').value.trim();
    var category = catSelect.value;
    var upazila = upazilaSelect.value;
    var owner = document.getElementById('shopOwner').value.trim();
    var phone = document.getElementById('shopPhone').value.trim();
    var whatsapp = document.getElementById('shopWhatsapp').value.trim();
    var address = document.getElementById('shopAddress').value.trim();
    var maps = document.getElementById('shopMaps').value.trim();
    var website = document.getElementById('shopWebsite').value.trim();
    var facebook = document.getElementById('shopFacebook').value.trim();
    var hours = document.getElementById('shopHours').value.trim();
    var description = document.getElementById('shopDescription').value.trim();

    if (!name) { setMsg('দোকানের নাম লিখুন।'); return; }
    if (!category) { setMsg('ক্যাটাগরি নির্বাচন করুন।'); return; }
    if (!upazila) { setMsg('উপজেলা নির্বাচন করুন।'); return; }
    if (!phone || phone.replace(/\D/g, '').length < 11) { setMsg('সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন।'); return; }
    if (!address) { setMsg('ঠিকানা লিখুন।'); return; }
    if (!description) { setMsg('দোকানের বিবরণ লিখুন।'); return; }

    submitBtn.disabled = true;

    var toUpload = [];
    if (slots[0]) toUpload.push({ key: 'logo_url', file: slots[0] });
    if (slots[1]) toUpload.push({ key: 'cover_url', file: slots[1] });

    var urls = {};
    var chain = Promise.resolve();
    if (toUpload.length) {
      setMsg('ছবি প্রস্তুত করা হচ্ছে…', true);
      toUpload.forEach(function (item, i) {
        chain = chain.then(function () {
          return compressImageFile(item.file).then(function (processed) {
            setMsg('ছবি আপলোড হচ্ছে (' + (i + 1) + '/' + toUpload.length + ')…', true);
            showProgress(0);
            return uploadImage(processed, showProgress);
          }).then(function (url) { urls[item.key] = url; });
        });
      });
    }

    chain.then(function () {
      hideProgress();
      setMsg('জমা দেওয়া হচ্ছে…', true);
      return client.from('shops').insert({
        name: name,
        category: category,
        owner_name: owner || null,
        phone: phone,
        whatsapp: whatsapp || null,
        address: address,
        upazila: upazila,
        maps_url: maps || null,
        website: website || null,
        facebook: facebook || null,
        hours: hours || null,
        description: description,
        logo_url: urls.logo_url || null,
        cover_url: urls.cover_url || null,
        rating: 0,
        reviews: 0,
        verified: false,
        status: 'pending',
        user_id: currentUser ? currentUser.id : null
      });
    }).then(function (res) {
      submitBtn.disabled = false;
      if (res.error) {
        console.error('shops insert error:', res.error);
        setMsg('জমা দিতে সমস্যা হয়েছে। একটু পর আবার চেষ্টা করুন।');
        return;
      }
      setMsg('ধন্যবাদ! আপনার দোকান পেন্ডিং তালিকায় জমা হয়েছে — অ্যাডমিন অনুমোদনের পর এটি দোকান ডিরেক্টরিতে দেখা যাবে।', true);
      form.reset();
      slots = [null, null];
      origFiles = [null, null];
      renderSlots();
    }).catch(function (err) {
      submitBtn.disabled = false;
      hideProgress();
      setMsg(err && err.message ? err.message : 'একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    });
  });
})();
