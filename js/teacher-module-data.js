// টাঙ্গাইল জেলা — শিক্ষক ও শিক্ষার্থী মডিউল হোমপেজ
// teacher-module.html-এর "বিশেষ শিক্ষক", "বিশেষ শিক্ষার্থী", "সাম্প্রতিক টিউশন পোস্ট" ও
// "টপ রেটেড শিক্ষক" সেকশনে Supabase থেকে approved রেকর্ড লোড করে বসিয়ে দেয়।
// Supabase কানেকশন না থাকলে বা কোনো ডেটা না পেলে আগের ডেমো কার্ডগুলোই দেখা যাবে (কিছু ভাঙবে না)।
(function () {
  var BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

  function bn(num) {
    return String(num).replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; });
  }
  function bnMoney(num) {
    var n = Math.round(Number(num) || 0);
    return '৳' + bn(n.toLocaleString('en-US'));
  }
  function initial(name) {
    return (name || '').trim().charAt(0) || '?';
  }
  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }
  function timeAgo(iso) {
    var then = new Date(iso).getTime();
    if (!then) return '';
    var diffMin = Math.max(1, Math.round((Date.now() - then) / 60000));
    if (diffMin < 60) return bn(diffMin) + ' মিনিট আগে';
    var diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return bn(diffHr) + ' ঘণ্টা আগে';
    var diffDay = Math.round(diffHr / 24);
    if (diffDay < 30) return bn(diffDay) + ' দিন আগে';
    return bn(Math.round(diffDay / 30)) + ' মাস আগে';
  }

  var sbClient = (window.supabase && window.TANGAIL_SUPABASE)
    ? window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key)
    : null;
  if (!sbClient) return;

  // ---------- Featured + Top rated teachers ----------
  function teacherCard(t) {
    var verified = t.verified
      ? '<span class="tm-verified"><i class="fa-solid fa-check"></i></span>' : '';
    return (
      '<article class="tm-teacher-card">' +
        '<div class="tm-teacher-top">' +
          '<div class="tm-avatar">' + esc(initial(t.name)) + verified + '</div>' +
          '<div>' +
            '<div class="tm-teacher-name">' + esc(t.name) + '</div>' +
            '<div class="tm-teacher-sub">' + esc(t.subject) + (t.class_range ? ' • ক্লাস ' + esc(t.class_range) : '') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="tm-teacher-meta">' +
          '<span class="tm-rating"><i class="fa-solid fa-star"></i> ' + bn(Number(t.rating || 0).toFixed(1)) + ' (' + bn(t.reviews || 0) + ')</span>' +
          '<span><i class="fa-solid fa-location-dot"></i> ' + esc(t.upazila) + '</span>' +
        '</div>' +
        '<div class="tm-fee">' + bnMoney(t.monthly_fee) + ' /মাস</div>' +
        '<div class="tm-teacher-actions">' +
          '<a class="tm-view" href="teacher-profile.html?id=' + encodeURIComponent(t.id) + '">প্রোফাইল দেখুন</a>' +
          '<a class="tm-msg" href="teacher-profile.html?id=' + encodeURIComponent(t.id) + '#contact">বার্তা</a>' +
        '</div>' +
      '</article>'
    );
  }

  function topRatedCard(t, rank) {
    var verified = t.verified
      ? '<span class="tm-verified"><i class="fa-solid fa-check"></i></span>' : '';
    return (
      '<a class="tm-toprated-card" href="teacher-profile.html?id=' + encodeURIComponent(t.id) + '">' +
        '<span class="tm-toprated-rank">' + bn(rank) + '</span>' +
        '<div class="tm-avatar">' + esc(initial(t.name)) + verified + '</div>' +
        '<div class="tm-toprated-info">' +
          '<div class="tm-teacher-name">' + esc(t.name) + '</div>' +
          '<div class="tm-teacher-sub">' + esc(t.subject) + (t.class_range ? ' • ক্লাস ' + esc(t.class_range) : '') + '</div>' +
          '<div class="tm-toprated-stats">' +
            '<span class="tm-rating"><i class="fa-solid fa-star"></i> ' + bn(Number(t.rating || 0).toFixed(1)) + '</span>' +
            '<span><i class="fa-solid fa-comment"></i> ' + bn(t.reviews || 0) + ' রিভিউ</span>' +
            '<span><i class="fa-solid fa-briefcase"></i> ' + bn(t.experience_years || 0) + ' বছর অভিজ্ঞতা</span>' +
          '</div>' +
        '</div>' +
      '</a>'
    );
  }

  sbClient.from('teachers').select('*').eq('status', 'approved').order('rating', { ascending: false }).limit(12)
    .then(function (res) {
      var rows = (res && res.data) || [];
      if (!rows.length) return;

      var featuredEl = document.getElementById('tmFeaturedTeachers');
      if (featuredEl) featuredEl.innerHTML = rows.slice(0, 8).map(teacherCard).join('');

      var topEl = document.getElementById('tmTopRated');
      if (topEl) {
        topEl.innerHTML = rows.slice(0, 4).map(function (t, i) { return topRatedCard(t, i + 1); }).join('');
      }
    })
    .catch(function () { /* ডেমো কার্ড থেকে যাবে */ });

  // ---------- Featured students ----------
  function studentCard(s) {
    return (
      '<article class="tm-student-card">' +
        '<div class="tm-student-top">' +
          '<div class="tm-avatar tm-avatar-student">' + esc(initial(s.name)) + '</div>' +
          '<div>' +
            '<div class="tm-student-name">' + esc(s.name) + '</div>' +
            '<div class="tm-student-sub">ক্লাস ' + esc(s.class_range) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="tm-student-meta">' +
          '<span><i class="fa-solid fa-school"></i> ' + esc(s.institution) + '</span>' +
          '<span><i class="fa-solid fa-location-dot"></i> ' + esc(s.upazila) + '</span>' +
          '<span><i class="fa-solid fa-book"></i> প্রয়োজন: ' + esc(s.required_subject) + '</span>' +
        '</div>' +
        '<div class="tm-budget">' + bnMoney(s.budget) + ' /মাস বাজেট</div>' +
        '<div class="tm-student-actions"><a href="student-profile.html?id=' + encodeURIComponent(s.id) + '">যোগাযোগ করুন</a></div>' +
      '</article>'
    );
  }

  sbClient.from('students').select('*').eq('status', 'approved').order('created_at', { ascending: false }).limit(8)
    .then(function (res) {
      var rows = (res && res.data) || [];
      if (!rows.length) return;
      var el = document.getElementById('tmFeaturedStudents');
      if (el) el.innerHTML = rows.map(studentCard).join('');
    })
    .catch(function () { /* ডেমো কার্ড থেকে যাবে */ });

  // ---------- Latest tuition posts ----------
  function postCard(p) {
    return (
      '<article class="tm-post-card">' +
        '<div class="tm-post-top">' +
          '<span class="tm-post-badge">শিক্ষক প্রয়োজন</span>' +
          '<span class="tm-post-time">' + timeAgo(p.created_at) + '</span>' +
        '</div>' +
        '<div class="tm-post-title">' + esc(p.subject) + (p.class_range ? ' — ক্লাস ' + esc(p.class_range) : '') + ' পড়ানোর জন্য শিক্ষক দরকার</div>' +
        '<div class="tm-post-meta">' +
          '<span><i class="fa-solid fa-location-dot"></i> ' + esc(p.upazila) + '</span>' +
        '</div>' +
        (p.description ? '<div class="tm-post-meta" style="margin-top:-6px;"><span>' + esc(p.description) + '</span></div>' : '') +
        '<div class="tm-post-foot">' +
          '<span class="tm-post-budget">' + bnMoney(p.budget) + '/মাস</span>' +
          '<a class="tm-post-apply" href="tel:+88' + esc(p.poster_phone) + '">আবেদন করুন</a>' +
        '</div>' +
      '</article>'
    );
  }

  sbClient.from('tuition_posts').select('*').eq('status', 'approved').order('created_at', { ascending: false }).limit(6)
    .then(function (res) {
      var rows = (res && res.data) || [];
      if (!rows.length) return;
      var el = document.getElementById('tmTuitionPosts');
      if (el) el.innerHTML = rows.map(postCard).join('');
    })
    .catch(function () { /* ডেমো কার্ড থেকে যাবে */ });
})();
