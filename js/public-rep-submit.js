// টাঙ্গাইল জেলা — জনপ্রতিনিধি পেজ (public-representative.html) — Supabase সংযোগ
// • অনুমোদিত (approved) সারি public_representatives টেবিল থেকে পড়ে window.PR_ITEMS-এ বসায় ও 'pr:items-updated' ইভেন্ট পাঠায়
//   (RLS + কলাম-গ্রান্ট: পাবলিক শুধু approved সারি ও প্রকাশযোগ্য কলাম পড়ে; user_id বন্ধ)
// • নতুন জমা window.PR_SUBMIT(data, photoFile) — সবসময় status='pending', is_demo=false;
//   অ্যাডমিন অনুমোদন না করা পর্যন্ত পাবলিক তালিকায় আসে না
// • ছবি: market-media বাকেটের public-rep/ ফোল্ডারে (কুরিয়ার/ভাইরাল মডিউলের মতো)
// • ফর্মের ফিল্ড → কলাম: union → union_name, wardGroup → ward_group, map → maps_url
(function () {
  var client = null;
  try {
    if (window.supabase && window.TANGAIL_SUPABASE) {
      client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
    }
  } catch (e) { client = null; }
  window.PR_SB = client;

  window.PR_LOADING = true;
  window.PR_LOADED = false;
  window.PR_LOAD_FAILED = false;

  function httpsOnly(u) { return /^https:\/\//i.test(u || '') ? u : ''; }
  function httpOrHttps(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }

  function finish(failed) {
    window.PR_LOAD_FAILED = failed === true;
    window.PR_LOADING = false;
    window.PR_LOADED = true;
    window.dispatchEvent(new Event('pr:items-updated'));
  }

  // anon-কে যে কলামগুলোর SELECT দেওয়া আছে শুধু সেগুলোই চাওয়া হয় (user_id চাওয়া হয় না)
  var COLS = 'id,created_at,type,name,post,seat,upazila,union_name,ward,ward_group,party,phone,address,maps_url,photo_url,is_demo';

  function loadApproved() {
    if (!client) { window.PR_ITEMS = []; finish(true); return; }
    client.from('public_representatives')
      .select(COLS)
      .eq('status', 'approved')                         // লগইন করা অ্যাডমিন/মালিকের পেন্ডিং সারি পাবলিক পেজে আসবে না
      .order('is_demo', { ascending: true })            // আসল আগে, নমুনা পরে
      .order('created_at', { ascending: false })
      .limit(1000)
      .then(function (res) {
        if (!res || res.error || !res.data) { window.PR_ITEMS = []; finish(true); return; }
        var latest = '';
        window.PR_ITEMS = res.data.map(function (r) {
          if (!r.is_demo && r.created_at && r.created_at > latest) latest = r.created_at;
          return {
            id: 'db-' + r.id,
            type: r.type,
            name: r.name || '',
            post: r.post || '',
            seat: r.seat || '',
            upazila: r.upazila || '',
            union: r.union_name || '',
            ward: r.ward || '',
            wardGroup: r.ward_group || '',
            party: r.party || '',
            phone: r.phone || '',
            address: r.address || '',
            mapUrl: httpOrHttps(r.maps_url),
            photo: httpsOnly(r.photo_url),
            demo: r.is_demo === true
          };
        });
        if (latest) window.PR_LAST_UPDATED = latest.slice(0, 10);   // সর্বশেষ আসল এন্ট্রির তারিখ
        finish(false);
      }, function () { window.PR_ITEMS = []; finish(true); });
  }
  loadApproved();

  // ---------- ছবি কম্প্রেস + আপলোড ----------
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

  // লগইন থাকলে ইউজারের টোকেনে আপলোড (ফাইলের owner = ইউজার); নইলে anon কী
  function uploadToken() {
    return client.auth.getSession().then(function (r) {
      return (r && r.data && r.data.session && r.data.session.access_token) || window.TANGAIL_SUPABASE.key;
    }, function () { return window.TANGAIL_SUPABASE.key; });
  }

  function uploadImage(file) {
    if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error('ছবি ৫ MB এর বেশি — ছোট ছবি দিন'));
    var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    var path = 'public-rep/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + safeName;
    return uploadToken().then(function (token) {
      return fetch(window.TANGAIL_SUPABASE.url + '/storage/v1/object/market-media/' + path, {
        method: 'POST',
        headers: {
          apikey: window.TANGAIL_SUPABASE.key,
          Authorization: 'Bearer ' + token,
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'false'
        },
        body: file
      });
    }).then(function (res) {
      if (!res.ok) throw new Error('ছবি আপলোড ব্যর্থ হয়েছে');
      return client.storage.from('market-media').getPublicUrl(path).data.publicUrl;
    });
  }

  // ফর্মের ডাটা → টেবিলের কলাম। খালি ঐচ্ছিক ফিল্ড বাদ (কলামের ডিফল্ট ''), status সবসময় pending।
  // user_id পাঠানো হয় না — লগইন থাকলে কলামের ডিফল্ট auth.uid() বসায়, নইলে null (RLS দুটোই অনুমতি দেয়)।
  var MAP = { type: 'type', name: 'name', post: 'post', seat: 'seat', upazila: 'upazila', union: 'union_name',
              ward: 'ward', wardGroup: 'ward_group', party: 'party', phone: 'phone', address: 'address', map: 'maps_url' };
  function buildRow(data, photoUrl) {
    var row = {};
    Object.keys(MAP).forEach(function (k) {
      var v = data[k];
      if (v === undefined || v === null || v === '') return;
      row[MAP[k]] = v;
    });
    row.photo_url = photoUrl || '';
    row.status = 'pending';
    row.is_demo = false;
    return row;
  }

  // ফর্ম এটাকে ডাকে; সফল হলে resolve, ব্যর্থ হলে বাংলা বার্তাসহ Error reject
  window.PR_SUBMIT = function (data, photoFile) {
    if (!client) return Promise.reject(new Error('সংযোগে সমস্যা হচ্ছে। ইন্টারনেট চেক করে আবার চেষ্টা করুন।'));
    return (photoFile ? compressImageFile(photoFile).then(uploadImage) : Promise.resolve(''))
      .then(function (photoUrl) {
        return client.from('public_representatives').insert(buildRow(data, photoUrl));
      })
      .then(function (res) {
        if (res && res.error) throw res.error;
        return true;
      });
  };
})();
