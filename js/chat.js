// টাঙ্গাইল জেলা — চ্যাট পেজ (chat.html?u=<username>) — মেসেজিং সিস্টেম ধাপ ২ক + ২গ
// ২ক: মেসেজ দেখা (পুরনো মেসেজ ৩০টি করে) + টেক্সট পাঠানো + তিন অবস্থার ব্যানার (Add Friend সহ)।
// ২গ (এই ধাপে যোগ): Supabase Realtime (chat_messages INSERT, conversation-ভিত্তিক ফিল্টার; পেজ লুকালে/বন্ধে
//   unsubscribe) + রিয়েলটাইম সাবস্ক্রাইব না হলে ১২ সেকেন্ডের পোলিং fallback (get_messages দিয়ে); "নতুন মেসেজ ↓"
//   বাটন (ওপরে পড়ার সময় জোর করে না নামিয়ে); ইমোজি-পিকার (CDN ছাড়া ইউনিকোড গ্রিড); ৩০ সেকেন্ড পরপর
//   get_chat_state দিয়ে হেডারের অনলাইন-অবস্থা রিফ্রেশ (পেজ দৃশ্যমান থাকলেই)।
// ধাপ ৩ (এই ধাপে যোগ): ছবি/ভিডিও — 📎 বাটন, প্রিভিউ, ছবি পাঠানোর আগে কম্প্রেস (~১২৮০px, JPEG ৭০%), ভিডিও ≤৩০ সেকেন্ড ও ≤৮ MB,
//   প্রাইভেট বাকেট `chat-media`-তে <নিজের-uid>/<নাম> পাথে XHR-আপলোড (প্রগ্রেস %), তারপর send_message(p_media_url, p_media_type);
//   দেখানো signed URL (১ ঘণ্টা, ব্যাচে) দিয়ে; ছবিতে ট্যাপ → লাইটবক্স; পাঠানো ব্যর্থ হলে আপলোড-করা ফাইল আবার-পাঠানো বা মুছে ফেলা।
//   অপরিচিত/রিকোয়েস্ট অবস্থায় মিডিয়া বন্ধ (get_chat_state.can_send_media; সার্ভারেও আটকায়)।
// ধাপ ৪.১ (এই ধাপে যোগ): রিঅ্যাকশন — বাবলে দীর্ঘ চাপ (বা ডেস্কটপে ডাবল-ক্লিক/রাইট-ক্লিক) → 👍 ❤️ 😂 😮 😢 🙏 প্যালেট;
//   react_to_message (একজন = একটা; একই ইমোজিতে আবার চাপলে উঠে যায়); বাবলের নিচে চিপ + সংখ্যা (চিপে চাপলেও রিঅ্যাক্ট/তোলা);
//   আশাবাদী আপডেট (ব্যর্থ হলে আগের অবস্থা ফিরে আসে); অন্যের রিঅ্যাকশন Realtime (chat_message_reactions) বা পোলিং-এ আসে।
//   শুধু accepted (চ্যাট চালু) কথোপকথনে — সার্ভারও রিকোয়েস্ট/ব্লক অবস্থায় আটকায়।
// ধাপ ৪.২ (এই ধাপে যোগ): Seen — চ্যাট খুললে (ও খোলা অবস্থায় নতুন মেসেজ এলে) mark_read; অন্যজন পড়লে Realtime
//   (chat_messages UPDATE, read_at) বা পোলিং-এ আপডেট। না-পড়া ব্যাজ ইনবক্স/নেভে (js/profile-inbox.js, js/nav-avatar.js)।
// Seen Status UI (v133, এই ধাপে যোগ): WhatsApp-এর মতো টিক — নিজের প্রতিটা মেসেজের সময়ের পাশে ছোট আইকন।
//   sending (tmp) = single tick (ধূসর #9CA3AF); পাঠানো/সংরক্ষিত হলেও read_at না-থাকলে = double tick (ধূসর);
//   read_at থাকলে = double tick (নীল #3B82F6)। কোনো বাড়তি টেক্সট নেই — শুধু আইকনের রঙ বদলায়। কোনো নতুন DB
//   কলাম লাগেনি — বিদ্যমান chat_messages.read_at (+ ইতিমধ্যের mark_read/Realtime) ব্যবহার করা হয়েছে।
// ধাপ ৫ (এই ধাপে যোগ): হেডারের ⋮ মেনু — নিজের দিক থেকে কথোপকথন মোছা (delete_conversation_for_me, অন্যজনের দিকে প্রভাব ফেলে না)
//   ও ব্লক/আনব্লক (block_user/unblock_user, get_chat_state.i_blocked দিয়ে বাটনের লেখা বদলায়)। মোছার পর ইনবক্সে ফেরত।
// মেসেজ অ্যাকশন (v109): যেকোনো মেসেজে (টেক্সট/ছবি/ভিডিও) দীর্ঘ চাপ → মেসেজটি নির্বাচিত হয়, হেডার বদলে ✕ + ⋮ বার (WhatsApp-এর মতো);
//   ⋮ মেনুতে কপি · রিপ্লাই · ফরওয়ার্ড · এডিট (শুধু নিজের) · ডিলিট (আমার থেকে / নিজের হলে সবার জন্য)। রিঅ্যাকশন-প্যালেটও আগের মতো সাথে আসে।
//   RPC (লাইভ, migration `chat_message_actions`): send_message(p_reply_to), edit_message, delete_message_for_everyone,
//   hide_message_for_me, forward_message; get_messages এখন edited_at/deleted_at/is_forwarded/reply_* ও দেয়।
//
// সব ডাটা ধাপ ১-এর RPC দিয়ে (সবই SECURITY DEFINER, শুধু authenticated):
//   get_chat_state(p_username)                 — অন্যপক্ষ + অবস্থা (none/request_sent/request_received/accepted) + পাঠানো যাবে কিনা
//   get_messages(p_username, p_before, p_limit) — নতুন থেকে পুরনো ক্রমে; এখানে উল্টে দেখানো হয়
//   send_message(p_username, p_body)           — সব নিয়ম (ব্লক/রেট-লিমিট/৫-মেসেজ/ফ্রেন্ড) সার্ভারে প্রয়োগ হয়
// Add Friend = ফ্রেন্ড রিকোয়েস্ট (follows টেবিলে pending insert; চ্যাট চালু হয় accepted হলে — public-profile.js-এর মতোই)।
// সব ডাইনামিক টেক্সট textContent দিয়ে (innerHTML নয়) — XSS-নিরাপদ; ছবির URL শুধু https।
(function () {
  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
  var USERNAME_RE = /^[a-z0-9_]{3,20}$/;
  var PAGE = 30;

  function $(id) { return document.getElementById(id); }
  var el = {
    back: $('chatBack'), peer: $('chatPeer'), avatar: $('chatAvatar'), name: $('chatName'),
    verified: $('chatVerified'), status: $('chatStatus'),
    loading: $('chatLoading'), error: $('chatError'), errorText: $('chatErrorText'), retry: $('chatRetry'),
    notFound: $('chatNotFound'), notFoundText: $('chatNotFoundText'), main: $('chatMain'),
    banner: $('chatBanner'), bannerTitle: $('chatBannerTitle'), bannerSub: $('chatBannerSub'),
    addFriend: $('chatAddFriend'), bannerMsg: $('chatBannerMsg'),
    list: $('chatList'), input: $('chatInput'), send: $('chatSend'),
    newMsg: $('chatNewMsg'), emojiBtn: $('chatEmojiBtn'), emojiPanel: $('chatEmojiPanel'),
    attach: $('chatAttachBtn'), file: $('chatFile'), preview: $('chatPreview'), previewImg: $('chatPreviewImg'),
    previewVideo: $('chatPreviewVideo'), previewTag: $('chatPreviewTag'), previewRemove: $('chatPreviewRemove'),
    previewInfo: $('chatPreviewInfo'), lightbox: $('chatLightbox'), lightboxImg: $('chatLightboxImg'),
    lightboxClose: $('chatLightboxClose'),
    callVoice: $('chatCallVoice'), callVideo: $('chatCallVideo'),
    menuWrap: $('chatMenuWrap'), menuBtn: $('chatMenuBtn'), menuPanel: $('chatMenuPanel'),
    menuBlock: $('chatMenuBlock'), menuBlockText: $('chatMenuBlockText'), menuDelete: $('chatMenuDelete'),
    head: $('chatHead'), selClose: $('chatSelClose'), selMenuBtn: $('chatSelMenuBtn'), selMenuPanel: $('chatSelMenuPanel'),
    actCopy: $('chatActCopy'), actReply: $('chatActReply'), actForward: $('chatActForward'), actEdit: $('chatActEdit'), actDelete: $('chatActDelete'),
    replyBar: $('chatReplyBar'), replyWho: $('chatReplyWho'), replySnip: $('chatReplySnip'), replyX: $('chatReplyX'),
    sheet: $('chatSheet'), sheetBack: $('chatSheetBack'), sheetTitle: $('chatSheetTitle'), sheetBody: $('chatSheetBody'), sheetClose: $('chatSheetClose')
  };

  var uname = (new URLSearchParams(window.location.search).get('u') || '').trim().toLowerCase();
  var me = null;             // লগইন করা ইউজারের id
  var chat = null;           // get_chat_state-এর সারি
  var msgs = [];             // পুরনো → নতুন ক্রমে; অস্থায়ী (পাঠানোর অপেক্ষায়/ব্যর্থ) মেসেজে tmp:true
  var hasMore = false, loadingOlder = false, tmpSeq = 0, msgTimer = null, busyFriend = false;
  var pending = null;        // পাঠানোর জন্য বাছাই করা ছবি/ভিডিও: { file, type, mime, url, size, dur }
  var preparing = false;     // ছবি কম্প্রেস/ভিডিও যাচাই চলছে
  var stickBottom = true;    // নিচে আছি — মিডিয়া লোড হয়ে উচ্চতা বাড়লে আবার নিচে নামাও
  var menuOpen = false, busyMenuAction = false;   // ধাপ ৫: হেডারের ⋮ মেনু (মোছা/ব্লক)
  var selId = null, selMenuOpen = false;          // মেসেজ অ্যাকশন: নির্বাচিত মেসেজের id ও হেডারের ⋮ মেনু
  var compose = null, busyEdit = false, busyAction = false, sheetOpen = false;   // রিপ্লাই/এডিট-মোড ({mode, id, hasMedia, draft}), শিট

  // ---------- রিয়েলটাইম + পোলিং (ধাপ ২গ) ----------
  var rtChannel = null, rtOk = false, msgPollTimer = null, statePollTimer = null;
  var MSG_POLL_MS = 12000, STATE_POLL_MS = 30000;

  // ---------- ছোট হেল্পার ----------
  function toBn(n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'.charAt(d); }); }
  function isHttps(u) { return /^https:\/\//i.test(u || ''); }
  var MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

  function fmtTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) { return ''; }
    var h = d.getHours(), m = d.getMinutes();
    var period = h < 4 ? 'রাত' : h < 6 ? 'ভোর' : h < 12 ? 'সকাল' : h < 15 ? 'দুপুর' : h < 18 ? 'বিকাল' : h < 20 ? 'সন্ধ্যা' : 'রাত';
    return period + ' ' + toBn(h % 12 || 12) + ':' + toBn(('0' + m).slice(-2));
  }
  function dayKey(d) { return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
  function fmtDay(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) { return ''; }
    var now = new Date(), y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    if (dayKey(d) === dayKey(now)) { return 'আজ'; }
    if (dayKey(d) === dayKey(y)) { return 'গতকাল'; }
    return toBn(d.getDate()) + ' ' + MONTHS[d.getMonth()] + ' ' + toBn(d.getFullYear());
  }

  // সার্ভারের এরর কোড → বাংলা বার্তা (কাঁচা ইংরেজি এরর কখনো দেখানো হয় না)
  function errText(err, ctx) {   // ctx = 'action' (এডিট/ডিলিট/ফরওয়ার্ড): not_allowed-এর বার্তা আলাদা
    if (err && err.soft) { return err.soft; }
    var rawMsg = String((err && err.message) || '');
    if (/^rate_limited:/i.test(rawMsg)) { return rawMsg.replace(/^rate_limited:\s*/i, ''); }
    var m = String((err && (err.message || err.details)) || '').toLowerCase();
    if (m.indexOf('rate_limit') > -1) { return 'অল্প সময়ে অনেক মেসেজ পাঠানো হয়েছে — একটু পরে আবার চেষ্টা করুন।'; }
    if (m.indexOf('request_limit') > -1) { return 'রিকোয়েস্ট অবস্থায় আর মেসেজ পাঠানো যাবে না। ফ্রেন্ড হলে আবার পাঠাতে পারবেন।'; }
    if (m.indexOf('need_friend') > -1) { return 'চ্যাট চালু করতে আগে Add Friend করুন।'; }
    if (m.indexOf('you_blocked') > -1) { return 'আপনি এই ব্যক্তিকে ব্লক করেছেন।'; }
    if (m.indexOf('blocked') > -1) { return 'এই ব্যক্তিকে মেসেজ পাঠানো যাচ্ছে না।'; }
    if (m.indexOf('too_long') > -1) { return 'মেসেজ সর্বোচ্চ ২০০০ অক্ষরের হতে পারে।'; }
    if (m.indexOf('user_not_found') > -1) { return 'এই সদস্যকে মেসেজ পাঠানো যাচ্ছে না।'; }
    if (m.indexOf('request_text_only') > -1) { return 'চ্যাট চালু না হওয়া পর্যন্ত শুধু টেক্সট মেসেজ পাঠানো যাবে — ছবি/ভিডিও নয়।'; }
    if (m.indexOf('bad_media') > -1) { return 'ছবি/ভিডিওটি পাঠানো যায়নি — আবার চেষ্টা করুন।'; }
    if (m.indexOf('empty') > -1) { return 'খালি মেসেজ পাঠানো যায় না।'; }
    if (m.indexOf('bad_emoji') > -1) { return 'এই রিঅ্যাকশন দেওয়া যাচ্ছে না।'; }
    if (m.indexOf('bad_reply') > -1) { return 'যে মেসেজের রিপ্লাই দিচ্ছিলেন সেটি আর নেই — আবার পাঠালে সাধারণ মেসেজ হিসেবে যাবে।'; }
    if (m.trim() === 'self') { return 'নিজেকে ফরওয়ার্ড করা যায় না।'; }
    if (m.indexOf('not_allowed') > -1) { return ctx === 'action' ? 'এই মেসেজে এখন এটা করা যাচ্ছে না।' : 'এখন রিঅ্যাক্ট করা যাচ্ছে না — চ্যাট চালু হলে পারবেন।'; }
    if (m.indexOf('jwt') > -1 || m.indexOf('guest') > -1) { return 'সেশন শেষ হয়ে গেছে — আবার লগইন করুন।'; }
    if (m.indexOf('failed to fetch') > -1 || m.indexOf('network') > -1) { return 'নেটওয়ার্ক সমস্যা — সংযোগ দেখে আবার চেষ্টা করুন।'; }
    return 'কাজটি সম্পন্ন করা যায়নি — আবার চেষ্টা করুন।';
  }
  function needsLogin(err) {
    if (err && err.login) { return true; }
    var m = String((err && err.message) || '').toLowerCase();
    return m.indexOf('guest') > -1 || m.indexOf('jwt') > -1;
  }
  function redirectLogin() {
    stopLive();
    var back = 'chat.html' + (uname ? '?u=' + encodeURIComponent(uname) : '');
    window.location.replace('login.html?next=' + encodeURIComponent(back));
  }

  // ---------- অবস্থা-পর্দা ----------
  function showState(which) {
    el.loading.hidden = which !== 'loading';
    el.error.hidden = which !== 'error';
    el.notFound.hidden = which !== 'notfound';
    el.main.hidden = which !== 'chat';
    el.peer.hidden = which !== 'chat';
    el.menuWrap.hidden = which !== 'chat';
    if (which !== 'chat') { setMenuOpen(false); clearSel(); closeSheet(); }
  }
  function flash(text, ok) {
    clearTimeout(msgTimer);
    el.bannerMsg.textContent = text || '';
    el.bannerMsg.className = 'chat-banner-msg' + (ok ? ' ok' : '');
    el.bannerMsg.hidden = !text;
    if (text) { msgTimer = setTimeout(function () { el.bannerMsg.hidden = true; }, 6000); }
  }

  // ---------- হেডার ----------
  var headerSig = '';
  function renderHeader() {
    var sig = [chat.other_name, chat.other_username, chat.other_avatar, chat.other_verified, chat.other_online].join('\u0001');
    if (sig === headerSig) { return; }
    headerSig = sig;
    var nm = chat.other_name || ('@' + chat.other_username);
    el.name.textContent = nm;
    el.verified.hidden = !chat.other_verified;
    el.peer.href = 'public-profile.html?u=' + encodeURIComponent(chat.other_username);
    document.title = nm + ' — মেসেজ';
    el.avatar.textContent = '';
    if (isHttps(chat.other_avatar)) {
      var img = document.createElement('img');
      img.src = chat.other_avatar; img.alt = ''; img.loading = 'lazy';
      img.onerror = function () { img.remove(); el.avatar.insertBefore(document.createTextNode(nm.charAt(0)), el.avatar.firstChild); };
      el.avatar.appendChild(img);
    } else {
      el.avatar.appendChild(document.createTextNode(nm.charAt(0)));
    }
    if (chat.other_online) {
      var dot = document.createElement('span'); dot.className = 'chat-dot'; el.avatar.appendChild(dot);
    }
    el.status.textContent = chat.other_online ? 'অনলাইন' : '@' + chat.other_username;
    el.status.className = 'chat-peer-status' + (chat.other_online ? ' online' : '');
  }

  // ---------- ব্যানার + ইনপুটের অবস্থা (get_chat_state থেকে) ----------
  function reasonText(r) {
    if (r === 'you_blocked') { return 'আপনি এই ব্যক্তিকে ব্লক করেছেন'; }
    if (r === 'blocked') { return 'এই ব্যক্তিকে মেসেজ পাঠানো যাচ্ছে না'; }
    if (r === 'request_limit') { return 'রিকোয়েস্টের মেসেজ-সীমা শেষ'; }
    if (r === 'need_friend') { return 'চ্যাট চালু করতে Add Friend করুন'; }
    return 'এখন মেসেজ পাঠানো যাচ্ছে না';
  }
  function applyState() {
    var st = chat.state, title = '', sub = '', showAdd = false;
    if (chat.send_block === 'you_blocked') {
      title = 'আপনি এই ব্যক্তিকে ব্লক করেছেন';
      sub = 'মেসেজ পাঠাতে হলে আগে আনব্লক করতে হবে।';
    } else if (chat.send_block === 'blocked') {
      title = 'এই ব্যক্তিকে মেসেজ পাঠানো যাচ্ছে না।';
    } else if (st === 'request_received') {
      title = 'এই ব্যক্তি আপনার ফ্রেন্ড নয়';
      sub = 'মেসেজ পড়তে পারবেন। ফ্রেন্ড হলে চ্যাট চালু হবে — Add Friend করুন (তিনি রিকোয়েস্ট পাঠিয়ে থাকলে Accept Request চাপুন)।';
      showAdd = true;
    } else if (st === 'request_sent' || (st === 'none' && chat.requests_left != null)) {
      if (chat.requests_left === 0) {
        title = 'রিকোয়েস্টের মেসেজ-সীমা শেষ';
        sub = 'এই ব্যক্তি আপনার ফ্রেন্ড রিকোয়েস্ট গ্রহণ করলে চ্যাট চালু হবে।';
      } else {
        title = 'মেসেজ রিকোয়েস্ট';
        sub = 'এই ব্যক্তি আপনার ফ্রেন্ড রিকোয়েস্ট গ্রহণ করলে চ্যাট চালু হবে। এর আগে আর ' + toBn(chat.requests_left) + 'টি টেক্সট মেসেজ পাঠাতে পারবেন।';
      }
    }
    el.banner.hidden = !title;
    el.bannerTitle.textContent = title;
    el.bannerSub.textContent = sub;
    el.addFriend.hidden = !showAdd;
    if (showAdd) { loadFriendSt(); }

    var canCall = st === 'accepted' && chat.can_send;
    el.callVoice.hidden = !canCall; el.callVideo.hidden = !canCall;

    el.menuBlockText.textContent = chat.i_blocked ? 'আনব্লক করুন' : 'ব্লক করুন';
    el.menuBlock.querySelector('i').className = chat.i_blocked ? 'fa-solid fa-circle-check' : 'fa-solid fa-ban';
    el.menuBlock.classList.toggle('chat-menu-item-danger', !chat.i_blocked);

    el.input.disabled = !chat.can_send;
    el.input.placeholder = chat.can_send ? 'মেসেজ লিখুন…' : reasonText(chat.send_block);
    el.emojiBtn.disabled = !chat.can_send;
    if (!chat.can_send) { setEmojiOpen(false); }
    el.attach.disabled = !chat.can_send || !!(compose && compose.mode === 'edit');
    if (compose && !chat.can_send) { cancelCompose(); }   // ব্লক/সীমা শেষ হলে রিপ্লাই/এডিট বাতিল
    el.attach.title = chat.can_send && !chat.can_send_media ? 'চ্যাট চালু হলে ছবি/ভিডিও পাঠানো যাবে' : '';
    if (pending && !(chat.can_send && chat.can_send_media)) { clearPending(); }
    updateSendBtn();
  }
  function updateSendBtn() {
    var editing = !!(compose && compose.mode === 'edit');
    var canEmpty = editing && compose.hasMedia;   // ছবি/ভিডিওর ক্যাপশন খালি করা যায় (মেসেজ থেকে যায়)
    el.send.disabled = !(chat && chat.can_send) || preparing || busyEdit || (!el.input.value.trim() && !pending && !canEmpty);
    if (chat && chat.can_send) { el.input.placeholder = editing ? 'মেসেজ এডিট করুন…' : (pending ? 'ক্যাপশন লিখুন (ঐচ্ছিক)…' : 'মেসেজ লিখুন…'); }
  }
  function refreshState() {
    return client.rpc('get_chat_state', { p_username: uname }).then(function (r) {
      var row = r.data && r.data[0];
      if (!r.error && row) { chat = row; applyState(); renderHeader(); ensureLive(); }
    }).catch(function () { /* ব্যানার পুরনো থাকলেও চ্যাট চলবে */ });
  }

  // ---------- ছবি/ভিডিও (ধাপ ৩) ----------
  var BUCKET = 'chat-media';
  var MAX_VIDEO_SECONDS = 30;
  var MAX_VIDEO_BYTES = 8 * 1024 * 1024;     // বাকেটের সীমার সাথে মেলানো (৮ MB)
  var MAX_IMAGE_BYTES = 8 * 1024 * 1024;     // কম্প্রেসের পরের সীমা (বাকেটের)
  var MAX_IMAGE_SOURCE = 15 * 1024 * 1024;   // কম্প্রেসের আগের সেফটি-ক্যাপ
  var IMG_MAX_DIM = 1280, IMG_QUALITY = 0.7;
  var SIGN_TTL = 3600;                       // signed URL ১ ঘণ্টা; ক্যাশে ৫০ মিনিট
  var MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
  var EXT_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
    mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };

  function fmtSize(b) {
    if (b >= 1024 * 1024) { return toBn((b / 1024 / 1024).toFixed(1)) + ' MB'; }
    return toBn(Math.max(1, Math.round(b / 1024))) + ' KB';
  }
  function fileMime(file) {   // কিছু ফোনে ভিডিওর type খালি আসে — এক্সটেনশন থেকে ধরো
    var t = (file.type || '').toLowerCase();
    if (MIME_EXT[t]) { return t; }
    var m = /\.([a-z0-9]+)$/i.exec(file.name || '');
    return m && EXT_MIME[m[1].toLowerCase()] ? EXT_MIME[m[1].toLowerCase()] : '';
  }

  function getVideoDuration(file) {
    return new Promise(function (resolve, reject) {
      var u = URL.createObjectURL(file), v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = function () {
        var d = v.duration; URL.revokeObjectURL(u);
        if (!isFinite(d) || isNaN(d)) { reject(new Error('x')); return; }
        resolve(d);
      };
      v.onerror = function () { URL.revokeObjectURL(u); reject(new Error('x')); };
      v.src = u;
    });
  }

  // ছবি ~১২৮০px-এ ছোট করে JPEG ৭০% — ছোট/হালকা ছবি ও GIF অপরিবর্তিত
  function compressImage(file, mime) {
    return new Promise(function (resolve) {
      if (mime === 'image/gif') { resolve(file); return; }
      var u = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(u);
        var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        if (w <= IMG_MAX_DIM && h <= IMG_MAX_DIM && file.size <= 400 * 1024) { resolve(file); return; }
        var sc = Math.min(1, IMG_MAX_DIM / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * sc)); c.height = Math.max(1, Math.round(h * sc));
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);   // স্বচ্ছ PNG JPEG-এ কালো না হতে
        ctx.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (blob) {
          if (!blob || blob.size >= file.size && w <= IMG_MAX_DIM && h <= IMG_MAX_DIM) { resolve(file); return; }
          resolve(new File([blob], (file.name || 'photo').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', IMG_QUALITY);
      };
      img.onerror = function () { URL.revokeObjectURL(u); resolve(file); };
      img.src = u;
    });
  }

  function previewNote(text, isErr) {
    el.previewInfo.textContent = text || '';
    el.previewInfo.className = 'chat-preview-info' + (isErr ? ' err' : '');
  }
  function hidePreview() {
    el.preview.hidden = true;
    el.previewImg.hidden = true; el.previewImg.removeAttribute('src');
    el.previewVideo.hidden = true; el.previewVideo.removeAttribute('src');
    try { el.previewVideo.load(); } catch (e) { /* কিছু না */ }
    previewNote('');
  }
  function clearPending() {
    if (pending && pending.url) { URL.revokeObjectURL(pending.url); }
    pending = null; hidePreview(); updateSendBtn();
  }
  function selectMedia(file) {
    if (!file || !chat || !chat.can_send) { return; }
    if (!chat.can_send_media) { flash('চ্যাট চালু না হওয়া পর্যন্ত শুধু টেক্সট মেসেজ পাঠানো যাবে।'); return; }
    var mime = fileMime(file);
    if (!mime) { flash('শুধু ছবি (JPG, PNG, WEBP, GIF) অথবা ভিডিও (MP4, WEBM, MOV) পাঠানো যাবে।'); return; }
    var isVideo = mime.indexOf('video/') === 0;
    if (isVideo && file.size > MAX_VIDEO_BYTES) { flash('ভিডিওর সাইজ ৮ এমবি-র বেশি হওয়া যাবে না।'); return; }
    if (!isVideo && file.size > MAX_IMAGE_SOURCE) { flash('ছবির সাইজ ১৫ এমবি-র বেশি হওয়া যাবে না।'); return; }
    flash('');
    clearPending();
    preparing = true; updateSendBtn();
    el.preview.hidden = false;
    previewNote(isVideo ? 'ভিডিও যাচাই করা হচ্ছে…' : 'ছবি প্রস্তুত হচ্ছে…');

    var work = isVideo
      ? getVideoDuration(file).then(function (d) {
          if (d > MAX_VIDEO_SECONDS) { throw { soft: 'ভিডিও সর্বোচ্চ ' + toBn(MAX_VIDEO_SECONDS) + ' সেকেন্ডের হতে পারবে। এই ভিডিওটি ' + toBn(Math.round(d)) + ' সেকেন্ডের।' }; }
          return { file: file, mime: mime, dur: d };
        }, function () { throw { soft: 'ভিডিওটি যাচাই করা যায়নি — অন্য ফাইল বেছে নিন।' }; })
      : compressImage(file, mime).then(function (out) {
          var om = out === file ? mime : 'image/jpeg';
          if (out.size > MAX_IMAGE_BYTES) { throw { soft: 'ছবিটি অনেক বড় — ৮ এমবি-র ছোট ছবি বেছে নিন।' }; }
          return { file: out, mime: om, dur: null };
        });

    work.then(function (r) {
      preparing = false;
      if (!chat || !chat.can_send || !chat.can_send_media) { hidePreview(); updateSendBtn(); return; }
      pending = { file: r.file, type: isVideo ? 'video' : 'image', mime: r.mime, url: URL.createObjectURL(r.file), size: r.file.size, dur: r.dur };
      if (isVideo) {
        el.previewImg.hidden = true; el.previewVideo.hidden = false; el.previewVideo.src = pending.url + '#t=0.1';
      } else {
        el.previewVideo.hidden = true; el.previewImg.hidden = false; el.previewImg.src = pending.url;
      }
      el.previewTag.textContent = isVideo ? '🎥' : '📷';
      previewNote((isVideo ? 'ভিডিও · ' + toBn(Math.round(r.dur)) + ' সেকেন্ড · ' : 'ছবি · ') + fmtSize(r.file.size));
      updateSendBtn();
      el.input.focus();
    }).catch(function (e) {
      preparing = false; hidePreview(); updateSendBtn();
      flash(e && e.soft ? e.soft : 'ফাইলটি প্রস্তুত করা যায়নি — অন্য ফাইল বেছে নিন।');
    });
  }
  el.attach.addEventListener('click', function () {
    if (!chat || !chat.can_send) { return; }
    if (!chat.can_send_media) { flash('ফ্রেন্ড হলে ছবি/ভিডিও পাঠানো যাবে। এখন শুধু টেক্সট।'); return; }
    el.file.click();
  });
  el.file.addEventListener('change', function () {
    var f = el.file.files && el.file.files[0];
    el.file.value = '';   // একই ফাইল আবার বাছাই করা যেন কাজ করে
    if (f) { selectMedia(f); }
  });
  el.previewRemove.addEventListener('click', function () { clearPending(); flash(''); });

  // ---- আপলোড (XHR — প্রগ্রেস % পেতে); পাথ = <নিজের-uid>/<সময়>-<এলোমেলো>.<ext> (send_message-এর মালিকানা-চেকের ছাঁচ) ----
  function newPath(mime) {
    var rnd = Math.random().toString(36).slice(2, 10);
    return me + '/' + Date.now().toString(36) + '-' + rnd + '.' + (MIME_EXT[mime] || 'bin');
  }
  function uploadMedia(m) {
    return client.auth.getSession().then(function (res) {
      var sess = res.data && res.data.session;
      if (!sess) { throw { login: true, message: 'jwt' }; }
      var path = newPath(m.mime);
      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', window.TANGAIL_SUPABASE.url + '/storage/v1/object/' + BUCKET + '/' + path, true);
        xhr.setRequestHeader('apikey', window.TANGAIL_SUPABASE.key);
        xhr.setRequestHeader('Authorization', 'Bearer ' + sess.access_token);
        xhr.setRequestHeader('Content-Type', m.mime);
        xhr.setRequestHeader('x-upsert', 'false');
        xhr.upload.onprogress = function (e) {
          if (e.lengthComputable) { setProgress(m, Math.min(99, Math.round(e.loaded / e.total * 100))); }
        };
        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) { setProgress(m, 100); resolve(path); return; }
          if (xhr.status === 401) { reject({ login: true, message: 'jwt' }); }
          else if (xhr.status === 413) { reject({ soft: 'ফাইলটি অনেক বড় — ৮ এমবি-র ছোট ফাইল পাঠান।' }); }
          else if (xhr.status === 403) { reject({ soft: 'এখন ছবি/ভিডিও আপলোড করা যাচ্ছে না — আবার চেষ্টা করুন।' }); }
          else { reject({ soft: 'আপলোড ব্যর্থ হয়েছে — আবার চেষ্টা করুন।' }); }
        };
        xhr.onerror = function () { reject({ soft: 'নেটওয়ার্ক সমস্যা — আপলোড হয়নি। সংযোগ দেখে আবার চেষ্টা করুন।' }); };
        xhr.send(m.file);
      });
    });
  }
  function setProgress(m, p) {
    m.progress = p;
    if (m.progEl) { m.progEl.textContent = toBn(p) + '%'; }
  }
  function removeUploaded(path) {
    if (!path) { return; }
    try { client.storage.from(BUCKET).remove([path]).then(function () {}, function () {}); } catch (e) { /* কিছু না */ }
  }

  // ---- signed URL (প্রাইভেট বাকেট): ব্যাচে তৈরি, ৫০ মিনিট ক্যাশ ----
  var signCache = {}, signQueue = [], signTimer = null;
  function cachedUrl(path) {
    var c = signCache[path];
    return c && c.url && c.exp > Date.now() ? c.url : null;
  }
  function signedUrl(path) {
    var hit = cachedUrl(path);
    if (hit) { return Promise.resolve(hit); }
    if (signCache[path] && signCache[path].p) { return signCache[path].p; }
    var p = new Promise(function (resolve, reject) {
      signQueue.push({ path: path, resolve: resolve, reject: reject });
      if (!signTimer) { signTimer = setTimeout(flushSign, 30); }
    });
    signCache[path] = { p: p };
    p.catch(function () { if (signCache[path] && signCache[path].p === p) { delete signCache[path]; } });
    return p;
  }
  function flushSign() {
    var batch = signQueue; signQueue = []; signTimer = null;
    var paths = [], seen = {};
    batch.forEach(function (q) { if (!seen[q.path]) { seen[q.path] = true; paths.push(q.path); } });
    function failAll() { batch.forEach(function (q) { q.reject(new Error('sign')); }); }
    client.storage.from(BUCKET).createSignedUrls(paths, SIGN_TTL).then(function (res) {
      if (res.error || !res.data) { failAll(); return; }
      var map = {};
      res.data.forEach(function (it) { if (it && it.path && it.signedUrl && !it.error) { map[it.path] = it.signedUrl; } });
      batch.forEach(function (q) {
        if (map[q.path]) {
          signCache[q.path] = { url: map[q.path], exp: Date.now() + (SIGN_TTL - 600) * 1000 };
          q.resolve(map[q.path]);
        } else { q.reject(new Error('sign')); }
      });
    }).catch(failAll);
  }

  // ---- লাইটবক্স ----
  function openLightbox(url) {
    el.lightboxImg.src = url; el.lightbox.hidden = false;
  }
  function closeLightbox() {
    el.lightbox.hidden = true; el.lightboxImg.removeAttribute('src');
  }
  el.lightboxClose.addEventListener('click', closeLightbox);
  el.lightbox.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !el.lightbox.hidden) { closeLightbox(); } });

  // ---- বাবলের মিডিয়া বক্স ----
  function afterMediaLoad() { if (stickBottom) { scrollBottom(); } }
  function waitBox(box) {
    box.className = 'chat-media wait'; box.textContent = '';
    var w = document.createElement('div'); w.className = 'chat-media-msg';
    var i = document.createElement('i'); i.className = 'fa-solid fa-spinner fa-spin'; i.setAttribute('aria-hidden', 'true');
    w.appendChild(i); box.appendChild(w);
  }
  function brokenBox(box, m) {
    box.className = 'chat-media broken'; box.textContent = '';
    var w = document.createElement('div'); w.className = 'chat-media-msg';
    var i = document.createElement('i'); i.className = 'fa-regular fa-image'; i.setAttribute('aria-hidden', 'true');
    var t = document.createElement('span'); t.textContent = m.media_type === 'video' ? 'ভিডিও লোড হয়নি' : 'ছবি লোড হয়নি';
    var b = document.createElement('button'); b.type = 'button'; b.textContent = 'আবার চেষ্টা';
    b.addEventListener('click', function () { delete signCache[m.media_url]; loadRemote(box, m, false); });
    w.appendChild(i); w.appendChild(t); w.appendChild(b); box.appendChild(w);
  }
  function fillMedia(box, m, url, retried) {
    box.className = 'chat-media'; box.textContent = '';
    if (m.media_type === 'video') {
      var v = document.createElement('video');
      v.controls = true; v.preload = 'metadata'; v.setAttribute('playsinline', '');
      v.onloadedmetadata = afterMediaLoad;
      v.onerror = function () {
        if (!retried && m.media_url) { delete signCache[m.media_url]; loadRemote(box, m, true); } else { brokenBox(box, m); }
      };
      v.src = url; box.appendChild(v);
    } else {
      var img = document.createElement('img');
      img.alt = 'ছবি'; img.decoding = 'async';
      img.onload = afterMediaLoad;
      img.onerror = function () {
        // signed URL-এর মেয়াদ শেষ হয়ে থাকলে একবার নতুন করে নাও
        if (!retried && m.media_url) { delete signCache[m.media_url]; loadRemote(box, m, true); } else { brokenBox(box, m); }
      };
      img.addEventListener('click', function () { openLightbox(url); });
      img.src = url; box.appendChild(img);
    }
  }
  function loadRemote(box, m, retried) {
    var hit = cachedUrl(m.media_url);
    if (hit) { fillMedia(box, m, hit, retried); return; }
    waitBox(box);
    signedUrl(m.media_url).then(function (u) { fillMedia(box, m, u, retried); }, function () { brokenBox(box, m); });
  }
  function buildMediaBox(m) {
    var box = document.createElement('div');
    if (m.localUrl) {   // আমার পাঠানো (বা পাঠানোর অপেক্ষায়) — লোকাল কপিই দেখাও, আবার নামাতে হয় না
      fillMedia(box, m, m.localUrl, true);
      if (m.tmp && m.status === 'sending') {
        var pr = document.createElement('div'); pr.className = 'chat-media-prog';
        pr.textContent = m.progress != null ? toBn(m.progress) + '%' : '…';
        m.progEl = pr; box.appendChild(pr);
      }
    } else if (m.media_url) {
      loadRemote(box, m, false);
    } else {
      brokenBox(box, m);
    }
    return box;
  }

  // ---------- মেসেজ তালিকা ----------
  function nearBottom() { return el.list.scrollHeight - el.list.scrollTop - el.list.clientHeight < 80; }
  function scrollBottom() { el.list.scrollTop = el.list.scrollHeight; }

  // ---- রিপ্লাইয়ের উদ্ধৃতি / মুছে-ফেলা মেসেজ (মেসেজ অ্যাকশন) ----
  var DELETED_TEXT = '🚫 মেসেজটি মুছে ফেলা হয়েছে';
  function isDel(m) { return !!(m && m.deleted_at); }
  function mediaLabel(t) { return t === 'video' ? '🎥 ভিডিও' : t === 'image' ? '📷 ছবি' : ''; }
  function peerName() { return (chat && (chat.other_name || (chat.other_username ? '@' + chat.other_username : ''))) || ''; }
  function snippetOf(m) { return (m.body && m.body.trim()) ? m.body.trim() : mediaLabel(m.media_type); }
  function buildQuote(m) {
    var st = m.reply_state || 'hidden';
    var q = document.createElement('div');
    q.className = 'chat-quote' + (st === 'ok' ? '' : ' dim');
    var txt = document.createElement('span'); txt.className = 'chat-quote-txt';
    if (st === 'ok') {
      var who = document.createElement('span'); who.className = 'chat-quote-who';
      who.textContent = m.reply_is_mine ? 'আপনি' : peerName();
      q.appendChild(who);
      txt.textContent = (m.reply_body && m.reply_body.trim()) ? m.reply_body : mediaLabel(m.reply_media_type);
      q.setAttribute('role', 'button');
      q.addEventListener('click', function () { jumpTo(m.reply_to_id); });
    } else {
      txt.textContent = st === 'deleted' ? DELETED_TEXT : 'মূল মেসেজটি আর নেই';
    }
    q.appendChild(txt);
    return q;
  }
  function jumpTo(id) {   // উদ্ধৃতিতে চাপলে মূল মেসেজে যাও (লোড করা থাকলে)
    var r = el.list.querySelector('.chat-row[data-mid="' + id + '"]');
    if (!r) { flash('মূল মেসেজটি এখন লোড করা নেই — ওপরে স্ক্রল করে পুরনো মেসেজ আনুন।'); return; }
    r.scrollIntoView({ block: 'center' });
    stickBottom = nearBottom();
    r.classList.add('hl');
    setTimeout(function () { r.classList.remove('hl'); }, 1500);
  }

  // নিজের মেসেজের Sent/Delivered/Seen টিক — WhatsApp-এর মতো, শুধু আইকন (টেক্সট নেই)
  function buildTicks(m, del) {
    if (!m.is_mine || del) { return null; }
    var state;
    if (m.tmp) {
      if (m.status === 'failed') { return null; }   // ব্যর্থ হলে টিক নয়, আলাদা "পাঠানো যায়নি" UI আছে
      state = 'sent';                                 // পাঠানোর সাথে সাথেই (এখনো সার্ভার-নিশ্চিত নয়)
    } else {
      state = m.read_at ? 'seen' : 'delivered';        // সার্ভারে সংরক্ষিত: read_at না থাকলে delivered, থাকলে seen
    }
    var wrap = document.createElement('span');
    wrap.className = 'chat-ticks chat-ticks-' + state;
    wrap.setAttribute('aria-hidden', 'true');   // এটা স্রেফ ভিজ্যুয়াল ইঙ্গিত; স্ক্রিন-রিডারের জন্য বাড়তি টেক্সট দরকার নেই
    var icon = document.createElement('i');
    icon.className = state === 'sent' ? 'fa-solid fa-check' : 'fa-solid fa-check-double';
    wrap.appendChild(icon);
    return wrap;
  }

  function buildRow(m, prev) {
    var row = document.createElement('div');
    var saved = !m.tmp && m.id != null;
    row.className = 'chat-row ' + (m.is_mine ? 'mine' : 'theirs') +
      (m.tmp && m.status === 'failed' ? ' failed' : '') + (m.tmp && m.status === 'sending' ? ' sending' : '') +
      (!prev || prev.is_mine !== m.is_mine ? ' gap' : '') +
      (saved && selId != null && String(selId) === String(m.id) ? ' selected' : '');
    if (saved) { row.setAttribute('data-mid', m.id); }
    var bub = document.createElement('div');
    var del = isDel(m);
    bub.className = 'chat-bubble' + (del ? ' deleted' : (m.media_type ? ' has-media' : ''));
    if (del) {
      bub.appendChild(document.createTextNode(DELETED_TEXT));
    } else {
      if (m.is_forwarded) {
        var fw = document.createElement('span'); fw.className = 'chat-fwd';
        var fi = document.createElement('i'); fi.className = 'fa-solid fa-share'; fi.setAttribute('aria-hidden', 'true');
        fw.appendChild(fi); fw.appendChild(document.createTextNode(' ফরওয়ার্ড করা'));
        bub.appendChild(fw);
      }
      if (m.reply_to_id != null) { bub.appendChild(buildQuote(m)); }
      if (m.media_type) {
        bub.appendChild(buildMediaBox(m));
        if (m.body) {
          var cap = document.createElement('span');
          cap.className = 'chat-cap';
          cap.textContent = m.body;   // ক্যাপশন — textContent (XSS-নিরাপদ)
          bub.appendChild(cap);
        }
      } else {
        bub.appendChild(document.createTextNode(m.body || ''));
      }
    }
    var meta = document.createElement('span');
    meta.className = 'chat-meta';
    var t = document.createElement('span');
    t.className = 'chat-time';
    t.textContent = m.tmp ? (m.status === 'failed' ? '' : 'পাঠানো হচ্ছে…') : ((m.edited_at && !del ? 'সম্পাদিত · ' : '') + fmtTime(m.created_at));
    meta.appendChild(t);
    var ticks = buildTicks(m, del);
    if (ticks) { meta.appendChild(ticks); }
    bub.appendChild(meta);
    row.appendChild(bub);
    attachReactions(row, bub, m);
    if (m.tmp && m.status === 'failed') {
      var f = document.createElement('div');
      f.className = 'chat-fail';
      var s = document.createElement('span'); s.textContent = 'পাঠানো যায়নি';
      var retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'আবার পাঠান';
      retry.addEventListener('click', function () { resend(m); });
      var del = document.createElement('button'); del.type = 'button'; del.textContent = 'মুছুন';
      del.addEventListener('click', function () {
        removeUploaded(m.path);   // আপলোড হয়ে থাকলে ফাইল পড়ে থাকতে দেবে না
        if (m.localUrl) { URL.revokeObjectURL(m.localUrl); }
        msgs = msgs.filter(function (x) { return x !== m; }); renderList('keep');
      });
      f.appendChild(s); f.appendChild(retry); f.appendChild(del);
      row.appendChild(f);
    }
    return row;
  }

  // mode: 'bottom' (নিচে নামাও) | 'keep' (স্ক্রল যেখানে ছিল) | 'prepend' (পুরনো যোগ — অবস্থান ধরে রাখো)
  function renderList(mode) {
    var prevH = el.list.scrollHeight, prevT = el.list.scrollTop;
    el.list.textContent = '';
    if (hasMore) {
      var older = document.createElement('button');
      older.type = 'button'; older.className = 'chat-btn chat-older';
      older.textContent = loadingOlder ? 'পুরনো মেসেজ লোড হচ্ছে…' : 'আরও পুরনো মেসেজ দেখুন';
      older.disabled = loadingOlder;
      older.addEventListener('click', loadOlder);
      el.list.appendChild(older);
    }
    if (!msgs.length) {
      var empty = document.createElement('p');
      empty.className = 'chat-empty';
      empty.textContent = 'এখনো কোনো মেসেজ নেই। প্রথম মেসেজটি পাঠান।';
      el.list.appendChild(empty);
    }
    var lastDay = '', prev = null;
    msgs.forEach(function (m) {
      var d = new Date(m.created_at), k = isNaN(d.getTime()) ? '' : dayKey(d);
      if (k && k !== lastDay) {
        var sep = document.createElement('div');
        sep.className = 'chat-day'; sep.textContent = fmtDay(m.created_at);
        el.list.appendChild(sep);
        lastDay = k; prev = null;
      }
      el.list.appendChild(buildRow(m, prev));
      prev = m;
    });
    if (mode === 'bottom') { scrollBottom(); stickBottom = true; }
    else if (mode === 'prepend') { el.list.scrollTop = prevT + (el.list.scrollHeight - prevH); }
    else { el.list.scrollTop = prevT; }
    if (selId != null && !findMsg(selId)) { selId = null; }   // নির্বাচিত মেসেজ আর নেই
    updateSelBar();
  }

  function oldestId() {
    for (var i = 0; i < msgs.length; i++) { if (!msgs[i].tmp) { return msgs[i].id; } }
    return null;
  }
  function loadOlder() {
    if (loadingOlder || !hasMore) { return; }
    var before = oldestId();
    if (before == null) { return; }
    loadingOlder = true; renderList('keep');
    client.rpc('get_messages', { p_username: uname, p_before: before, p_limit: PAGE }).then(function (r) {
      loadingOlder = false;
      if (r.error) { flash('পুরনো মেসেজ লোড করা যায়নি — আবার চেষ্টা করুন।'); renderList('keep'); return; }
      var rows = (r.data || []).slice().reverse();
      hasMore = (r.data || []).length >= PAGE;
      var known = {};
      msgs.forEach(function (m) { if (!m.tmp) { known[m.id] = true; } });
      rows = rows.filter(function (m) { return !known[m.id]; });
      msgs = rows.concat(msgs);
      renderList('prepend');
    }).catch(function () {
      loadingOlder = false; flash('নেটওয়ার্ক সমস্যা — পুরনো মেসেজ লোড করা যায়নি।'); renderList('keep');
    });
  }
  el.list.addEventListener('scroll', function () {
    closeReactPop();
    stickBottom = nearBottom();
    if (el.list.scrollTop < 80) { loadOlder(); }
    if (stickBottom) { el.newMsg.hidden = true; }
  });
  el.newMsg.addEventListener('click', function () { renderList('bottom'); el.newMsg.hidden = true; });

  // নতুন মেসেজ (রিয়েলটাইম/পোলিং থেকে) তালিকায় যোগ — id দিয়ে ডুপ্লিকেট বাদ (নিজের পাঠানো মেসেজ doSend-এই যোগ হয়)।
  // যোগ হলে true, আগে থেকেই থাকলে false।
  function appendIncoming(row) {
    for (var i = 0; i < msgs.length; i++) { if (!msgs[i].tmp && msgs[i].id === row.id) { return false; } }
    var atBottom = nearBottom();
    msgs.push({ id: row.id, is_mine: !!row.is_mine, body: row.body, media_url: row.media_url || null, media_type: row.media_type || null,
      created_at: row.created_at, read_at: row.read_at || null, my_reaction: row.my_reaction || null, reactions: row.reactions || [],
      edited_at: row.edited_at || null, deleted_at: row.deleted_at || null, is_forwarded: !!row.is_forwarded,
      reply_to_id: row.reply_to_id != null ? row.reply_to_id : null, reply_state: row.reply_state || null, reply_body: row.reply_body || null,
      reply_media_type: row.reply_media_type || null, reply_is_mine: !!row.reply_is_mine });
    if (atBottom) { renderList('bottom'); el.newMsg.hidden = true; }
    else { renderList('keep'); if (!row.is_mine) { el.newMsg.hidden = false; } }
    if (!row.is_mine) { markReadIfNeeded(); }
    return true;
  }
  function rerender() { renderList(nearBottom() ? 'bottom' : 'keep'); }
  function findMsg(id) {
    for (var i = 0; i < msgs.length; i++) { if (!msgs[i].tmp && msgs[i].id != null && String(msgs[i].id) === String(id)) { return msgs[i]; } }
    return null;
  }

  // ---------- Seen / mark_read (ধাপ ৪.২) ----------
  // অন্যের অপঠিত মেসেজ থাকলে ও পেজ দৃশ্যমান থাকলে mark_read (সার্ভার: সব অপঠিত একবারে পঠিত)। রিকোয়েস্ট-অবস্থাতেও চলে —
  // সার্ভার-নিয়ম ধাপ ১-এর (mark_read-এ accepted-চেক নেই), ইনবক্সের ব্যাজ কমানোর জন্যও দরকার।
  var markingRead = false, seenTimer = null;
  function unreadIncomingIds() {
    var ids = [];
    msgs.forEach(function (m) { if (!m.tmp && !m.is_mine && !m.read_at && m.id != null) { ids.push(m.id); } });
    return ids;
  }
  function markReadIfNeeded() {
    if (markingRead || document.hidden || !chat || !chat.conversation_id) { return; }
    var ids = unreadIncomingIds();
    if (!ids.length) { return; }
    markingRead = true;
    client.rpc('mark_read', { p_username: uname }).then(function (r) {
      markingRead = false;
      if (r.error) { if (needsLogin(r.error)) { redirectLogin(); } return; }   // অন্য এরর: চুপচাপ — পরের ঘটনায় (নতুন মেসেজ/ফিরে আসা) আবার চেষ্টা
      var now = new Date().toISOString(), set = {};
      ids.forEach(function (i) { set[i] = true; });   // শুধু যেগুলো কলের সময় ছিল — মাঝখানে আসা নতুনটা সার্ভারে পঠিত হয়নি হতে পারে
      msgs.forEach(function (m) { if (!m.tmp && !m.is_mine && set[m.id] && !m.read_at) { m.read_at = now; } });
      if (unreadIncomingIds().length) { markReadIfNeeded(); }
    }).catch(function () { markingRead = false; });
  }
  // অন্যজন আমার মেসেজ পড়লে (Realtime UPDATE) — mark_read একসাথে অনেক সারি বদলায়, তাই ডিবাউন্স করে একবার আঁকা
  function scheduleSeenRender() {
    if (seenTimer) { return; }
    seenTimer = setTimeout(function () { seenTimer = null; rerender(); }, 120);
  }

  // ---------- রিঅ্যাকশন (ধাপ ৪.১) ----------
  var REACTS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];   // সার্ভারের react_to_message-এর অনুমোদিত তালিকার সাথে মেলে
  var LONG_MS = 450;
  var reactPop = null, reactMsgId = null, refreshTimer = null;

  // শুধু চ্যাট-চালু (accepted) ও ব্লক-ছাড়া কথোপকথনে, সার্ভারে-সেভ-হওয়া মেসেজে
  function canReact(m) { return !!(m && !m.tmp && m.id != null && chat && chat.state === 'accepted' && !chat.send_block); }

  function sigOf(list) { return (list || []).map(function (x) { return x.emoji + ':' + x.count; }).sort().join('|'); }
  function bumpReaction(m, emoji, d) {
    var list = m.reactions || (m.reactions = []);
    for (var i = 0; i < list.length; i++) {
      if (list[i].emoji === emoji) { list[i].count += d; if (list[i].count <= 0) { list.splice(i, 1); } return; }
    }
    if (d > 0) { list.push({ emoji: emoji, count: d }); }
  }
  // লোকাল হিসাব: আশাবাদী আপডেট ও সার্ভারের উত্তর মেলানোর কাজে
  function setMyReaction(m, next) {
    var old = m.my_reaction || null;
    if (old === next) { return; }
    if (old) { bumpReaction(m, old, -1); }
    if (next) { bumpReaction(m, next, 1); }
    m.my_reaction = next;
    (m.reactions || []).sort(function (a, b) { return b.count - a.count || (a.emoji < b.emoji ? -1 : 1); });
  }
  function react(m, emoji) {
    if (!canReact(m) || m.reactBusy) { return; }
    var before = m.my_reaction || null, next = emoji === before ? null : emoji;   // একই ইমোজি আবার = তুলে নাও (সার্ভারেও একই নিয়ম)
    m.reactBusy = true; setMyReaction(m, next); rerender();
    client.rpc('react_to_message', { p_message_id: m.id, p_emoji: emoji }).then(function (r) {
      m.reactBusy = false;
      if (r.error) {
        if (needsLogin(r.error)) { redirectLogin(); return; }
        setMyReaction(m, before); flash(errText(r.error)); rerender(); refreshState(); return;
      }
      var got = r.data == null ? null : r.data;   // সার্ভারের আসল ফলাফল (অন্য ডিভাইসে বদলে থাকলে এটাই সত্য)
      if (got !== (m.my_reaction || null)) { setMyReaction(m, got); rerender(); }
      if (!rtOk) { scheduleRefresh(); }
    }).catch(function () {
      m.reactBusy = false; setMyReaction(m, before);
      flash('নেটওয়ার্ক সমস্যা — রিঅ্যাকশন যায়নি। আবার চেষ্টা করুন।'); rerender();
    });
  }

  function buildReactPop() {
    reactPop = document.createElement('div');
    reactPop.className = 'chat-react-pop';
    reactPop.setAttribute('role', 'dialog'); reactPop.setAttribute('aria-label', 'রিঅ্যাকশন বাছাই');
    reactPop.hidden = true;
    REACTS.forEach(function (e) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = e; b.setAttribute('data-emoji', e); b.setAttribute('aria-label', 'রিঅ্যাকশন ' + e);
      b.addEventListener('click', function () {
        var m = findMsg(reactMsgId); clearSel();   // রিঅ্যাকশন দিলে নির্বাচনও শেষ (WhatsApp-এর মতো)
        if (m) { react(m, e); }
      });
      reactPop.appendChild(b);
    });
    document.body.appendChild(reactPop);
  }
  function closeReactPop() { if (reactPop) { reactPop.hidden = true; } reactMsgId = null; }
  function openReactPop(m, bub) {
    if (!canReact(m) || !bub.isConnected) { return; }
    if (!reactPop) { buildReactPop(); }
    reactMsgId = m.id;
    Array.prototype.forEach.call(reactPop.children, function (b) { b.classList.toggle('on', b.getAttribute('data-emoji') === m.my_reaction); });
    reactPop.hidden = false;
    var r = bub.getBoundingClientRect(), w = reactPop.offsetWidth, h = reactPop.offsetHeight;
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var top = r.top - h - 6;
    if (top < 8) { top = Math.min(r.bottom + 6, vh - h - 8); }
    var left = m.is_mine ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, vw - w - 8));
    reactPop.style.top = Math.max(8, top) + 'px'; reactPop.style.left = left + 'px';
  }

  document.addEventListener('pointerdown', function (e) {
    if (reactPop && !reactPop.hidden && !reactPop.contains(e.target)) { closeReactPop(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeReactPop(); } });
  window.addEventListener('resize', closeReactPop);
  window.addEventListener('resize', function () { setMenuOpen(false); });

  // বাবলে জেসচার (দীর্ঘ চাপ / রাইট-ক্লিক = মেসেজ নির্বাচন + রিঅ্যাকশন-প্যালেট; ডাবল-ক্লিক = প্যালেট) ও নিচের চিপ
  // মেসেজের অ্যাকশন (কপি/রিপ্লাই/ফরওয়ার্ড/এডিট/ডিলিট) শুধু হেডারের ⋮ মেনু থেকেই পাওয়া যায় — বাবলের পাশে আলাদা কোনো ভাসমান মেনু নেই।
  // v111: চাপ ধরে রাখার ~০.৪৫ সেকেন্ডের মধ্যে তালিকা আবার আঁকা হলে (রিয়েলটাইম/পোলিং/"দেখা হয়েছে") বাবলের DOM নোড বদলে যায় —
  // পুরনো নোড detached হয়ে openReactPop চুপচাপ ফিরে যেত (নির্বাচন হতো, প্যালেট নয়)। তাই টাইমার ফায়ার হলে সবসময় বর্তমান নোডটা খুঁজে নিই।
  function liveBub(m, bub) {
    if (bub && bub.isConnected) { return bub; }
    if (m == null || m.id == null) { return null; }
    var b = el.list.querySelector('.chat-row[data-mid="' + m.id + '"] .chat-bubble');
    return b || null;
  }
  function longPress(m, bub) {
    bub = liveBub(m, bub);
    if (!bub) { return; }   // মেসেজটা তালিকা থেকেই সরে গেছে (যেমন "আমার থেকে ডিলিট") — কিছু করার নেই
    selectMsg(m);
    if (canReact(m) && !isDel(m)) { openReactPop(m, bub); } else { closeReactPop(); }
  }
  function attachReactions(row, bub, m) {
    if (!m.tmp && m.id != null) {   // সার্ভারে-সেভ-হওয়া প্রতিটা মেসেজ নির্বাচনযোগ্য; রিঅ্যাকশন শুধু accepted অবস্থায়
      bub.classList.add('selectable');
      if (canReact(m) && !isDel(m)) { bub.classList.add('reactable'); }
      var t = null, sx = 0, sy = 0;
      var cancel = function () { if (t) { clearTimeout(t); t = null; } };
      bub.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) { return; }
        m.lp = false; sx = e.clientX; sy = e.clientY; cancel();
        t = setTimeout(function () { t = null; m.lp = true; longPress(m, bub); }, LONG_MS);
      });
      bub.addEventListener('pointermove', function (e) {
        if (t && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) { cancel(); }
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { bub.addEventListener(ev, cancel); });
      bub.addEventListener('contextmenu', function (e) { e.preventDefault(); cancel(); longPress(m, bub); });
      if (!m.media_type && canReact(m) && !isDel(m)) {   // মিডিয়ায় প্রথম ট্যাপেই লাইটবক্স খোলে, তাই সেখানে শুধু দীর্ঘ চাপ
        bub.addEventListener('dblclick', function (e) { e.preventDefault(); openReactPop(m, bub); });
      }
      // দীর্ঘ চাপের পর আঙুল তুললে যে click আসে সেটা মিডিয়ার লাইটবক্স খুলতে দিও না;
      // নির্বাচন চালু থাকলে যেকোনো বাবলে ট্যাপ = সেটা নির্বাচন (আবার নির্বাচিতটায় চাপলে বাতিল), লাইটবক্স/প্লেয়ার নয়
      bub.addEventListener('click', function (e) {
        if (m.lp) { m.lp = false; e.stopPropagation(); e.preventDefault(); return; }
        if (selId != null) {
          e.stopPropagation(); e.preventDefault();
          if (String(selId) === String(m.id)) { clearSel(); } else { closeReactPop(); selectMsg(m); }
        }
      }, true);
    }
    var list = m.reactions || [];
    if (!list.length) { return; }
    var box = document.createElement('div');
    box.className = 'chat-reacts';
    list.forEach(function (rc) {
      var mine = rc.emoji === m.my_reaction;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chat-chip' + (mine ? ' mine' : '');
      var e = document.createElement('span'); e.textContent = rc.emoji;
      var n = document.createElement('span'); n.className = 'n'; n.textContent = toBn(rc.count);
      b.appendChild(e); b.appendChild(n);
      b.setAttribute('aria-label', rc.emoji + ' ' + toBn(rc.count) + (mine ? ' — আপনার রিঅ্যাকশন, তুলতে চাপুন' : ''));
      if (canReact(m)) { b.addEventListener('click', function () { react(m, rc.emoji); }); } else { b.disabled = true; }
      box.appendChild(b);
    });
    row.appendChild(box);
  }

  // সার্ভারের সর্বশেষ সারির সাথে লোকাল মেসেজ মেলানো (রিঅ্যাকশন; ধাপ ৪.২-এ read_at-ও) — বদলালে true
  function mergeExisting(rows) {
    var byId = {}, changed = false;
    msgs.forEach(function (m) { if (!m.tmp && m.id != null) { byId[m.id] = m; } });
    rows.forEach(function (row) {
      var m = byId[row.id];
      if (!m) { return; }
      if (row.read_at && !m.read_at) { m.read_at = row.read_at; changed = true; }
      if (row.deleted_at && !m.deleted_at) { markDeletedLocal(m, row.deleted_at); changed = true; }   // অন্যজন/অন্য ডিভাইস থেকে সবার জন্য মোছা
      else if (!row.deleted_at && !sameTs(row.edited_at, m.edited_at)) {   // এডিট হয়েছে
        m.body = row.body; m.edited_at = row.edited_at || null; patchQuotes(m.id, m.body); changed = true;
      }
      if (row.reply_to_id != null && !m.deleted_at && (m.reply_state !== row.reply_state || (m.reply_body || null) !== (row.reply_body || null))) {
        m.reply_state = row.reply_state; m.reply_body = row.reply_body || null; m.reply_media_type = row.reply_media_type || null;
        m.reply_is_mine = !!row.reply_is_mine; changed = true;
      }
      if (!m.reactBusy) {   // আমার নিজের রিঅ্যাকশন পাঠানো চলছে — সার্ভারের পুরনো উত্তর দিয়ে মুছো না
        var mine = row.my_reaction || null;
        if (mine !== (m.my_reaction || null) || sigOf(row.reactions) !== sigOf(m.reactions)) {
          m.my_reaction = mine; m.reactions = row.reactions || []; changed = true;
        }
      }
    });
    return changed;
  }
  // get_messages-এর সর্বশেষ সারি (নতুন → পুরনো) দিয়ে তালিকা হালনাগাদ: নতুন মেসেজ যোগ + বদলানো রিঅ্যাকশন মেলানো
  function syncRows(rows) {
    var changed = mergeExisting(rows), added = false;
    rows.slice().reverse().forEach(function (r) { if (appendIncoming(r)) { added = true; } });
    if (changed && !added) { rerender(); }
  }
  // রিয়েলটাইমে অন্যের রিঅ্যাকশন এলে ডিবাউন্স করে একবার সর্বশেষ ৩০টি আনা (রিঅ্যাকশন-টেবিলে conversation_id নেই বলে সরাসরি আপডেট না)
  function scheduleRefresh() {
    if (refreshTimer || document.hidden || !chat || !chat.conversation_id) { return; }
    refreshTimer = setTimeout(function () { refreshTimer = null; pollMessages(); }, 350);
  }

  // ---------- পাঠানো ----------
  function doSend(m) {
    // মিডিয়া হলে আগে আপলোড (ব্যর্থ পাঠানোর পর আবার-পাঠানোয় আপলোড-হওয়া পাথ থাকলে আবার আপলোড হয় না)
    if (m.media_type && !m.path) {
      setProgress(m, 0);
      uploadMedia(m).then(function (path) { m.path = path; sendRpc(m); }).catch(function (e) { fail(m, e); });
      return;
    }
    sendRpc(m);
  }
  function sendRpc(m) {
    var args = { p_username: uname, p_body: m.body || null };
    if (m.media_type) { args.p_media_url = m.path; args.p_media_type = m.media_type; }
    if (m.reply_to_id != null) { args.p_reply_to = m.reply_to_id; }
    client.rpc('send_message', args).then(function (r) {
      if (r.error) { return fail(m, r.error); }
      var row = r.data && r.data[0];
      if (!row) { return fail(m, null); }
      m.tmp = false; delete m.status; delete m.progEl; delete m.file;
      if (m.media_type) { m.media_url = m.path; }
      m.id = row.message_id; m.created_at = row.created_at;
      // পোলিং/রিয়েলটাইম এই উত্তরের আগেই মেসেজটা ধরে ফেললে একই id-র দ্বিতীয় কপি বাদ
      msgs = msgs.filter(function (x) { return x === m || x.tmp || x.id !== m.id; });
      renderList(nearBottom() ? 'bottom' : 'keep');
      refreshState();   // বাকি-মেসেজ সংখ্যা/অবস্থা হালনাগাদ (সার্ভারের আসল মান)
    }).catch(function (e) { fail(m, e); });
  }
  function fail(m, err) {
    if (needsLogin(err)) { redirectLogin(); return; }
    m.status = 'failed';
    if (/bad_reply/i.test(String((err && err.message) || ''))) {   // যাকে রিপ্লাই — সে মেসেজ আর নেই: আবার-পাঠান সাধারণ মেসেজ হিসেবে যাবে
      m.reply_to_id = null; m.reply_state = null; m.reply_body = null; m.reply_media_type = null; m.reply_is_mine = false;
    }
    if (m.media_type && /bad_media/i.test(String((err && err.message) || ''))) { m.path = null; }   // ফাইল সার্ভারে নেই/অগ্রহণযোগ্য — পরের বার আবার আপলোড
    flash(errText(err));
    renderList('bottom');
    refreshState();
  }
  function resend(m) { m.status = 'sending'; renderList('bottom'); doSend(m); }

  function sendFromInput() {
    if (selId != null) { clearSel(); }
    if (compose && compose.mode === 'edit') { doEdit(); return; }   // এডিট-মোডে "পাঠান" = পরিবর্তন সেভ
    var text = el.input.value.trim();
    if (!chat || !chat.can_send || preparing || (!text && !pending)) { return; }
    if (pending && !chat.can_send_media) { flash('চ্যাট চালু না হওয়া পর্যন্ত শুধু টেক্সট মেসেজ পাঠানো যাবে।'); return; }
    var m = { tmpId: 't' + (++tmpSeq), is_mine: true, body: text || null, created_at: new Date().toISOString(), tmp: true, status: 'sending' };
    if (pending) {   // বাছাই করা মিডিয়া মেসেজে চলে যায় (localUrl প্রিভিউ-ও এখান থেকে দেখানো হয়)
      m.media_type = pending.type; m.mime = pending.mime; m.file = pending.file; m.localUrl = pending.url; m.progress = 0;
      pending = null; hidePreview();
    }
    if (compose && compose.mode === 'reply') {   // রিপ্লাই: উদ্ধৃতির তথ্য লোকালে বসাও, সার্ভারে p_reply_to যাবে
      var q = findMsg(compose.id);
      if (q && !isDel(q)) {
        m.reply_to_id = q.id; m.reply_state = 'ok'; m.reply_body = q.body ? q.body.slice(0, 140) : null;
        m.reply_media_type = q.media_type || null; m.reply_is_mine = !!q.is_mine;
      }
      cancelCompose();
    }
    el.input.value = ''; autosize(); updateSendBtn();
    msgs.push(m);
    renderList('bottom');
    flash('');
    doSend(m);
    el.input.focus();
  }
  function autosize() {
    el.input.style.height = 'auto';
    el.input.style.height = Math.min(el.input.scrollHeight, 120) + 'px';
  }
  el.input.addEventListener('input', function () { autosize(); updateSendBtn(); });
  el.input.addEventListener('focus', function () { if (selId != null) { clearSel(); } });   // লিখতে শুরু করলে নির্বাচন ছেড়ে দাও
  el.input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && compose) { cancelCompose(); return; }
    // ডেস্কটপে Enter = পাঠান, Shift+Enter = নতুন লাইন; মোবাইলে Enter = নতুন লাইন
    if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      e.preventDefault(); sendFromInput();
    }
  });
  el.send.addEventListener('click', sendFromInput);

  // ---------- ইমোজি-পিকার (বাইরের লাইব্রেরি/CDN ছাড়া, ইউনিকোড গ্রিড) ----------
  var EMOJIS = ['😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😉', '😎', '🤩',
    '😢', '😭', '😡', '😱', '😴', '🤔', '😅', '🙄', '😇', '🤗',
    '👍', '👎', '👏', '🙏', '💪', '🤝', '👋', '✌️', '🤞', '❤️',
    '💔', '🔥', '🎉', '🎂', '😷', '🤒', '🌹', '⭐', '☀️', '🌙',
    '☔', '🍔', '🍵', '☕', '🍰', '⚽', '🚗', '📷', '🎵', '✅'];
  var emojiBuilt = false, emojiOpen = false;
  function buildEmojiPanel() {
    if (emojiBuilt) { return; }
    emojiBuilt = true;
    EMOJIS.forEach(function (e) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = e; b.setAttribute('aria-label', 'ইমোজি');
      b.addEventListener('click', function () {
        var start = el.input.selectionStart == null ? el.input.value.length : el.input.selectionStart;
        var end = el.input.selectionEnd == null ? el.input.value.length : el.input.selectionEnd;
        el.input.value = el.input.value.slice(0, start) + e + el.input.value.slice(end);
        el.input.focus();
        var pos = start + e.length;
        el.input.setSelectionRange(pos, pos);
        autosize(); updateSendBtn();
      });
      el.emojiPanel.appendChild(b);
    });
  }
  function setEmojiOpen(open) {
    if (open && el.input.disabled) { return; }
    emojiOpen = open;
    if (open) { buildEmojiPanel(); }
    el.emojiPanel.hidden = !open;
    el.emojiBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  el.emojiBtn.addEventListener('click', function () { setEmojiOpen(!emojiOpen); });
  document.addEventListener('click', function (e) {
    if (emojiOpen && !el.emojiPanel.contains(e.target) && e.target !== el.emojiBtn && !el.emojiBtn.contains(e.target)) {
      setEmojiOpen(false);
    }
    if (menuOpen && !el.menuPanel.contains(e.target) && e.target !== el.menuBtn && !el.menuBtn.contains(e.target)) {
      setMenuOpen(false);
    }
    if (selMenuOpen && !el.selMenuPanel.contains(e.target) && e.target !== el.selMenuBtn && !el.selMenuBtn.contains(e.target)) {
      setSelMenuOpen(false);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') { return; }
    setMenuOpen(false);
    if (sheetOpen) { closeSheet(); }
    else if (selMenuOpen) { setSelMenuOpen(false); }
    else if (selId != null) { clearSel(); }
  });

  // ---------- হেডারের ⋮ মেনু — মোছা/ব্লক (ধাপ ৫) ----------
  function setMenuOpen(open) {
    menuOpen = open;
    el.menuPanel.hidden = !open;
    el.menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  // ---------- কল বাটন (js/call.js যদি লোড থাকে) ----------
  function startCallClick(type) {
    if (!window.TangailCall || !chat || !chat.other_id) { return; }
    window.TangailCall.start(chat.other_id, chat.other_username, chat.other_name, chat.other_avatar, type);
  }
  el.callVoice.addEventListener('click', function () { startCallClick('voice'); });
  el.callVideo.addEventListener('click', function () { startCallClick('video'); });

  el.menuBtn.addEventListener('click', function () { setMenuOpen(!menuOpen); });

  el.menuBlock.addEventListener('click', function () {
    setMenuOpen(false);
    if (!chat || busyMenuAction) { return; }
    var willBlock = !chat.i_blocked;
    var ok = willBlock
      ? confirm('এই ব্যক্তিকে ব্লক করতে চান? ব্লক করলে সে আর আপনাকে মেসেজ পাঠাতে পারবে না, আপনিও তাকে পারবেন না। আপনার দিক থেকে এই কথোপকথনের আগের মেসেজও মুছে যাবে (অন্যজনের দিকে থাকবে)।')
      : confirm('এই ব্যক্তিকে আনব্লক করতে চান?');
    if (!ok) { return; }
    busyMenuAction = true;
    client.rpc(willBlock ? 'block_user' : 'unblock_user', { p_username: uname }).then(function (r) {
      if (r.error) { flash(errText(r.error)); return; }
      flash(willBlock ? 'ব্লক করা হয়েছে।' : 'আনব্লক করা হয়েছে।');
      return refreshState();
    }).catch(function () { flash('নেটওয়ার্ক সমস্যা — আবার চেষ্টা করুন।'); })
      .then(function () { busyMenuAction = false; });
  });

  el.menuDelete.addEventListener('click', function () {
    setMenuOpen(false);
    if (!chat || busyMenuAction) { return; }
    if (!confirm('এই কথোপকথন আপনার দিক থেকে মুছে ফেলতে চান? অন্যজনের ইনবক্সে এটি থেকে যাবে; সে নতুন মেসেজ দিলে আবার আপনার ইনবক্সে ফিরে আসবে।')) { return; }
    busyMenuAction = true;
    client.rpc('delete_conversation_for_me', { p_username: uname }).then(function (r) {
      if (r.error) { flash(errText(r.error)); busyMenuAction = false; return; }
      stopLive();
      window.location.href = 'profile.html#messages';
    }).catch(function () { flash('নেটওয়ার্ক সমস্যা — আবার চেষ্টা করুন।'); busyMenuAction = false; });
  });

  // ---------- মেসেজ অ্যাকশন: দীর্ঘ চাপ → নির্বাচন → হেডারের ⋮ মেনু (কপি · রিপ্লাই · ফরওয়ার্ড · এডিট · ডিলিট) ----------
  function sameTs(a, b) {
    if (!a && !b) { return true; }
    if (!a || !b) { return false; }
    return Date.parse(a) === Date.parse(b);
  }
  // যে মেসেজগুলো id-কে রিপ্লাই করেছে তাদের উদ্ধৃতি হালনাগাদ: এডিট → নতুন টেক্সট; সবার জন্য মোছা → "মুছে ফেলা"; আমার থেকে মোছা → "আর নেই"
  function patchQuotes(id, body) {
    msgs.forEach(function (x) {
      if (x.reply_to_id != null && String(x.reply_to_id) === String(id) && x.reply_state === 'ok') { x.reply_body = body ? String(body).slice(0, 140) : null; }
    });
  }
  function quoteGone(id, state) {
    msgs.forEach(function (x) {
      if (x.reply_to_id != null && String(x.reply_to_id) === String(id)) { x.reply_state = state; x.reply_body = null; x.reply_media_type = null; }
    });
  }
  function markDeletedLocal(m, at) {
    if (m.localUrl) { try { URL.revokeObjectURL(m.localUrl); } catch (e) { /* কিছু না */ } }
    m.deleted_at = at || new Date().toISOString();
    m.body = null; m.media_url = null; m.media_type = null; m.localUrl = null; m.path = null;
    m.reactions = []; m.my_reaction = null; m.reply_to_id = null; m.reply_state = null; m.reply_body = null; m.reply_media_type = null;
    m.is_forwarded = false; m.edited_at = null;
    quoteGone(m.id, 'deleted');
    if (compose && String(compose.id) === String(m.id)) { cancelCompose(); }
  }

  // কোন অপশন কার জন্য: কপি = টেক্সট/ক্যাপশন থাকলে; রিপ্লাই/এডিট = চ্যাটে পাঠানো চালু থাকলে (এডিট শুধু নিজের); ফরওয়ার্ড = মোছা নয় এমন মেসেজ; ডিলিট = সবার
  function actionsFor(m) {
    if (!m || m.tmp || m.id == null) { return null; }
    var del = isDel(m), w = !!(chat && chat.can_send);
    return { copy: !del && !!(m.body && m.body.trim()), reply: !del && w, forward: !del, edit: !del && !!m.is_mine && w, del: true };
  }
  function paintSel() {   // DOM ভেঙে আবার না এঁকে শুধু ক্লাস বদলাই (ভিডিও/ছবি রিলোড হয় না, আঙুলের নিচের বাবল টিকে থাকে)
    Array.prototype.forEach.call(el.list.querySelectorAll('.chat-row.selected'), function (r) { r.classList.remove('selected'); });
    if (selId != null) {
      var r = el.list.querySelector('.chat-row[data-mid="' + selId + '"]');
      if (r) { r.classList.add('selected'); }
    }
  }
  function updateSelBar() {
    var m = selId == null ? null : findMsg(selId), a = actionsFor(m);
    if (!a) {
      selId = null; el.head.classList.remove('selecting'); setSelMenuOpen(false); paintSel();
      return;
    }
    el.head.classList.add('selecting');
    el.actCopy.hidden = !a.copy; el.actReply.hidden = !a.reply; el.actForward.hidden = !a.forward;
    el.actEdit.hidden = !a.edit; el.actDelete.hidden = !a.del;
  }
  function selectMsg(m) {
    if (!actionsFor(m)) { return; }
    selId = m.id; paintSel(); updateSelBar(); setSelMenuOpen(false);
  }
  function clearSel() { selId = null; closeReactPop(); paintSel(); updateSelBar(); }
  function setSelMenuOpen(open) {
    selMenuOpen = open;
    el.selMenuPanel.hidden = !open;
    el.selMenuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { closeReactPop(); }
  }
  el.selMenuBtn.addEventListener('click', function () { setSelMenuOpen(!selMenuOpen); });
  el.selClose.addEventListener('click', clearSel);
  function withSel(fn) {
    var m = selId == null ? null : findMsg(selId);
    setSelMenuOpen(false);
    if (m) { fn(m); }
  }

  // ---- কপি ----
  function fallbackCopy(text) {
    var ta = document.createElement('textarea'), ok = false;
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    try { ta.setSelectionRange(0, ta.value.length); ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }
  function doCopy(m) {
    var text = m.body || '';
    if (!text.trim()) { return; }
    var done = function (ok) { flash(ok ? 'কপি হয়েছে।' : 'কপি করা যায়নি।', ok); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallbackCopy(text)); });
    } else { done(fallbackCopy(text)); }
  }
  el.actCopy.addEventListener('click', function () { withSel(function (m) { clearSel(); doCopy(m); }); });

  // ---- রিপ্লাই / এডিট (কম্পোজারের উপরে বার) ----
  function startCompose(mode, m) {
    if (!chat || !chat.can_send || isDel(m)) { return; }
    var prevEdit = !!(compose && compose.mode === 'edit');
    var draft = prevEdit ? compose.draft : el.input.value;   // লেখা অসমাপ্ত মেসেজ এডিটের পর ফিরে আসে
    if (mode === 'edit') {
      clearPending();
      compose = { mode: 'edit', id: m.id, hasMedia: !!m.media_type, draft: draft };
      el.input.value = m.body || '';
    } else {
      compose = { mode: 'reply', id: m.id };
      if (prevEdit) { el.input.value = draft || ''; }
    }
    el.replyBar.hidden = false; el.replyBar.classList.toggle('edit', mode === 'edit');
    el.replyWho.textContent = mode === 'edit' ? 'মেসেজ এডিট করুন' : 'রিপ্লাই: ' + (m.is_mine ? 'আপনি' : peerName());
    el.replySnip.textContent = snippetOf(m);
    el.attach.disabled = mode === 'edit' || !chat.can_send;
    setEmojiOpen(false);
    autosize(); updateSendBtn();
    el.input.focus();
    try { var n = el.input.value.length; el.input.setSelectionRange(n, n); } catch (e) { /* কিছু না */ }
  }
  function cancelCompose() {
    var wasEdit = !!(compose && compose.mode === 'edit'), draft = wasEdit ? compose.draft : null;
    compose = null; el.replyBar.hidden = true; el.replyBar.classList.remove('edit');
    if (wasEdit) { el.input.value = draft || ''; autosize(); }
    if (chat) { el.attach.disabled = !chat.can_send; }
    updateSendBtn();
  }
  el.replyX.addEventListener('click', cancelCompose);
  el.actReply.addEventListener('click', function () { withSel(function (m) { clearSel(); startCompose('reply', m); }); });
  el.actEdit.addEventListener('click', function () { withSel(function (m) { clearSel(); startCompose('edit', m); }); });

  function doEdit() {
    if (busyEdit || !compose || compose.mode !== 'edit') { return; }
    var m = findMsg(compose.id);
    if (!m || isDel(m)) { cancelCompose(); flash('মেসেজটি আর নেই।'); return; }
    var text = el.input.value.trim();
    if (!text && !m.media_type) { flash('মেসেজ খালি রাখা যায় না। পুরো মেসেজ সরাতে চাইলে ডিলিট করুন।'); return; }
    if (text === (m.body || '')) { cancelCompose(); return; }   // কিছু বদলায়নি
    busyEdit = true; updateSendBtn(); flash('');
    client.rpc('edit_message', { p_message_id: m.id, p_body: text || null }).then(function (r) {
      busyEdit = false;
      if (r.error) {
        if (needsLogin(r.error)) { redirectLogin(); return; }
        flash(errText(r.error, 'action'));
        if (/not_allowed|blocked/i.test(String(r.error.message || ''))) { cancelCompose(); } else { updateSendBtn(); }
        return;
      }
      m.body = text || null; m.edited_at = r.data || new Date().toISOString();
      patchQuotes(m.id, m.body);
      cancelCompose(); rerender();
    }).catch(function () { busyEdit = false; updateSendBtn(); flash('নেটওয়ার্ক সমস্যা — এডিট সেভ হয়নি। আবার চেষ্টা করুন।'); });
  }

  // ---- বটম-শিট ----
  var fwToken = 0;
  function openSheet(title) {
    el.sheetTitle.textContent = title; el.sheetBody.textContent = '';
    el.sheet.hidden = false; sheetOpen = true;
    return el.sheetBody;
  }
  function closeSheet() {
    fwToken++;   // চলমান ফরওয়ার্ড-তালিকা লোড বাতিল
    el.sheet.hidden = true; sheetOpen = false; el.sheetBody.textContent = '';
  }
  el.sheetBack.addEventListener('click', closeSheet);
  el.sheetClose.addEventListener('click', closeSheet);
  function sheetBtn(text, danger, fn) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'chat-sheet-btn' + (danger ? ' danger' : ''); b.textContent = text;
    b.addEventListener('click', fn);
    return b;
  }

  // ---- ডিলিট: আমার থেকে (hide_message_for_me) / সবার জন্য (delete_message_for_everyone — শুধু নিজের) ----
  function runDelete(m, everyone) {
    if (busyAction) { return; }
    busyAction = true;
    var call = everyone ? client.rpc('delete_message_for_everyone', { p_message_id: m.id }) : client.rpc('hide_message_for_me', { p_message_id: m.id });
    call.then(function (r) {
      busyAction = false;
      if (r.error) { if (needsLogin(r.error)) { redirectLogin(); return; } flash(errText(r.error, 'action')); return; }
      if (everyone) {
        var path = typeof r.data === 'string' ? r.data : null;   // সার্ভার ফাইলের পাথ দেয় যদি আর কোনো মেসেজ ফাইলটা ব্যবহার না করে
        markDeletedLocal(m);
        if (path && me && path.indexOf(me + '/') === 0) { removeUploaded(path); }   // শুধু নিজের ফোল্ডারের ফাইল মোছা যায়
      } else {
        msgs = msgs.filter(function (x) { return x !== m; });
        quoteGone(m.id, 'hidden');
        if (compose && String(compose.id) === String(m.id)) { cancelCompose(); }
      }
      rerender();
    }).catch(function () { busyAction = false; flash('নেটওয়ার্ক সমস্যা — আবার চেষ্টা করুন।'); });
  }
  function openDelete(m) {
    var body = openSheet('মেসেজ ডিলিট করবেন?');
    var all = !!m.is_mine && !isDel(m);
    var note = document.createElement('p'); note.className = 'chat-sheet-note';
    note.textContent = all
      ? '“সবার জন্য ডিলিট” করলে দুজনের চ্যাট থেকেই মেসেজটি মুছে যাবে। “আমার থেকে ডিলিট” করলে শুধু আপনার চ্যাট থেকে সরবে — অন্যজন দেখতে পাবে।'
      : (isDel(m) ? 'এই “মুছে ফেলা হয়েছে” চিহ্নটি শুধু আপনার চ্যাট থেকে সরে যাবে।' : 'মেসেজটি শুধু আপনার চ্যাট থেকে সরবে — অন্যজনের চ্যাটে থেকে যাবে।');
    body.appendChild(note);
    if (all) { body.appendChild(sheetBtn('সবার জন্য ডিলিট', true, function () { closeSheet(); runDelete(m, true); })); }
    body.appendChild(sheetBtn('আমার থেকে ডিলিট', !all, function () { closeSheet(); runDelete(m, false); }));
    body.appendChild(sheetBtn('বাতিল', false, closeSheet));
  }
  el.actDelete.addEventListener('click', function () { withSel(function (m) { clearSel(); openDelete(m); }); });

  // ---- ফরওয়ার্ড: প্রাপক-তালিকা = চ্যাট-তালিকা (list_conversations) + ফ্রেন্ডস (list_my_friends); প্রতিটার পাশে "পাঠান" (একাধিক জনকে একে একে) ----
  function fwAvatar(nm, url) {
    var a = document.createElement('span'); a.className = 'chat-avatar'; a.setAttribute('aria-hidden', 'true');
    var ch = document.createTextNode((nm || '?').charAt(0));
    if (isHttps(url)) {
      var img = document.createElement('img'); img.src = url; img.alt = ''; img.loading = 'lazy';
      img.onerror = function () { img.remove(); a.appendChild(ch); };
      a.appendChild(img);
    } else { a.appendChild(ch); }
    return a;
  }
  function openForward(m) {
    var body = openSheet('ফরওয়ার্ড করুন');
    var token = ++fwToken;
    var search = document.createElement('input');
    search.type = 'search'; search.className = 'chat-fw-search'; search.placeholder = 'নাম বা ইউজারনেম খুঁজুন…';
    search.setAttribute('aria-label', 'প্রাপক খুঁজুন'); search.autocomplete = 'off';
    var list = document.createElement('div');
    body.appendChild(search); body.appendChild(list);

    function note(text, retry) {
      list.textContent = '';
      var p = document.createElement('p'); p.className = 'chat-fw-empty'; p.textContent = text;
      list.appendChild(p);
      if (retry) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'chat-btn'; b.textContent = 'আবার চেষ্টা করুন';
        b.addEventListener('click', load);
        p.appendChild(document.createElement('br')); p.appendChild(b);
      }
    }
    function sendTo(p, btn, row) {
      if (btn.disabled) { return; }
      btn.disabled = true; btn.textContent = 'পাঠানো হচ্ছে…';
      var old = row.querySelector('.chat-fw-err'); if (old) { old.remove(); }
      client.rpc('forward_message', { p_message_id: m.id, p_username: p.username }).then(function (r) {
        if (r.error) {
          if (needsLogin(r.error)) { redirectLogin(); return; }
          btn.disabled = false; btn.textContent = 'আবার পাঠান';
          var er = document.createElement('p'); er.className = 'chat-fw-err'; er.textContent = errText(r.error, 'action');
          row.appendChild(er);
          return;
        }
        btn.textContent = '✓ পাঠানো হয়েছে'; btn.classList.add('done');   // disabled থাকে — একই জনকে দুবার নয়
      }).catch(function () {
        btn.disabled = false; btn.textContent = 'আবার পাঠান';
        var er = document.createElement('p'); er.className = 'chat-fw-err'; er.textContent = 'নেটওয়ার্ক সমস্যা — আবার চেষ্টা করুন।';
        row.appendChild(er);
      });
    }
    function render(people) {
      list.textContent = '';
      if (!people.length) { note('ফরওয়ার্ড করার মতো কেউ নেই। আগে কাউকে Add Friend করুন বা কারও সাথে চ্যাট শুরু করুন।'); return; }
      people.forEach(function (p) {
        var nm = p.name || ('@' + p.username);
        var row = document.createElement('div'); row.className = 'chat-fw-row';
        row.setAttribute('data-q', (nm + ' ' + p.username).toLowerCase());
        row.appendChild(fwAvatar(nm, p.avatar));
        var who = document.createElement('div'); who.className = 'chat-fw-who';
        var n1 = document.createElement('span'); n1.className = 'chat-fw-name'; n1.textContent = nm;
        var n2 = document.createElement('span'); n2.className = 'chat-fw-sub'; n2.textContent = '@' + p.username;
        who.appendChild(n1); who.appendChild(n2); row.appendChild(who);
        var b = document.createElement('button'); b.type = 'button'; b.className = 'chat-fw-btn'; b.textContent = 'পাঠান';
        b.addEventListener('click', function () { sendTo(p, b, row); });
        row.appendChild(b);
        list.appendChild(row);
      });
    }
    function load() {
      note('লোড হচ্ছে…');
      Promise.all([
        client.rpc('list_conversations', { p_folder: 'chat', p_limit: 50, p_offset: 0 }),
        client.rpc('list_my_friends', { p_limit: 100 })
      ]).then(function (res) {
        if (token !== fwToken) { return; }
        var conv = res[0], fr = res[1];
        if (conv.error && fr.error) {
          if (needsLogin(conv.error)) { redirectLogin(); return; }
          note('তালিকা লোড করা যায়নি।', true); return;
        }
        var seen = {}, people = [];
        var add = function (x) {
          var u = String(x.username || '').toLowerCase();
          if (!u || u === uname || seen[u]) { return; }   // এই চ্যাটের অন্যজনকে ফরওয়ার্ড অর্থহীন
          seen[u] = true; people.push({ username: x.username, name: x.full_name, avatar: x.avatar_url });
        };
        (conv.data || []).forEach(add); (fr.data || []).forEach(add);
        render(people);
      }).catch(function () { if (token === fwToken) { note('নেটওয়ার্ক সমস্যা — তালিকা লোড করা যায়নি।', true); } });
    }
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase(), shown = 0;
      Array.prototype.forEach.call(list.querySelectorAll('.chat-fw-row'), function (r) {
        var ok = !q || r.getAttribute('data-q').indexOf(q) > -1;
        r.hidden = !ok; if (ok) { shown++; }
      });
      var ex = list.querySelector('.chat-fw-nomatch');
      if (!shown && list.querySelector('.chat-fw-row')) {
        if (!ex) { ex = document.createElement('p'); ex.className = 'chat-fw-empty chat-fw-nomatch'; ex.textContent = 'কাউকে পাওয়া যায়নি।'; list.appendChild(ex); }
      } else if (ex) { ex.remove(); }
    });
    load();
  }
  el.actForward.addEventListener('click', function () { withSel(function (m) { clearSel(); openForward(m); }); });

  // ---------- Add Friend (রিকোয়েস্ট-প্রাপকের ব্যানার থেকে) ----------
  // ফ্রেন্ড রিকোয়েস্ট (follows.status: pending → accepted); চ্যাট চালু হয় শুধু accepted হলে।
  // বাটনের অবস্থা RPC get_follow_stats.viewer_status থেকে: none → Add Friend (pending সারি insert);
  // pending_sent → Friend Request (হলুদ; চাপলে নিশ্চিত করে বাতিল); pending_received → Accept Request (RPC respond_friend_request)।
  var friendSt = 'none';
  function paintFriendBtn() {
    el.addFriend.textContent = friendSt === 'pending_sent' ? 'Friend Request' : (friendSt === 'pending_received' ? 'Accept Request' : 'Add Friend');
    el.addFriend.classList.toggle('is-pending', friendSt === 'pending_sent');
  }
  function loadFriendSt() {
    return client.rpc('get_follow_stats', { p_username: uname }).then(function (r) {
      var row = r.data && r.data[0];
      friendSt = (!r.error && row && row.viewer_status) || 'none';
      paintFriendBtn();
    }).catch(function () { /* পুরনো অবস্থাই থাকে */ });
  }
  el.addFriend.addEventListener('click', function () {
    if (busyFriend || !chat) { return; }
    var st = friendSt;
    if (st === 'pending_sent' && !window.confirm('ফ্রেন্ড রিকোয়েস্ট বাতিল করবেন?')) { return; }
    busyFriend = true; el.addFriend.disabled = true; flash('');
    var okText = st === 'pending_received' ? 'আপনারা এখন ফ্রেন্ড — চ্যাট চালু।'
      : (st === 'pending_sent' ? 'ফ্রেন্ড রিকোয়েস্ট বাতিল করা হয়েছে।' : 'ফ্রেন্ড রিকোয়েস্ট পাঠানো হয়েছে। গ্রহণ করলে চ্যাট চালু হবে।');
    client.rpc('get_public_profile', { p_username: uname }).then(function (r) {
      var p = r.data && r.data[0];
      if (r.error || !p || !p.id) { throw { soft: 'এই ব্যক্তিকে এখন Add Friend করা যাচ্ছে না (সম্ভবত প্রোফাইল পাবলিক নয়)।' }; }
      if (st === 'pending_received') { return client.rpc('respond_friend_request', { p_username: uname, p_accept: true }); }
      if (st === 'pending_sent') {
        return client.from('follows').delete().or(
          'and(follower_id.eq.' + me + ',following_id.eq.' + p.id + '),and(follower_id.eq.' + p.id + ',following_id.eq.' + me + ')'
        );
      }
      // st === 'none': add_friend RPC — আগে অন্তত একবার ফ্রেন্ড ছিল হলে সঙ্গে সঙ্গে accepted করে
      // (কোনো নতুন pending রিকোয়েস্ট/নোটিফিকেশন ছাড়াই), নাহলে আগের মতোই pending রিকোয়েস্ট পাঠায়।
      return client.rpc('add_friend', { p_username: uname });
    }).then(function (r) {
      var err = r && r.error;
      if (err) {
        throw { soft: err.code === '42501' ? 'এই ব্যক্তিকে এখন Add Friend করা যাচ্ছে না (সম্ভবত প্রোফাইল পাবলিক নয়)।' : errText(err) };
      }
      if (st === 'pending_received' && r && r.data === false) { throw { soft: 'রিকোয়েস্টটি আর নেই।' }; }
      var reFriended = st === 'none' && r && r.data === 'accepted';
      flash(reFriended ? 'আপনারা আবার ফ্রেন্ড হয়েছেন — চ্যাট চালু।' : okText, true);
      return refreshState();   // accepted হলে ব্যানার সরে যায়, ইনপুট চালু হয়; নাহলে বাটনের অবস্থা আবার আনা হয়
    }).catch(function (e) {
      flash(e && e.soft ? e.soft : 'নেটওয়ার্ক সমস্যা — আবার চেষ্টা করুন।');
    }).then(function () { busyFriend = false; el.addFriend.disabled = false; });
  });

  // ---------- ব্যাক বাটন: আগের পেজ থাকলে সেখানে, নাহলে প্রোফাইলে ----------
  el.back.addEventListener('click', function (e) {
    if (window.history.length > 1 && document.referrer) { e.preventDefault(); window.history.back(); }
  });

  // ---------- রিয়েলটাইম (chat_messages, conversation-ভিত্তিক) + পোলিং fallback ----------
  var rtConvId = null;
  function unsubscribeRealtime() {
    if (rtChannel) { client.removeChannel(rtChannel); rtChannel = null; }
    rtOk = false; rtConvId = null;
  }
  function subscribeRealtime() {
    if (!chat || !chat.conversation_id || document.hidden) { return; }
    if (rtChannel && rtConvId === chat.conversation_id) { return; }
    unsubscribeRealtime();
    rtConvId = chat.conversation_id;
    var ch = client.channel('chat-msgs-' + rtConvId);
    rtChannel = ch;
    ch.on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: 'conversation_id=eq.' + rtConvId
      }, function (payload) {
        var row = payload && payload.new;
        if (!row || row.sender_id === me) { return; }   // নিজের মেসেজ doSend-এর মাধ্যমেই যোগ হয়
        var inc = { id: row.id, is_mine: false, body: row.body, media_url: row.media_url, media_type: row.media_type, created_at: row.created_at,
          read_at: row.read_at, edited_at: row.edited_at, deleted_at: row.deleted_at, is_forwarded: row.is_forwarded };
        if (row.reply_to_id != null) {   // রিপ্লাই: উদ্ধৃতির তথ্য লোড-করা মেসেজ থেকে; না থাকলে সার্ভার থেকে (get_messages) উদ্ধৃতিসহ আনো
          var q = findMsg(row.reply_to_id);
          if (!q) { pollMessages(); return; }
          inc.reply_to_id = q.id; inc.reply_state = isDel(q) ? 'deleted' : 'ok'; inc.reply_body = q.body ? q.body.slice(0, 140) : null;
          inc.reply_media_type = q.media_type || null; inc.reply_is_mine = !!q.is_mine;
        }
        appendIncoming(inc);
      })
      // UPDATE: (ক) আমার মেসেজ অন্যজন পড়লে (ধাপ ৪.২, read_at); (খ) মেসেজ এডিট (edited_at/body) বা সবার জন্য মোছা (deleted_at) — যার মেসেজই হোক
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'chat_messages',
        filter: 'conversation_id=eq.' + rtConvId
      }, function (payload) {
        var row = payload && payload.new;
        if (!row) { return; }
        var m = findMsg(row.id);
        if (!m) { return; }
        var changed = false;
        if (row.deleted_at && !m.deleted_at) { markDeletedLocal(m, row.deleted_at); changed = true; }
        else if (!row.deleted_at && !m.deleted_at && !sameTs(row.edited_at, m.edited_at)) {
          m.body = row.body; m.edited_at = row.edited_at || null; patchQuotes(m.id, m.body); changed = true;
        }
        if (row.sender_id === me && row.read_at && !m.read_at) { m.read_at = row.read_at; changed = true; }
        if (changed) { scheduleSeenRender(); }
      })
      // অন্যের রিঅ্যাকশন (ধাপ ৪.১): টেবিলে conversation_id নেই, তাই ফিল্টার ছাড়া — RLS শুধু অংশগ্রহণকারীর ইভেন্ট দেয়; অন্য কথোপকথনের মেসেজ-id উপেক্ষা
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_message_reactions' }, function (payload) {
        var rec = payload && ((payload.new && payload.new.message_id != null) ? payload.new : payload.old);
        if (!rec || rec.message_id == null || rec.user_id === me) { return; }   // নিজেরটা react()-এ আগেই আপডেট হয়েছে
        if (findMsg(rec.message_id)) { scheduleRefresh(); }
      })
      .subscribe(function (status) {
        if (rtChannel !== ch) { return; }   // পুরনো/বন্ধ করা চ্যানেলের দেরিতে আসা 'CLOSED' নতুনটার অবস্থা নষ্ট করবে না
        if (status === 'SUBSCRIBED') {
          rtOk = true; stopMsgPoll();
          pollMessages();   // লোড আর সাবস্ক্রাইবের মাঝের ফাঁকে আসা মেসেজ ধরতে একবার ক্যাচ-আপ (id দিয়ে ডুপ্লিকেট বাদ)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { rtOk = false; startMsgPoll(); }
      });
  }
  function pollMessages() {
    if (!chat || document.hidden) { return; }
    if (!chat.conversation_id) { refreshState(); return; }   // কথোপকথনই এখনো নেই — অন্যজন প্রথম মেসেজ দিয়েছে কিনা দেখো
    client.rpc('get_messages', { p_username: uname, p_limit: PAGE }).then(function (r) {
      if (r.error || !r.data) { return; }
      syncRows(r.data);
    }).catch(function () { /* পরের পোলিং-এ আবার চেষ্টা */ });
  }
  function startMsgPoll() {
    if (msgPollTimer || rtOk) { return; }
    msgPollTimer = setInterval(pollMessages, MSG_POLL_MS);
  }
  function stopMsgPoll() {
    if (msgPollTimer) { clearInterval(msgPollTimer); msgPollTimer = null; }
  }
  function startStatePoll() {
    if (statePollTimer) { return; }
    statePollTimer = setInterval(function () {
      if (!document.hidden) { refreshState(); }
    }, STATE_POLL_MS);
  }
  function stopStatePoll() {
    if (statePollTimer) { clearInterval(statePollTimer); statePollTimer = null; }
  }
  function ensureLive() {
    if (document.hidden || !chat) { return; }
    if (chat.conversation_id) { subscribeRealtime(); }
    if (!rtOk) { startMsgPoll(); }   // রিয়েলটাইম না চললে (বা কথোপকথন এখনো না থাকলে) ১২ সেকেন্ডের পোলিং
    startStatePoll();
  }
  function stopLive() { unsubscribeRealtime(); stopMsgPoll(); stopStatePoll(); closeReactPop(); setMenuOpen(false); if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; } if (seenTimer) { clearTimeout(seenTimer); seenTimer = null; } }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { stopLive(); }
    else if (chat) { ensureLive(); refreshState(); markReadIfNeeded(); }   // ফিরে এলে আবার সাবস্ক্রাইব (মিস হওয়া মেসেজ SUBSCRIBED-এ ধরা পড়ে) ও অনলাইন-অবস্থা রিফ্রেশ
  });
  window.addEventListener('pagehide', stopLive);

  // ---------- লোড ----------
  function load() {
    showState('loading');
    client.rpc('get_chat_state', { p_username: uname }).then(function (r) {
      if (r.error) {
        if (needsLogin(r.error)) { redirectLogin(); return; }
        el.errorText.textContent = errText(r.error);
        showState('error'); return;
      }
      var row = r.data && r.data[0];
      if (!row) { showState('notfound'); return; }
      chat = row;
      return client.rpc('get_messages', { p_username: uname, p_limit: PAGE }).then(function (g) {
        if (g.error) {
          if (needsLogin(g.error)) { redirectLogin(); return; }
          el.errorText.textContent = 'মেসেজ লোড করা যায়নি — আবার চেষ্টা করুন।';
          showState('error'); return;
        }
        var data = g.data || [];
        msgs = data.slice().reverse();
        hasMore = data.length >= PAGE;
        renderHeader(); applyState();
        showState('chat');
        renderList('bottom');
        // প্রথম পেজ স্ক্রিন না ভরলে আরও পুরনো মেসেজ আনো
        if (hasMore && el.list.scrollHeight <= el.list.clientHeight + 10) { loadOlder(); }
        ensureLive();
        markReadIfNeeded();   // চ্যাট খুললেই অন্যের অপঠিত মেসেজ পঠিত
      });
    }).catch(function () {
      el.errorText.textContent = 'নেটওয়ার্ক সমস্যা — সংযোগ দেখে আবার চেষ্টা করুন।';
      showState('error');
    });
  }
  el.retry.addEventListener('click', load);

  showState('loading');
  client.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (!session) { redirectLogin(); return; }   // গেস্ট: সরাসরি লগইনে (সার্ভারেও RPC আটকায়)
    me = session.user.id;
    if (!uname || !USERNAME_RE.test(uname)) { showState('notfound'); return; }
    load();
  }).catch(function () { el.errorText.textContent = 'নেটওয়ার্ক সমস্যা — সংযোগ দেখে আবার চেষ্টা করুন।'; showState('error'); });

  client.auth.onAuthStateChange(function (event) {
    if (event === 'SIGNED_OUT') { redirectLogin(); }
  });
})();
