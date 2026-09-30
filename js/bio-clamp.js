/* bio-clamp.js — প্রোফাইলের বায়ো সর্বোচ্চ ২ লাইনে দেখায়।
   বড় হলে ২য় লাইনের শেষে "… বিস্তারিত" থাকে; চাপলে পুরো বায়ো খোলে।
   ব্যবহার: window.tzBioClamp(element, text) */
(function () {
  'use strict';

  var LABEL = 'বিস্তারিত';
  var LINES = 2;

  function segments(str) {
    // বাংলা যুক্তাক্ষর/কার-চিহ্ন যাতে মাঝখানে না ভাঙে
    if (window.Intl && Intl.Segmenter) {
      var out = [];
      var it = new Intl.Segmenter('bn', { granularity: 'grapheme' }).segment(str);
      for (var s of it) out.push(s.segment);
      return out;
    }
    return Array.from(str);
  }

  function lineHeightPx(el) {
    var cs = window.getComputedStyle(el);
    var lh = parseFloat(cs.lineHeight);
    if (isNaN(lh)) lh = parseFloat(cs.fontSize) * 1.4;
    return lh;
  }

  function showFull(el, full) {
    el.classList.add('bio-expanded');
    el.textContent = full;
  }

  function clamp(el, full) {
    el.classList.remove('bio-expanded');
    el.textContent = full;
    if (!full || el.hidden || !el.offsetParent) return;      // দেখা যাচ্ছে না — পরে আবার চেষ্টা হবে

    var maxH = lineHeightPx(el) * LINES + 1;
    if (el.scrollHeight <= maxH) return;                     // ২ লাইনে ধরে গেছে

    var segs = segments(full);
    var txt = document.createTextNode('');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bio-more';
    btn.textContent = LABEL;
    btn.addEventListener('click', function () { showFull(el, full); });
    el.textContent = '';
    el.appendChild(txt);
    el.appendChild(btn);

    var lo = 0, hi = segs.length;                            // সবচেয়ে বড় n যেখানে টেক্সট + বিস্তারিত ২ লাইনে ধরে
    while (lo < hi) {
      var mid = Math.ceil((lo + hi) / 2);
      txt.data = segs.slice(0, mid).join('').replace(/\s+$/, '') + '… ';
      if (el.scrollHeight <= maxH) lo = mid; else hi = mid - 1;
    }
    txt.data = segs.slice(0, lo).join('').replace(/\s+$/, '') + '… ';
  }

  window.tzBioClamp = function (el, text) {
    if (!el) return;
    var full = (text || '').trim();
    el.__tzBioFull = full;
    clamp(el, full);

    if (!el.__tzBioBound) {
      el.__tzBioBound = true;
      var last = window.innerWidth;
      window.addEventListener('resize', function () {
        if (window.innerWidth === last) return;              // শুধু প্রস্থ বদলালে
        last = window.innerWidth;
        if (!el.classList.contains('bio-expanded')) clamp(el, el.__tzBioFull);
      });
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
          if (!el.classList.contains('bio-expanded')) clamp(el, el.__tzBioFull);
        });
      }
    }
  };
})();
