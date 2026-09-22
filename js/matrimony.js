// টাঙ্গাইল জেলা — পাত্র-পাত্রী পেজ (matrimony.html) — উপজেলা + সাব-ক্যাটাগরি চিপ ফিল্টার ও কার্ড রেন্ডারিং
// পুরোপুরি কনফিগ-চালিত: চিপ, কার্ডের ফিল্ড — সবই js/matrimony-data.js থেকে আসে।
(function () {
  var upazilas = window.MM_UPAZILAS || [];
  var types = window.MM_TYPES || [];
  var fields = window.MM_FIELDS || {};
  var lastUpdated = window.MM_LAST_UPDATED || '';

  var selectEl = document.getElementById('matrimonyUpazilaSelect');
  var gridEl = document.getElementById('matrimonyGrid');
  var catsEl = document.getElementById('matrimonyCats');
  var statusEl = document.getElementById('mmStatus');
  var totalEl = document.getElementById('mmTotalCount');
  var updatedTopEl = document.getElementById('mmUpdatedTop');
  var updatedFootEl = document.getElementById('mmUpdatedFoot');
  var selectedType = 'all';

  if (!selectEl || !gridEl) return;

  var BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  function toBn(n) { return String(n).replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; }); }

  var BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  function formatBnDate(iso) {
    var p = String(iso).split('-');
    if (p.length !== 3) return iso;
    var m = parseInt(p[1], 10) - 1;
    if (!BN_MONTHS[m]) return iso;
    return toBn(parseInt(p[2], 10)) + ' ' + BN_MONTHS[m] + ' ' + toBn(p[0]);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function upazilaName(key) {
    for (var i = 0; i < upazilas.length; i++) if (upazilas[i][0] === key) return upazilas[i][1];
    return key;
  }
  function typeOf(key) {
    for (var i = 0; i < types.length; i++) if (types[i].key === key) return types[i];
    return null;
  }
  function currentProfiles() { return window.MM_PROFILES || []; }

  function formatPhone(p) {
    var d = String(p || '').replace(/\s+/g, '');
    return /^\d{11}$/.test(d) ? d.slice(0, 5) + '-' + d.slice(5) : d;
  }

  // ---------- ফিল্টার UI ----------
  function renderOptions() {
    var html = '<option value="all">সকল উপজেলা</option>';
    upazilas.forEach(function (u) { html += '<option value="' + esc(u[0]) + '">' + esc(u[1]) + '</option>'; });
    selectEl.innerHTML = html;
  }

  function renderCats() {
    if (!catsEl) return;
    var html = '<button type="button" class="mm-cat is-active" data-cat="all" aria-pressed="true">সব</button>';
    types.forEach(function (t) {
      html += '<button type="button" class="mm-cat" data-cat="' + esc(t.key) + '" aria-pressed="false" style="--acc:' + esc(t.color) + '">' + esc(t.label) + '</button>';
    });
    catsEl.innerHTML = html;
  }

  // সক্রিয় চিপ মাঝখানে আনে (শুধু চিপ-বার স্ক্রল করে, পেজ নয়)
  function syncCats() {
    if (!catsEl) return;
    var btns = catsEl.querySelectorAll('.mm-cat');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-cat') === selectedType;
      btns[i].classList.toggle('is-active', on);
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on && catsEl.scrollWidth > catsEl.clientWidth) {
        var b = btns[i];
        catsEl.scrollTo({ left: b.offsetLeft - (catsEl.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' });
      }
    }
  }

  // ---------- কার্ড ----------
  function fieldValue(key, p) {
    var f = fields[key] || {};
    var v = p[key];
    if (v == null || v === '') return '';
    if (f.fmt === 'age') return toBn(v) + ' বছর';
    if (f.fmt === 'exp') return toBn(v) + ' বছরের অভিজ্ঞতা';
    if (f.fmt === 'upazila') return upazilaName(v);
    return String(v);
  }

  function metaRow(key, p) {
    var f = fields[key];
    var val = fieldValue(key, p);
    if (!f || !val) return '';
    return '<li><i class="fa-solid ' + esc(f.icon) + '" aria-hidden="true"></i><span' + (f.fmt === 'clamp' ? ' class="mm-clamp"' : '') + '><span class="mm-lbl">' + esc(f.label) + ':</span> ' + esc(val) + '</span></li>';
  }

  // আরও ছবি (ঐচ্ছিক): থাকলে প্রধান ছবির সাথে কার্ডে ছোট ব্যাজ দেখায়; ছবিতে ক্লিক করলে লাইটবক্সে সবগুলো দেখা যায়
  function extraList(p) {
    return (p.extra_photos || []).filter(function (u) { return /^https?:\/\//i.test(u); }).slice(0, 4);
  }
  function galleryAttr(p) {
    var l = extraList(p);
    return l.length ? ' data-extra="' + esc(JSON.stringify(l)) + '"' : '';
  }
  function galleryBadge(p) {
    var l = extraList(p);
    return l.length ? '<span class="mm-photo-count" aria-hidden="true"><i class="fa-regular fa-images"></i>' + toBn(l.length + 1) + '</span>' : '';
  }

  function tileHtml(t, p) {
    if (p.photo_url && /^https?:\/\//i.test(p.photo_url)) {
      return '<div class="mm-logo has-img"' + galleryAttr(p) + '><img src="' + esc(p.photo_url) + '" alt="" loading="lazy" decoding="async">' + galleryBadge(p) + '</div>';
    }
    return '<div class="mm-logo" aria-hidden="true"><span class="mm-logo-fallback" style="background:' + esc(t.color) + '1f;color:' + esc(t.color) + '"><i class="fa-solid ' + esc(t.icon) + '"></i></span></div>';
  }

  // ঘটকের গোল অ্যাভাটার (ছবি থাকলে ছবি, না থাকলে আইকন)
  function avatarHtml(t, p) {
    if (p.photo_url && /^https?:\/\//i.test(p.photo_url)) {
      return '<div class="mm-avatar mm-logo has-img"' + galleryAttr(p) + '><img src="' + esc(p.photo_url) + '" alt="" loading="lazy" decoding="async">' + galleryBadge(p) + '</div>';
    }
    return '<div class="mm-avatar" aria-hidden="true" style="background:' + esc(t.color) + '1f;color:' + esc(t.color) + '"><i class="fa-solid ' + esc(t.icon) + '"></i></div>';
  }

  // শিরোনামের নিচের ছোট "ফ্যাক্ট পিল" (বয়স · উচ্চতা ইত্যাদি)
  function factsHtml(t, p) {
    var out = (t.facts || []).map(function (k) {
      var f = fields[k], v = fieldValue(k, p);
      if (!f || !v) return '';
      return '<span class="mm-fact"><i class="fa-solid ' + esc(f.icon) + '" aria-hidden="true"></i>' + esc(v) + '</span>';
    }).join('');
    return out ? '<div class="mm-facts">' + out + '</div>' : '';
  }

  // হোয়াটসঅ্যাপ লিংক: বাংলাদেশি ০১... নম্বরকে wa.me-এর জন্য 880১... ফরম্যাটে বদলায়
  function waHref(phone) {
    var d = String(phone || '').replace(/\D+/g, '');
    if (/^0\d{10}$/.test(d)) d = '880' + d.slice(1);
    return 'https://wa.me/' + d;
  }

  function actionHtml(p, name) {
    var btns = '';
    if (p.whatsapp) {
      btns += '<a class="mm-btn-whatsapp" href="' + esc(waHref(p.whatsapp)) + '" target="_blank" rel="noopener" aria-label="হোয়াটসঅ্যাপ — ' + name + '"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i><span>হোয়াটসঅ্যাপ</span></a>';
    }
    // মোবাইল নম্বর শুধু প্রকাশের সম্মতি থাকলেই (phone_public) দেখানো হবে
    if (p.phone && p.phone_public) {
      // নম্বর কার্ডে দেখানো হয় না — বাটনে ক্লিক করলে নিচ থেকে কল-শিট উঠে আসে (কল দিন / নম্বর কপি)
      btns += '<button type="button" class="mm-btn-call" data-mm-call="' + esc(p.phone) + '" data-mm-name="' + esc(p.name) + '" aria-haspopup="dialog" aria-label="কল করুন — ' + name + '"><i class="fa-solid fa-phone" aria-hidden="true"></i><span>কল করুন</span></button>';
    }
    if (btns) return btns;
    return '<p class="mm-nophone"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><span>' + (p.is_demo ? 'ডেমো প্রোফাইল — যোগাযোগ নম্বর নেই' : 'যোগাযোগের নম্বর প্রকাশিত নয়') + '</span></p>';
  }

  function cardHtml(p) {
    var t = typeOf(p.type);
    if (!t) return '';
    var layout = t.layout || 'person';
    var name = esc(p.name);
    var tag = '<span class="mm-tag" style="background:' + esc(t.color) + '1f;color:' + esc(t.color) + '">' + esc(t.label) + '</span>';
    var demo = p.is_demo ? '<span class="mm-demo">ডেমো</span>' : '';
    // অ্যাডমিন যাচাই করে অনুমতি দিলেই (is_verified) "ভেরিফাইড" ব্যাজ দেখায়
    var verified = (p.is_verified === true && !p.is_demo)
      ? '<span class="mm-verified" title="অ্যাডমিন কর্তৃক যাচাইকৃত প্রোফাইল"><i class="fa-solid fa-circle-check" aria-hidden="true"></i>ভেরিফাইড<span class="mm-sr"> — অ্যাডমিন কর্তৃক যাচাইকৃত</span></span>' : '';
    var rows = t.card.map(function (k) { return metaRow(k, p); }).join('');
    var quote = '';
    if (t.quote && p[t.quote]) quote = '<blockquote class="mm-quote">' + esc(p[t.quote]) + '</blockquote>';

    var head = '<div class="mm-card-head"><h3 class="mm-card-name">' + name + '</h3></div>' +
               '<div class="mm-tags">' + tag + verified + demo + '</div>' + factsHtml(t, p);
    // কার্ডের লেখার অংশে (নাম/ট্যাগ/তথ্য) ক্লিক করলে বিস্তারিত পেজ খোলে; ছবিতে ক্লিক = লাইটবক্স, বাটনে = যোগাযোগ
    var body = '<div class="mm-card-body" role="button" tabindex="0" data-mm-open aria-haspopup="dialog" aria-label="বিস্তারিত দেখুন — ' + name + '">' +
      head + quote + '<ul class="mm-card-meta">' + rows + '</ul>' +
      '<div class="mm-more" aria-hidden="true">বিস্তারিত দেখুন <i class="fa-solid fa-chevron-right"></i></div></div>';

    var main;
    if (layout === 'agent') {
      main = '<div class="mm-card-main">' + avatarHtml(t, p) + body + '</div>';
    } else if (layout === 'guardian') {
      main = '<div class="mm-card-main">' + body + '</div>';
    } else {
      main = '<div class="mm-card-main">' + tileHtml(t, p) + body + '</div>';
    }

    return '<article class="mm-card mm-card--' + layout + (verified ? ' is-verified' : '') + '" data-pid="' + esc(p.id) + '" data-type="' + esc(t.key) + '" style="--acc:' + esc(t.color) + '">' +
      main + '<div class="mm-card-actions">' + actionHtml(p, name) + '</div></article>';
  }

  // ---------- রেন্ডার ----------
  function filtered() {
    var sel = selectEl.value || 'all';
    return currentProfiles().filter(function (p) {
      return (sel === 'all' || p.upazila === sel) && (selectedType === 'all' || p.type === selectedType);
    });
  }

  function renderStatus(count) {
    if (!statusEl) return;
    var t = selectedType === 'all' ? null : typeOf(selectedType);
    var uName = selectEl.value === 'all' ? 'সকল উপজেলা' : upazilaName(selectEl.value);
    statusEl.innerHTML =
      '<i class="fa-solid fa-filter" aria-hidden="true"></i>' +
      '<span>বর্তমানে দেখা হচ্ছে: <b>' + esc(t ? t.label : 'সব ধরন') + '</b> · <b>' + esc(uName) + '</b> — <b>' + toBn(count) + 'টি</b> প্রোফাইল</span>';
  }

  function render() {
    var list = filtered();
    if (totalEl) totalEl.textContent = toBn(currentProfiles().length) + 'টি';
    renderStatus(list.length);

    if (!list.length && !window.MM_LOADED && window.MM_LOADING) {
      gridEl.innerHTML = '<div class="mm-empty"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><p>প্রোফাইল লোড হচ্ছে…</p></div>';
      return;
    }
    if (!list.length && window.MM_LOAD_FAILED) {
      gridEl.innerHTML = '<div class="mm-empty"><i class="fa-solid fa-wifi" aria-hidden="true"></i><p>প্রোফাইল লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে পেজটি রিফ্রেশ করুন।</p></div>';
      return;
    }
    if (!list.length && !currentProfiles().length) {
      // পুরো ডাটাবেসই খালি — "সব দেখুন" বাটন অর্থহীন, তাই শুধু বার্তা
      gridEl.innerHTML = '<div class="mm-empty"><i class="fa-solid fa-heart-crack" aria-hidden="true"></i><p>এখনো কোনো প্রোফাইল যুক্ত হয়নি। নিচের “+” বাটনে চেপে প্রথম প্রোফাইলটি যোগ করুন।</p></div>';
      return;
    }
    if (!list.length) {
      var t = selectedType === 'all' ? null : typeOf(selectedType);
      gridEl.innerHTML =
        '<div class="mm-empty">' +
          '<i class="fa-solid fa-heart-crack" aria-hidden="true"></i>' +
          '<p>' + (t ? 'এই উপজেলায় “' + esc(t.label) + '” ক্যাটাগরির কোনো তথ্য এখনো যুক্ত হয়নি।' : 'এই উপজেলায় এখনো কোনো প্রোফাইল যুক্ত হয়নি।') + '</p>' +
          '<button type="button" class="mm-empty-btn" data-mm-show-all>সব দেখুন</button>' +
        '</div>';
      return;
    }
    gridEl.innerHTML = list.map(cardHtml).join('');
  }

  renderOptions();
  renderCats();
  var bnDate = formatBnDate(lastUpdated);
  if (updatedTopEl) updatedTopEl.textContent = bnDate;
  if (updatedFootEl) updatedFootEl.textContent = bnDate;

  // ছবি লোড না হলে আইকন-টাইলে ফিরে যায়
  gridEl.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG') return;
    var box = img.closest('.mm-logo');
    var card = img.closest('.mm-card');
    if (!box || !card) return;
    var acc = card.style.getPropertyValue('--acc') || '#0F7A52';
    box.classList.remove('has-img');
    box.setAttribute('aria-hidden', 'true');
    box.removeAttribute('role'); box.removeAttribute('tabindex'); box.removeAttribute('aria-label'); box.removeAttribute('data-lb-ready');
    if (box.classList.contains('mm-avatar')) {
      box.style.background = acc + '1f'; box.style.color = acc;
      box.innerHTML = '<i class="fa-solid fa-handshake"></i>';
    } else {
      box.innerHTML = '<span class="mm-logo-fallback" style="background:' + acc + '1f;color:' + acc + '"><i class="fa-solid fa-user"></i></span>';
    }
  }, true);

  // খালি অবস্থা: এক ট্যাপে সব ফিল্টার রিসেট (কীবোর্ড ব্যবহারকারীর ফোকাস ড্রপডাউনে যায়)
  gridEl.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-mm-show-all]') : null;
    if (!btn) return;
    selectEl.value = 'all';
    selectedType = 'all';
    syncCats();
    render();
    selectEl.focus();
  });

  if (catsEl) {
    catsEl.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.mm-cat') : null;
      if (!btn) return;
      selectedType = btn.getAttribute('data-cat') || 'all';
      syncCats();
      render();
    });
  }

  // ---------- কল-শিট ----------
  // "কল করুন" বাটনে ক্লিক করলে নিচ থেকে ছোট শিট উঠে আসে: নাম + নম্বর + [কল দিন] [নম্বর কপি করুন]
  var callRoot = null, callNameEl, callNumEl, callLinkEl, callCopyEl, callCopyLbl, callOpener = null, callPhone = '', copyTimer = null;

  function buildCallSheet() {
    if (callRoot) return;
    callRoot = document.createElement('div');
    callRoot.className = 'mm-call';
    callRoot.hidden = true;
    callRoot.setAttribute('role', 'dialog');
    callRoot.setAttribute('aria-modal', 'true');
    callRoot.setAttribute('aria-label', 'কল করুন');
    callRoot.innerHTML =
      '<div class="mm-call-backdrop" data-call="close"></div>' +
      '<div class="mm-call-sheet">' +
        '<div class="mm-call-grab" aria-hidden="true"></div>' +
        '<button type="button" class="mm-call-x" data-call="close" aria-label="বন্ধ করুন"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
        '<p class="mm-call-hint">যোগাযোগ করুন</p>' +
        '<h3 class="mm-call-name" id="mmCallName"></h3>' +
        '<p class="mm-call-num" id="mmCallNum"></p>' +
        '<a class="mm-call-go" id="mmCallGo" href="#"><i class="fa-solid fa-phone" aria-hidden="true"></i><span>কল দিন</span></a>' +
        '<button type="button" class="mm-call-copy" id="mmCallCopy"><i class="fa-regular fa-copy" aria-hidden="true"></i><span>নম্বর কপি করুন</span></button>' +
      '</div>';
    document.body.appendChild(callRoot);
    callNameEl = callRoot.querySelector('#mmCallName');
    callNumEl = callRoot.querySelector('#mmCallNum');
    callLinkEl = callRoot.querySelector('#mmCallGo');
    callCopyEl = callRoot.querySelector('#mmCallCopy');
    callCopyLbl = callCopyEl.querySelector('span');

    callRoot.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-call="close"]') : null;
      if (t) closeCall();
    });
    callLinkEl.addEventListener('click', function () {
      // কল অ্যাপ খুলবে; শিট একটু পরে বন্ধ হয়
      setTimeout(closeCall, 250);
    });
    callCopyEl.addEventListener('click', copyNumber);
    document.addEventListener('keydown', function (e) {
      if (callRoot && !callRoot.hidden && (e.key === 'Escape' || e.key === 'Esc')) closeCall();
    });
  }

  function openCall(phone, name, opener) {
    buildCallSheet();
    callPhone = String(phone || '').replace(/\s+/g, '');
    callOpener = opener || null;
    callNameEl.textContent = name || '';
    callNumEl.textContent = formatPhone(callPhone);
    callLinkEl.setAttribute('href', 'tel:' + callPhone);
    callLinkEl.setAttribute('aria-label', 'কল দিন — ' + formatPhone(callPhone));
    resetCopyLabel();
    callRoot.hidden = false;
    document.documentElement.classList.add('mm-call-open');
    // এক ফ্রেম পরে ক্লাস দিলে স্লাইড-আপ অ্যানিমেশন চলে
    requestAnimationFrame(function () { callRoot.classList.add('is-open'); });
    setTimeout(function () { if (callLinkEl) callLinkEl.focus({ preventScroll: true }); }, 60);
  }

  function closeCall() {
    if (!callRoot || callRoot.hidden) return;
    callRoot.classList.remove('is-open');
    document.documentElement.classList.remove('mm-call-open');
    setTimeout(function () { if (callRoot) callRoot.hidden = true; }, 180);
    if (callOpener && callOpener.focus) { try { callOpener.focus({ preventScroll: true }); } catch (err) {} }
    callOpener = null;
  }

  function resetCopyLabel() {
    if (copyTimer) { clearTimeout(copyTimer); copyTimer = null; }
    if (callCopyEl) {
      callCopyEl.classList.remove('is-done');
      callCopyLbl.textContent = 'নম্বর কপি করুন';
    }
  }

  function copyNumber() {
    function done(ok) {
      callCopyEl.classList.toggle('is-done', !!ok);
      callCopyLbl.textContent = ok ? 'কপি হয়েছে ✓' : 'কপি করা যায়নি';
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(resetCopyLabel, 1800);
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = callPhone;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      document.body.removeChild(ta);
      done(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(callPhone).then(function () { done(true); }, fallback);
    } else {
      fallback();
    }
  }

  // "কল করুন" বাটন (কার্ড ও বিস্তারিত পেজ — দুই জায়গাতেই) → শিট খোলে
  function onCallClick(e) {
    var btn = e.target.closest ? e.target.closest('[data-mm-call]') : null;
    if (!btn) return;
    e.preventDefault();
    openCall(btn.getAttribute('data-mm-call'), btn.getAttribute('data-mm-name'), btn);
  }
  gridEl.addEventListener('click', onCallClick);

  // ---------- বিস্তারিত পেজ ----------
  // কার্ডের লেখায় ক্লিক করলে পুরো-স্ক্রিন "পেজ" খোলে: উপরে বড় ছবি (আরও ছবি থাকলে থাম্বনেইল সহ), নিচে সব তথ্য,
  // নিচে আটকে থাকা হোয়াটসঅ্যাপ/কল বাটন। ডেটা Supabase থেকে লোড হয়ে MM_PROFILES-এ আসে; লোড শেষ না হওয়া পর্যন্ত তালিকায় "লোড হচ্ছে…" দেখায়।
  // ফোনের Back বাটনে বন্ধ হয় (history + #p-<id>); রিলোড করলে বা লিংক খুললে একই প্রোফাইল আবার খোলে।
  var detailRoot = null, detailBody = null, detailActions = null, detailOpener = null;
  var detailOpen = false, detailPushed = false, detailId = null;

  function findProfile(id) {
    var list = currentProfiles();
    for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) return list[i];
    return null;
  }

  function detailRowHtml(k, p) {
    var f = fields[k], v = fieldValue(k, p);
    if (!f || !v) return '';
    return '<div class="mm-drow"><div class="mm-dico"><i class="fa-solid ' + esc(f.icon) + '" aria-hidden="true"></i></div>' +
      '<div class="mm-dtxt"><span class="mm-dlbl">' + esc(f.label) + '</span><span class="mm-dval">' + esc(v) + '</span></div></div>';
  }

  function detailHtml(p) {
    var t = typeOf(p.type);
    if (!t) return '';
    var name = esc(p.name);
    var photo = (p.photo_url && /^https?:\/\//i.test(p.photo_url)) ? p.photo_url : '';
    var extras = photo ? extraList(p) : [];
    var all = photo ? [photo].concat(extras) : [];

    var photos;
    if (photo) {
      var thumbs = '';
      if (all.length > 1) {
        thumbs = '<div class="mm-dthumbs" role="list">' + all.map(function (u, i) {
          return '<div class="mm-dph mm-dthumb" role="button" tabindex="0" data-lb-ready="1" data-i="' + i + '" aria-label="ছবি ' + toBn(i + 1) + ' বড় করে দেখুন"><img src="' + esc(u) + '" alt="" loading="lazy" decoding="async"></div>';
        }).join('') + '</div>';
      }
      photos = '<div class="mm-dphotos" data-gallery data-main="' + esc(photo) + '" data-extra="' + esc(JSON.stringify(extras)) + '" data-name="' + name + '">' +
        '<div class="mm-dph mm-dhero" role="button" tabindex="0" data-lb-ready="1" data-i="0" aria-label="ছবি বড় করে দেখুন">' +
          '<img src="' + esc(photo) + '" alt="' + name + '" decoding="async">' +
          (extras.length ? '<span class="mm-photo-count" aria-hidden="true"><i class="fa-regular fa-images"></i>' + toBn(all.length) + '</span>' : '') +
        '</div>' + thumbs + '</div>';
    } else {
      photos = '<div class="mm-dhero mm-dhero--none" aria-hidden="true" style="background:' + esc(t.color) + '1f;color:' + esc(t.color) + '"><i class="fa-solid ' + esc(t.icon) + '"></i></div>';
    }

    var verified = (p.is_verified === true && !p.is_demo)
      ? '<span class="mm-verified" title="অ্যাডমিন কর্তৃক যাচাইকৃত প্রোফাইল"><i class="fa-solid fa-circle-check" aria-hidden="true"></i>ভেরিফাইড<span class="mm-sr"> — অ্যাডমিন কর্তৃক যাচাইকৃত</span></span>' : '';
    var tag = '<span class="mm-tag" style="background:' + esc(t.color) + '1f;color:' + esc(t.color) + '">' + esc(t.label) + '</span>';
    var demo = p.is_demo ? '<span class="mm-demo">ডেমো</span>' : '';
    var quote = (t.quote && p[t.quote]) ? '<blockquote class="mm-quote">' + esc(p[t.quote]) + '</blockquote>' : '';
    var rows = (t.detail || t.card).filter(function (k) { return k !== t.quote; }).map(function (k) { return detailRowHtml(k, p); }).join('');

    return photos +
      '<div class="mm-dhead"><h2 class="mm-dname" id="mmDetailName">' + name + '</h2>' +
        '<div class="mm-tags">' + tag + verified + demo + '</div>' + factsHtml(t, p) + '</div>' +
      (quote ? '<div class="mm-dsec">' + quote + '</div>' : '') +
      (rows ? '<section class="mm-dsec" aria-label="বিস্তারিত তথ্য"><h3 class="mm-dsec-title">বিস্তারিত তথ্য</h3>' + rows + '</section>' : '');
  }

  function buildDetail() {
    if (detailRoot) return;
    detailRoot = document.createElement('div');
    detailRoot.className = 'mm-detail';
    detailRoot.hidden = true;
    detailRoot.setAttribute('role', 'dialog');
    detailRoot.setAttribute('aria-modal', 'true');
    detailRoot.setAttribute('aria-labelledby', 'mmDetailName');
    detailRoot.innerHTML =
      '<div class="mm-detail-bar">' +
        '<button type="button" class="mm-detail-back" data-d="close" aria-label="ফিরে যান"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i></button>' +
        '<span class="mm-detail-title">প্রোফাইলের বিস্তারিত</span>' +
      '</div>' +
      '<div class="mm-detail-inner" id="mmDetailBody"></div>' +
      '<div class="mm-detail-actions mm-card-actions" id="mmDetailActions"></div>';
    document.body.appendChild(detailRoot);
    detailBody = detailRoot.querySelector('#mmDetailBody');
    detailActions = detailRoot.querySelector('#mmDetailActions');
    detailRoot.addEventListener('click', function (e) {
      var c = e.target.closest ? e.target.closest('[data-d="close"]') : null;
      if (c) { closeDetail(); return; }
      var ed = e.target.closest ? e.target.closest('[data-mm-edit]') : null;
      if (ed) { window.dispatchEvent(new CustomEvent('matrimony:edit', { detail: { id: ed.getAttribute('data-mm-edit') } })); return; }
      onCallClick(e);
    });
  }

  // শুধু প্রোফাইলের মালিক (লগইন করা, user_id মিলেছে) বিস্তারিত পেজে "এডিট করুন" দেখে।
  // মালিকের আইডি-তালিকা (window.MM_MY_IDS) matrimony-submit.js নিজের এন্ট্রি পড়ে বানায় — পাবলিক ডাটায় user_id আসে না।
  function isMine(p) { return !!(window.MM_MY_IDS && p && window.MM_MY_IDS[p.id]); }
  function ownerEditHtml(p) {
    if (!isMine(p)) return '';
    return '<button type="button" class="mm-btn-edit" data-mm-edit="' + esc(String(p.id).replace(/^db-/, '')) + '" aria-label="এই প্রোফাইল এডিট করুন — ' + esc(p.name) + '"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i><span>এডিট করুন</span></button>';
  }
  window.addEventListener('matrimony:mine-updated', function () {
    if (!detailOpen || !detailActions) return;
    var p = findProfile(detailId);
    if (p) detailActions.innerHTML = ownerEditHtml(p) + actionHtml(p, esc(p.name));
  });

  function showDetail(p, push) {
    buildDetail();
    detailId = p.id;
    detailOpener = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    detailBody.innerHTML = detailHtml(p);
    detailActions.innerHTML = ownerEditHtml(p) + actionHtml(p, esc(p.name));
    detailRoot.scrollTop = 0;
    detailRoot.hidden = false;
    detailOpen = true;
    document.documentElement.classList.add('mm-detail-open');
    if (push) {
      try { history.pushState({ mmDetail: String(p.id) }, '', '#p-' + encodeURIComponent(String(p.id))); detailPushed = true; }
      catch (err) { detailPushed = false; }
    } else {
      detailPushed = false;
    }
    var b = detailRoot.querySelector('.mm-detail-back');
    if (b) b.focus({ preventScroll: true });
  }

  function hideDetail() {
    if (!detailRoot || !detailOpen) return;
    detailOpen = false;
    detailRoot.hidden = true;
    detailBody.innerHTML = '';
    detailActions.innerHTML = '';
    document.documentElement.classList.remove('mm-detail-open');
    if (detailOpener && document.contains(detailOpener) && detailOpener.focus) { try { detailOpener.focus({ preventScroll: true }); } catch (err) {} }
    detailOpener = null; detailId = null;
  }

  // ← বাটন / Esc: history-তে ঢোকানো থাকলে এক ধাপ পেছনে যায় (popstate বন্ধ করে), নইলে সরাসরি বন্ধ + URL থেকে #p-... মুছে ফেলে
  function closeDetail() {
    if (!detailOpen) return;
    if (detailPushed) {
      detailPushed = false;
      try { history.back(); return; } catch (err) {}
    }
    hideDetail();
    try { history.replaceState(null, '', location.pathname + location.search); } catch (err) {}
  }

  function openDetailById(id, push) {
    var p = findProfile(id);
    if (!p) return false;
    showDetail(p, push);
    return true;
  }

  // কার্ডের লেখার অংশে ক্লিক / Enter / Space
  gridEl.addEventListener('click', function (e) {
    var body = e.target.closest ? e.target.closest('[data-mm-open]') : null;
    if (!body) return;
    var card = body.closest('.mm-card');
    if (!card) return;
    // লেখা সিলেক্ট করার সময় (টেনে) ভুলে খুলে না যায়
    var sel = window.getSelection && String(window.getSelection());
    if (sel && sel.length > 0) return;
    openDetailById(card.getAttribute('data-pid'), true);
  });
  gridEl.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var body = e.target;
    if (!body || !body.hasAttribute || !body.hasAttribute('data-mm-open')) return;
    e.preventDefault();
    var card = body.closest('.mm-card');
    if (card) openDetailById(card.getAttribute('data-pid'), true);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !detailOpen) return;
    // লাইটবক্স বা কল-শিট খোলা থাকলে সেটাই আগে বন্ধ হবে
    if (document.querySelector('.mm-lb:not([hidden])') || document.querySelector('.mm-call.is-open') || document.querySelector('.mm-sheet-backdrop:not([hidden])')) return;
    closeDetail();
  });

  window.addEventListener('popstate', function () {
    var st = history.state;
    if (st && st.mmDetail) { if (!detailOpen) openDetailById(st.mmDetail, false); return; }
    if (st && st.mmLb) return;      // লাইটবক্সের নিজস্ব history ধাপ
    closeCall();
    if (detailOpen) hideDetail();
  });

  // লিংক/রিলোড: URL-এ #p-<id> থাকলে প্রোফাইল লোড হওয়ার পর সেটা খোলে (একবারই)
  var hashHandled = false;
  function openFromHash() {
    if (hashHandled) return;
    var m = /^#p-(.+)$/.exec(location.hash || '');
    if (!m) { hashHandled = true; return; }
    var id;
    try { id = decodeURIComponent(m[1]); } catch (err) { hashHandled = true; return; }
    if (openDetailById(id, false)) { hashHandled = true; return; }
    if (window.MM_LOADED) hashHandled = true;   // লোড শেষ, তবু নেই (মুছে ফেলা/অনুমোদিত নয়)
  }
  window.addEventListener('matrimony:profiles-updated', openFromHash);

  // ধাপ ৪-এ: Supabase থেকে অনুমোদিত প্রোফাইল এলে (matrimony-submit.js) তালিকা আবার আঁকা হবে
  window.addEventListener('matrimony:profiles-updated', render);
  selectEl.addEventListener('change', render);
  render();
})();
