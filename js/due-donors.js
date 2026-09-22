// টাঙ্গাইল জেলা — রক্তদান বিভাগ পেজে যাদের রক্ত দেওয়ার সময় হয়ে গেছে তাদের প্রোফাইল প্রিভিউ
(function () {
  var wrap = document.getElementById('dueDonorsList');
  if (!wrap || !window.TANGAIL_SUPABASE) return;

  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
  var MAX_SHOW = 6;

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function daysBetween(dateStr) {
    if (!dateStr) return null;
    var then = new Date(dateStr);
    var now = new Date();
    return Math.floor((now - then) / (1000 * 60 * 60 * 24));
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'তথ্য নেই';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'তথ্য নেই';
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    return dd + '/' + mm + '/' + d.getFullYear();
  }

  function donorCardHtml(d) {
    var phoneDigits = (d.phone || '').replace(/\D/g, '');
    var locBits = [d.thana, d.address].filter(Boolean).join(' · ');

    return '' +
      '<div class="donor-card">' +
        '<div class="donor-card-top">' +
          '<div class="donor-avatar"><i class="fa-solid fa-user" aria-hidden="true"></i></div>' +
          '<div class="donor-info">' +
            '<div class="donor-name-row">' +
              '<h3 class="donor-name">' + escapeHtml(d.name) + '</h3>' +
              '<span class="donor-group-badge">' + escapeHtml(d.blood_group) + '</span>' +
            '</div>' +
            (locBits ? '<div class="donor-loc"><span><i class="fa-solid fa-location-dot" aria-hidden="true"></i></span><span>' + escapeHtml(locBits) + '</span></div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="donor-status available"><span class="dot"></span><span>এখন রক্ত দিতে পারবেন</span></div>' +
        '<div class="donor-stats">' +
          '<span><i class="fa-solid fa-calendar" aria-hidden="true"></i> সর্বশেষ: ' + formatDate(d.last_donation_date) + '</span>' +
          '<span><i class="fa-solid fa-bandage" aria-hidden="true"></i> মোট: ' + (d.total_donations || 0) + ' বার</span>' +
        '</div>' +
        '<div class="donor-actions">' +
          '<a class="call-btn" href="tel:' + escapeHtml(phoneDigits) + '"><i class="fa-solid fa-phone" aria-hidden="true"></i> কল</a>' +
          '<a class="msg-btn" href="sms:' + escapeHtml(phoneDigits) + '"><i class="fa-solid fa-comment" aria-hidden="true"></i> মেসেজ</a>' +
        '</div>' +
      '</div>';
  }

  client.from('blood_donors').select('*').eq('status', 'approved').then(function (res) {
    if (res.error || !res.data) {
      wrap.innerHTML = '<p class="donor-empty">তালিকা লোড করতে সমস্যা হয়েছে।</p>';
      return;
    }

    // যাদের সর্বশেষ রক্তদানের তারিখ নেই অথবা ৯০ দিনের বেশি হয়ে গেছে — তারাই এখন রক্ত দিতে পারবেন
    var due = res.data.filter(function (d) {
      var days = daysBetween(d.last_donation_date);
      return days === null || days >= 90;
    });

    // সবচেয়ে বেশিদিন ধরে অপেক্ষারত ডোনার আগে দেখানো হবে
    due.sort(function (a, b) {
      var da = daysBetween(a.last_donation_date);
      var db = daysBetween(b.last_donation_date);
      if (da === null) da = Infinity;
      if (db === null) db = Infinity;
      return db - da;
    });

    var shown = due.slice(0, MAX_SHOW);

    if (!shown.length) {
      wrap.innerHTML = '<div class="donor-empty"><div class="donor-empty-icon"><i class="fa-solid fa-droplet" aria-hidden="true"></i></div>এই মুহূর্তে রক্ত দেওয়ার সময় হয়েছে এমন কোনো ডোনার নেই।</div>';
      return;
    }

    wrap.innerHTML = shown.map(donorCardHtml).join('');
  });
})();
