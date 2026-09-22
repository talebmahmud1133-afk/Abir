// টাঙ্গাইল জেলা — ভয়েস/ভিডিও কল (WebRTC) — ধাপ ১: STUN-only, সাইট খোলা থাকা অবস্থায় ইনকামিং স্ক্রিন
// এই স্ক্রিপ্টটি supabase-js ও js/supabase-config.js এর পরে যোগ করতে হবে (nav-avatar.js এর মতো)।
// সিগন্যালিং সম্পূর্ণ Supabase Realtime broadcast দিয়ে — কোনো সিগন্যালিং টেবিল নেই।
//   ১. ব্যক্তিগত চ্যানেল 'call-user-<uid>' — লগইন থাকলেই সবসময় সাবস্ক্রাইব করা থাকে (ইনকামিং/বিজি/বাতিল/উত্তর জানাতে)।
//   ২. প্রতি কলের জন্য চ্যানেল 'call-signal-<call_id>' — শুধু Accept-এর পরেই দুইপক্ষ জয়েন করে (offer/answer/ICE/hangup)।
// ইতিহাস সংরক্ষিত হয় public.calls টেবিলে (RLS: শুধু accepted friend, ব্লক না থাকলে)।
// STUN + TURN: STUN (Google/Cloudflare) সাধারণ কানেকশনের জন্য, আর OpenRelay-এর ফ্রি পাবলিক TURN রিলে হিসেবে —
// কঠিন NAT/মোবাইল ক্যারিয়ারে (যেখানে শুধু STUN দিয়ে কল "connected" দেখালেও অডিও ভাঙা/পুট-পুট শোনায়) TURN রিলে ছাড়া প্যাকেট পার হয় না।
(function () {
  if (!window.supabase || !window.TANGAIL_SUPABASE) return;

  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
  var ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
  ];
  var RING_TIMEOUT_MS = 30000;

  var me = null;              // লগইন করা ইউজারের id
  var myChannel = null;       // ব্যক্তিগত চ্যানেল (সবসময় খোলা)
  var state = 'idle';         // idle | outgoing | incoming | active
  var call = null;            // { id, otherId, otherUsername, otherName, otherAvatar, type, role: 'caller'|'callee' }
  var pc = null;              // RTCPeerConnection
  var localStream = null, remoteStream = null;
  var signalChannel = null;
  var ringTimer = null, ringAudio = null, callTimerInt = null, callStartTs = null;
  var pendingIce = [];        // remote description বসার আগে আসা ICE candidate
  var facingMode = 'user';

  // ---------- ছোট হেল্পার ----------
  function $(id) { return document.getElementById(id); }
  function toBn(n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'.charAt(d); }); }
  function fmtDur(sec) {
    sec = Math.max(0, Math.floor(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return toBn(m) + ':' + toBn(s < 10 ? '0' + s : String(s));
  }
  function avatarNode(name, url) {
    var wrap = document.createElement('div');
    wrap.className = 'tcall-avatar';
    if (url && /^https:\/\//i.test(url)) {
      var img = document.createElement('img'); img.src = url; img.alt = '';
      wrap.appendChild(img);
    } else {
      wrap.textContent = (name || '?').charAt(0);
    }
    return wrap;
  }

  // ---------- রিংটোন (Web Audio দিয়ে তৈরি, কোনো ফাইল লাগে না) ----------
  function startRing(pattern) {
    stopRing();
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var on = false, timer;
      function tick() {
        if (on) {
          var osc = ctx.createOscillator(), gain = ctx.createGain();
          osc.frequency.value = pattern === 'out' ? 480 : 660;
          gain.gain.value = 0.05;
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(); osc.stop(ctx.currentTime + 0.35);
        }
        on = !on;
        timer = setTimeout(tick, on ? 350 : 700);
      }
      tick();
      ringAudio = { ctx: ctx, stop: function () { clearTimeout(timer); try { ctx.close(); } catch (e) {} } };
    } catch (e) { /* সাউন্ড না হলেও কল চলবে */ }
    if (pattern === 'in' && navigator.vibrate) {
      try { navigator.vibrate([600, 400, 600, 400, 600, 400, 600]); } catch (e) {}
    }
  }
  function stopRing() {
    if (ringAudio) { ringAudio.stop(); ringAudio = null; }
    if (navigator.vibrate) { try { navigator.vibrate(0); } catch (e) {} }
  }

  // ---------- UI তৈরি (একবার, লুকানো অবস্থায়) ----------
  var ui = {};
  function buildUI() {
    if ($('tcallRoot')) { return; }
    var style = document.createElement('style');
    style.textContent = [
      '.tcall-root{position:fixed;inset:0;z-index:99999;display:none;font-family:inherit;}',
      '.tcall-root.show{display:block;}',
      '.tcall-bg{position:absolute;inset:0;background:linear-gradient(160deg,#0A3D24,#0E6B3A 60%,#084F2A);}',
      '.tcall-panel{position:relative;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:space-between;color:#fff;padding:40px 20px 32px;box-sizing:border-box;}',
      '.tcall-top{text-align:center;margin-top:20px;}',
      '.tcall-sub{opacity:.85;font-size:14px;margin:6px 0 0;}',
      '.tcall-name{font-size:22px;font-weight:700;margin:14px 0 0;}',
      '.tcall-avatar{width:112px;height:112px;border-radius:50%;overflow:hidden;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:700;margin:0 auto;flex:none;}',
      '.tcall-avatar img{width:100%;height:100%;object-fit:cover;}',
      '.tcall-mid{flex:1;display:flex;align-items:center;justify-content:center;width:100%;}',
      '.tcall-videos{position:absolute;inset:0;background:#000;display:none;}',
      '.tcall-videos.on{display:block;}',
      '.tcall-remote-v{width:100%;height:100%;object-fit:cover;}',
      '.tcall-local-v{position:absolute;width:96px;height:140px;right:14px;top:14px;border-radius:12px;object-fit:cover;border:2px solid rgba(255,255,255,.5);background:#111;}',
      '.tcall-actions{display:flex;gap:28px;align-items:center;justify-content:center;}',
      '.tcall-btn{width:60px;height:60px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;color:#fff;background:rgba(255,255,255,.2);}',
      '.tcall-btn.active{background:#fff;color:#0E6B3A;}',
      '.tcall-btn-accept{background:#22c55e;width:68px;height:68px;font-size:26px;}',
      '.tcall-btn-reject,.tcall-btn-end{background:#e5484d;width:68px;height:68px;font-size:26px;}',
      '.tcall-row{display:flex;gap:36px;align-items:center;justify-content:center;margin-bottom:8px;}',
      '.tcall-label{font-size:12px;text-align:center;opacity:.85;margin-top:4px;}',
      '.tcall-timer{font-size:15px;opacity:.9;margin-top:6px;}'
    ].join('\n');
    document.head.appendChild(style);

    var root = document.createElement('div');
    root.className = 'tcall-root'; root.id = 'tcallRoot';
    root.innerHTML =
      '<div class="tcall-bg"></div>' +
      '<div class="tcall-videos" id="tcallVideos">' +
        '<video class="tcall-remote-v" id="tcallRemoteV" autoplay playsinline></video>' +
        '<video class="tcall-local-v" id="tcallLocalV" autoplay playsinline muted></video>' +
      '</div>' +
      '<div class="tcall-panel">' +
        '<div class="tcall-top">' +
          '<div class="tcall-sub" id="tcallStatus"></div>' +
          '<div class="tcall-avatar" id="tcallAvatarWrap"></div>' +
          '<div class="tcall-name" id="tcallName"></div>' +
          '<div class="tcall-timer" id="tcallTimer" hidden></div>' +
        '</div>' +
        '<div class="tcall-mid"></div>' +
        '<div class="tcall-bottom" style="width:100%;">' +
          '<div class="tcall-row" id="tcallMidRow" hidden>' +
            '<div><button type="button" class="tcall-btn" id="tcallMute"><i class="fa-solid fa-microphone" aria-hidden="true"></i></button><div class="tcall-label">মিউট</div></div>' +
            '<div id="tcallCamWrap" hidden><button type="button" class="tcall-btn" id="tcallCam"><i class="fa-solid fa-video" aria-hidden="true"></i></button><div class="tcall-label">ক্যামেরা</div></div>' +
            '<div id="tcallFlipWrap" hidden><button type="button" class="tcall-btn" id="tcallFlip"><i class="fa-solid fa-camera-rotate" aria-hidden="true"></i></button><div class="tcall-label">ঘোরান</div></div>' +
            '<div><button type="button" class="tcall-btn" id="tcallSpeaker"><i class="fa-solid fa-volume-high" aria-hidden="true"></i></button><div class="tcall-label">স্পিকার</div></div>' +
          '</div>' +
          '<div class="tcall-actions" id="tcallActions"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);

    ui = {
      root: root, videos: $('tcallVideos'), remoteV: $('tcallRemoteV'), localV: $('tcallLocalV'),
      status: $('tcallStatus'), avatarWrap: $('tcallAvatarWrap'), name: $('tcallName'), timer: $('tcallTimer'),
      midRow: $('tcallMidRow'), mute: $('tcallMute'), cam: $('tcallCam'), camWrap: $('tcallCamWrap'),
      flip: $('tcallFlip'), flipWrap: $('tcallFlipWrap'), speaker: $('tcallSpeaker'), actions: $('tcallActions')
    };

    ui.mute.addEventListener('click', toggleMute);
    ui.cam.addEventListener('click', toggleCam);
    ui.flip.addEventListener('click', flipCam);
    ui.speaker.addEventListener('click', toggleSpeaker);
  }

  function setAvatar(name, url) {
    ui.avatarWrap.innerHTML = '';
    ui.avatarWrap.appendChild(avatarNode(name, url));
  }
  function showRoot(show) { buildUI(); ui.root.classList.toggle('show', !!show); }

  function renderActions(kind) {
    if (kind === 'incoming') {
      ui.actions.innerHTML =
        '<div><button type="button" class="tcall-btn tcall-btn-reject" id="tcallRejectBtn"><i class="fa-solid fa-phone-slash" aria-hidden="true"></i></button><div class="tcall-label">প্রত্যাখ্যান</div></div>' +
        '<div><button type="button" class="tcall-btn tcall-btn-accept" id="tcallAcceptBtn"><i class="fa-solid fa-phone" aria-hidden="true"></i></button><div class="tcall-label">গ্রহণ</div></div>';
      $('tcallRejectBtn').addEventListener('click', function () { respondIncoming('rejected'); });
      $('tcallAcceptBtn').addEventListener('click', function () { respondIncoming('accepted'); });
    } else if (kind === 'outgoing') {
      ui.actions.innerHTML = '<div><button type="button" class="tcall-btn tcall-btn-end" id="tcallCancelBtn"><i class="fa-solid fa-phone-slash" aria-hidden="true"></i></button><div class="tcall-label">বাতিল</div></div>';
      $('tcallCancelBtn').addEventListener('click', cancelOutgoing);
    } else if (kind === 'active') {
      ui.actions.innerHTML = '<div><button type="button" class="tcall-btn tcall-btn-end" id="tcallEndBtn"><i class="fa-solid fa-phone-slash" aria-hidden="true"></i></button><div class="tcall-label">শেষ</div></div>';
      $('tcallEndBtn').addEventListener('click', function () { endCall('ended'); });
    }
  }

  // ---------- calls টেবিল হেল্পার ----------
  function insertCallRow(id, calleeId, type) {
    return client.from('calls').insert({ id: id, caller_id: me, callee_id: calleeId, call_type: type, status: 'ringing' });
  }
  function updateCallRow(id, patch) {
    return client.from('calls').update(patch).eq('id', id);
  }

  // ---------- ব্যক্তিগত চ্যানেল (সবসময়) ----------
  function joinMyChannel() {
    if (myChannel || !me) { return; }
    myChannel = client.channel('call-user-' + me, { config: { broadcast: { self: false } } });
    myChannel.on('broadcast', { event: 'signal' }, function (msg) {
      var p = msg.payload || {};
      if (p.kind === 'incoming') { onIncoming(p); }
      else if (p.kind === 'response') { onCallerResponse(p); }
      else if (p.kind === 'cancel') { onCancelled(p); }
    }).subscribe();
  }
  function leaveMyChannel() {
    if (myChannel) { client.removeChannel(myChannel); myChannel = null; }
  }
  function sendToUser(uid, payload) {
    var ch = client.channel('call-user-' + uid, { config: { broadcast: { self: false } } });
    ch.subscribe(function (status) {
      if (status === 'SUBSCRIBED') {
        ch.send({ type: 'broadcast', event: 'signal', payload: payload }).then(function () {
          setTimeout(function () { client.removeChannel(ch); }, 500);
        });
      }
    });
  }

  // ---------- ইনকামিং কল ----------
  function onIncoming(p) {
    if (state !== 'idle') {
      // ব্যস্ত — সাথে সাথে জানিয়ে দাও
      sendToUser(p.caller_id, { kind: 'response', call_id: p.call_id, response: 'busy' });
      return;
    }
    state = 'incoming';
    call = { id: p.call_id, otherId: p.caller_id, otherUsername: p.caller_username, otherName: p.caller_name, otherAvatar: p.caller_avatar, type: p.call_type, role: 'callee' };
    showRoot(true);
    ui.videos.classList.remove('on');
    ui.midRow.hidden = true;
    ui.timer.hidden = true;
    setAvatar(call.otherName, call.otherAvatar);
    ui.name.textContent = call.otherName || ('@' + call.otherUsername);
    ui.status.textContent = (call.type === 'video' ? 'ভিডিও কল আসছে…' : 'ভয়েস কল আসছে…');
    renderActions('incoming');
    startRing('in');
    ringTimer = setTimeout(function () {
      if (state === 'incoming' && call && call.id === p.call_id) {
        updateCallRow(call.id, { status: 'missed' }).then(function () { refreshMissedBadge(); });
        closeUI();
      }
    }, RING_TIMEOUT_MS);
  }

  function respondIncoming(response) {
    if (!call) { return; }
    clearTimeout(ringTimer);
    stopRing();
    var cid = call.id, callerId = call.otherId;
    if (response === 'rejected') {
      updateCallRow(cid, { status: 'rejected' }).then(function () {});
      sendToUser(callerId, { kind: 'response', call_id: cid, response: 'rejected' });
      closeUI();
      return;
    }
    // accepted
    updateCallRow(cid, { status: 'accepted', answered_at: new Date().toISOString() }).then(function () {});
    state = 'active';
    ui.status.textContent = 'সংযোগ হচ্ছে…';
    renderActions('active');
    joinSignalChannel(cid, function () {
      sendToUser(callerId, { kind: 'response', call_id: cid, response: 'accepted' });
      startMedia(call.type).then(function () {
        // অফার আসার অপেক্ষা (caller পাঠাবে)
      }).catch(mediaFailAbort);
    });
  }

  // মিসড কল হলে বেলের ব্যাজ নতুন করে আনার সংকেত (কলারের calls-সারি আপডেট হওয়ার জন্য ১ সেকেন্ড অপেক্ষা)
  function refreshMissedBadge() {
    setTimeout(function () { try { window.dispatchEvent(new CustomEvent('tangail:missed-calls-refresh')); } catch (e) { /* কিছু না */ } }, 1000);
  }

  function onCancelled(p) {
    if (call && call.id === p.call_id && (state === 'incoming' || state === 'outgoing')) {
      var wasIncoming = (state === 'incoming');
      stopRing(); closeUI();
      if (wasIncoming) { refreshMissedBadge(); }
    }
  }

  // ---------- আউটগোয়িং কল ----------
  function startCall(otherId, otherUsername, otherName, otherAvatar, type) {
    if (state !== 'idle') { alert('আপনি ইতিমধ্যে একটি কলে আছেন।'); return; }
    if (!me) { return; }
    var cid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() :
      ('c-' + Date.now() + '-' + Math.random().toString(16).slice(2));
    call = { id: cid, otherId: otherId, otherUsername: otherUsername, otherName: otherName, otherAvatar: otherAvatar, type: type, role: 'caller' };
    insertCallRow(cid, otherId, type).then(function (r) {
      if (r.error) {
        var msg = String((r.error && r.error.message) || '');
        if (/^rate_limited:/i.test(msg)) { alert(msg.replace(/^rate_limited:\s*/i, '')); }
        else { alert('কল করা যাচ্ছে না — শুধু পরস্পর ফ্রেন্ড (accepted) থাকলে কল করা যায়।'); }
        call = null; return;
      }
      state = 'outgoing';
      showRoot(true);
      ui.videos.classList.remove('on');
      ui.midRow.hidden = true;
      ui.timer.hidden = true;
      setAvatar(otherName, otherAvatar);
      ui.name.textContent = otherName || ('@' + otherUsername);
      ui.status.textContent = (type === 'video' ? 'ভিডিও কল হচ্ছে…' : 'ভয়েস কল হচ্ছে…');
      renderActions('outgoing');
      startRing('out');
      sendToUser(otherId, {
        kind: 'incoming', call_id: cid, caller_id: me,
        caller_username: window.TCALL_ME_USERNAME || '', caller_name: window.TCALL_ME_NAME || '',
        caller_avatar: window.TCALL_ME_AVATAR || '', call_type: type
      });
      ringTimer = setTimeout(function () {
        if (state === 'outgoing' && call && call.id === cid) {
          updateCallRow(cid, { status: 'missed' }).then(function () {});
          sendToUser(otherId, { kind: 'cancel', call_id: cid });
          stopRing(); closeUI();
        }
      }, RING_TIMEOUT_MS);
    });
  }

  function cancelOutgoing() {
    if (!call) { return; }
    clearTimeout(ringTimer); stopRing();
    updateCallRow(call.id, { status: 'cancelled' }).then(function () {});
    sendToUser(call.otherId, { kind: 'cancel', call_id: call.id });
    closeUI();
  }

  function onCallerResponse(p) {
    if (!call || call.id !== p.call_id || state !== 'outgoing') { return; }
    clearTimeout(ringTimer); stopRing();
    if (p.response === 'rejected') { closeUI(); return; }
    if (p.response === 'busy') { ui.status.textContent = 'ব্যস্ত আছেন'; setTimeout(closeUI, 1500); return; }
    if (p.response === 'accepted') {
      state = 'active';
      ui.status.textContent = 'সংযোগ হচ্ছে…';
      renderActions('active');
      var cid = call.id, otherId = call.otherId, type = call.type;
      joinSignalChannel(cid, function () {
        startMedia(type).then(function () { makeOffer(); }).catch(mediaFailAbort);
      });
    }
  }

  function mediaFailAbort() {
    alert('মাইক্রোফোন/ক্যামেরা পাওয়া যায়নি — অনুমতি আছে কিনা দেখুন।');
    endCall('ended');
  }

  // ---------- সিগন্যাল চ্যানেল (per-call, শুধু accept-এর পর) ----------
  function joinSignalChannel(cid, onReady) {
    signalChannel = client.channel('call-signal-' + cid, { config: { broadcast: { self: false } } });
    signalChannel.on('broadcast', { event: 'sig' }, function (msg) { onSignal(msg.payload || {}); })
      .subscribe(function (status) {
        if (status === 'SUBSCRIBED') { onReady && onReady(); }
      });
  }
  function sendSignal(payload) {
    if (signalChannel) { signalChannel.send({ type: 'broadcast', event: 'sig', payload: payload }); }
  }
  function leaveSignalChannel() {
    if (signalChannel) { client.removeChannel(signalChannel); signalChannel = null; }
  }

  function onSignal(p) {
    if (!pc && p.kind === 'offer') {
      // callee পাশে pc তৈরি হয়ে থাকার কথা startMedia-এর সময়; এখনো না হলে অপেক্ষা
      pendingIce._offer = p; return;
    }
    if (!pc) { return; }
    if (p.kind === 'offer') {
      pc.setRemoteDescription(new RTCSessionDescription(p.sdp)).then(drainIce).then(function () {
        return pc.createAnswer();
      }).then(function (ans) { return pc.setLocalDescription(ans); }).then(function () {
        sendSignal({ kind: 'answer', sdp: pc.localDescription });
      });
    } else if (p.kind === 'answer') {
      pc.setRemoteDescription(new RTCSessionDescription(p.sdp)).then(drainIce);
    } else if (p.kind === 'ice') {
      if (pc.remoteDescription && pc.remoteDescription.type) {
        pc.addIceCandidate(new RTCIceCandidate(p.candidate)).catch(function () {});
      } else {
        pendingIce.push(p.candidate);
      }
    } else if (p.kind === 'hangup') {
      endCall('ended', true);
    }
  }
  function drainIce() {
    pendingIce.forEach(function (c) { pc.addIceCandidate(new RTCIceCandidate(c)).catch(function () {}); });
    pendingIce = [];
  }

  // ---------- WebRTC ----------
  function startMedia(type) {
    var constraints = { audio: true, video: type === 'video' ? { facingMode: facingMode } : false };
    return navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
      localStream = stream;
      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      stream.getTracks().forEach(function (t) { pc.addTrack(t, stream); });
      pc.ontrack = function (ev) {
        if (!remoteStream) { remoteStream = new MediaStream(); ui.remoteV.srcObject = remoteStream; }
        remoteStream.addTrack(ev.track);
      };
      pc.onicecandidate = function (ev) {
        if (ev.candidate) { sendSignal({ kind: 'ice', candidate: ev.candidate }); }
      };
      pc.onconnectionstatechange = function () {
        if (pc && (pc.connectionState === 'connected')) { onConnected(); }
        if (pc && (pc.connectionState === 'failed' || pc.connectionState === 'disconnected')) {
          if (state === 'active' && callStartTs) { /* ক্ষণস্থায়ী ড্রপ হতে পারে, সাথে সাথে বন্ধ না করে ধরে রাখা */ }
        }
      };
      if (type === 'video') {
        ui.videos.classList.add('on');
        ui.localV.srcObject = stream;
        ui.camWrap.hidden = false; ui.flipWrap.hidden = false;
      } else {
        ui.videos.classList.remove('on');
        ui.camWrap.hidden = true; ui.flipWrap.hidden = true;
      }
      ui.midRow.hidden = false;
      // pending offer এসে থাকলে (রেস কন্ডিশন) এখনই প্রসেস করো
      if (pendingIce._offer) { var off = pendingIce._offer; pendingIce._offer = null; onSignal(off); }
    });
  }
  function makeOffer() {
    pc.createOffer().then(function (off) { return pc.setLocalDescription(off); }).then(function () {
      sendSignal({ kind: 'offer', sdp: pc.localDescription });
    });
  }
  function onConnected() {
    if (callStartTs) { return; }
    callStartTs = Date.now();
    ui.status.textContent = '';
    ui.timer.hidden = false;
    callTimerInt = setInterval(function () {
      ui.timer.textContent = fmtDur((Date.now() - callStartTs) / 1000);
    }, 1000);
  }

  // ---------- কল শেষ ----------
  function endCall(finalStatus, remoteInitiated) {
    if (!call) { closeUI(); return; }
    var cid = call.id;
    if (!remoteInitiated) { sendSignal({ kind: 'hangup' }); }
    var patch = { status: finalStatus || 'ended', ended_at: new Date().toISOString() };
    if (callStartTs) { patch.duration_seconds = Math.round((Date.now() - callStartTs) / 1000); }
    updateCallRow(cid, patch).then(function () {});
    closeUI();
  }

  function closeUI() {
    clearTimeout(ringTimer); stopRing();
    if (callTimerInt) { clearInterval(callTimerInt); callTimerInt = null; }
    callStartTs = null;
    if (pc) { try { pc.close(); } catch (e) {} pc = null; }
    if (localStream) { localStream.getTracks().forEach(function (t) { t.stop(); }); localStream = null; }
    remoteStream = null;
    leaveSignalChannel();
    pendingIce = [];
    state = 'idle'; call = null;
    showRoot(false);
  }

  // ---------- কন্ট্রোল বাটন ----------
  var muted = false, camOff = false;
  function toggleMute() {
    if (!localStream) { return; }
    muted = !muted;
    localStream.getAudioTracks().forEach(function (t) { t.enabled = !muted; });
    ui.mute.classList.toggle('active', muted);
    ui.mute.innerHTML = '<i class="fa-solid fa-microphone' + (muted ? '-slash' : '') + '" aria-hidden="true"></i>';
  }
  function toggleCam() {
    if (!localStream) { return; }
    camOff = !camOff;
    localStream.getVideoTracks().forEach(function (t) { t.enabled = !camOff; });
    ui.cam.classList.toggle('active', camOff);
    ui.cam.innerHTML = '<i class="fa-solid fa-video' + (camOff ? '-slash' : '') + '" aria-hidden="true"></i>';
  }
  function flipCam() {
    if (!localStream || !call || call.type !== 'video') { return; }
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } }).then(function (s) {
      var newTrack = s.getVideoTracks()[0];
      var sender = pc.getSenders().find(function (sd) { return sd.track && sd.track.kind === 'video'; });
      if (sender) { sender.replaceTrack(newTrack); }
      var old = localStream.getVideoTracks()[0];
      localStream.removeTrack(old); old.stop();
      localStream.addTrack(newTrack);
      ui.localV.srcObject = localStream;
    }).catch(function () {});
  }
  function toggleSpeaker() {
    // setSinkId কিছু Android Chrome-এ কাজ করে; iOS Safari-তে সমর্থন নেই — নীরবে উপেক্ষা
    var el = ui.remoteV;
    if (el.setSinkId) {
      var want = ui.speaker.classList.contains('active') ? 'default' : 'speaker';
      el.setSinkId(want === 'speaker' ? '' : '').catch(function () {});
    }
    ui.speaker.classList.toggle('active');
  }

  // ---------- ইনিশিয়ালাইজ (সেশন থাকলেই ব্যক্তিগত চ্যানেলে জয়েন) ----------
  function boot(session) {
    var user = session && session.user;
    if (!user) { leaveMyChannel(); me = null; return; }
    me = user.id;
    window.TCALL_ME_NAME = (user.user_metadata && user.user_metadata.full_name) || '';
    window.TCALL_ME_AVATAR = (user.user_metadata && user.user_metadata.avatar_url) || '';
    client.from('profiles').select('username, full_name, avatar_url').eq('id', me).maybeSingle().then(function (r) {
      if (r.data) {
        window.TCALL_ME_USERNAME = r.data.username || '';
        window.TCALL_ME_NAME = r.data.full_name || window.TCALL_ME_NAME;
        window.TCALL_ME_AVATAR = r.data.avatar_url || window.TCALL_ME_AVATAR;
      }
    });
    joinMyChannel();
  }
  client.auth.getSession().then(function (r) { boot(r.data && r.data.session); });
  client.auth.onAuthStateChange(function (event, session) { boot(session); });

  // ---------- বাইরে থেকে ব্যবহারের API ----------
  window.TangailCall = {
    start: function (otherId, otherUsername, otherName, otherAvatar, type) {
      startCall(otherId, otherUsername, otherName, otherAvatar, type === 'video' ? 'video' : 'voice');
    },
    isBusy: function () { return state !== 'idle'; }
  };
})();
