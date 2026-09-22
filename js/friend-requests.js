// টাঙ্গাইল জেলা — বিজ্ঞপ্তি পেজে "ফ্রেন্ড রিকোয়েস্ট" তালিকা (যাকে রিকোয়েস্ট পাঠানো হয়েছে, সে এখানে দেখে)
// ডেটা: RPC list_incoming_friend_requests(p_limit)  — আমাকে পাঠানো pending রিকোয়েস্ট (নাম/ছবি/ইউজারনেম)
//       RPC respond_friend_request(p_username, p_accept) — true = গ্রহণ, false = মুছে ফেলা
// (দুটোই লাইভ Supabase-এ আগে থেকে আছে — migration friend_requests_accept_flow; এই ফাইলে কোনো ডাটাবেজ বদল নেই)
// সব ডাইনামিক টেক্সট textContent দিয়ে বসানো হয় (innerHTML নয়) — XSS-নিরাপদ।
(function () {
  var sec = document.getElementById('frSection');
  if (!sec || !window.supabase || !window.TANGAIL_SUPABASE) { return; }
  var listEl = document.getElementById('frList');
  var countEl = document.getElementById('frCount');
  var msgEl = document.getElementById('frMsg');
  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
  var count = 0;

  function toBn(n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'.charAt(d); }); }
  function setMsg(t, ok) { msgEl.textContent = t || ''; msgEl.className = 'auth-msg fr-msg' + (ok ? ' ok' : ''); }
  function timeAgo(iso) {
    if (!iso) { return ''; }
    var mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) { return 'এইমাত্র'; }
    if (mins < 60) { return toBn(mins) + ' মিনিট আগে'; }
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) { return toBn(hrs) + ' ঘণ্টা আগে'; }
    return toBn(Math.floor(hrs / 24)) + ' দিন আগে';
  }
  function initial(name) { var c = String(name || '').replace(/^@/, '').trim().charAt(0); return c ? c.toUpperCase() : '?'; }
  function refreshBadge() { try { window.dispatchEvent(new CustomEvent('tangail:friend-req-refresh')); } catch (e) { /* কিছু না */ } }

  function updateCount() {
    countEl.textContent = count > 0 ? '(' + toBn(count) + ')' : '';
    sec.hidden = count < 1;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text) { e.textContent = text; }
    return e;
  }

  function renderItem(r) {
    var name = r.full_name || ('@' + r.username);
    var href = 'public-profile.html?u=' + encodeURIComponent(r.username);
    var item = el('div', 'fr-item');

    var av = el('a', 'fr-avatar'); av.href = href; av.setAttribute('aria-hidden', 'true'); av.tabIndex = -1;
    if (/^https:\/\//i.test(r.avatar_url || '')) {
      var img = document.createElement('img'); img.src = r.avatar_url; img.alt = '';
      img.onerror = function () { img.remove(); av.textContent = initial(name); };
      av.appendChild(img);
    } else { av.textContent = initial(name); }
    item.appendChild(av);

    var body = el('div', 'fr-body');
    var nm = el('a', 'fr-name', name); nm.href = href;
    body.appendChild(nm);
    body.appendChild(el('div', 'fr-sub', 'আপনাকে ফ্রেন্ড রিকোয়েস্ট পাঠিয়েছেন'));
    body.appendChild(el('div', 'fr-time', timeAgo(r.requested_at)));

    var actions = el('div', 'fr-actions');
    var ok = el('button', 'fr-btn fr-confirm', 'Confirm'); ok.type = 'button';
    var no = el('button', 'fr-btn fr-delete', 'Delete'); no.type = 'button';
    actions.appendChild(ok); actions.appendChild(no);
    body.appendChild(actions);
    item.appendChild(body);

    function respond(accept) {
      ok.disabled = true; no.disabled = true; setMsg('');
      client.rpc('respond_friend_request', { p_username: r.username, p_accept: accept }).then(function (res) {
        if (res.error) { setMsg('সম্পন্ন করা যায়নি: ' + (res.error.message || 'অজানা সমস্যা')); ok.disabled = false; no.disabled = false; return; }
        item.remove(); count = Math.max(0, count - 1); updateCount();
        setMsg(res.data === false ? 'রিকোয়েস্টটি আর নেই।' : (accept ? name + ' এখন আপনার ফ্রেন্ড।' : 'রিকোয়েস্ট মুছে ফেলা হয়েছে।'), res.data !== false);
        refreshBadge();
      }).catch(function () { setMsg('নেটওয়ার্ক সমস্যা — আবার চেষ্টা করুন।'); ok.disabled = false; no.disabled = false; });
    }
    ok.addEventListener('click', function () { respond(true); });
    no.addEventListener('click', function () { respond(false); });
    return item;
  }

  function load() {
    return client.auth.getSession().then(function (res) {
      if (!(res.data && res.data.session)) { return; }   // গেস্টের জন্য কিছুই দেখানো হয় না
      return client.rpc('list_incoming_friend_requests', { p_limit: 50 }).then(function (r) {
        var rows = !r.error && r.data ? r.data : [];
        listEl.innerHTML = '';
        rows.forEach(function (row) { if (row && row.username) { listEl.appendChild(renderItem(row)); } });
        count = listEl.children.length;
        updateCount();
      });
    }).catch(function () { /* ব্যর্থ হলে সেকশন লুকানোই থাকে */ });
  }

  // notifications.html খোলা থাকতে থাকতে নতুন ফ্রেন্ড রিকোয়েস্ট এলে nav-avatar.js-এর Realtime
  // সাবস্ক্রিপশন এই ইভেন্ট পাঠায় — তালিকা সাথে সাথে নতুন করে লোড হয় (রিফ্রেশ লাগে না)।
  window.addEventListener('tangail:friend-req-live', function () { load(); });

  load();
})();
