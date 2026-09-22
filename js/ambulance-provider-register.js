// টাঙ্গাইল অ্যাম্বুলেন্স সার্ভিস — প্রোভাইডার নিবন্ধন ফর্ম লজিক (Supabase: ambulance_providers টেবিল)
(function () {
  var form = document.getElementById('ambProviderForm');
  if (!form) return;

  var upazilaSelect = document.getElementById('provUpazila');
  var typeSelect = document.getElementById('provType');
  var successEl = document.getElementById('provSuccess');
  var listEl = document.getElementById('ambProviderAppList');
  var emptyEl = document.getElementById('ambProviderAppEmpty');
  var submitBtn = form.querySelector('button[type="submit"]');

  var photoInput = document.getElementById('provPhoto');
  var photoBtn = document.getElementById('provPhotoBtn');
  var photoRemoveBtn = document.getElementById('provPhotoRemoveBtn');
  var photoPreview = document.getElementById('provPhotoPreview');
  var pendingPhotoBlob = null; // সাবমিটের সময় আপলোড করার জন্য প্রস্তুত ছবি (ক্রপ করা)

  var client = (window.supabase && window.TANGAIL_SUPABASE)
    ? window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key)
    : null;

  // ---- ছবি বাছাই: প্রিভিউ + স্কয়ার ক্রপ (আপলোড হয় সাবমিটের সময়) ----
  var PHOTO_SIZE = 480;
  var MAX_PHOTO_BYTES = 3 * 1024 * 1024;

  function resetPhotoPicker() {
    pendingPhotoBlob = null;
    if (photoInput) photoInput.value = '';
    if (photoPreview) { photoPreview.innerHTML = '<i class="fa-solid fa-camera" aria-hidden="true"></i>'; photoPreview.classList.remove('is-loading'); }
    if (photoRemoveBtn) photoRemoveBtn.hidden = true;
  }

  function cropToSquareJPEG(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('ফাইল পড়া যায়নি')); };
      reader.onload = function (e) {
        var img = new Image();
        img.onerror = function () { reject(new Error('ছবিটি খোলা যায়নি')); };
        img.onload = function () {
          var side = Math.min(img.width, img.height);
          var sx = (img.width - side) / 2;
          var sy = (img.height - side) / 2;
          var canvas = document.createElement('canvas');
          canvas.width = PHOTO_SIZE; canvas.height = PHOTO_SIZE;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, sx, sy, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
          canvas.toBlob(function (blob) {
            if (!blob) { reject(new Error('ছবি প্রসেস করা যায়নি')); return; }
            resolve({ blob: blob, dataUrl: canvas.toDataURL('image/jpeg', 0.85) });
          }, 'image/jpeg', 0.85);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  if (photoBtn && photoInput) {
    photoBtn.addEventListener('click', function () { photoInput.click(); });
  }
  if (photoRemoveBtn) {
    photoRemoveBtn.addEventListener('click', function () { resetPhotoPicker(); });
  }
  if (photoInput) {
    photoInput.addEventListener('change', function () {
      var file = photoInput.files && photoInput.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        alert('শুধুমাত্র ছবি ফাইল (jpg, png, webp) নির্বাচন করুন।');
        resetPhotoPicker();
        return;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        alert('ছবির সাইজ সর্বোচ্চ ৩MB হতে হবে।');
        resetPhotoPicker();
        return;
      }
      if (photoPreview) photoPreview.classList.add('is-loading');
      cropToSquareJPEG(file).then(function (result) {
        pendingPhotoBlob = result.blob;
        if (photoPreview) {
          photoPreview.classList.remove('is-loading');
          photoPreview.innerHTML = '<img src="' + result.dataUrl + '" alt="নির্বাচিত ছবি">';
        }
        if (photoRemoveBtn) photoRemoveBtn.hidden = false;
      }).catch(function () {
        if (photoPreview) photoPreview.classList.remove('is-loading');
        alert('ছবিটি প্রসেস করা যায়নি, অন্য একটি ছবি চেষ্টা করুন।');
        resetPhotoPicker();
      });
    });
  }

  function uploadProviderPhoto(id, blob) {
    var path = id + '/' + Date.now() + '.jpg';
    return client.storage.from('ambulance-photos').upload(path, blob, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' })
      .then(function (res) {
        if (res.error) throw res.error;
        return client.storage.from('ambulance-photos').getPublicUrl(path).data.publicUrl;
      });
  }

  // ---- সিলেক্ট অপশন বসানো ----
  if (upazilaSelect && window.AMB_UPAZILAS) {
    window.AMB_UPAZILAS.forEach(function (u) {
      var opt = document.createElement('option');
      opt.value = u[0]; opt.textContent = u[1];
      upazilaSelect.appendChild(opt);
    });
  }
  if (typeSelect && window.AMB_TYPES) {
    window.AMB_TYPES.forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = t[0]; opt.textContent = t[1];
      typeSelect.appendChild(opt);
    });
  }

  // ---- এই ডিভাইস থেকে পাঠানো আবেদনগুলো স্থানীয়ভাবে মনে রাখা ----
  // (pending অবস্থায় থাকা রেকর্ড পাবলিক RLS দিয়ে সার্ভার থেকে আবার পড়া যায় না,
  //  তাই সাবমিট করা তথ্য দিয়েই লোকালি কার্ড দেখানো হয়, approved হলে সার্ভার থেকে হালনাগাদ যাচাই করা হয়)
  var MY_APPS_KEY = 'ambMyProviderApplications';
  function loadMyApps() {
    try {
      var raw = window.localStorage.getItem(MY_APPS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return [];
  }
  function saveMyApps(list) {
    try { window.localStorage.setItem(MY_APPS_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }
  function newId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function timeAgo(iso) {
    var diff = Date.now() - new Date(iso).getTime();
    var min = Math.floor(diff / 60000);
    if (min < 1) return 'এইমাত্র';
    if (min < 60) return min.toLocaleString('bn-BD') + ' মিনিট আগে';
    var hr = Math.floor(min / 60);
    if (hr < 24) return hr.toLocaleString('bn-BD') + ' ঘণ্টা আগে';
    var day = Math.floor(hr / 24);
    return day.toLocaleString('bn-BD') + ' দিন আগে';
  }

  function statusBadge(status) {
    if (status === 'approved') return '<span class="amb-badge amb-badge-online"><i class="fa-solid fa-circle-check" style="font-size:10px"></i> অনুমোদিত — তালিকায় প্রকাশিত</span>';
    return '<span class="amb-badge amb-badge-pending"><i class="fa-solid fa-hourglass-half" style="font-size:10px"></i> অ্যাডমিন অনুমোদনের অপেক্ষায়</span>';
  }

  function cardHTML(a) {
    return (
      '<article class="amb-provider-card" data-id="' + a.id + '">' +
        '<div class="amb-provider-top">' +
          '<div class="amb-provider-info">' +
            '<h3>' + a.name + '</h3>' +
            '<div class="amb-provider-meta">' +
              '<span><i class="fa-solid fa-location-dot"></i> ' + a.upazila + ' থানা</span>' +
              '<span><i class="fa-solid fa-phone"></i> ' + a.phone + '</span>' +
            '</div>' +
          '</div>' +
          statusBadge(a.status) +
        '</div>' +
        '<div class="amb-provider-tags">' +
          '<span class="amb-tag">' + a.type + '</span>' +
          (a.years ? '<span class="amb-tag">' + a.years + ' বছর অভিজ্ঞতা</span>' : '') +
          '<span class="amb-tag">' + timeAgo(a.created_at) + ' পাঠানো হয়েছে</span>' +
        '</div>' +
      '</article>'
    );
  }

  function renderMyApps() {
    if (!listEl) return;
    var apps = loadMyApps();
    if (!apps.length) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    listEl.innerHTML = apps.map(cardHTML).join('');
    if (emptyEl) emptyEl.style.display = 'none';

    // pending থাকা আবেদনগুলো এর মধ্যে অনুমোদিত হয়েছে কিনা তা যাচাই করা (approved হলেই পাবলিক থেকে পড়া যায়)
    if (!client) return;
    var pendingIds = apps.filter(function (a) { return a.status !== 'approved'; }).map(function (a) { return a.id; });
    if (!pendingIds.length) return;
    client.from('ambulance_providers').select('*').in('id', pendingIds).eq('status', 'approved')
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) return;
        var changed = false;
        res.data.forEach(function (row) {
          apps.forEach(function (a) {
            if (a.id === row.id && a.status !== 'approved') { a.status = 'approved'; changed = true; }
          });
        });
        if (changed) {
          saveMyApps(apps);
          listEl.innerHTML = apps.map(cardHTML).join('');
        }
      });
  }

  // ---- ফর্ম সাবমিট ----
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var name = document.getElementById('provName').value.trim();
    var phone = document.getElementById('provPhone').value.trim();
    var upazilaId = upazilaSelect.value;
    var upazilaLabel = upazilaSelect.options[upazilaSelect.selectedIndex] ? upazilaSelect.options[upazilaSelect.selectedIndex].textContent : '';
    var typeId = typeSelect.value;
    var typeLabel = typeSelect.options[typeSelect.selectedIndex] ? typeSelect.options[typeSelect.selectedIndex].textContent : '';
    var experience = document.getElementById('provExperience').value.trim();
    var vehicleNo = document.getElementById('provVehicleNo').value.trim();
    var address = document.getElementById('provAddress').value.trim();
    var notes = document.getElementById('provNotes').value.trim();
    var agree = document.getElementById('provAgree').checked;

    if (!name || !phone || !upazilaId || !typeId || !agree) {
      alert('অনুগ্রহ করে (*) চিহ্নিত সব ঘর পূরণ করুন এবং শর্তাবলীতে সম্মত হন।');
      return;
    }

    if (!client) {
      alert('দুঃখিত, এই মুহূর্তে আবেদন জমা দেওয়া যাচ্ছে না। একটু পর আবার চেষ্টা করুন।');
      return;
    }

    var id = newId();
    var row = {
      id: id,
      name: name,
      phone: phone,
      upazila_id: upazilaId,
      upazila: upazilaLabel,
      type_id: typeId,
      type: typeLabel,
      years: experience ? parseInt(experience, 10) || 0 : 0,
      vehicle_no: vehicleNo,
      address: address,
      notes: notes
    };

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'পাঠানো হচ্ছে...'; }

    var photoStep = pendingPhotoBlob
      ? uploadProviderPhoto(id, pendingPhotoBlob).catch(function () {
          // ছবি আপলোড ব্যর্থ হলেও আবেদন যেন আটকে না যায় — ছবি ছাড়াই এগিয়ে যাওয়া হবে
          return null;
        })
      : Promise.resolve(null);

    photoStep.then(function (avatarUrl) {
      if (avatarUrl) row.avatar = avatarUrl;

      // .select() ব্যবহার করা হচ্ছে না ইচ্ছাকৃতভাবে — নতুন রেকর্ড status='pending' থাকায়
      // পাবলিক RLS পলিসি সাথে সাথে সেটা "রিটার্ন" করতে দেয় না (শুধু approved হলেই পড়া যায়)
      return client.from('ambulance_providers').insert(row).then(function (res) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> আবেদন জমা দিন'; }

        if (res.error) {
          alert('আবেদন জমা দিতে সমস্যা হয়েছে: ' + res.error.message);
          return;
        }

        var apps = loadMyApps();
        apps.unshift({
          id: id,
          name: name,
          phone: phone,
          upazila: upazilaLabel,
          type: typeLabel,
          years: row.years,
          status: 'pending',
          created_at: new Date().toISOString()
        });
        saveMyApps(apps);

        form.reset();
        resetPhotoPicker();

        if (successEl) {
          successEl.classList.add('is-visible');
          setTimeout(function () { successEl.classList.remove('is-visible'); }, 5000);
        }

        renderMyApps();
      });
    });
  });

  renderMyApps();
})();
