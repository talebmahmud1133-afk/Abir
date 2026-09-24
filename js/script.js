// ব্রাউজারের "অ্যাড টু হোমস্ক্রিন" ইনস্টল ব্যানার (আইকনসহ) বন্ধ রাখা
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
});

// টাঙ্গাইল জেলা — মোবাইল মেনু টগল
(function () {
  var toggle = document.getElementById('menuToggle');
  var nav = document.getElementById('mainNav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    nav.classList.toggle('open');
  });

  // মেনুর বাইরে ক্লিক করলে বন্ধ হয়ে যাবে
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('open') &&
        !nav.contains(e.target) &&
        !toggle.contains(e.target)) {
      nav.classList.remove('open');
    }
  });

  // মেনুর ভেতরের কোনো লিংকে ক্লিক করলেও বন্ধ হয়ে যাবে
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      nav.classList.remove('open');
    }
  });
})();

// টাঙ্গাইল জেলা — হোমপেজে ক্যাটাগরি সার্চ ফিল্টার
(function () {
  var form = document.getElementById('searchForm');
  var input = document.getElementById('searchInput');
  var cards = document.querySelectorAll('.cat-card');

  if (!form || !input) return;

  function filter() {
    var q = input.value.trim().toLowerCase();
    cards.forEach(function (card) {
      var text = card.textContent.toLowerCase();
      card.classList.toggle('no-match', q.length > 0 && text.indexOf(q) === -1);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    filter();
  });

  input.addEventListener('input', filter);
})();

// টাঙ্গাইল জেলা — ক্যাটাগরি পেজের ভেতরে তালিকা সার্চ ফিল্টার
(function () {
  var form = document.getElementById('catSearchForm');
  var input = document.getElementById('catSearchInput');
  var items = document.querySelectorAll('.list-item');

  if (!form || !input) return;

  function filter() {
    var q = input.value.trim().toLowerCase();
    items.forEach(function (item) {
      var text = item.textContent.toLowerCase();
      item.style.display = (q.length > 0 && text.indexOf(q) === -1) ? 'none' : '';
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    filter();
  });

  input.addEventListener('input', filter);
})();
