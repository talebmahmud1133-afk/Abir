// টাঙ্গাইল জেলা — বিজ্ঞপ্তি পেজে "মিসড কল" তালিকা (যে কল আমি ধরিনি — অনলাইনে ছিলাম না / ব্যস্ত ছিলাম / কলার কেটে দিয়েছে)
// ডেটা: RPC list_missed_calls(p_limit)   — কলার অনুযায়ী গ্রুপ: প্রোফাইল, কতগুলা মিসড কল, কয়টা নতুন, শেষ কখন (শেষ ৭ দিন)
//       RPC mark_missed_calls_seen()      — পেজ দেখা হলে সব "নতুন" চিহ্ন মোছে (তালিকা থাকে, শুধু বেলের ব্যাজ কমে)
// ⚠️ তিনটি RPC (count_unseen_missed_calls, list_missed_calls, mark_missed_calls_seen) supabase/missed-calls.sql-এ; সেটা লাইভে না চালালে
//    এই সেকশন লুকানোই থাকে (এরর দেখায় না)।
// সব ডাইনামিক টেক্সট textContent দিয়ে বসানো হয় (innerHTML নয়) — XSS-নিরাপদ।
(function () {
  var sec = document.getElementById('mcSection');
  if (!sec || !window.supabase || !window.TANGAIL_SUPABASE) { return; }
  var listEl = document.getElementById('mcList');
  var countEl = document.getElementById('mcCount');
  var clearAllBtn = document.getElementById('mcClearAllBtn');
  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);

  function toBn(n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'.charAt(d); }); }
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
  function refreshBadge() { try { window.dispatchEvent(new CustomEvent('tangail:missed-calls-refresh')); } catch (e) { /* কিছু না */ } }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text) { e.textContent = text; }
    return e;
  }

  function renderItem(r) {
    var name = r.full_name || ('@' + r.username);
    var href = 'public-profile.html?u=' + encodeURIComponent(r.username);
    var isVideo = r.last_call_type === 'video';
    var item = el('div', 'fr-item mc-item' + (Number(r.new_count) > 0 ? ' mc-new' : ''));

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

    var sub = el('div', 'fr-sub mc-sub');
    var ic = document.createElement('i');
    ic.className = 'fa-solid ' + (isVideo ? 'fa-video' : 'fa-phone') + ' mc-icon';
    ic.setAttribute('aria-hidden', 'true');
    sub.appendChild(ic);
    sub.appendChild(document.createTextNode(toBn(Number(r.missed_count) || 1) + 'টি মিসড কল'));
    if (Number(r.new_count) > 0) { sub.appendChild(el('span', 'mc-new-tag', 'নতুন')); }
    body.appendChild(sub);
    body.appendChild(el('div', 'fr-time', 'শেষ কল: ' + timeAgo(r.last_called_at)));

    var actions = el('div', 'fr-actions');
    var back = el('button', 'fr-btn fr-confirm', 'কল ব্যাক'); back.type = 'button';
    var prof = el('a', 'fr-btn fr-delete mc-profile-btn', 'প্রোফাইল'); prof.href = href;
    var del = el('button', 'fr-btn fr-delete', 'মুছুন'); del.type = 'button';
    actions.appendChild(back); actions.appendChild(prof); actions.appendChild(del);
    body.appendChild(actions);
    item.appendChild(body);

    back.addEventListener('click', function () {
      if (!window.TangailCall || !r.caller_id) { return; }
      window.TangailCall.start(r.caller_id, r.username, r.full_name || '', r.avatar_url || '', isVideo ? 'video' : 'voice');
    });
    del.addEventListener('click', function () {
      del.disabled = true;
      client.rpc('dismiss_missed_calls_from', { p_caller_id: r.caller_id }).then(function (res) {
        if (res.error) { del.disabled = false; return; }
        item.remove();
        if (!listEl.children.length) { sec.hidden = true; }
        refreshBadge();
      }).catch(function () { del.disabled = false; });
    });
    return item;
  }

  function load() {
    return client.auth.getSession().then(function (res) {
      if (!(res.data && res.data.session)) { return; }   // গেস্টের জন্য কিছুই দেখানো হয় না
      return client.rpc('list_missed_calls', { p_limit: 50 }).then(function (r) {
        if (r.error || !r.data) { return; }               // RPC না থাকলে/ব্যর্থ হলে সেকশন লুকানোই থাকে
        var rows = r.data.filter(function (x) { return x && x.username; });
        listEl.innerHTML = '';
        var total = 0, anyNew = false;
        rows.forEach(function (row) {
          listEl.appendChild(renderItem(row));
          total += Number(row.missed_count) || 0;
          if (Number(row.new_count) > 0) { anyNew = true; }
        });
        countEl.textContent = total > 0 ? '(' + toBn(total) + ')' : '';
        sec.hidden = rows.length < 1;
        if (anyNew) {
          // এই ভিউতে "নতুন" দেখানো হয়ে গেছে — এখন সব দেখা চিহ্নিত করি, বেলের সংখ্যা কমবে
          client.rpc('mark_missed_calls_seen').then(function () { refreshBadge(); });
        }
      });
    }).catch(function () { /* ব্যর্থ হলে সেকশন লুকানোই থাকে */ });
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', function () {
      clearAllBtn.disabled = true;
      client.rpc('dismiss_all_missed_calls').then(function (res) {
        clearAllBtn.disabled = false;
        if (res.error) { return; }
        listEl.innerHTML = '';
        countEl.textContent = '';
        sec.hidden = true;
        refreshBadge();
      }).catch(function () { clearAllBtn.disabled = false; });
    });
  }

  // notifications.html খোলা থাকতে থাকতে নতুন মিসড কল এলে nav-avatar.js-এর Realtime সাবস্ক্রিপশন
  // এই ইভেন্ট পাঠায় — তালিকা সাথে সাথে নতুন করে লোড হয় (রিফ্রেশ লাগে না)।
  window.addEventListener('tangail:missed-calls-live', function () { load(); });

  load();
})();
