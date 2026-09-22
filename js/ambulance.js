// টাঙ্গাইল অ্যাম্বুলেন্স সার্ভিস — মডিউল ইন্টারঅ্যাকশন
(function () {
  // ---- মোবাইল ড্রয়ার মেনু ----
  var openBtn = document.getElementById('ambMenuOpen');
  var drawer = document.getElementById('ambDrawer');
  var closeBtn = document.getElementById('ambDrawerClose');
  var backdrop = drawer ? drawer.querySelector('.amb-drawer-backdrop') : null;

  function openDrawer(){
    if (!drawer) return;
    drawer.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer(){
    if (!drawer) return;
    drawer.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  if (openBtn) openBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  // ---- স্ক্রল-টু-টপ ফ্লোটিং বাটন ----
  var topBtn = document.getElementById('ambScrollTop');
  if (topBtn) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 420) topBtn.classList.add('is-visible');
      else topBtn.classList.remove('is-visible');
    }, { passive: true });
    topBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ---- পরিসংখ্যান কাউন্ট-আপ (একবারই, রিডিউসড-মোশনে বন্ধ) ----
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var statEls = document.querySelectorAll('[data-amb-count]');
  if (statEls.length && !reduceMotion && 'IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = parseFloat(el.getAttribute('data-amb-count'));
        var isDecimal = target % 1 !== 0;
        var start = 0;
        var duration = 900;
        var startTime = null;
        function step(ts) {
          if (!startTime) startTime = ts;
          var progress = Math.min((ts - startTime) / duration, 1);
          var value = start + (target - start) * progress;
          el.textContent = isDecimal ? value.toFixed(1) : Math.round(value).toLocaleString('bn-BD');
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = isDecimal ? target.toFixed(1) : target.toLocaleString('bn-BD');
        }
        requestAnimationFrame(step);
        obs.unobserve(el);
      });
    }, { threshold: 0.4 });
    statEls.forEach(function (el) { obs.observe(el); });
  }
})();
