// টাঙ্গাইল জেলা — রক্তদান বিভাগ পেজে "রক্তের রিকোয়েস্ট" ফর্ম ও চলমান রিকোয়েস্টের তালিকা
(function () {
  if (!window.TANGAIL_SUPABASE) return;
  var listEl = document.getElementById('openRequestsList');
  if (!listEl) return;

  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
  var allOpen = [];

  // ---------- এই ব্রাউজার থেকে কে কোন রক্তের রিকোয়েস্ট করেছে তার প্রমাণ (owner token) ----------
  // যে কেউ রিকোয়েস্ট সাবমিট করলে একটা র‍্যান্ডম টোকেন জেনারেট হয়ে DB-তে (owner_token) ও এই
  // ব্রাউজারের localStorage-এ সেভ থাকে। "প্রয়োজন মিটে গেছে" বাটন ক্লিক করলে সেই টোকেনটাই সার্ভারে
  // যাচাই হয় (RPC ফাংশন fulfill_blood_request দিয়ে) — টোকেন না মিললে কিছুই আপডেট হয় না।
  // তাই শুধু যে রিকোয়েস্ট করেছে তার নিজের ব্রাউজার থেকেই এই বাটনটা আসলে কাজ করবে; অন্য কেউ
  // (এমনকি সরাসরি API কল করেও) অন্যের রিকোয়েস্ট fulfilled করতে পারবে না।
  var OWNER_KEY = 'bloodReqOwnerTokens';
  function getOwnerTokens() {
    try { return JSON.parse(window.localStorage.getItem(OWNER_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveOwnerToken(id, token) {
    try {
      var map = getOwnerTokens();
      map[id] = token;
      window.localStorage.setItem(OWNER_KEY, JSON.stringify(map));
    } catch (e) { /* ignore */ }
  }
  function myTokenFor(id) {
    return getOwnerTokens()[id] || null;
  }
  function makeToken() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'tok-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function timeAgo(iso) {
    var then = new Date(iso).getTime();
    var diff = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (diff < 60) return 'এইমাত্র';
    if (diff < 3600) return Math.floor(diff / 60) + ' মিনিট আগে';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ঘণ্টা আগে';
    return Math.floor(diff / 86400) + ' দিন আগে';
  }

  function reqCardHtml(r) {
    var phoneDigits = (r.phone || '').replace(/\D/g, '');
    var locBits = [r.hospital, r.thana].filter(Boolean).join(' · ');
    var urgent = r.urgency === 'urgent';
    var badgeClass = urgent ? 'urgent' : 'normal';
    var badgeText = urgent ? 'জরুরি' : 'সাধারণ';

    return '' +
      '<div class="donor-card req-card" data-req-id="' + escapeHtml(r.id) + '">' +
        '<div class="donor-card-top">' +
          '<div class="donor-avatar"><i class="fa-solid fa-droplet" aria-hidden="true"></i></div>' +
          '<div class="donor-info">' +
            '<div class="donor-name-row">' +
              '<h3 class="donor-name">' + escapeHtml(r.patient_name) + '</h3>' +
              '<span class="donor-group-badge">' + escapeHtml(r.blood_group) + '</span>' +
            '</div>' +
            (locBits ? '<div class="donor-loc"><span><i class="fa-solid fa-hospital" aria-hidden="true"></i></span><span>' + escapeHtml(locBits) + '</span></div>' : '') +
          '</div>' +
        '</div>' +
        '<span class="req-badge ' + badgeClass + '"><span class="dot"></span>' + badgeText + '</span>' +
        '<div class="donor-stats">' +
          '<span><i class="fa-solid fa-droplet" aria-hidden="true"></i> ' + (r.bags_needed || 1) + ' ব্যাগ প্রয়োজন</span>' +
          '<span><i class="fa-solid fa-clock" aria-hidden="true"></i> ' + timeAgo(r.created_at) + '</span>' +
        '</div>' +
        '<div class="donor-actions">' +
          '<a class="call-btn" href="tel:' + escapeHtml(phoneDigits) + '"><i class="fa-solid fa-phone" aria-hidden="true"></i> কল</a>' +
          '<a class="msg-btn" href="sms:' + escapeHtml(phoneDigits) + '"><i class="fa-solid fa-comment" aria-hidden="true"></i> মেসেজ</a>' +
        '</div>' +
        (myTokenFor(r.id)
          ? '<button type="button" class="req-fulfilled-btn" data-id="' + escapeHtml(r.id) + '"><i class="fa-solid fa-check" aria-hidden="true"></i> প্রয়োজন মিটে গেছে? ক্লিক করুন</button>'
          : '<div class="req-fulfilled-locked-wrap">' +
              '<span class="req-fulfilled-btn locked" aria-disabled="true"><i class="fa-solid fa-check" aria-hidden="true"></i> প্রয়োজন মিটে গেছে? ক্লিক করুন</span>' +
              '<span class="req-fulfilled-lock-note"><i class="fa-solid fa-lock" aria-hidden="true"></i> শুধুমাত্র যিনি এই রিকোয়েস্টটি করেছেন তিনিই এটি চিহ্নিত করতে পারবেন</span>' +
            '</div>') +
      '</div>';
  }

  function renderList() {
    if (!allOpen.length) {
      listEl.innerHTML = '<div class="donor-empty"><div class="donor-empty-icon"><i class="fa-solid fa-droplet" aria-hidden="true"></i></div>এই মুহূর্তে খোলা কোনো রক্তের রিকোয়েস্ট নেই।</div>';
      return;
    }
    listEl.innerHTML = allOpen.map(reqCardHtml).join('');
  }

  function loadRequests() {
    listEl.innerHTML = '<p class="donor-empty">লোড হচ্ছে…</p>';
    client.from('blood_requests').select('*').eq('status', 'open').order('urgency', { ascending: false }).order('created_at', { ascending: false })
      .then(function (res) {
        if (res.error) {
          listEl.innerHTML = '<p class="donor-empty">তালিকা লোড করতে সমস্যা হয়েছে।</p>';
          return;
        }
        allOpen = res.data || [];
        renderList();
      });
  }

  loadRequests();

  // "প্রয়োজন মিটে গেছে" বাটনে ক্লিক করলে রিকোয়েস্ট বন্ধ (fulfilled) করে দেওয়া
  // শুধুমাত্র .req-fulfilled-btn (লক করা .locked ক্লাস বাদে) এর উপর ক্লিক কাজ করবে —
  // .locked অবস্থায় CSS-এ pointer-events বন্ধ থাকে, তাই অন্য কারো ব্রাউজারে এটা ক্লিকই হবে না।
  listEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.req-fulfilled-btn');
    if (!btn || btn.classList.contains('locked')) return;
    var id = btn.getAttribute('data-id');
    if (!id) return;
    var token = myTokenFor(id);
    if (!token) return; // এই ব্রাউজার থেকে এই রিকোয়েস্টের টোকেন নেই — অনুমতি নেই
    if (!window.confirm('এই রক্তের রিকোয়েস্টটি কি পূরণ হয়ে গেছে?')) return;
    btn.disabled = true;
    client.rpc('fulfill_blood_request', { p_id: id, p_token: token }).then(function (res) {
      if (res.error || !res.data) {
        btn.disabled = false;
        window.alert('এই কাজটি করার অনুমতি নেই, অথবা একটি সমস্যা হয়েছে।');
        return;
      }
      allOpen = allOpen.filter(function (r) { return r.id !== id; });
      renderList();
    });
  });

  // ---------- রিকোয়েস্ট ফর্ম মোডাল ----------
  var openBtn = document.getElementById('openReqFormBtn');
  var modal = document.getElementById('reqModal');
  var form = document.getElementById('reqForm');
  if (!openBtn || !modal || !form) return;

  var msg = document.getElementById('reqFormMsg');
  var submitBtn = document.getElementById('reqSubmitBtn');
  var groupSelect = document.getElementById('reqGroup');

  function setMsg(text, ok) {
    msg.textContent = text || '';
    msg.className = 'auth-msg' + (ok ? ' ok' : '');
  }

  function openModal() {
    setMsg('');
    modal.classList.add('open');
  }
  function closeModal() {
    modal.classList.remove('open');
  }

  openBtn.addEventListener('click', openModal);
  document.getElementById('reqCancelBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var patientName = document.getElementById('reqPatientName').value.trim();
    var bg = groupSelect.value;
    var bags = parseInt(document.getElementById('reqBags').value, 10);
    var urgency = document.getElementById('reqUrgency').value;
    var hospital = document.getElementById('reqHospital').value.trim();
    var thana = document.getElementById('reqThana').value;
    var phone = document.getElementById('reqPhone').value.trim();
    var notes = document.getElementById('reqNotes').value.trim();

    if (!patientName) { setMsg('রোগীর নাম লিখুন।'); return; }
    if (!bg) { setMsg('রক্তের গ্রুপ সিলেক্ট করুন।'); return; }
    if (!phone || phone.replace(/\D/g, '').length < 11) { setMsg('সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন।'); return; }

    submitBtn.disabled = true;
    setMsg('জমা দেওয়া হচ্ছে…', true);

    var token = makeToken();

    client.from('blood_requests').insert({
      patient_name: patientName,
      blood_group: bg,
      bags_needed: isNaN(bags) || bags < 1 ? 1 : bags,
      urgency: urgency || 'normal',
      hospital: hospital,
      thana: thana,
      phone: phone.replace(/\D/g, ''),
      notes: notes,
      status: 'open',
      owner_token: token
    }).select().then(function (res) {
      submitBtn.disabled = false;
      if (res.error) {
        setMsg('জমা দিতে সমস্যা হয়েছে, একটু পর আবার চেষ্টা করুন।');
        return;
      }
      setMsg('ধন্যবাদ! আপনার রিকোয়েস্টটি তালিকায় যুক্ত হয়েছে।', true);
      form.reset();
      var added = (res.data && res.data[0]) || null;
      if (added) {
        saveOwnerToken(added.id, token); // এই ব্রাউজারকেই এই রিকোয়েস্টের মালিক হিসেবে চিহ্নিত করা
        allOpen.unshift(added);
        renderList();
      }
      setTimeout(closeModal, 900);
    });
  });
})();
