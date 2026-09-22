// টাঙ্গাইল জেলা — শিক্ষক ও শিক্ষার্থী মডিউল: সার্চ বক্স ও ফিল্টার
// সার্চ বাটনে ক্লিক করলে বা এন্টার চাপলে "বিশেষ শিক্ষক" সেকশনে Supabase থেকে
// ফিল্টার-করা ফলাফল বসিয়ে দেয় এবং সেকশনে স্ক্রল করে নিয়ে যায়।
(function () {
  var BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  function bn(num) { return String(num).replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; }); }
  function bnMoney(num) {
    var n = Math.round(Number(num) || 0);
    return '৳' + bn(n.toLocaleString('en-US'));
  }
  function initial(name) { return (name || '').trim().charAt(0) || '?'; }
  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  var input = document.getElementById('tmSearchInput');
  var btn = document.getElementById('tmSearchBtn');
  var subjectSel = document.getElementById('tmFilterSubject');
  var classSel = document.getElementById('tmFilterClass');
  var upazilaSel = document.getElementById('tmFilterUpazila');
  var modeSel = document.getElementById('tmFilterMode');
  var statusEl = document.getElementById('tmSearchStatus');
  var resultsEl = document.getElementById('tmFeaturedTeachers');
  var titleEl = document.getElementById('tmFeaturedTeachersTitle');
  var seeAllEl = document.getElementById('tmFeaturedTeachersSeeAll');
  var sectionEl = document.getElementById('tm-featured-teachers');

  if (!btn || !resultsEl) return; // পেজে সার্চ উপাদান না থাকলে কিছু করার নেই

  var sbClient = (window.supabase && window.TANGAIL_SUPABASE)
    ? window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key)
    : null;

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
          '<span><i class="fa-solid fa-location-dot"></i> ' + esc(t.upazila || '') + '</span>' +
        '</div>' +
        '<div class="tm-fee">' + bnMoney(t.monthly_fee) + ' /মাস</div>' +
        '<div class="tm-teacher-actions">' +
          '<a class="tm-view" href="teacher-profile.html?id=' + encodeURIComponent(t.id) + '">প্রোফাইল দেখুন</a>' +
          '<a class="tm-msg" href="teacher-profile.html?id=' + encodeURIComponent(t.id) + '#contact">বার্তা</a>' +
        '</div>' +
      '</article>'
    );
  }

  function setStatus(text, showReset) {
    if (!statusEl) return;
    if (!text) { statusEl.style.display = 'none'; statusEl.innerHTML = ''; return; }
    statusEl.style.display = 'flex';
    statusEl.innerHTML = '<span>' + text + '</span>' +
      (showReset ? '<button type="button" id="tmSearchReset">সব দেখাও</button>' : '');
    var resetBtn = document.getElementById('tmSearchReset');
    if (resetBtn) resetBtn.addEventListener('click', resetSearch);
  }

  function resetSearch() {
    if (input) input.value = '';
    if (subjectSel) subjectSel.value = '';
    if (classSel) classSel.value = '';
    if (upazilaSel) upazilaSel.value = '';
    if (modeSel) modeSel.value = '';
    if (titleEl) titleEl.textContent = 'বিশেষ শিক্ষক';
    if (seeAllEl) seeAllEl.style.display = '';
    setStatus('');
    window.location.reload();
  }

  function runSearch() {
    if (!sbClient) {
      setStatus('এই মুহূর্তে সার্চ করা যাচ্ছে না, একটু পরে আবার চেষ্টা করুন।', false);
      return;
    }
    var q = (input && input.value || '').trim();
    var subject = subjectSel ? subjectSel.value : '';
    var cls = classSel ? classSel.value : '';
    var upazila = upazilaSel ? upazilaSel.value : '';
    var mode = modeSel ? modeSel.value : '';

    resultsEl.innerHTML = '<div class="tm-empty-state">খোঁজা হচ্ছে…</div>';
    if (titleEl) titleEl.textContent = 'সার্চ ফলাফল';
    if (seeAllEl) seeAllEl.style.display = 'none';
    if (sectionEl) sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    var query = sbClient.from('teachers').select('*').eq('status', 'approved').order('rating', { ascending: false }).limit(30);
    if (q) query = query.or('name.ilike.%' + q + '%,subject.ilike.%' + q + '%');
    if (subject) query = query.ilike('subject', '%' + subject + '%');
    if (cls) query = query.ilike('class_range', '%' + cls + '%');
    if (upazila) query = query.eq('upazila', upazila);
    if (mode) query = query.eq('mode', mode);

    query.then(function (res) {
      var rows = (res && res.data) || [];
      if (!rows.length) {
        resultsEl.innerHTML = '<div class="tm-empty-state">দুঃখিত, এই মুহূর্তে আপনার শর্ত অনুযায়ী কোনো শিক্ষক খুঁজে পাওয়া যায়নি। অন্য বিষয় বা এলাকা দিয়ে চেষ্টা করুন।</div>';
        setStatus('০টি ফলাফল পাওয়া গেছে', true);
        return;
      }
      resultsEl.innerHTML = rows.map(teacherCard).join('');
      setStatus(bn(rows.length) + 'টি শিক্ষক পাওয়া গেছে', true);
    }).catch(function () {
      resultsEl.innerHTML = '<div class="tm-empty-state">সার্চ করার সময় সমস্যা হয়েছে, আবার চেষ্টা করুন।</div>';
      setStatus('সমস্যা হয়েছে', true);
    });
  }

  btn.addEventListener('click', runSearch);
  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); runSearch(); }
    });
  }
  [subjectSel, classSel, upazilaSel, modeSel].forEach(function (sel) {
    if (sel) sel.addEventListener('change', runSearch);
  });
})();
