// টাঙ্গাইল জেলা — হাসপাতাল কার্ডের ছবি ও উপরের ব্যানারের ছবিতে ক্লিক করলে পুরো ছবি (লাইটবক্স) + জুম ইন/আউট
// - দুই আঙুলে চিমটি কেটে জুম ইন/আউট, জুম করা অবস্থায় এক আঙুলে ছবি সরানো (pan)
// - ডাবল-ট্যাপ করলে জুম ইন, আবার ডাবল-ট্যাপ করলে আগের অবস্থায়
// - + / − / রিসেট বাটন, ডেস্কটপে মাউস হুইল ও কিবোর্ড (+ − 0 Esc)
// - বন্ধ করা: ✕ বাটন, Esc, ছবির বাইরে ট্যাপ, বা ফোনের Back বাটন
// - আরও ছবি থাকলে (কার্ডের ছবির data-extra): ডানে-বামে সোয়াইপ / ◀ ▶ বাটন / নিচের থাম্বনেইল / কিবোর্ডের ← → দিয়ে সবগুলো দেখা
(function () {
  var MIN = 1, MAX = 5, DBL_ZOOM = 2.5, STEP = 1.4;

  var root, stage, img, titleEl, zoomLabel, linkEl, countEl, thumbsEl, prevBtn, nextBtn, hintEl;
  var list = [];                // গ্যালারির ছবি: [প্রধান, ...আরও]
  var idx = 0;
  var scale = 1, tx = 0, ty = 0;
  var pointers = {};            // pointerId -> {x, y}
  var pinch = null;             // {dist, scale}
  var lastMid = null;
  var lastTap = { t: 0, x: 0, y: 0 };
  var moved = false;
  var opener = null;
  var pushedState = false;

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  function build() {
    if (root) return;
    root = document.createElement('div');
    root.className = 'hp-lb';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'ছবি দেখুন');
    root.hidden = true;
    root.innerHTML =
      '<div class="hp-lb-bar">' +
        '<span class="hp-lb-title" id="hpLbTitle"></span>' +
        '<span class="hp-lb-count" id="hpLbCount" hidden></span>' +
        '<a class="hp-lb-link" id="hpLbLink" href="#" hidden></a>' +
        '<button type="button" class="hp-lb-btn hp-lb-close" data-lb="close" aria-label="বন্ধ করুন"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
      '</div>' +
      '<div class="hp-lb-stage" id="hpLbStage">' +
        '<img class="hp-lb-img" id="hpLbImg" alt="" draggable="false">' +
        '<button type="button" class="hp-lb-nav hp-lb-prev" data-lb="prev" aria-label="আগের ছবি" hidden><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>' +
        '<button type="button" class="hp-lb-nav hp-lb-next" data-lb="next" aria-label="পরের ছবি" hidden><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>' +
      '</div>' +
      '<div class="hp-lb-thumbs" id="hpLbThumbs" hidden></div>' +
      '<div class="hp-lb-controls">' +
        '<button type="button" class="hp-lb-btn" data-lb="out" aria-label="জুম আউট"><i class="fa-solid fa-minus" aria-hidden="true"></i></button>' +
        '<button type="button" class="hp-lb-zoom" data-lb="reset" aria-label="আসল সাইজে ফিরুন" id="hpLbZoom">১০০%</button>' +
        '<button type="button" class="hp-lb-btn" data-lb="in" aria-label="জুম ইন"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>' +
      '</div>' +
      '<p class="hp-lb-hint" id="hpLbHint">দুই আঙুলে চিমটি কেটে বা ডাবল-ট্যাপ করে জুম করুন</p>';
    document.body.appendChild(root);

    stage = root.querySelector('#hpLbStage');
    img = root.querySelector('#hpLbImg');
    titleEl = root.querySelector('#hpLbTitle');
    zoomLabel = root.querySelector('#hpLbZoom');
    linkEl = root.querySelector('#hpLbLink');
    countEl = root.querySelector('#hpLbCount');
    thumbsEl = root.querySelector('#hpLbThumbs');
    prevBtn = root.querySelector('.hp-lb-prev');
    nextBtn = root.querySelector('.hp-lb-next');
    hintEl = root.querySelector('#hpLbHint');

    root.addEventListener('click', onRootClick);
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    stage.addEventListener('wheel', onWheel, { passive: false });
    img.addEventListener('dragstart', function (e) { e.preventDefault(); });
    img.addEventListener('load', function () { root.classList.add('is-loaded'); reset(); });
    img.addEventListener('error', function () { root.classList.add('is-loaded'); });
    window.addEventListener('resize', function () { if (!root.hidden) { clampPan(); apply(); } });
  }

  var BN = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  function toBn(n) { return String(n).replace(/[0-9]/g, function (d) { return BN[+d]; }); }

  // ---------- গ্যালারি (আরও ছবি) ----------
  var HINT_ONE = 'দুই আঙুলে চিমটি কেটে বা ডাবল-ট্যাপ করে জুম করুন';
  var HINT_MANY = 'ডানে-বামে সোয়াইপ করে অন্য ছবি দেখুন · দুই আঙুলে জুম করুন';

  function syncGallery() {
    var many = list.length > 1;
    countEl.hidden = !many;
    prevBtn.hidden = !many;
    nextBtn.hidden = !many;
    thumbsEl.hidden = !many;
    hintEl.textContent = many ? HINT_MANY : HINT_ONE;
    if (!many) { thumbsEl.innerHTML = ''; return; }
    countEl.textContent = toBn(idx + 1) + '/' + toBn(list.length);
    var btns = thumbsEl.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var on = i === idx;
      btns[i].classList.toggle('is-active', on);
      btns[i].setAttribute('aria-current', on ? 'true' : 'false');
      if (on && btns[i].scrollIntoView) { try { btns[i].scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (err) {} }
    }
  }

  function buildThumbs() {
    if (list.length < 2) { thumbsEl.innerHTML = ''; return; }
    thumbsEl.innerHTML = list.map(function (u, i) {
      return '<button type="button" data-lb="go" data-i="' + i + '" aria-label="ছবি ' + toBn(i + 1) + '"><img src="' + u.replace(/"/g, '&quot;') + '" alt="" loading="lazy" draggable="false"></button>';
    }).join('');
  }

  function preload(i) {
    if (i < 0 || i >= list.length) return;
    var im = new Image();
    im.src = list[i];
  }

  function go(n) {
    if (list.length < 2) return;
    n = (n + list.length) % list.length;
    if (n === idx) return;
    idx = n;
    root.classList.remove('is-loaded');
    reset();
    img.src = list[idx];
    syncGallery();
    preload(idx + 1); preload(idx - 1);
  }

  function apply() {
    img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    root.classList.toggle('is-zoomed', scale > 1.001);
    zoomLabel.textContent = toBn(Math.round(scale * 100)) + '%';
  }

  // ছবি যতটুকু স্ক্রিনের বাইরে যেতে পারে তার সীমা
  function clampPan() {
    var w = img.clientWidth * scale, h = img.clientHeight * scale;
    var maxX = Math.max(0, (w - stage.clientWidth) / 2);
    var maxY = Math.max(0, (h - stage.clientHeight) / 2);
    tx = clamp(tx, -maxX, maxX);
    ty = clamp(ty, -maxY, maxY);
  }

  function reset() { scale = 1; tx = 0; ty = 0; apply(); }

  // clientX/clientY বিন্দুটি স্থির রেখে জুম করা
  function zoomAt(newScale, cx, cy) {
    newScale = clamp(newScale, MIN, MAX);
    var r = stage.getBoundingClientRect();
    var ox = cx - (r.left + r.width / 2);
    var oy = cy - (r.top + r.height / 2);
    var px = (ox - tx) / scale;
    var py = (oy - ty) / scale;
    scale = newScale;
    tx = ox - px * scale;
    ty = oy - py * scale;
    if (scale <= 1.001) { scale = 1; tx = 0; ty = 0; }
    clampPan();
    apply();
  }

  function zoomCenter(factor) {
    var r = stage.getBoundingClientRect();
    zoomAt(scale * factor, r.left + r.width / 2, r.top + r.height / 2);
  }

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  function ids() { return Object.keys(pointers); }

  function onDown(e) {
    if (e.target.closest && e.target.closest('button')) return;
    stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY };
    if (ids().length === 1) moved = false;
    if (ids().length === 2) {
      var p = ids().map(function (k) { return pointers[k]; });
      pinch = { dist: dist(p[0], p[1]), scale: scale };
      lastMid = mid(p[0], p[1]);
      moved = true;
    }
    root.classList.add('is-dragging');
  }

  function onMove(e) {
    var p = pointers[e.pointerId];
    if (!p) return;
    var prevX = p.x, prevY = p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (Math.hypot(p.x - p.sx, p.y - p.sy) > 8) moved = true;

    var keys = ids();
    if (keys.length === 2 && pinch) {
      var a = pointers[keys[0]], b = pointers[keys[1]];
      var m = mid(a, b);
      // চিমটির মাঝখানের নড়াচড়া অনুযায়ী সরানো, তারপর ওই বিন্দু ধরে জুম
      tx += m.x - lastMid.x;
      ty += m.y - lastMid.y;
      lastMid = m;
      zoomAt(pinch.scale * (dist(a, b) / pinch.dist), m.x, m.y);
    } else if (keys.length === 1 && scale > 1) {
      tx += p.x - prevX;
      ty += p.y - prevY;
      clampPan();
      apply();
    }
  }

  function onUp(e) {
    var p = pointers[e.pointerId];
    if (!p) return;
    var wasSingle = ids().length === 1;
    delete pointers[e.pointerId];
    pinch = null;
    if (ids().length === 1) {
      // চিমটি শেষ: বাকি আঙুলে pan চালিয়ে যাওয়া
      var rest = pointers[ids()[0]];
      rest.sx = rest.x; rest.sy = rest.y;
    }
    if (ids().length === 0) root.classList.remove('is-dragging');

    // জুম করা না থাকলে ডানে-বামে সোয়াইপ = আগের/পরের ছবি
    if (wasSingle && e.type === 'pointerup' && list.length > 1 && scale <= 1.001) {
      var dx = e.clientX - p.sx, dy = e.clientY - p.sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { go(dx < 0 ? idx + 1 : idx - 1); return; }
    }

    if (wasSingle && !moved && e.type === 'pointerup') {
      var now = Date.now();
      var isDouble = now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30;
      if (isDouble) {
        lastTap.t = 0;
        if (scale > 1.001) reset(); else zoomAt(DBL_ZOOM, e.clientX, e.clientY);
      } else {
        lastTap = { t: now, x: e.clientX, y: e.clientY };
        // ছবির বাইরের কালো অংশে ট্যাপ করলে বন্ধ (জুম করা না থাকলে)
        var ir = img.getBoundingClientRect();
        var outside = e.clientX < ir.left || e.clientX > ir.right || e.clientY < ir.top || e.clientY > ir.bottom;
        if (outside && scale <= 1.001) {
          var t = lastTap.t;
          setTimeout(function () { if (lastTap.t === t && !root.hidden) close(); }, 330);
        }
      }
    }
  }

  function onWheel(e) {
    e.preventDefault();
    var f = Math.exp(-e.deltaY * 0.0016);
    zoomAt(scale * f, e.clientX, e.clientY);
  }

  function onRootClick(e) {
    var b = e.target.closest ? e.target.closest('[data-lb]') : null;
    if (!b) return;
    var act = b.getAttribute('data-lb');
    if (act === 'close') close();
    else if (act === 'in') zoomCenter(STEP);
    else if (act === 'out') zoomCenter(1 / STEP);
    else if (act === 'reset') reset();
    else if (act === 'prev') go(idx - 1);
    else if (act === 'next') go(idx + 1);
    else if (act === 'go') go(parseInt(b.getAttribute('data-i'), 10) || 0);
  }

  function onKey(e) {
    if (!root || root.hidden) return;
    if (e.key === 'Escape') { close(); }
    else if (e.key === '+' || e.key === '=') { zoomCenter(STEP); }
    else if (e.key === '-' || e.key === '_') { zoomCenter(1 / STEP); }
    else if (e.key === '0') { reset(); }
    else if (e.key === 'ArrowLeft') { go(idx - 1); }
    else if (e.key === 'ArrowRight') { go(idx + 1); }
  }

  function open(src, title, fromEl, link, extras, start) {
    build();
    opener = fromEl || null;
    pointers = {}; pinch = null;
    root.classList.remove('is-loaded', 'is-dragging');
    titleEl.textContent = title || '';
    img.alt = title || '';
    if (link && link.href && /^(https?:|\/|[a-z0-9_.-]+\.html)/i.test(link.href)) {
      linkEl.href = link.href;
      linkEl.textContent = link.text || 'লিংকে যান';
      linkEl.hidden = false;
    } else {
      linkEl.hidden = true;
      linkEl.removeAttribute('href');
    }
    list = [src].concat(extras || []);
    idx = Math.max(0, Math.min(list.length - 1, start || 0));
    buildThumbs();
    syncGallery();
    reset();
    img.src = list[idx];
    root.hidden = false;
    preload(idx + 1); preload(idx - 1);
    document.documentElement.classList.add('hp-lb-open');
    // ফোনের Back বাটনে যেন শুধু লাইটবক্স বন্ধ হয়
    try { history.pushState({ hpLb: 1 }, ''); pushedState = true; } catch (err) { pushedState = false; }
    var c = root.querySelector('.hp-lb-close');
    if (c) c.focus();
  }

  function hide() {
    if (!root || root.hidden) return;
    root.hidden = true;
    img.removeAttribute('src');
    list = []; idx = 0;
    document.documentElement.classList.remove('hp-lb-open');
    if (opener && opener.focus) { try { opener.focus(); } catch (err) {} }
    opener = null;
  }

  function close() {
    if (!root || root.hidden) return;
    hide();
    if (pushedState) {
      pushedState = false;
      try { if (history.state && history.state.hpLb) history.back(); } catch (err) {}
    }
  }

  window.addEventListener('popstate', function () {
    if (root && !root.hidden) { pushedState = false; hide(); }
  });
  document.addEventListener('keydown', onKey);

  function cssUrl(v) {
    var m = /url\((['"]?)(.*?)\1\)\s*$/.exec(String(v || '').trim());
    return m ? m[2].replace(/\\"/g, '"') : '';
  }

  function triggerFrom(target) {
    if (!target || !target.closest) return null;
    // ০) বিস্তারিত পেজের ছবি/থাম্বনেইল — ক্লিক করা ছবি থেকেই গ্যালারি শুরু
    var ph = target.closest('.hp-dph');
    if (ph) {
      var g = ph.closest('[data-gallery]');
      var main = g && g.getAttribute('data-main');
      if (!main) return null;
      var ex = [];
      try { ex = JSON.parse(g.getAttribute('data-extra') || '[]'); } catch (err) { ex = []; }
      ex = (Array.isArray(ex) ? ex : []).filter(function (u) { return /^https?:\/\//i.test(u); }).slice(0, 4);
      return { el: ph, src: main, name: g.getAttribute('data-name') || '', extras: ex, start: parseInt(ph.getAttribute('data-i'), 10) || 0 };
    }
    // ১) কার্ডের ছবি
    var logo = target.closest('.hp-logo.has-img');
    if (logo) {
      var im = logo.querySelector('img');
      if (!im || !im.getAttribute('src')) return null;
      var card = logo.closest('.hp-card');
      var nameEl = card && card.querySelector('.hp-card-name');
      var extras = [];
      try { extras = JSON.parse(logo.getAttribute('data-extra') || '[]'); } catch (err) { extras = []; }
      extras = (Array.isArray(extras) ? extras : []).filter(function (u) { return /^https?:\/\//i.test(u); }).slice(0, 4);
      return { el: logo, src: im.currentSrc || im.src, name: nameEl ? nameEl.textContent : '', extras: extras };
    }
    // ২) উপরের ব্যানার স্লাইড
    var slide = target.closest('#catBannerTrack .banner-slide.has-image');
    if (slide) {
      var src = cssUrl(slide.style.getPropertyValue('--banner-img'));
      if (!src) return null;
      var h = slide.querySelector('.banner-inner h3');
      var btn = slide.querySelector('.banner-btn');
      var href = slide.tagName === 'A' ? slide.getAttribute('href') : '';
      return {
        el: slide, src: src, name: h ? h.textContent : '',
        link: href ? { href: href, text: btn ? btn.textContent : '' } : null
      };
    }
    return null;
  }

  document.addEventListener('click', function (e) {
    var t = triggerFrom(e.target);
    if (!t) return;
    e.preventDefault();
    open(t.src, t.name, t.el, t.link, t.extras, t.start);
  });

  // কিবোর্ডে Enter / Space দিয়েও খোলা যাবে
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var t = triggerFrom(e.target);
    if (!t || e.target !== t.el) return;
    e.preventDefault();
    open(t.src, t.name, t.el, t.link, t.extras, t.start);
  });

  // আঁকার পর ছবির বক্স/ব্যানারকে বাটনের মতো চিহ্নিত করা (কিবোর্ড/স্ক্রিন-রিডারের জন্য)
  function decorate() {
    var list = document.querySelectorAll('.hp-logo.has-img:not([data-lb-ready]), #catBannerTrack .banner-slide.has-image:not([data-lb-ready])');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      el.setAttribute('data-lb-ready', '1');
      if (el.tagName !== 'A') el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', el.getAttribute('data-extra') ? 'সব ছবি বড় করে দেখুন' : 'ছবি বড় করে দেখুন');
    }
  }
  decorate();
  ['hospitalGrid', 'catBannerTrack'].forEach(function (id) {
    var node = document.getElementById(id);
    if (node) new MutationObserver(decorate).observe(node, { childList: true, subtree: true });
  });
})();
