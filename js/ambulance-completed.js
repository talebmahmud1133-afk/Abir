// টাঙ্গাইল অ্যাম্বুলেন্স সার্ভিস — সম্পন্ন সেবা ড্যাশবোর্ড লজিক
(function () {
  var STORAGE_KEY = 'ambRequests';
  var listEl = document.getElementById('ambCompletedList');
  var emptyEl = document.getElementById('ambCompletedEmpty');
  if (!listEl) return;

  function loadRequests() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return (window.AMB_REQUESTS_SEED || []).slice();
  }

  var requests = loadRequests();
  var completed = requests.filter(function (r) { return r.status === 'completed'; })
    .sort(function (a, b) { return b.createdAt - a.createdAt; });

  function timeAgo(ts) {
    var diff = Date.now() - ts;
    var day = Math.floor(diff / 86400000);
    if (day < 1) return 'আজ';
    if (day === 1) return 'গতকাল';
    return day.toLocaleString('bn-BD') + ' দিন আগে';
  }

  function starString(rating) {
    var full = Math.round(rating || 5);
    var out = '';
    for (var i = 0; i < 5; i++) out += '<i class="fa-solid fa-star" aria-hidden="true" style="' + (i < full ? '' : 'opacity:.25') + '"></i>';
    return out;
  }

  function cardHTML(r) {
    var rating = r.rating || 5;
    return (
      '<article class="amb-request-card">' +
        '<div class="amb-request-top">' +
          '<span class="amb-emg-badge completed"><i class="fa-solid fa-circle"></i> সম্পন্ন</span>' +
          '<span class="amb-request-time">' + timeAgo(r.createdAt) + '</span>' +
        '</div>' +
        '<div class="amb-request-patient">' + r.patientName + ' <span>&middot; ' + r.phone + '</span></div>' +
        '<div class="amb-request-route"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ' + r.pickup + ' <i class="fa-solid fa-arrow-right-long" aria-hidden="true"></i> ' + r.destination + '</div>' +
        '<div class="amb-request-meta">' +
          '<span><i class="fa-solid fa-truck-medical"></i> ' + r.type + '</span>' +
          '<span><i class="fa-solid fa-route"></i> ' + r.distanceKm + ' কিমি</span>' +
          '<span><i class="fa-regular fa-calendar"></i> ' + r.datetime + '</span>' +
        '</div>' +
        '<div class="amb-completed-rating">' +
          '<span class="amb-completed-stars">' + starString(rating) + ' ' + (rating.toFixed ? rating.toFixed(1) : rating) + '</span>' +
          (r.review ? '<span class="amb-completed-review">' + r.review + '</span>' : '') +
        '</div>' +
      '</article>'
    );
  }

  function render() {
    listEl.innerHTML = completed.map(cardHTML).join('');
    if (emptyEl) emptyEl.style.display = completed.length ? 'none' : 'block';
  }

  // ---- ড্যাশবোর্ড পরিসংখ্যান বসানো ----
  function setStat(id, value) {
    var el = document.getElementById(id);
    if (el) el.setAttribute('data-amb-count', value);
  }
  var totalCompleted = completed.length;
  var avgRating = completed.length
    ? (completed.reduce(function (s, r) { return s + (r.rating || 5); }, 0) / completed.length)
    : 0;
  var totalDrivers = (window.AMB_DRIVERS || []).length;
  var totalRequests = requests.length;

  setStat('statCompleted', totalCompleted);
  setStat('statRating', avgRating.toFixed(1));
  setStat('statDrivers', totalDrivers);
  setStat('statRequests', totalRequests);
  setStat('statResponse', 8); // মিনিট — ডেমো গড় মান
  setStat('statSuccess', totalRequests ? ((totalCompleted / totalRequests) * 100).toFixed(0) : 0);

  render();
  // কাউন্ট-আপ অ্যানিমেশন js/ambulance.js পরিচালনা করে ([data-amb-count] এট্রিবিউট দেখে,
  // যা উপরে ইতিমধ্যে বসানো হয়েছে — এই পেজে আলাদা করে অ্যানিমেট করার দরকার নেই)।
})();
