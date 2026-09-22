// টাঙ্গাইল অ্যাম্বুলেন্স সার্ভিস — আমার প্রোফাইল পেজ
// পোর্টালের profile.html-এর মতো একই Supabase অ্যাকাউন্ট ও একই "avatars" বাকেট
// ব্যবহার করে, তাই এখানে বদলানো ছবি মূল পোর্টালেও (এবং উল্টোটাও) দেখা যায়।
(function () {
  if (!window.supabase || !window.TANGAIL_SUPABASE) return;

  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);

  var loadingEl = document.getElementById('ambProfileLoading');
  var cardEl = document.getElementById('ambProfileCard');
  var avatarEl = document.getElementById('ambProfileAvatar');
  var nameEl = document.getElementById('ambProfileName');
  var emailEl = document.getElementById('ambProfileEmail');
  var joinedEl = document.getElementById('ambProfileJoined');
  var msgEl = document.getElementById('ambProfileMsg');
  var logoutBtn = document.getElementById('ambLogoutBtn');
  var avatarEditBtn = document.getElementById('ambAvatarEditBtn');
  var avatarInput = document.getElementById('ambAvatarInput');
  var historySection = document.getElementById('ambHistorySection');
  var historyLoadingEl = document.getElementById('ambHistoryLoading');
  var historyListEl = document.getElementById('ambHistoryList');
  var historyEmptyEl = document.getElementById('ambHistoryEmpty');
  var favSection = document.getElementById('ambFavSection');
  var favLoadingEl = document.getElementById('ambFavLoading');
  var favListEl = document.getElementById('ambFavList');
  var favEmptyEl = document.getElementById('ambFavEmpty');
  if (!cardEl) return;

  // ---- রিকোয়েস্ট হিস্ট্রি (Supabase থেকে, শুধু এই ইউজারের নিজের রিকোয়েস্টগুলো) ----
  var LEVEL_LABEL = { critical: 'জরুরি', serious: 'গুরুতর', normal: 'সাধারণ' };
  var STATUS_LABEL = { new: 'নতুন', ongoing: 'প্রক্রিয়াধীন', completed: 'সম্পন্ন' };

  function historyBadgeHTML(r) {
    if (r.status === 'completed') {
      return '<span class="amb-emg-badge completed"><i class="fa-solid fa-circle"></i> সম্পন্ন</span>';
    }
    var lvl = r.level || 'normal';
    return '<span class="amb-emg-badge ' + lvl + '"><i class="fa-solid fa-circle"></i> ' + (LEVEL_LABEL[lvl] || lvl) + '</span>';
  }

  function formatHistoryDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    var months = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্ট', 'অক্টো', 'নভে', 'ডিসে'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function historyCardHTML(r) {
    return (
      '<article class="amb-request-card">' +
        '<div class="amb-request-top">' +
          historyBadgeHTML(r) +
          '<span class="amb-request-time">' + formatHistoryDate(r.created_at) + '</span>' +
        '</div>' +
        '<div class="amb-request-patient">' + r.patient_name + ' <span>&middot; ' + r.phone + '</span></div>' +
        '<div class="amb-request-route"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ' + r.pickup + ' <i class="fa-solid fa-arrow-right-long" aria-hidden="true"></i> ' + r.destination + '</div>' +
        '<div class="amb-request-meta">' +
          (r.type_label ? '<span><i class="fa-solid fa-truck-medical"></i> ' + r.type_label + '</span>' : '') +
          '<span><i class="fa-solid fa-route"></i> ' + (r.distance_km != null ? r.distance_km : '—') + ' কিমি দূরে</span>' +
          (r.date_label ? '<span><i class="fa-regular fa-calendar"></i> ' + r.date_label + '</span>' : '') +
          '<span><i class="fa-solid fa-list-check"></i> ' + (STATUS_LABEL[r.status] || r.status) + '</span>' +
        '</div>' +
        (r.notes ? '<div class="amb-request-notes"><i class="fa-regular fa-note-sticky" aria-hidden="true"></i>&nbsp; ' + r.notes + '</div>' : '') +
      '</article>'
    );
  }

  function loadRequestHistory(userId) {
    if (!historyListEl) return;
    client.from('ambulance_requests').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(30)
      .then(function (res) {
        historyLoadingEl.style.display = 'none';
        if (res.error || !res.data || !res.data.length) {
          historyEmptyEl.style.display = 'block';
          return;
        }
        historyListEl.innerHTML = res.data.map(historyCardHTML).join('');
      });
  }

  // ---- পছন্দের (ফেভারিট) ড্রাইভার ----
  function favCardHTML(row) {
    var avatar = row.driver_avatar || ('https://ui-avatars.com/api/?background=e11d2e&color=fff&bold=true&name=' + encodeURIComponent((row.driver_name || '?').charAt(0)));
    return (
      '<article class="amb-provider-card" data-id="' + row.driver_id + '">' +
        '<div class="amb-provider-top">' +
          '<div class="amb-provider-avatar">' +
            '<img src="' + avatar + '" alt="' + row.driver_name + '" loading="lazy">' +
            '<button type="button" class="amb-fav-btn is-active" data-unfav="' + row.driver_id + '" aria-label="পছন্দ থেকে সরান" title="পছন্দ থেকে সরান"><i class="fa-solid fa-heart" aria-hidden="true"></i></button>' +
          '</div>' +
          '<div class="amb-provider-info">' +
            '<h3>' + row.driver_name + '</h3>' +
            '<div class="amb-provider-meta">' +
              '<span><i class="fa-solid fa-location-dot"></i> ' + (row.driver_upazila || '—') + ' থানা</span>' +
              '<span><i class="fa-solid fa-phone"></i> ' + row.driver_phone + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        (row.driver_type ? '<div class="amb-provider-tags"><span class="amb-tag">' + row.driver_type + '</span></div>' : '') +
        '<div class="amb-provider-actions" style="grid-template-columns:1fr 1fr">' +
          '<a class="amb-icon-btn amb-call" href="tel:' + row.driver_phone + '"><i class="fa-solid fa-phone"></i> কল করুন</a>' +
          '<a class="amb-icon-btn amb-whatsapp" href="https://wa.me/88' + row.driver_phone + '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>' +
        '</div>' +
      '</article>'
    );
  }

  function loadFavoriteDrivers(userId) {
    if (!favListEl) return;
    client.from('ambulance_favorite_drivers').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(function (res) {
        favLoadingEl.style.display = 'none';
        if (res.error || !res.data || !res.data.length) {
          favEmptyEl.style.display = 'block';
          return;
        }
        favListEl.innerHTML = res.data.map(favCardHTML).join('');
      });
  }

  if (favListEl) {
    favListEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-unfav]');
      if (!btn) return;
      var driverId = btn.getAttribute('data-unfav');
      btn.disabled = true;
      client.from('ambulance_favorite_drivers').delete().eq('user_id', currentUser.id).eq('driver_id', driverId)
        .then(function (res) {
          if (res.error) { btn.disabled = false; return; }
          var card = btn.closest('.amb-provider-card');
          if (card) card.remove();
          if (!favListEl.children.length) { favEmptyEl.style.display = 'block'; }
        });
    });
  }

  function formatDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    var months = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্ট', 'অক্টো', 'নভে', 'ডিসে'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  var currentUser = null;

  function renderAvatar(user) {
    var avatarUrl = user.user_metadata && user.user_metadata.avatar_url;
    if (avatarUrl) {
      avatarEl.innerHTML = '';
      var img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = 'প্রোফাইল ছবি';
      avatarEl.appendChild(img);
      return;
    }
    var name = (user.user_metadata && user.user_metadata.full_name) || (user.email ? user.email.split('@')[0] : 'ব্যবহারকারী');
    var initial = name.trim().charAt(0).toUpperCase();
    avatarEl.innerHTML = '';
    if (initial) {
      avatarEl.textContent = initial;
    } else {
      avatarEl.innerHTML = '<i class="fa-solid fa-user" aria-hidden="true"></i>';
    }
  }

  function showProfile(user) {
    currentUser = user;
    var name = (user.user_metadata && user.user_metadata.full_name) || (user.email ? user.email.split('@')[0] : 'ব্যবহারকারী');
    nameEl.textContent = name;
    renderAvatar(user);
    emailEl.textContent = user.email || '—';
    joinedEl.textContent = formatDate(user.created_at);
    loadingEl.hidden = true;
    cardEl.hidden = false;
    if (historySection) {
      historySection.hidden = false;
      loadRequestHistory(user.id);
    }
    if (favSection) {
      favSection.hidden = false;
      loadFavoriteDrivers(user.id);
    }
  }

  // সেশন চেক — লগইন করা না থাকলে লগইন পেজে পাঠানো হবে, লগইনের পর আবার এই পেজেই ফিরে আসবে
  client.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (!session) {
      window.location.href = 'login.html?next=ambulance-profile.html';
      return;
    }
    showProfile(session.user);
  });

  // অন্য ট্যাবে লগআউট করলে এই পেজও সিঙ্ক থাকবে
  client.auth.onAuthStateChange(function (event, session) {
    if (event === 'SIGNED_OUT' || !session) {
      window.location.href = 'login.html?next=ambulance-profile.html';
    }
  });

  // ---- প্রোফাইল ছবি আপলোড (গ্যালারি থেকে) — মূল পোর্টালের মতো একই বাকেট ও লজিক ----
  avatarEditBtn.addEventListener('click', function () {
    avatarInput.click();
  });

  function uploadAvatarPhoto(file) {
    var safeName = (file.name || 'avatar.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
    var path = currentUser.id + '/' + Date.now() + '-' + safeName;
    return client.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' })
      .then(function (res) {
        if (res.error) { throw res.error; }
        return client.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      });
  }

  // ছবি জুম ইন/আউট ও টেনে বসানোর ক্রপ এডিটর (js/image-cropper.js) দিয়ে ৪৮০×৪৮০ বর্গাকার JPEG হয়
  var AVATAR_SIZE = 480;

  // পাবলিক URL থেকে বাকেটের ভেতরের পাথ বের করা (পুরনো ছবি ডিলিট করার জন্য)
  function avatarPathFromPublicUrl(url) {
    if (!url) return null;
    var marker = '/avatars/';
    var idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length).split('?')[0];
  }

  function deleteOldAvatar(oldUrl) {
    var oldPath = avatarPathFromPublicUrl(oldUrl);
    if (!oldPath) return;
    client.storage.from('avatars').remove([oldPath]);
  }

  avatarInput.addEventListener('change', function () {
    var file = avatarInput.files && avatarInput.files[0];
    if (!file) { return; }

    if (!file.type.startsWith('image/')) {
      msgEl.textContent = 'শুধুমাত্র ছবি ফাইল (jpg, png ইত্যাদি) আপলোড করুন।';
      msgEl.className = 'amb-profile-msg';
      avatarInput.value = '';
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      msgEl.textContent = 'ছবির সাইজ ৩ এমবি-র বেশি হওয়া যাবে না।';
      msgEl.className = 'amb-profile-msg';
      avatarInput.value = '';
      return;
    }

    avatarEditBtn.disabled = true;
    msgEl.textContent = 'ছবি প্রসেস হচ্ছে…';
    msgEl.className = 'amb-profile-msg ok';

    var oldAvatarUrl = currentUser.user_metadata && currentUser.user_metadata.avatar_url;

    window.TZCropper.open({ file: file, aspect: 1, outWidth: AVATAR_SIZE, shape: 'circle', title: 'প্রোফাইল ছবি সাজান' }).then(function (prepared) {
      avatarEl.innerHTML = '';
      var img = document.createElement('img');
      img.src = prepared.dataUrl;
      img.alt = 'প্রোফাইল ছবি';
      avatarEl.appendChild(img);

      msgEl.textContent = 'ছবি আপলোড হচ্ছে…';
      return uploadAvatarPhoto(prepared.blob);
    }).then(function (publicUrl) {
      return client.auth.updateUser({ data: { avatar_url: publicUrl } });
    }).then(function (res) {
      if (res.error) { throw res.error; }
      currentUser = res.data.user;
      deleteOldAvatar(oldAvatarUrl);
      msgEl.textContent = 'প্রোফাইল ছবি সফলভাবে পরিবর্তন হয়েছে।';
      msgEl.className = 'amb-profile-msg ok';
    }).catch(function (err) {
      renderAvatar(currentUser);
      if (err && err.cancelled) { msgEl.textContent = ''; return; }
      msgEl.textContent = 'ছবি আপলোড করা যায়নি: ' + (err && err.message ? err.message : 'অজানা সমস্যা');
      msgEl.className = 'amb-profile-msg';
    }).finally(function () {
      avatarEditBtn.disabled = false;
      avatarInput.value = '';
    });
  });

  // ---- লগআউট ----
  logoutBtn.addEventListener('click', function () {
    logoutBtn.disabled = true;
    msgEl.textContent = 'লগআউট করা হচ্ছে…';
    msgEl.className = 'amb-profile-msg ok';
    client.auth.signOut().then(function () {
      window.location.href = 'login.html';
    });
  });
})();
