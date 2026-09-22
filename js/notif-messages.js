// টাঙ্গাইল জেলা — বিজ্ঞপ্তি পেজে "মেসেজ" তালিকা (যাদের কাছ থেকে না-পড়া মেসেজ আছে)
// ডেটা: RPC list_conversations('chat', ...) + list_conversations('requests', ...) — দুটো ফোল্ডার থেকেই
//       unread_count > 0 এমন কথোপকথন বেছে নেওয়া হয় (folder='requests' মানে এখনো ফ্রেন্ড নয়, তাই "মেসেজ
//       রিকোয়েস্ট" ট্যাগ দেখানো হয়) (দুটোই লাইভে আগে থেকে আছে — messages-schema.sql; এই ফাইলে কোনো
//       ডাটাবেজ বদল নেই)।
// বেলের সংখ্যা এই তালিকার উপর নির্ভর করে না — nav-avatar.js নিজেই get_chat_counters থেকে সংখ্যা আনে;
// এখানে শুধু কারা পাঠিয়েছে তার তালিকা দেখানো হয় (ক্লিক করলে chat.html-এ গিয়ে mark_read হয়, ব্যাজ কমে)।
// সব ডাইনামিক টেক্সট textContent দিয়ে বসানো হয় (innerHTML নয়) — XSS-নিরাপদ।
(function () {
  var sec = document.getElementById('msgSection');
  if (!sec || !window.supabase || !window.TANGAIL_SUPABASE) { return; }
  var listEl = document.getElementById('msgList');
  var countEl = document.getElementById('msgCount');
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
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text) { e.textContent = text; }
    return e;
  }

  function renderItem(r) {
    var name = r.full_name || ('@' + r.username);
    var href = 'chat.html?u=' + encodeURIComponent(r.username);
    var item = el('a', 'fr-item msg-item'); item.href = href;
    item.style.textDecoration = 'none'; item.style.color = 'inherit';

    var av = el('span', 'fr-avatar');
    if (/^https:\/\//i.test(r.avatar_url || '')) {
      var img = document.createElement('img'); img.src = r.avatar_url; img.alt = '';
      img.onerror = function () { img.remove(); av.textContent = initial(name); };
      av.appendChild(img);
    } else { av.textContent = initial(name); }
    item.appendChild(av);

    var body = el('div', 'fr-body');
    var nm = el('span', 'fr-name', name); nm.style.display = 'block';
    body.appendChild(nm);

    var subRow = el('div', 'msg-sub-row');
    subRow.appendChild(el('span', 'fr-sub', r.last_message_preview || ''));
    subRow.appendChild(el('span', 'msg-unread-count', r.unread_count > 99 ? '৯৯+' : toBn(r.unread_count)));
    body.appendChild(subRow);

    if (r.state === 'request_received') { body.appendChild(el('span', 'msg-req-tag', 'মেসেজ রিকোয়েস্ট')); }
    body.appendChild(el('div', 'fr-time', timeAgo(r.last_message_at)));
    item.appendChild(body);
    return item;
  }

  function load() {
    return client.auth.getSession().then(function (res) {
      if (!(res.data && res.data.session)) { return; }   // গেস্টের জন্য কিছুই দেখানো হয় না
      return Promise.all([
        client.rpc('list_conversations', { p_folder: 'chat', p_limit: 50, p_offset: 0 }),
        client.rpc('list_conversations', { p_folder: 'requests', p_limit: 50, p_offset: 0 })
      ]).then(function (results) {
        var rows = [];
        results.forEach(function (r) {
          if (!r.error && r.data) { rows = rows.concat(r.data); }
        });
        rows = rows.filter(function (x) { return x && x.username && Number(x.unread_count) > 0; });
        rows.sort(function (a, b) { return new Date(b.last_message_at) - new Date(a.last_message_at); });

        listEl.innerHTML = '';
        var totalUnread = 0;
        rows.forEach(function (row) {
          listEl.appendChild(renderItem(row));
          totalUnread += Number(row.unread_count) || 0;
        });
        countEl.textContent = totalUnread > 0 ? '(' + toBn(totalUnread) + ')' : '';
        sec.hidden = rows.length < 1;
      });
    }).catch(function () { /* ব্যর্থ হলে সেকশন লুকানোই থাকে */ });
  }

  // notifications.html খোলা থাকতে থাকতে নতুন মেসেজ এলে nav-avatar.js-এর হার্টবিট/রিয়েলটাইম
  // `tangail:chat-counters` পাঠায় (প্রতি হার্টবিটে/ফোকাসে) — তালিকা তখন নতুন করে লোড হয়।
  window.addEventListener('tangail:chat-counters', function () { load(); });

  load();
})();
