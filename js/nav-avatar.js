// বটম-ন্যাভের "প্রোফাইল" আইকনে লগইন করা ইউজারের প্রোফাইল ছবি (যদি সেট করা থাকে) দেখানো হয়।
// এই স্ক্রিপ্টটি supabase-js এবং js/supabase-config.js এর পরে যোগ করতে হবে।
(function () {
  if (!window.supabase || !window.TANGAIL_SUPABASE) return;

  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);

  function applyAvatar(session) {
    var user = session && session.user;
    var avatarUrl = user && user.user_metadata && user.user_metadata.avatar_url;
    var iconWrap = document.querySelector('.bottom-nav a[href="profile.html"] .bn-icon');
    if (!iconWrap) return;

    if (!avatarUrl) {
      // লগআউট থাকলে বা ছবি না থাকলে ডিফল্ট আইকনে ফিরিয়ে দেওয়া
      if (iconWrap.getAttribute('data-avatar-applied')) {
        iconWrap.innerHTML = '<i class="fa-solid fa-user" aria-hidden="true"></i>';
        iconWrap.removeAttribute('data-avatar-applied');
      }
      return;
    }

    iconWrap.innerHTML = '';
    var img = document.createElement('img');
    img.src = avatarUrl;
    img.alt = 'প্রোফাইল';
    img.className = 'nav-avatar-img';
    iconWrap.appendChild(img);
    iconWrap.setAttribute('data-avatar-applied', '1');
  }

  client.auth.getSession().then(function (res) {
    applyAvatar(res.data && res.data.session);
  });

  client.auth.onAuthStateChange(function (event, session) {
    applyAvatar(session);
  });

  // ---- অনলাইন উপস্থিতি (প্রেজেন্স) হার্টবিট ----
  // লগইন করা ইউজার সাইটে থাকলে প্রতি ৬০ সেকেন্ডে profiles.last_seen আপডেট হয় (RPC touch_last_seen);
  // members.html-এ list_public_members এটা দেখেই is_online (শেষ ২ মিনিটের মধ্যে) হিসাব করে।
  var presenceOn = false;
  var presenceTimer = null;

  function heartbeat() {
    if (document.hidden) return; // ট্যাব ব্যাকগ্রাউন্ডে থাকলে পাঠানোর দরকার নেই
    client.rpc('touch_last_seen').then(function (r) {
      if (r && r.error && window.console) { console.warn('touch_last_seen:', r.error.code || '', r.error.message || ''); }
    });
    fetchCounters(); // প্রোফাইল আইকনের না-পড়া ব্যাজ (আসল মোট অপঠিত) — হার্টবিটের সাথেই (আলাদা টাইমার নেই)
    fetchBellCounts(); // বেল আইকনে মেসেজ + ফ্রেন্ড রিকোয়েস্টের "নতুন" সংখ্যা — একই হার্টবিটে
    fetchMissedCalls(); // বেল আইকনে মিসড কলের ব্যাজ — একই হার্টবিটে
  }

  // ---- না-পড়া মেসেজের ব্যাজ (মেসেজিং ধাপ ৪.২) ----
  // বটম-ন্যাভের "প্রোফাইল" আইকনে ছোট লাল সংখ্যা: get_chat_counters (গেস্টের জন্য কল হয় না — শুধু লগইন সেশনে)।
  // এটা সবসময় আসল মোট অপঠিত মেসেজ (bell-এর "seen" ধারণার সাথে সম্পর্কহীন) — চ্যাট খুলে পড়লেই কমে।
  // সংখ্যা এখানেই একবার আনা হয়; প্রোফাইল পেজের ইনবক্স `tangail:chat-counters` ইভেন্টে/window.TangailChatCounters থেকে নেয়
  // এবং তালিকা রিফ্রেশ হলে `tangail:chat-counters-refresh` পাঠিয়ে নতুন করে আনতে বলে। ব্যাজ ৬০ সেকেন্ড পরপর/পেজ খুললে/ট্যাবে ফিরলে হালনাগাদ।
  var chatOn = false, cntBusy = false, cntTimer = null;
  window.TangailChatCounters = null;

  function toBn(n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'.charAt(d); }); }

  function setChatBadge(total) {
    var a = document.querySelector('.bottom-nav a[href="profile.html"]');
    if (!a) return;
    var b = a.querySelector('.bn-badge');
    if (!total || total < 1) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('span'); b.className = 'bn-badge'; a.appendChild(b); }
    b.textContent = total > 99 ? '৯৯+' : toBn(total);
    b.setAttribute('aria-label', toBn(total) + 'টি না-পড়া মেসেজ');
  }

  function fetchCounters() {
    if (!chatOn || cntBusy || document.hidden) return;
    cntBusy = true;
    client.rpc('get_chat_counters').then(function (r) {
      cntBusy = false;
      var row = r && !r.error && r.data && r.data[0];
      if (!row) return; // ব্যর্থ হলে পুরনো ব্যাজই থাকে
      window.TangailChatCounters = row;
      setChatBadge((Number(row.unread_chat) || 0) + (Number(row.unread_requests) || 0));
      try { window.dispatchEvent(new CustomEvent('tangail:chat-counters', { detail: row })); } catch (e) { /* কিছু না */ }
    }).catch(function () { cntBusy = false; });
  }

  window.addEventListener('tangail:chat-counters-refresh', function () {
    clearTimeout(cntTimer);
    cntTimer = setTimeout(fetchCounters, 300); // একসাথে অনেক অনুরোধে একটাই কল
  });
  window.addEventListener('pageshow', function (e) { if (e && e.persisted) fetchCounters(); }); // পিছনের বোতামে ফিরলে

  // ---- বেল আইকনের ব্যাজ: "শেষবার বেল দেখার পর থেকে নতুন" মেসেজ + ফ্রেন্ড রিকোয়েস্ট + মিসড কল (v132) ----
  // ইউজারের চাওয়া: একবার notifications.html খুলে (seen) দেখে ফেললে গণনা শেষ; আবার নতুন কিছু এলে তখন
  // থেকে আবার গণনা শুরু হবে, যতক্ষণ না আবার বেল/নোটিফিকেশন পেজ দেখা হয়।
  // তাই বেলের মেসেজ+রিকোয়েস্ট সংখ্যা প্রোফাইল-ব্যাজের (আসল মোট অপঠিত/পেন্ডিং) থেকে আলাদা RPC থেকে আসে:
  // RPC get_chat_counters()এর বদলে RPC get_bell_counts() — যা শুধু শেষ "seen"-এর পরের না-দেখা মেসেজ/রিকোয়েস্ট গোনে
  // (কলাম: chat_conversations.a_bell_seen_at/b_bell_seen_at, follows.seen_at)। notifications.html খুললেই
  // js/notif-seen.js RPC mark_notifications_seen() কল করে এই "seen" টাইমস্ট্যাম্পগুলো এখনকার সময়ে বসিয়ে দেয় —
  // এর পরের নতুন মেসেজ/রিকোয়েস্ট না আসা পর্যন্ত বেলের সংখ্যা ০-ই থাকে। মিসড কলের নিজস্ব seen/dismiss
  // ব্যবস্থা আগে থেকেই এই একই মডেলে (calls.callee_seen_at) — অপরিবর্তিত।
  var bellBusy = false, mcBusy = false, mcTimer = null;
  var frCount = 0, mcCount = 0, msgCount = 0;

  function setBellBadge() {
    var total = frCount + mcCount + msgCount;
    var parts = [];
    if (msgCount > 0) { parts.push(toBn(msgCount) + 'টি নতুন মেসেজ'); }
    if (frCount > 0) { parts.push(toBn(frCount) + 'টি ফ্রেন্ড রিকোয়েস্ট'); }
    if (mcCount > 0) { parts.push(toBn(mcCount) + 'টি মিসড কল'); }
    var bells = document.querySelectorAll('a.icon-btn[href="notifications.html"]');
    Array.prototype.forEach.call(bells, function (a) {
      var b = a.querySelector('.bell-badge');
      if (total < 1) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement('span'); b.className = 'bell-badge'; a.appendChild(b); }
      b.textContent = total > 99 ? '৯৯+' : toBn(total);
      b.setAttribute('aria-label', parts.join(', '));
    });
  }

  function fetchBellCounts() {
    if (!chatOn || bellBusy || document.hidden) return;
    bellBusy = true;
    client.rpc('get_bell_counts').then(function (r) {
      bellBusy = false;
      var row = r && !r.error && r.data && r.data[0];
      if (!row) return; // RPC না থাকলে/ব্যর্থ হলে পুরনো সংখ্যাই থাকে
      msgCount = Number(row.unseen_messages) || 0;
      frCount = Number(row.unseen_requests) || 0;
      setBellBadge();
    }).catch(function () { bellBusy = false; });
  }

  function fetchMissedCalls() {
    if (!chatOn || mcBusy || document.hidden) return;
    mcBusy = true;
    client.rpc('count_unseen_missed_calls').then(function (r) {
      mcBusy = false;
      if (!r || r.error || typeof r.data !== 'number') return; // RPC না থাকলে/ব্যর্থ হলে পুরনো সংখ্যাই থাকে
      mcCount = r.data;
      setBellBadge();
    }).catch(function () { mcBusy = false; });
  }

  // notif-seen.js (notifications.html) mark_notifications_seen() কল করার পর, ও চ্যাট পড়া/রিকোয়েস্ট
  // Confirm-Delete করার পরও এই একই ইভেন্টগুলোতে বেলের সংখ্যা তাৎক্ষণিক রিফ্রেশ হয়।
  var bellTimer = null;
  function scheduleBellRefresh() { clearTimeout(bellTimer); bellTimer = setTimeout(fetchBellCounts, 300); }
  window.addEventListener('tangail:chat-counters-refresh', scheduleBellRefresh);
  window.addEventListener('tangail:friend-req-refresh', scheduleBellRefresh);
  window.addEventListener('tangail:missed-calls-refresh', function () {
    clearTimeout(mcTimer);
    mcTimer = setTimeout(fetchMissedCalls, 300);
  });

  // ---- বেলের রিয়েল-টাইম আপডেট (ধাপ ১) ----
  // calls (আমাকে করা) ও follows (আমাকে পাঠানো) টেবিলে Supabase Realtime সাবস্ক্রাইব করা —
  // RLS-এর কারণে (calls_select_own / follows: read own) প্রতিটি ইউজার শুধু নিজের সারির
  // পরিবর্তনই পায়, তাই ফিল্টার (callee_id/following_id = নিজের id) দুই স্তরেই নিরাপদ।
  // পরিবর্তন এলে বেলের সংখ্যা সাথে সাথে আপডেট হয় + notifications.html খোলা থাকলে সেই
  // পেজের তালিকাও রিফ্রেশ করতে `tangail:missed-calls-live` / `tangail:friend-req-live` পাঠানো হয়
  // (missed-calls.js / friend-requests.js এই ইভেন্ট শোনে)।
  var realtimeChannel = null;

  function startRealtime(uid) {
    if (realtimeChannel || !uid || !client.channel) return;
    realtimeChannel = client.channel('tangail-notif-' + uid)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls', filter: 'callee_id=eq.' + uid }, function () {
        fetchMissedCalls();
        try { window.dispatchEvent(new CustomEvent('tangail:missed-calls-live')); } catch (e) { /* কিছু না */ }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'follows', filter: 'following_id=eq.' + uid }, function () {
        fetchBellCounts();
        try { window.dispatchEvent(new CustomEvent('tangail:friend-req-live')); } catch (e) { /* কিছু না */ }
      })
      .subscribe();
  }

  function stopRealtime() {
    if (realtimeChannel) { client.removeChannel(realtimeChannel); realtimeChannel = null; }
  }

  function startPresence(uid) {
    if (presenceOn) return;
    presenceOn = true;
    chatOn = true;
    heartbeat();
    presenceTimer = setInterval(heartbeat, 60000);
    startRealtime(uid);
  }

  function stopPresence() {
    presenceOn = false;
    chatOn = false;
    window.TangailChatCounters = null;
    setChatBadge(0);
    frCount = 0; mcCount = 0; msgCount = 0;
    setBellBadge();
    if (presenceTimer) { clearInterval(presenceTimer); presenceTimer = null; }
    stopRealtime();
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && presenceOn) { heartbeat(); }
  });

  client.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (session) { startPresence(session.user.id); }
  });

  client.auth.onAuthStateChange(function (event, session) {
    if (session) { startPresence(session.user.id); } else { stopPresence(); }
  });
})();
