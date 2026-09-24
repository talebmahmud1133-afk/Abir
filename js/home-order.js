// টাঙ্গাইল জেলা — হোম পেজের ক্যাটাগরি নিজের মতো সাজানো (Binance-এর মতো)
// • "সাজান" বাটন (বা কোনো কার্ড ~০.৬ সেকেন্ড চেপে ধরলে) সাজানোর মোড চালু হয়।
// • কার্ড চেপে ধরে টেনে জায়গা বদলানো যায়; অথবা একটা কার্ড ট্যাপ করে আরেকটা কার্ডে ট্যাপ করলে ওই জায়গায় চলে যায়।
// • ক্রম ব্রাউজারে (localStorage: tz_home_order_v1) সংরক্ষিত থাকে; "রিসেট" দিলে আগের ক্রম ফিরে আসে।
// • নতুন ক্যাটাগরি যোগ হলে সেটা আপনার সাজানো তালিকার শেষে দেখাবে — কিছু ভাঙে না।
// index.html-এ #homeCatGrid সেকশনের ঠিক পরে যোগ করতে হবে (যাতে প্রথম রেন্ডারেই সাজানো ক্রম দেখা যায়)।
(function () {
  'use strict';
  var grid = document.getElementById('homeCatGrid');
  if (!grid) { return; }
  var LS_KEY = 'tz_home_order_v1';

  function isEn() { return (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0; }
  function T(bn, en) { return isEn() ? en : bn; }
  function cards() { return Array.prototype.filter.call(grid.children, function (c) { return c.classList && c.classList.contains('cat-card'); }); }
  function keyOf(card) {
    var h3 = card.querySelector('h3[data-i18n]');
    return (h3 && h3.getAttribute('data-i18n')) || card.getAttribute('href') || '';
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (html) { e.innerHTML = html; }
    return e;
  }

  // ---- সংরক্ষণ ----
  var defaultOrder = cards().map(keyOf);
  function readSaved() {
    try {
      var a = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      return Array.isArray(a) ? a : null;
    } catch (e) { return null; }
  }
  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(cards().map(keyOf))); } catch (e) { /* ignore */ }
  }
  function applyOrder(order) {
    var map = {};
    cards().forEach(function (c) { map[keyOf(c)] = c; });
    var frag = document.createDocumentFragment();
    var used = {};
    order.forEach(function (k) { if (map[k] && !used[k]) { frag.appendChild(map[k]); used[k] = true; } });
    cards().forEach(function (c) { if (!used[keyOf(c)]) { frag.appendChild(c); } });
    grid.appendChild(frag);
  }
  var saved = readSaved();
  if (saved) { applyOrder(saved); }

  // ---- উপরের বার ----
  var bar = el('div', 'tz-order-bar');
  var title = el('span', 'tz-order-title', '');
  var editBtn = el('button', 'tz-order-btn', '');
  editBtn.type = 'button';
  bar.appendChild(title);
  bar.appendChild(editBtn);
  grid.parentNode.insertBefore(bar, grid);

  var floatBar = el('div', 'tz-order-float');
  var resetBtn = el('button', 'tz-order-reset', '');
  var doneBtn = el('button', 'tz-order-done', '');
  resetBtn.type = 'button'; doneBtn.type = 'button';
  floatBar.appendChild(resetBtn);
  floatBar.appendChild(doneBtn);

  var editing = false;
  function paintBar() {
    if (editing) {
      title.textContent = T('টেনে সরান বা ট্যাপ করে জায়গা বদলান', 'Drag, or tap two cards to swap');
      title.classList.add('is-hint');
      editBtn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> ' + T('সম্পন্ন', 'Done');
    } else {
      title.textContent = T('ক্যাটাগরি', 'Categories');
      title.classList.remove('is-hint');
      editBtn.innerHTML = '<i class="fa-solid fa-arrows-up-down-left-right" aria-hidden="true"></i> ' + T('সাজান', 'Arrange');
    }
    resetBtn.innerHTML = '<i class="fa-solid fa-rotate-left" aria-hidden="true"></i> ' + T('রিসেট', 'Reset');
    doneBtn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> ' + T('সম্পন্ন', 'Done');
  }
  paintBar();
  document.addEventListener('tz:i18n-applied', paintBar);

  function setEditing(on) {
    editing = on;
    grid.classList.toggle('is-arranging', on);
    if (on) { document.body.appendChild(floatBar); }
    else { if (floatBar.parentNode) { floatBar.parentNode.removeChild(floatBar); } deselect(); persist(); }
    paintBar();
  }
  editBtn.addEventListener('click', function () { setEditing(!editing); });
  doneBtn.addEventListener('click', function () { setEditing(false); });

  // ---- FLIP অ্যানিমেশনসহ জায়গা বদল ----
  function flip(fn) {
    var list = cards();
    var first = list.map(function (c) { return c.getBoundingClientRect(); });
    fn();
    list.forEach(function (c, i) {
      var l = c.getBoundingClientRect();
      var dx = first[i].left - l.left, dy = first[i].top - l.top;
      if (dx || dy) {
        c.style.transition = 'none';
        c.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        void c.offsetWidth;
        c.style.transition = 'transform .2s ease';
        c.style.transform = '';
        setTimeout(function () { c.style.transition = ''; }, 260);
      }
    });
  }
  function place(card, target) {
    if (!card || !target || card === target) { return; }
    flip(function () {
      if (card.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING) {
        grid.insertBefore(card, target.nextSibling);
      } else {
        grid.insertBefore(card, target);
      }
    });
  }
  resetBtn.addEventListener('click', function () {
    try { localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ }
    flip(function () { applyOrder(defaultOrder); });
    deselect();
  });

  // ---- ট্যাপ করে বদল ----
  var sel = null;
  function deselect() { if (sel) { sel.classList.remove('tz-selected'); sel = null; } }
  function tap(card) {
    if (!sel) { sel = card; card.classList.add('tz-selected'); return; }
    if (sel === card) { deselect(); return; }
    place(sel, card);
    persist();
    deselect();
  }

  // ---- টেনে সরানো ----
  var cur = null, lpTimer = null, lpDown = null, suppressUntil = 0, lastSwap = 0, raf = 0;
  var lastX = 0, lastY = 0;

  function startDrag(c) {
    if (!cur || cur !== c || c.active) { return; }
    c.active = true;
    deselect();
    var r = c.card.getBoundingClientRect();
    var clone = c.card.cloneNode(true);
    clone.className = c.card.className + ' tz-drag-clone';
    clone.classList.remove('tz-selected');
    clone.style.width = r.width + 'px';
    clone.style.height = r.height + 'px';
    clone.style.left = r.left + 'px';
    clone.style.top = r.top + 'px';
    document.body.appendChild(clone);
    c.clone = clone;
    c.offX = lastX - r.left;
    c.offY = lastY - r.top;
    c.card.classList.add('tz-dragging');
    if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) { /* ignore */ } }
    loop();
  }
  function moveClone() {
    if (!cur || !cur.clone) { return; }
    cur.clone.style.left = (lastX - cur.offX) + 'px';
    cur.clone.style.top = (lastY - cur.offY) + 'px';
  }
  function hit() {
    if (!cur || !cur.active) { return; }
    var now = Date.now();
    if (now - lastSwap < 130) { return; }
    var t = document.elementFromPoint(lastX, lastY);
    var target = t && t.closest ? t.closest('.cat-card') : null;
    if (target && target !== cur.card && target.parentNode === grid) {
      place(cur.card, target);
      lastSwap = now;
    }
  }
  function loop() {
    cancelAnimationFrame(raf);
    (function step() {
      if (!cur || !cur.active) { return; }
      var stack = document.querySelector('.sticky-top-stack');
      var top = (stack ? stack.getBoundingClientRect().bottom : 0) + 40;
      var bottom = window.innerHeight - 150;
      if (lastY < top) { window.scrollBy(0, -10); hit(); }
      else if (lastY > bottom) { window.scrollBy(0, 10); hit(); }
      raf = requestAnimationFrame(step);
    })();
  }
  function endDrag() {
    cancelAnimationFrame(raf);
    if (cur) {
      if (cur.clone && cur.clone.parentNode) { cur.clone.parentNode.removeChild(cur.clone); }
      cur.card.classList.remove('tz-dragging');
    }
  }

  grid.addEventListener('pointerdown', function (e) {
    var card = e.target.closest ? e.target.closest('.cat-card') : null;
    if (!card || (e.pointerType === 'mouse' && e.button !== 0)) { return; }
    lastX = e.clientX; lastY = e.clientY;
    if (!editing) {
      // কার্ড দীর্ঘক্ষণ চেপে ধরলে সাজানোর মোড চালু
      lpDown = { x: e.clientX, y: e.clientY, id: e.pointerId };
      clearTimeout(lpTimer);
      lpTimer = setTimeout(function () {
        lpDown = null;
        suppressUntil = Date.now() + 700;
        setEditing(true);
        if (navigator.vibrate) { try { navigator.vibrate(20); } catch (er) { /* ignore */ } }
      }, 650);
      return;
    }
    cur = { card: card, id: e.pointerId, x0: e.clientX, y0: e.clientY, pt: e.pointerType, active: false, moved: false, timer: null };
    if (e.pointerType !== 'mouse') {
      var mine = cur;
      cur.timer = setTimeout(function () { startDrag(mine); }, 170);
    }
  });
  document.addEventListener('pointermove', function (e) {
    lastX = e.clientX; lastY = e.clientY;
    if (lpDown && e.pointerId === lpDown.id && Math.hypot(e.clientX - lpDown.x, e.clientY - lpDown.y) > 10) {
      clearTimeout(lpTimer); lpDown = null;
    }
    if (!cur || e.pointerId !== cur.id) { return; }
    if (!cur.active) {
      if (Math.hypot(e.clientX - cur.x0, e.clientY - cur.y0) > 10) {
        cur.moved = true;
        if (cur.pt === 'mouse') { startDrag(cur); }
        else { clearTimeout(cur.timer); } // আঙুল সরে গেছে = স্ক্রল
      }
      return;
    }
    moveClone();
    hit();
  });
  function finish(e, cancelled) {
    clearTimeout(lpTimer); lpDown = null;
    if (!cur || (e && e.pointerId !== cur.id)) { return; }
    clearTimeout(cur.timer);
    var c = cur;
    if (c.active) { endDrag(); persist(); }
    else if (!c.moved && !cancelled) { tap(c.card); }
    cur = null;
  }
  document.addEventListener('pointerup', function (e) { finish(e, false); });
  document.addEventListener('pointercancel', function (e) { finish(e, true); });
  // টেনে সরানোর সময় পেজ স্ক্রল বন্ধ রাখতে
  document.addEventListener('touchmove', function (e) {
    if (cur && cur.active && e.cancelable) { e.preventDefault(); }
  }, { passive: false });

  // সাজানোর মোডে (বা দীর্ঘ চাপের পর) কার্ডের লিংক খুলবে না
  grid.addEventListener('click', function (e) {
    if (editing || Date.now() < suppressUntil) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  grid.addEventListener('contextmenu', function (e) {
    if (editing || Date.now() < suppressUntil || lpDown) { e.preventDefault(); }
  });
  grid.addEventListener('dragstart', function (e) { if (editing) { e.preventDefault(); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && editing) { setEditing(false); } });
})();
