// টাঙ্গাইল জেলা — ইনবক্স (profile.html-এর "মেসেজ" ট্যাব) — মেসেজিং সিস্টেম ধাপ ২খ + ২গ
// সাব-ট্যাব: "চ্যাট" (accepted + আমি-পাঠানো রিকোয়েস্ট) ও "মেসেজ রিকোয়েস্ট" (আমি যে রিকোয়েস্ট পেয়েছি)।
// ডাটা: RPC list_conversations(p_folder, p_limit, p_offset) (ধাপ ১; শুধু authenticated — গেস্টকে সার্ভারও আটকায়)।
// সারিতে ট্যাপ → chat.html?u=<username>। ট্যাব প্রথমবার খুললেই লোড হয় (অকারণ RPC কল এড়াতে)।
// ২গ (এই ধাপে যোগ): মেসেজ ট্যাব খোলা থাকা অবস্থায় chat_conversations-এ Realtime (user_a/user_b আলাদা
//   ফিল্টারে দুটো চ্যানেল, কারণ postgres_changes-এ OR ফিল্টার হয় না) — নতুন/আপডেট হওয়া কথোপকথনে তালিকা
//   হালনাগাদ (ডিবাউন্স করে, ঘন ঘন RPC এড়াতে); অন্য প্রোফাইল-ট্যাবে গেলে unsubscribe।
// ৪.২ (এই ধাপে যোগ): না-পড়া ব্যাজ — প্রতি সারিতে সংখ্যা (list_conversations.unread_count) + গাঢ় অক্ষর; সাব-ট্যাবে ও প্রোফাইলের
//   "মেসেজ" ট্যাব-বাটনে মোট সংখ্যা। মোট সংখ্যা get_chat_counters থেকে — js/nav-avatar.js একাই আনে (পেজে একটাই কল) এবং
//   `tangail:chat-counters` ইভেন্টে জানায়; এখানে তালিকা রিফ্রেশ হলে `tangail:chat-counters-refresh` ইভেন্টে নতুন করে আনতে বলা হয়।
// এখনো নয় (পরের ধাপে): মোছা/ব্লক (৫)।
// সব ডাইনামিক টেক্সট textContent দিয়ে (XSS-নিরাপদ); ছবির URL শুধু https।
(function () {
  var tabBtn = document.querySelector('[data-pf-tab="messages"]');
  var panel = document.querySelector('[data-pf-panel="messages"]');
  if (!tabBtn || !panel || !window.supabase) { return; }

  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
  var USERNAME_RE = /^[a-z0-9_]{3,20}$/;
  var PAGE = 20;
  var STALE_MS = 30000;   // ট্যাবে ফিরলে এর চেয়ে পুরনো হলে তালিকা আবার আনা হয়

  function $(id) { return document.getElementById(id); }
  var listEl = $('ibList'), stateEl = $('ibState'), moreBtn = $('ibMore'), msgEl = $('ibMsg'), countEl = $('ibReqCount');
  var chatCountEl = $('ibChatCount'), tabBadgeEl = $('pfMsgBadge');
  var subBtns = panel.querySelectorAll('[data-ib-folder]');

  var folders = {
    chat:     { rows: [], offset: 0, hasMore: false, loaded: false, loading: false, error: false },
    requests: { rows: [], offset: 0, hasMore: false, loaded: false, loading: false, error: false }
  };
  var cur = 'chat', opened = false, guest = false, lastLoad = 0;
  var rtChanA = null, rtChanB = null, rtDebounce = null, tabVisible = false, myId = null;

  function toBn(n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'.charAt(d); }); }
  var MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  function dayKey(d) { return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
  function fmtWhen(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) { return ''; }
    var now = new Date(), y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    if (dayKey(d) === dayKey(now)) {
      var h = d.getHours(), m = d.getMinutes();
      var period = h < 4 ? 'রাত' : h < 6 ? 'ভোর' : h < 12 ? 'সকাল' : h < 15 ? 'দুপুর' : h < 18 ? 'বিকাল' : h < 20 ? 'সন্ধ্যা' : 'রাত';
      return period + ' ' + toBn(h % 12 || 12) + ':' + toBn(('0' + m).slice(-2));
    }
    if (dayKey(d) === dayKey(y)) { return 'গতকাল'; }
    return toBn(d.getDate()) + ' ' + MONTHS[d.getMonth()] + (d.getFullYear() !== now.getFullYear() ? ' ' + toBn(d.getFullYear()) : '');
  }
  function needsLogin(err) {
    var m = String((err && err.message) || '').toLowerCase();
    return m.indexOf('guest') > -1 || m.indexOf('jwt') > -1;
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  // ---------- একটা সারি ----------
  function buildRow(c) {
    var u = String(c.username || '').toLowerCase();
    if (!USERNAME_RE.test(u)) { return null; }
    var name = c.full_name || ('@' + u);
    var unread = Math.max(0, Number(c.unread_count) || 0);
    var li = el('li', 'ib-item' + (unread > 0 ? ' unread' : ''));
    var a = el('a', 'ib-link');
    a.href = 'chat.html?u=' + encodeURIComponent(u);

    var av = el('div', 'ib-avatar');
    av.setAttribute('aria-hidden', 'true');
    var initial = name.replace(/^@/, '').trim().charAt(0).toUpperCase() || '?';
    if (/^https:\/\//i.test(c.avatar_url || '')) {
      var img = document.createElement('img');
      img.src = c.avatar_url; img.alt = ''; img.loading = 'lazy';
      img.onerror = function () { img.remove(); av.insertBefore(document.createTextNode(initial), av.firstChild); };
      av.appendChild(img);
    } else {
      av.appendChild(document.createTextNode(initial));
    }
    if (c.is_online) { av.appendChild(el('span', 'ib-dot')); }
    a.appendChild(av);

    var body = el('div', 'ib-body');
    var top = el('div', 'ib-top');
    var nm = el('div', 'ib-name');
    nm.appendChild(el('span', null, name));
    if (c.is_verified) {
      var vi = document.createElement('i');
      vi.className = 'fa-solid fa-circle-check';
      vi.setAttribute('role', 'img'); vi.setAttribute('aria-label', 'যাচাইকৃত সদস্য');
      nm.appendChild(vi);
    }
    top.appendChild(nm);
    top.appendChild(el('span', 'ib-when', fmtWhen(c.last_message_at)));
    body.appendChild(top);
    var pr = el('div', 'ib-prev-row');
    pr.appendChild(el('div', 'ib-preview', (c.last_is_mine ? 'আপনি: ' : '') + (c.last_message_preview || '')));
    if (unread > 0) {
      var bd = el('span', 'ib-unread', unread > 99 ? '৯৯+' : toBn(unread));
      bd.setAttribute('aria-label', toBn(unread) + 'টি না-পড়া মেসেজ');
      pr.appendChild(bd);
    }
    body.appendChild(pr);
    if (c.state === 'request_sent') { body.appendChild(el('span', 'ib-tag', 'রিকোয়েস্ট পাঠানো হয়েছে')); }
    a.appendChild(body);
    li.appendChild(a);
    return li;
  }

  // ---------- রেন্ডার ----------
  function setState(text, kind) {   // kind: null | 'login' | 'retry' | 'members'
    stateEl.textContent = '';
    if (!text) { stateEl.hidden = true; return; }
    stateEl.appendChild(document.createTextNode(text));
    if (kind === 'login') {
      stateEl.appendChild(document.createElement('br'));
      var a = el('a', 'ib-cta', 'লগইন করুন');
      a.href = 'login.html?next=' + encodeURIComponent('profile.html#messages');
      stateEl.appendChild(a);
    } else if (kind === 'retry') {
      stateEl.appendChild(document.createElement('br'));
      var b = el('button', 'ib-cta', 'আবার চেষ্টা করুন');
      b.type = 'button';
      b.addEventListener('click', function () { load(cur, true); });
      stateEl.appendChild(b);
    } else if (kind === 'members') {
      stateEl.appendChild(document.createTextNode(' '));
      var l = el('a', null, 'সদস্য খুঁজুন');
      l.href = 'members.html';
      stateEl.appendChild(l);
    }
    stateEl.hidden = false;
  }
  // মোট না-পড়া সংখ্যার ব্যাজ (সাব-ট্যাব দুটো + প্রোফাইলের মেসেজ ট্যাব-বাটন)। সংখ্যা nav-avatar.js-এর get_chat_counters থেকে।
  function setBadge(node, n) {
    if (!node) { return; }
    if (!n || n < 1) { node.hidden = true; node.textContent = ''; return; }
    node.textContent = n > 99 ? '৯৯+' : toBn(n);
    node.hidden = false;
  }
  function applyCounters(c) {
    if (!c) { return; }
    var ch = Math.max(0, Number(c.unread_chat) || 0), rq = Math.max(0, Number(c.unread_requests) || 0);
    setBadge(chatCountEl, ch); setBadge(countEl, rq); setBadge(tabBadgeEl, ch + rq);
  }
  window.addEventListener('tangail:chat-counters', function (e) { applyCounters(e && e.detail); });
  if (window.TangailChatCounters) { applyCounters(window.TangailChatCounters); }
  function updateCount() {   // তালিকা লোড/রিফ্রেশের পর — মোট সংখ্যা নতুন করে আনতে বলো (nav-avatar.js ডিবাউন্স করে একবার আনে)
    try { window.dispatchEvent(new Event('tangail:chat-counters-refresh')); } catch (e) { /* কিছু না */ }
  }
  function render() {
    listEl.textContent = '';
    moreBtn.hidden = true;
    msgEl.textContent = '';
    Array.prototype.forEach.call(subBtns, function (b) { b.classList.toggle('active', b.getAttribute('data-ib-folder') === cur); });
    if (guest) {
      subBtns[0].parentNode.hidden = true;
      setState('মেসেজ করতে লগইন করুন।', 'login');
      return;
    }
    var st = folders[cur];
    if (st.loading && !st.rows.length) { setState('লোড হচ্ছে…'); return; }
    if (st.error && !st.rows.length) { setState('মেসেজ তালিকা এখন লোড করা যাচ্ছে না।', 'retry'); return; }
    st.rows.forEach(function (c) { var li = buildRow(c); if (li) { listEl.appendChild(li); } });
    if (!st.rows.length) {
      setState(cur === 'chat' ? 'এখনো কোনো চ্যাট নেই। সদস্য খুঁজে প্রথম মেসেজ পাঠান।' : 'কোনো মেসেজ রিকোয়েস্ট নেই।', cur === 'chat' ? 'members' : null);
    } else {
      setState('');
    }
    moreBtn.hidden = !st.hasMore;
    moreBtn.disabled = st.loading;
    if (st.error && st.rows.length) { msgEl.textContent = 'আরও লোড করা যায়নি — আবার চেষ্টা করুন।'; msgEl.className = 'auth-msg'; moreBtn.hidden = false; }
  }

  // ---------- লোড ----------
  function load(f, reset) {
    var st = folders[f];
    if (st.loading) { return Promise.resolve(); }
    if (reset) { st.rows = []; st.offset = 0; st.hasMore = false; st.loaded = false; }
    st.loading = true; st.error = false;
    if (f === cur) { render(); }
    return client.rpc('list_conversations', { p_folder: f, p_limit: PAGE + 1, p_offset: st.offset }).then(function (r) {
      if (r.error) { throw r.error; }
      var data = r.data || [], more = data.length > PAGE;
      if (more) { data = data.slice(0, PAGE); }
      st.rows = st.rows.concat(data); st.offset += data.length; st.hasMore = more; st.loaded = true;
    }).catch(function (e) {
      if (needsLogin(e)) { guest = true; } else { st.error = true; }
    }).then(function () {
      st.loading = false; updateCount();
      if (f === cur || guest) { render(); }
      if (st.dirty) { st.dirty = false; if (tabVisible && !guest) { refresh(f); } }   // লোডের মাঝে রিয়েলটাইম আপডেট এলে আবার আনো
    });
  }
  function loadAll() {
    lastLoad = Date.now();
    load('chat', true);
    load('requests', true);   // সাব-ট্যাবের সংখ্যার জন্য আগেই আনা
  }
  // রিয়েলটাইম/ফিরে-আসার রিফ্রেশ: তালিকা খালি করে "লোড হচ্ছে…" দেখায় না, নতুন ডাটা এলে একবারে বদলায়;
  // আগে যতগুলো সারি লোড ছিল ("আরও দেখুন" সহ) ততগুলোই আবার আনে। ব্যর্থ হলে পুরনো তালিকাই থাকে।
  function refresh(f) {
    var st = folders[f];
    if (st.loading) { st.dirty = true; return Promise.resolve(); }
    st.loading = true;
    var want = Math.max(PAGE, st.rows.length);
    return client.rpc('list_conversations', { p_folder: f, p_limit: want + 1, p_offset: 0 }).then(function (r) {
      if (r.error) { throw r.error; }
      var data = r.data || [], more = data.length > want;
      if (more) { data = data.slice(0, want); }
      st.rows = data; st.offset = data.length; st.hasMore = more; st.loaded = true; st.error = false;
    }).catch(function (e) {
      if (needsLogin(e)) { guest = true; } else if (!st.rows.length) { st.error = true; }
    }).then(function () {
      st.loading = false; updateCount();
      if (f === cur || guest) { render(); }
      if (st.dirty) { st.dirty = false; if (tabVisible && !guest) { refresh(f); } }
    });
  }
  function refreshAll() {
    lastLoad = Date.now();
    refresh('chat');
    refresh('requests');
  }

  // ---------- রিয়েলটাইম (chat_conversations — মেসেজ ট্যাব খোলা থাকলেই) ----------
  function unsubscribeRealtime() {
    if (rtChanA) { client.removeChannel(rtChanA); rtChanA = null; }
    if (rtChanB) { client.removeChannel(rtChanB); rtChanB = null; }
    clearTimeout(rtDebounce); rtDebounce = null;
  }
  function onConvChange() {
    clearTimeout(rtDebounce);
    rtDebounce = setTimeout(function () { if (tabVisible && !guest) { refreshAll(); } }, 800);
  }
  function subscribeRealtime() {
    if (!myId || rtChanA) { return; }
    rtChanA = client.channel('inbox-conv-a-' + myId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations', filter: 'user_a=eq.' + myId }, onConvChange)
      .subscribe();
    rtChanB = client.channel('inbox-conv-b-' + myId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations', filter: 'user_b=eq.' + myId }, onConvChange)
      .subscribe();
  }

  function open() {
    tabVisible = true;
    if (!opened) {
      opened = true;
      client.auth.getSession().then(function (res) {
        var session = res.data && res.data.session;
        if (!session) { guest = true; render(); return; }
        myId = session.user.id;
        loadAll();
        subscribeRealtime();
      }).catch(function () { folders.chat.error = true; render(); });
      return;
    }
    if (!guest) { subscribeRealtime(); }
    if (!guest && Date.now() - lastLoad > STALE_MS) { refreshAll(); }
  }
  function leave() { tabVisible = false; unsubscribeRealtime(); }

  Array.prototype.forEach.call(subBtns, function (b) {
    b.addEventListener('click', function () {
      cur = b.getAttribute('data-ib-folder');
      render();
      if (!guest && !folders[cur].loaded && !folders[cur].loading) { load(cur, true); }
    });
  });
  moreBtn.addEventListener('click', function () { load(cur, false); });
  tabBtn.addEventListener('click', open);
  Array.prototype.forEach.call(document.querySelectorAll('[data-pf-tab]'), function (b) {
    if (b !== tabBtn) { b.addEventListener('click', leave); }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { unsubscribeRealtime(); }
    else if (tabVisible && !guest) {
      subscribeRealtime();
      if (Date.now() - lastLoad > STALE_MS) { refreshAll(); }   // লুকানো অবস্থায় আসা মেসেজ ধরতে
    }
  });
  window.addEventListener('pagehide', unsubscribeRealtime);
  // পিছনের বোতামে ফিরলে (bfcache) পুরনো তালিকা/ব্যাজ থাকতে পারে — চ্যাটে পড়ে আসা মেসেজের ব্যাজ কমাতে রিফ্রেশ
  window.addEventListener('pageshow', function (e) { if (e && e.persisted && tabVisible && !guest) { refreshAll(); } });

  // profile.html#messages → মেসেজ ট্যাব সরাসরি খোলা
  if (window.location.hash === '#messages') { tabBtn.click(); }
})();
