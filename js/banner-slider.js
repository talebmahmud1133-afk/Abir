// টাঙ্গাইল জেলা — পুনঃব্যবহারযোগ্য ব্যানার স্লাইডার
// index.html (banners.json থেকে fetch করে) এবং admin.html (মেমরি থেকে সরাসরি)
// উভয় জায়গা থেকেই এই একই ফাংশন দিয়ে স্লাইডার আঁকা হয়।

window.TangailBanners = (function () {
  var AUTOPLAY_MS = 5000;

  function renderSlider(trackEl, dotsEl, banners, opts) {
    opts = opts || {};
    var list = (banners || []).filter(function (b) { return b && b.enabled !== false; }).slice(0, 10);
    var current = 0;
    var timer = null;

    trackEl.innerHTML = '';
    dotsEl.innerHTML = '';

    if (list.length === 0) {
      trackEl.innerHTML = '<div class="banner-slide bg-maroon"><div class="banner-inner"><h3>কোনো ব্যানার নেই</h3><p>অ্যাডমিন প্যানেল থেকে ব্যানার যোগ করুন।</p></div></div>';
      return { update: function () {}, destroy: function () {} };
    }

    list.forEach(function (b, i) {
      var slide = document.createElement(b.buttonLink ? 'a' : 'div');
      slide.className = 'banner-slide' + (b.image ? ' has-image' : ' bg-' + (b.bg || 'maroon'));
      if (b.buttonLink) slide.href = b.buttonLink;
      if (b.image) {
        slide.style.backgroundImage = 'url(' + b.image + ')';
        slide.style.setProperty('--banner-img', 'url("' + String(b.image).replace(/"/g, '\\"') + '")');
      }

      var inner = document.createElement('div');
      inner.className = 'banner-inner';
      // ছবি-ব্যানারে কোনো লেখা দেখানো হয় না — শুধু ছবি (লিংক থাকলে ট্যাপে সেই পেজ)
      inner.innerHTML = b.image ? '' :
        (b.badge ? '<span class="banner-badge">' + escapeHtml(b.badge) + '</span>' : '') +
        '<h3>' + escapeHtml(b.title || '') + '</h3>' +
        (b.subtitle ? '<p>' + escapeHtml(b.subtitle) + '</p>' : '') +
        (b.buttonText ? '<span class="banner-btn">' + escapeHtml(b.buttonText) + '</span>' : '');
      slide.appendChild(inner);
      // ছবি-ব্যানারে লিংক থাকলে মাঝখানে নীল লিংক লেখা — ট্যাপ করলে সেই পেজে যায়
      if (b.image && b.buttonLink) {
        var linkLabel = document.createElement('span');
        linkLabel.className = 'banner-link-label';
        linkLabel.innerHTML = 'বিস্তারিত দেখুন <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>';
        slide.appendChild(linkLabel);
      }
      trackEl.appendChild(slide);

      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'banner-dot';
      dot.setAttribute('aria-label', (i + 1) + ' নম্বর স্লাইড');
      dot.addEventListener('click', function () { goTo(i); resetTimer(); });
      dotsEl.appendChild(dot);
    });

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function goTo(i) {
      current = (i + list.length) % list.length;
      trackEl.style.transform = 'translateX(-' + (current * 100) + '%)';
      Array.prototype.forEach.call(dotsEl.children, function (d, idx) {
        d.classList.toggle('active', idx === current);
      });
    }

    function next() { goTo(current + 1); }

    function resetTimer() {
      if (timer) clearInterval(timer);
      if (list.length > 1) timer = setInterval(next, AUTOPLAY_MS);
    }

    // touch swipe
    var startX = null;
    trackEl.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
      if (timer) clearInterval(timer);
    }, { passive: true });
    trackEl.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) { dx < 0 ? next() : goTo(current - 1); }
      startX = null;
      resetTimer();
    });

    trackEl.parentElement.addEventListener('mouseenter', function () { if (timer) clearInterval(timer); });
    trackEl.parentElement.addEventListener('mouseleave', resetTimer);

    goTo(0);
    resetTimer();

    return {
      update: function (newBanners) {
        if (timer) clearInterval(timer);
        return renderSlider(trackEl, dotsEl, newBanners, opts);
      },
      destroy: function () { if (timer) clearInterval(timer); }
    };
  }

  return { renderSlider: renderSlider };
})();
