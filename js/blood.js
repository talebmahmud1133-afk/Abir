// রক্তদাতা ও রক্তের দরকার পেজ (একই JS) — থানা ফিল্টার + ব্লাড গ্রুপ চিপ + কার্ড + ফর্ম
// <body data-bd-mode="donor"> → blood_donors টেবিল · <body data-bd-mode="request"> → blood_requests টেবিল
(function () {
  'use strict';
  var THANAS = ['টাঙ্গাইল সদর', 'বাসাইল', 'ভূঞাপুর', 'দেলদুয়ার', 'ধনবাড়ী', 'ঘাটাইল', 'গোপালপুর', 'কালিহাতী', 'মধুপুর', 'মির্জাপুর', 'নাগরপুর', 'সখীপুর'];
  var GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  var $ = function (id) { return document.getElementById(id); };
  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
  var isReq = document.body.getAttribute('data-bd-mode') === 'request';
  var state = { thana: '', group: GROUPS[0] };
  var reqId = 0;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function bnToEn(s) { return String(s).replace(/[০-৯]/g, function (d) { return '০১২৩৪৫৬৭৮৯'.indexOf(d); }); }
  function fmtDate(v) {
    var d = v ? new Date(v) : null;
    if (!d || isNaN(d.getTime())) return 'তথ্য নেই';
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  // ---- থানা ড্রপডাউন + চিপ ----
  var thanaSel = $('bdThana'), formThana = $('bdfThana'), formGroup = $('bdfGroup'), chipsEl = $('bdChips'), listEl = $('bdList');
  thanaSel.innerHTML = '<option value="">সব থানা</option>' + THANAS.map(function (t) { return '<option>' + t + '</option>'; }).join('');
  formThana.innerHTML = '<option value="">থানা সিলেক্ট করুন</option>' + THANAS.map(function (t) { return '<option>' + t + '</option>'; }).join('');
  formGroup.innerHTML = '<option value="">রক্তের গ্রুপ সিলেক্ট করুন</option>' + GROUPS.map(function (g) { return '<option>' + g + '</option>'; }).join('');
  chipsEl.innerHTML = GROUPS.map(function (g) {
    return '<button type="button" class="bd-chip" data-group="' + g + '" aria-pressed="false">' + g + '</button>';
  }).join('');

  function syncChips() {
    Array.prototype.forEach.call(chipsEl.children, function (b) {
      var on = b.getAttribute('data-group') === state.group;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on && b.scrollIntoView) b.scrollIntoView({ inline: 'center', block: 'nearest' });
    });
  }
  chipsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.bd-chip');
    if (!b) return;
    state.group = b.getAttribute('data-group');
    syncChips();
    load();
  });
  thanaSel.addEventListener('change', function () { state.thana = thanaSel.value; load(); });

  // ---- কার্ড ----
  var donorUsernameMap = {}; // user_id -> username, লগইন করা ডোনারদের জন্য ওয়েবসাইটের নিজস্ব চ্যাট চালু করতে
  // মেসেজ বাটন: ডোনারের অ্যাকাউন্ট (user_id → username) থাকলে ওয়েবসাইটের নিজস্ব চ্যাট (chat.html) খুলবে;
  // অ্যাকাউন্ট না থাকলে (অ্যাডমিন-যোগ করা ডোনার) আগের মতো SMS অপশন থাকবে।
  function donorMsgBtn(d, digits) {
    var uname = d.user_id ? donorUsernameMap[d.user_id] : null;
    if (uname) {
      return '<a class="msg-btn" href="chat.html?u=' + encodeURIComponent(uname) + '"><i class="fa-solid fa-comment" aria-hidden="true"></i> মেসেজ</a>';
    }
    return '<a class="msg-btn" href="sms:' + esc(digits) + '"><i class="fa-solid fa-comment" aria-hidden="true"></i> মেসেজ</a>';
  }
  function card(d) {
    var days = d.last_donation_date ? Math.floor((Date.now() - new Date(d.last_donation_date)) / 86400000) : null;
    var ok = days === null || days >= 90;
    var digits = String(d.phone || '').replace(/\D/g, '');
    var loc = [d.thana, d.address].filter(Boolean).join(' · ');
    var av = /^https:\/\//.test(d.avatar_url || '') ? '<img src="' + esc(d.avatar_url) + '" alt="" loading="lazy">' : '<i class="fa-solid fa-user" aria-hidden="true"></i>';
    return '<div class="donor-card"><div class="donor-card-top"><div class="donor-avatar">' + av + '</div><div class="donor-info">' +
      '<div class="donor-name-row"><h3 class="donor-name">' + esc(d.name) + '</h3><span class="donor-group-badge">' + esc(d.blood_group) + '</span></div>' +
      (loc ? '<div class="donor-loc"><span><i class="fa-solid fa-location-dot" aria-hidden="true"></i></span><span>' + esc(loc) + '</span></div>' : '') +
      '</div></div>' +
      '<div class="donor-status ' + (ok ? 'available' : 'unavailable') + '"><span class="dot"></span><span>' + (ok ? 'এখন রক্ত দিতে পারবেন' : 'এখনো রক্ত দেওয়ার সময় হয়নি') + '</span></div>' +
      '<div class="donor-stats">' + (d.last_donation_date ? '<span><i class="fa-solid fa-calendar" aria-hidden="true"></i> সর্বশেষ: ' + fmtDate(d.last_donation_date) + '</span>' : '') +
      '<span><i class="fa-solid fa-bandage" aria-hidden="true"></i> মোট: ' + (d.total_donations || 0) + ' বার</span></div>' +
      (d.comment ? '<div class="donor-address">' + esc(d.comment) + '</div>' : '') +
      '<div class="donor-actions"><a class="call-btn" href="tel:' + esc(digits) + '"><i class="fa-solid fa-phone" aria-hidden="true"></i> কল</a>' +
      donorMsgBtn(d, digits) + '</div></div>';
  }

  // ---- রিকোয়েস্ট: মালিকানার টোকেন (এই ব্রাউজার থেকেই "প্রয়োজন মিটে গেছে" চাপা যাবে) ----
  var OWNER_KEY = 'bloodReqOwnerTokens';
  function tokens() { try { return JSON.parse(localStorage.getItem(OWNER_KEY)) || {}; } catch (e) { return {}; } }
  function saveToken(id, t) { try { var m = tokens(); m[id] = t; localStorage.setItem(OWNER_KEY, JSON.stringify(m)); } catch (e) {} }
  function makeToken() { return window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'tok-' + Date.now() + '-' + Math.random().toString(36).slice(2); }
  function ago(iso) {
    var s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return 'এইমাত্র';
    if (s < 3600) return Math.floor(s / 60) + ' মিনিট আগে';
    if (s < 86400) return Math.floor(s / 3600) + ' ঘণ্টা আগে';
    return Math.floor(s / 86400) + ' দিন আগে';
  }

  function reqCard(r) {
    var digits = String(r.phone || '').replace(/\D/g, '');
    var loc = [r.hospital, r.thana].filter(Boolean).join(' · ');
    var urgent = r.urgency === 'urgent';
    return '<div class="donor-card req-card"><div class="donor-card-top"><div class="donor-avatar">' + (/^https:\/\//.test(r.avatar_url || '') ? '<img src="' + esc(r.avatar_url) + '" alt="" loading="lazy">' : '<i class="fa-solid fa-droplet" aria-hidden="true"></i>') + '</div><div class="donor-info">' +
      '<div class="donor-name-row"><h3 class="donor-name">' + esc(r.patient_name) + '</h3><span class="donor-group-badge">' + esc(r.blood_group) + '</span></div>' +
      (loc ? '<div class="donor-loc"><span><i class="fa-solid fa-hospital" aria-hidden="true"></i></span><span>' + esc(loc) + '</span></div>' : '') +
      '</div></div>' +
      '<span class="req-badge ' + (urgent ? 'urgent' : 'normal') + '"><span class="dot"></span>' + (urgent ? 'জরুরি' : 'সাধারণ') + '</span>' +
      '<div class="donor-stats"><span><i class="fa-solid fa-droplet" aria-hidden="true"></i> ' + (r.bags_needed || 1) + ' ব্যাগ প্রয়োজন</span>' +
      '<span><i class="fa-solid fa-clock" aria-hidden="true"></i> ' + ago(r.created_at) + '</span></div>' +
      (r.notes ? '<div class="donor-address">' + esc(r.notes) + '</div>' : '') +
      '<div class="donor-actions"><a class="call-btn" href="tel:' + esc(digits) + '"><i class="fa-solid fa-phone" aria-hidden="true"></i> কল</a>' +
      donorMsgBtn(r, digits) + '</div>' +
      (tokens()[r.id] ? '<button type="button" class="req-fulfilled-btn" data-id="' + esc(r.id) + '"><i class="fa-solid fa-check" aria-hidden="true"></i> প্রয়োজন মিটে গেছে? ক্লিক করুন</button>' : '') +
      '</div>';
  }

  function load() {
    var my = ++reqId;
    listEl.innerHTML = '<p class="donor-empty">লোড হচ্ছে…</p>';
    var q = isReq
      // owner_token কলাম ইচ্ছাকৃতভাবে আনা হয় না
      ? client.from('blood_requests').select('id,patient_name,blood_group,bags_needed,urgency,hospital,thana,phone,notes,status,created_at,avatar_url,user_id')
          .eq('status', 'open').eq('blood_group', state.group).order('urgency', { ascending: false }).order('created_at', { ascending: false }).limit(100)
      : client.from('blood_donors').select('*').eq('status', 'approved').eq('blood_group', state.group).order('created_at', { ascending: false }).limit(200);
    if (state.thana) q = q.eq('thana', state.thana);
    q.then(function (res) {
      if (my !== reqId) return;
      if (res.error) { listEl.innerHTML = '<p class="donor-empty">তালিকা লোড করতে সমস্যা হয়েছে।</p>'; return; }
      var rows = res.data || [];
      var where = (state.thana ? esc(state.thana) + ' থানায় ' : '') + esc(state.group) + ' গ্রুপের ';
      function renderRows() {
        if (my !== reqId) return;
        listEl.innerHTML = rows.length ? rows.map(isReq ? reqCard : card).join('') :
          '<div class="donor-empty"><div class="donor-empty-icon"><i class="fa-solid fa-droplet" aria-hidden="true"></i></div>' +
          (isReq ? where + 'কোনো রক্তের দরকার নেই।<br>রক্ত প্রয়োজন হলে নিচের + বাটনে ক্লিক করে জানান।'
                 : where + 'কোনো রক্তদাতা এখনো যুক্ত হননি।<br>নিচের + বাটনে ক্লিক করে প্রথম রক্তদাতা হোন।') + '</div>';
      }
      // ডোনার বা রিকোয়েস্ট — যাদের অ্যাকাউন্ট (user_id) আছে তাদের username এক ব্যাচে এনে ম্যাপ তৈরি করা হয়
      var ids = rows.map(function (d) { return d.user_id; }).filter(Boolean);
      if (!ids.length) { renderRows(); return; }
      client.rpc('get_usernames_by_ids', { p_ids: ids }).then(function (pr) {
        (pr.data || []).forEach(function (p) { if (p.username) donorUsernameMap[p.id] = p.username; });
        renderRows();
      });
    });
  }

  // "প্রয়োজন মিটে গেছে" — টোকেন সার্ভারে যাচাই হয় (RPC fulfill_blood_request)
  listEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.req-fulfilled-btn');
    if (!btn) return;
    var id = btn.getAttribute('data-id'), token = tokens()[id];
    if (!id || !token || !window.confirm('এই রক্তের দরকারটি কি মিটে গেছে?')) return;
    btn.disabled = true;
    client.rpc('fulfill_blood_request', { p_id: id, p_token: token }).then(function (res) {
      if (res.error || !res.data) { btn.disabled = false; window.alert('এই কাজটি করার অনুমতি নেই, অথবা একটি সমস্যা হয়েছে।'); return; }
      load();
    });
  });

  // ট্যাব (রক্তদাতা ⇄ রক্তের দরকার): হিস্ট্রিতে জমা না করে বদলানো, যাতে ব্যাক চাপলে হোমে ফেরা যায়
  Array.prototype.forEach.call(document.querySelectorAll('.bd-tab'), function (a) {
    a.addEventListener('click', function (e) {
      if (a.classList.contains('is-active')) { e.preventDefault(); return; }
      e.preventDefault(); window.location.replace(a.getAttribute('href'));
    });
  });

  // ---- ফ্লোটিং + ও ফর্ম ----
  var modal = $('bdModal'), form = $('bdForm'), msg = $('bdFormMsg'), submitBtn = $('bdSubmit');
  function setMsg(t, ok) { msg.textContent = t || ''; msg.className = 'auth-msg' + (ok ? ' ok' : ''); }
  function openModal() { formThana.value = state.thana; formGroup.value = state.group; setMsg(''); modal.classList.add('open'); }
  function closeModal() { modal.classList.remove('open'); }
  $('bdFab').addEventListener('click', openModal);
  $('bdCancel').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  function done(text, thana, bg) {
    submitBtn.disabled = false;
    setMsg(text, true);
    form.reset();
    // নতুন কার্ড যেন চিপের নিচে দেখা যায় — ফিল্টার এই এন্ট্রির থানা ও গ্রুপে নিয়ে যাওয়া হয়
    state.group = bg; state.thana = thana; thanaSel.value = thana;
    syncChips(); load();
    setTimeout(closeModal, 900);
  }
  function fail() { submitBtn.disabled = false; setMsg('জমা দিতে সমস্যা হয়েছে, একটু পর আবার চেষ্টা করুন।'); }
  function validPhone(p) { return /^01\d{9}$/.test(p); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if ($('bdHp').value) return; // স্প্যাম ফাঁদ
    var thana = formThana.value, bg = formGroup.value;
    if (!thana) return setMsg('থানা সিলেক্ট করুন।');
    if (!bg) return setMsg('রক্তের গ্রুপ সিলেক্ট করুন।');

    if (!isReq) {
      var name = $('bdfName').value.trim(), phone = bnToEn($('bdfPhone').value).replace(/\D/g, '');
      var total = parseInt(bnToEn($('bdfTotal').value), 10);
      if (!name) return setMsg('আপনার নাম লিখুন।');
      if (!validPhone(phone)) return setMsg('সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (01XXXXXXXXX)।');
      submitBtn.disabled = true; setMsg('জমা দেওয়া হচ্ছে…', true);
      client.from('blood_donors').insert({
        name: name, blood_group: bg, thana: thana, phone: phone,
        address: $('bdfAddress').value.trim(), comment: $('bdfComment').value.trim(),
        total_donations: isNaN(total) || total < 0 ? 0 : total, status: 'approved'
      }).then(function (res) {
        if (res.error) return fail();
        done('ধন্যবাদ! আপনি রক্তদাতা হিসেবে যুক্ত হয়েছেন।', thana, bg);
      });
      return;
    }

    var patient = $('bdrPatient').value.trim(), rphone = bnToEn($('bdrPhone').value).replace(/\D/g, '');
    var bags = parseInt(bnToEn($('bdrBags').value), 10);
    if (!patient) return setMsg('রোগীর নাম লিখুন।');
    if (isNaN(bags) || bags < 1) return setMsg('কত ব্যাগ রক্ত প্রয়োজন লিখুন।');
    if (!$('bdrHospital').value.trim()) return setMsg('হাসপাতাল / স্থানের নাম লিখুন।');
    if (!validPhone(rphone)) return setMsg('সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (01XXXXXXXXX)।');
    var token = makeToken();
    submitBtn.disabled = true; setMsg('জমা দেওয়া হচ্ছে…', true);
    client.from('blood_requests').insert({
      patient_name: patient, blood_group: bg, bags_needed: bags, urgency: $('bdrUrgency').value || 'normal',
      hospital: $('bdrHospital').value.trim(), thana: thana, phone: rphone, notes: $('bdrNotes').value.trim(),
      status: 'open', owner_token: token
    }).select('id').then(function (res) {
      if (res.error) return fail();
      var added = res.data && res.data[0];
      if (added) saveToken(added.id, token); // এই ব্রাউজারই রিকোয়েস্টের মালিক
      done('ধন্যবাদ! আপনার রক্তের দরকারটি তালিকায় যুক্ত হয়েছে।', thana, bg);
    });
  });

  syncChips();
  load();
  window.addEventListener('pageshow', function (e) { if (e.persisted) load(); }); // ব্যাক করে ফিরলে তালিকা নতুন করে আনা
})();
