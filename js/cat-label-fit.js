// হোম পেজের ক্যাটাগরি বক্সের নিচের লেখা (h3) সবসময় এক লাইনে রাখা হয়।
// লেখা বক্সের চেয়ে বড় হলে ফন্ট-সাইজ কমিয়ে ঠিক বক্সের বাম থেকে ডান প্রান্ত পর্যন্ত ফিট করানো হয়,
// যাতে দুই লাইনে ভেঙে একটার উপরে একটা লেখা না দেখায়।
(function () {
  function fitLabel(h3) {
    if (!h3.dataset.tzBaseFont) {
      h3.dataset.tzBaseFont = parseFloat(getComputedStyle(h3).fontSize) || 12;
    }
    var base = parseFloat(h3.dataset.tzBaseFont);

    // প্রথমে বেস সাইজে রিসেট করে প্রকৃত প্রয়োজনীয় প্রস্থ মাপা হচ্ছে
    h3.style.fontSize = base + 'px';
    var available = h3.clientWidth;
    var needed = h3.scrollWidth;

    if (available > 0 && needed > available) {
      var newSize = base * (available / needed) * 0.985; // সামান্য মার্জিন যাতে কাটা না পড়ে
      if (newSize < 6) newSize = 6; // অতিরিক্ত ছোট হয়ে অপাঠ্য হওয়া থেকে রক্ষা
      h3.style.fontSize = newSize + 'px';
    }
  }

  function fitAllCatLabels() {
    var grid = document.getElementById('homeCatGrid');
    if (!grid) return;
    var labels = grid.querySelectorAll('.cat-card h3');
    labels.forEach(fitLabel);
  }

  window.TZ_FIT_CAT_LABELS = fitAllCatLabels;

  document.addEventListener('DOMContentLoaded', function () {
    fitAllCatLabels();
    // ফন্ট (ফন্ট অসম বা ওয়েব ফন্ট) দেরিতে লোড হলে মাপ আবার ঠিক করার জন্য
    setTimeout(fitAllCatLabels, 250);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fitAllCatLabels);
    }
  });

  window.addEventListener('load', fitAllCatLabels);
  window.addEventListener('resize', fitAllCatLabels);
  // ভাষা পরিবর্তনের পর (বাংলা/English) লেখার দৈর্ঘ্য বদলে যায়, তাই আবার ফিট করানো হয়
  document.addEventListener('tz:i18n-applied', fitAllCatLabels);
})();
