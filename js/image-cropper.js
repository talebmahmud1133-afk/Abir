// টাঙ্গাইল জেলা — ছবি জুম ইন/আউট ও টেনে বসানোর (crop) টুল
// ব্যবহার: TZCropper.open({ file | url, aspect, outWidth, shape, title }) → Promise<{ blob, dataUrl }>
//   • aspect   : ফ্রেমের চওড়া ÷ উচ্চতা (প্রোফাইল ছবি = 1, ব্যানার = 3 ইত্যাদি)
//   • outWidth : ফাইনাল ছবির চওড়া (px); উচ্চতা aspect থেকে নিজে বের হয়
//   • shape    : 'circle' (প্রোফাইল ছবি) বা 'rect' (ব্যানার)
//   • বাতিল করলে Promise reject হয় এমন Error দিয়ে যার cancelled === true
// টেনে সরানো, দুই আঙুলে পিঞ্চ, মাউস হুইল, স্লাইডার ও +/− বাটন — সব দিয়ে জুম করা যায়।
(function () {
  'use strict';

  var MAX_ZOOM = 5;
  var STYLE_ID = 'tz-cropper-style';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = '' +
      '.tzc-overlay{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:12px;font-family:"Hind Siliguri",sans-serif;}' +
      '.tzc-box{width:100%;max-width:480px;max-height:100%;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.35);display:flex;flex-direction:column;}' +
      '.tzc-head{padding:14px 16px 6px;font-weight:700;font-size:1.02rem;color:#1f2933;}' +
      '.tzc-hint{padding:0 16px 10px;font-size:.8rem;color:#6b7785;}' +
      '.tzc-stage{position:relative;margin:0 12px;background:#111;border-radius:12px;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab;}' +
      '.tzc-stage.is-drag{cursor:grabbing;}' +
      '.tzc-stage img{position:absolute;left:50%;top:50%;max-width:none;max-height:none;pointer-events:none;-webkit-user-drag:none;will-change:transform;}' +
      '.tzc-frame{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border:2px solid #fff;box-shadow:0 0 0 9999px rgba(0,0,0,.55);pointer-events:none;box-sizing:border-box;}' +
      '.tzc-frame.is-circle{border-radius:50%;}' +
      '.tzc-zoom{display:flex;align-items:center;gap:10px;padding:14px 16px 4px;}' +
      '.tzc-zbtn{flex:0 0 38px;width:38px;height:38px;border-radius:50%;border:1px solid #d9dee3;background:#fff;color:#1f2933;font-size:1.25rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;}' +
      '.tzc-zbtn:active{background:#eef2f5;}' +
      '.tzc-range{flex:1;min-width:0;accent-color:var(--maroon,#0E6B3A);height:32px;}' +
      '.tzc-zval{flex:0 0 44px;text-align:right;font-size:.82rem;color:#6b7785;}' +
      '.tzc-actions{display:flex;gap:10px;padding:12px 16px 16px;}' +
      '.tzc-actions button{flex:1;height:44px;border-radius:12px;font-family:inherit;font-size:.95rem;cursor:pointer;border:1px solid #d9dee3;background:#fff;color:#1f2933;}' +
      '.tzc-actions .tzc-ok{background:var(--maroon,#0E6B3A);border-color:var(--maroon,#0E6B3A);color:#fff;font-weight:600;}' +
      '.tzc-actions .tzc-reset{flex:0 0 auto;padding:0 14px;}' +
      '.tzc-actions button:disabled{opacity:.6;cursor:default;}' +
      '.tzc-err{padding:0 16px 12px;color:#c0392b;font-size:.85rem;}';
    document.head.appendChild(st);
  }

  function toBn(s) {
    return String(s).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'.charAt(d); });
  }

  function cancelError() {
    var e = new Error('cancel');
    e.cancelled = true;
    return e;
  }

  function loadImage(opts) {
    return new Promise(function (resolve, reject) {
      function fromObjectUrl(objUrl) {
        var img = new Image();
        img.onload = function () { resolve({ img: img, objUrl: objUrl }); };
        img.onerror = function () { URL.revokeObjectURL(objUrl); reject(new Error('ছবিটি খোলা যায়নি')); };
        img.src = objUrl;
      }
      if (opts.file) {
        fromObjectUrl(URL.createObjectURL(opts.file));
      } else if (opts.url) {
        fetch(opts.url, { mode: 'cors', cache: 'no-store' })
          .then(function (r) { if (!r.ok) throw new Error('http'); return r.blob(); })
          .then(function (b) { fromObjectUrl(URL.createObjectURL(b)); })
          .catch(function () { reject(new Error('বর্তমান ছবিটি লোড করা যায়নি')); });
      } else {
        reject(new Error('ছবি পাওয়া যায়নি'));
      }
    });
  }

  function open(opts) {
    opts = opts || {};
    injectStyle();

    var aspect = opts.aspect > 0 ? opts.aspect : 1;
    var isCircle = opts.shape === 'circle';
    var outW = opts.outWidth || 1200;
    var outH = Math.round(outW / aspect);
    var quality = opts.quality || 0.86;

    return loadImage(opts).then(function (loaded) {
      var img = loaded.img;
      var objUrl = loaded.objUrl;
      var iw = img.naturalWidth || img.width;
      var ih = img.naturalHeight || img.height;

      return new Promise(function (resolve, reject) {
        // ---------- মার্কআপ ----------
        var overlay = document.createElement('div');
        overlay.className = 'tzc-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.innerHTML =
          '<div class="tzc-box">' +
            '<div class="tzc-head"></div>' +
            '<div class="tzc-hint">ছবি টেনে সরান, দুই আঙুলে বা স্লাইডারে জুম ইন/আউট করুন।</div>' +
            '<div class="tzc-stage"><div class="tzc-frame' + (isCircle ? ' is-circle' : '') + '"></div></div>' +
            '<div class="tzc-zoom">' +
              '<button type="button" class="tzc-zbtn" data-z="out" aria-label="জুম আউট">−</button>' +
              '<input class="tzc-range" type="range" min="100" max="' + (MAX_ZOOM * 100) + '" value="100" step="1" aria-label="জুম">' +
              '<button type="button" class="tzc-zbtn" data-z="in" aria-label="জুম ইন">+</button>' +
              '<span class="tzc-zval">১×</span>' +
            '</div>' +
            '<div class="tzc-err" hidden></div>' +
            '<div class="tzc-actions">' +
              '<button type="button" class="tzc-cancel">বাতিল</button>' +
              '<button type="button" class="tzc-reset">রিসেট</button>' +
              '<button type="button" class="tzc-ok">ঠিক আছে</button>' +
            '</div>' +
          '</div>';
        overlay.querySelector('.tzc-head').textContent = opts.title || 'ছবি ঠিক করুন';
        document.body.appendChild(overlay);
        var prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        var stage = overlay.querySelector('.tzc-stage');
        var frame = overlay.querySelector('.tzc-frame');
        var range = overlay.querySelector('.tzc-range');
        var zval = overlay.querySelector('.tzc-zval');
        var errEl = overlay.querySelector('.tzc-err');
        var okBtn = overlay.querySelector('.tzc-ok');
        stage.insertBefore(img, frame);
        img.alt = '';
        img.draggable = false;

        // ---------- মাপজোক ----------
        var stageW = 0, stageH = 0, fw = 0, fh = 0;
        var minScale = 1;          // ফ্রেম পুরো ভরাট হয় এমন সর্বনিম্ন স্কেল
        var zoom = 1;              // ১ = ফ্রেম ভরাট, MAX_ZOOM পর্যন্ত
        var ox = 0, oy = 0;        // ছবির কেন্দ্র, ফ্রেমের কেন্দ্র থেকে কত px সরানো

        function layout() {
          var boxW = Math.min(window.innerWidth - 24, 480) - 24;
          fw = Math.min(boxW - 24, isCircle || aspect <= 1.2 ? 300 : boxW - 24);
          fh = fw / aspect;
          var maxFh = Math.max(160, window.innerHeight - 330);
          if (fh > maxFh) { fh = maxFh; fw = fh * aspect; }
          stageW = boxW;
          stageH = Math.max(fh + 70, 240);
          stage.style.width = stageW + 'px';
          stage.style.height = stageH + 'px';
          frame.style.width = fw + 'px';
          frame.style.height = fh + 'px';
          minScale = Math.max(fw / iw, fh / ih);
        }

        function clampOffsets() {
          var s = minScale * zoom;
          var maxX = Math.max(0, (iw * s - fw) / 2);
          var maxY = Math.max(0, (ih * s - fh) / 2);
          ox = Math.min(maxX, Math.max(-maxX, ox));
          oy = Math.min(maxY, Math.max(-maxY, oy));
        }

        function render() {
          clampOffsets();
          var s = minScale * zoom;
          img.style.width = (iw * s) + 'px';
          img.style.height = (ih * s) + 'px';
          img.style.transform = 'translate(-50%,-50%) translate(' + ox + 'px,' + oy + 'px)';
          range.value = Math.round(zoom * 100);
          zval.textContent = toBn((Math.round(zoom * 10) / 10).toString().replace(/\.0$/, '')) + '×';
        }

        function setZoom(z) {
          z = Math.min(MAX_ZOOM, Math.max(1, z));
          var ratio = z / zoom;
          ox *= ratio; oy *= ratio;   // কেন্দ্র ধরে জুম হয়, ছবি লাফায় না
          zoom = z;
          render();
        }

        layout();
        render();

        function onResize() { layout(); render(); }
        window.addEventListener('resize', onResize);

        // ---------- টানা + পিঞ্চ ----------
        var pointers = {};
        var lastPan = null;
        var pinchStart = null;

        function pointerList() { return Object.keys(pointers).map(function (k) { return pointers[k]; }); }

        stage.addEventListener('pointerdown', function (e) {
          try { stage.setPointerCapture(e.pointerId); } catch (x) {}
          pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
          var list = pointerList();
          if (list.length === 1) {
            lastPan = { x: e.clientX, y: e.clientY };
            stage.classList.add('is-drag');
          } else if (list.length === 2) {
            var dx = list[0].x - list[1].x, dy = list[0].y - list[1].y;
            pinchStart = { dist: Math.sqrt(dx * dx + dy * dy) || 1, zoom: zoom };
            lastPan = null;
          }
        });

        stage.addEventListener('pointermove', function (e) {
          if (!pointers[e.pointerId]) return;
          pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
          var list = pointerList();
          if (list.length >= 2 && pinchStart) {
            var dx = list[0].x - list[1].x, dy = list[0].y - list[1].y;
            var dist = Math.sqrt(dx * dx + dy * dy) || 1;
            setZoom(pinchStart.zoom * dist / pinchStart.dist);
          } else if (list.length === 1 && lastPan) {
            ox += e.clientX - lastPan.x;
            oy += e.clientY - lastPan.y;
            lastPan = { x: e.clientX, y: e.clientY };
            render();
          }
        });

        function endPointer(e) {
          delete pointers[e.pointerId];
          var list = pointerList();
          if (list.length === 1) {
            lastPan = { x: list[0].x, y: list[0].y };
            pinchStart = null;
          } else if (!list.length) {
            lastPan = null; pinchStart = null;
            stage.classList.remove('is-drag');
          }
        }
        stage.addEventListener('pointerup', endPointer);
        stage.addEventListener('pointercancel', endPointer);

        stage.addEventListener('wheel', function (e) {
          e.preventDefault();
          setZoom(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
        }, { passive: false });

        range.addEventListener('input', function () { setZoom(Number(range.value) / 100); });
        overlay.querySelector('[data-z="in"]').addEventListener('click', function () { setZoom(zoom + 0.25); });
        overlay.querySelector('[data-z="out"]').addEventListener('click', function () { setZoom(zoom - 0.25); });
        overlay.querySelector('.tzc-reset').addEventListener('click', function () { zoom = 1; ox = 0; oy = 0; render(); });

        // ---------- বন্ধ / সংরক্ষণ ----------
        function cleanup() {
          window.removeEventListener('resize', onResize);
          document.removeEventListener('keydown', onKey);
          document.body.style.overflow = prevOverflow;
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          URL.revokeObjectURL(objUrl);
        }
        function cancel() { cleanup(); reject(cancelError()); }
        function onKey(e) { if (e.key === 'Escape') cancel(); }
        document.addEventListener('keydown', onKey);
        overlay.querySelector('.tzc-cancel').addEventListener('click', cancel);
        overlay.addEventListener('pointerdown', function (e) { if (e.target === overlay) cancel(); });

        okBtn.addEventListener('click', function () {
          okBtn.disabled = true;
          errEl.hidden = true;
          var s = minScale * zoom;
          var sw = fw / s, sh = fh / s;
          var sx = iw / 2 - ox / s - sw / 2;
          var sy = ih / 2 - oy / s - sh / 2;
          var canvas = document.createElement('canvas');
          canvas.width = outW; canvas.height = outH;
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, outW, outH);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          try {
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
          } catch (x) {
            okBtn.disabled = false;
            errEl.textContent = 'ছবি প্রসেস করা যায়নি।';
            errEl.hidden = false;
            return;
          }
          canvas.toBlob(function (blob) {
            if (!blob) {
              okBtn.disabled = false;
              errEl.textContent = 'ছবি প্রসেস করা যায়নি।';
              errEl.hidden = false;
              return;
            }
            var dataUrl = canvas.toDataURL('image/jpeg', quality);
            cleanup();
            resolve({ blob: blob, dataUrl: dataUrl });
          }, 'image/jpeg', quality);
        });

        okBtn.focus();
      });
    });
  }

  window.TZCropper = { open: open };
})();
