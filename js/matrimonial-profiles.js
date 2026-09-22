// টাঙ্গাইল জেলা — পাত্র-পাত্রী পেজের পাত্র/পাত্রী কার্ড সেকশন (ধাপ ৭)
// matrimonial_profiles টেবিল থেকে (শুধু status='approved') বাস্তব প্রোফাইল লোড করে,
// পাত্র/পাত্রী প্রতিটা কলামে আলাদাভাবে ইনফিনিট স্ক্রল করে দেখায়।
// শুধুমাত্র matrimonial.html-এ লোড হয়, অন্য কোনো পেজ এই ফাইল ব্যবহার করে না।
(function () {
  var maleGrid = document.getElementById('matriMaleGrid');
  var femaleGrid = document.getElementById('matriFemaleGrid');
  if (!maleGrid || !femaleGrid || !window.supabase || !window.TANGAIL_SUPABASE) return;

  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
  var PAGE_SIZE = 6;

  function esc(s) { return (s || '').toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  function cardHTML(p) {
    var photoInner = p.photo_url
      ? '<img src="' + esc(p.photo_url) + '" alt="' + esc(p.full_name) + '" loading="lazy">'
      : '<span class="matri-avatar-ph"><i class="fa-solid fa-user" aria-hidden="true"></i></span>';
    var verifiedBadge = p.is_verified
      ? '<span class="matri-verified"><i class="fa-solid fa-check" aria-hidden="true"></i> ভেরিফাইড</span>'
      : '';
    var metaItems = '';
    if (p.age) metaItems += '<li><i class="fa-solid fa-cake-candles" aria-hidden="true"></i> ' + esc(p.age) + ' বছর</li>';
    if (p.education) metaItems += '<li><i class="fa-solid fa-graduation-cap" aria-hidden="true"></i> ' + esc(p.education) + '</li>';
    if (p.occupation) metaItems += '<li><i class="fa-solid fa-briefcase" aria-hidden="true"></i> ' + esc(p.occupation) + '</li>';
    if (p.thana) metaItems += '<li><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ' + esc(p.thana) + ' থানা</li>';

    return (
      '<div class="matri-card">' +
        '<div class="matri-card-photo">' + photoInner + verifiedBadge + '</div>' +
        '<div class="matri-card-body">' +
          '<h5>' + esc(p.full_name) + '</h5>' +
          '<ul class="matri-card-meta">' + metaItems + '</ul>' +
          '<div class="matri-card-id">প্রোফাইল আইডি: ' + esc(p.profile_code || '—') + '</div>' +
          '<a href="matrimonial-profile.html?id=' + esc(p.id) + '" class="matri-card-btn">বিস্তারিত দেখুন</a>' +
        '</div>' +
      '</div>'
    );
  }

  function makeColumn(gender, gridEl) {
    var emptyEl = document.getElementById(gender === 'male' ? 'matriMaleEmpty' : 'matriFemaleEmpty');
    var loadingEl = document.getElementById(gender === 'male' ? 'matriMaleLoading' : 'matriFemaleLoading');
    var sentinel = document.getElementById(gender === 'male' ? 'matriMaleSentinel' : 'matriFemaleSentinel');
    var filterGroup = gridEl.closest('.matri-col').querySelector('.matri-col-filters');

    var state = { filter: 'latest', shown: 0, hasMore: true, loading: false, ids: [] };

    function buildQuery() {
      var q = client.from('matrimonial_profiles').select('*').eq('gender', gender).eq('status', 'approved');
      if (state.filter === 'verified') q = q.eq('is_verified', true);
      if (state.filter === 'popular') {
        q = q.order('view_count', { ascending: false }).order('created_at', { ascending: false });
      } else {
        q = q.order('is_featured', { ascending: false }).order('sort_order', { ascending: true }).order('created_at', { ascending: false });
      }
      return q.range(state.shown, state.shown + PAGE_SIZE - 1);
    }

    function render(reset) {
      if (state.loading) return;
      if (reset) {
        state.shown = 0;
        state.hasMore = true;
        state.ids = [];
        gridEl.innerHTML = '';
        emptyEl.style.display = 'none';
      }
      if (!state.hasMore) return;

      state.loading = true;
      loadingEl.style.display = 'flex';

      buildQuery().then(function (res) {
        state.loading = false;
        loadingEl.style.display = 'none';

        if (res.error) {
          // নেটওয়ার্ক/RLS সমস্যা হলে নীরবে ফাঁকা দেখায় — বাকি পেজের কার্যকারিতা অক্ষত রাখতে
          state.hasMore = false;
          if (state.shown === 0) emptyEl.style.display = 'block';
          return;
        }

        var rows = res.data || [];
        rows.forEach(function (p) { gridEl.insertAdjacentHTML('beforeend', cardHTML(p)); state.ids.push(p.id); });
        state.shown += rows.length;
        state.hasMore = rows.length === PAGE_SIZE;

        if (state.shown === 0) emptyEl.style.display = 'block';
      });
    }

    // "বিস্তারিত দেখুন" কার্ডে ক্লিক করলে এই কলামে এখন পর্যন্ত লোড হওয়া প্রোফাইল id-গুলোর
    // সারি (এই gender + এই filter) sessionStorage-এ রেখে দেওয়া হয়, যাতে ডিটেইল পেজে
    // Prev/Next বাটন দিয়ে ঠিক এই একই ক্রমে একটার পর একটা প্রোফাইল দেখা যায়।
    gridEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.matri-card-btn');
      if (!btn) return;
      try {
        sessionStorage.setItem('matriNavQueue', JSON.stringify({
          gender: gender,
          filter: state.filter,
          ids: state.ids.slice(),
          hasMore: state.hasMore
        }));
      } catch (err) { /* সেশনস্টোরেজ না থাকলেও প্রোফাইল পেজ নিজের ফলব্যাক সারি বানিয়ে নেবে */ }
    });

    if (filterGroup) {
      filterGroup.querySelectorAll('.matri-filter-pill').forEach(function (pill) {
        pill.addEventListener('click', function () {
          if (pill.classList.contains('is-active')) return;
          filterGroup.querySelectorAll('.matri-filter-pill').forEach(function (p) { p.classList.remove('is-active'); });
          pill.classList.add('is-active');
          state.filter = pill.getAttribute('data-filter') || 'latest';
          render(true);
        });
      });
    }

    if ('IntersectionObserver' in window && sentinel) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) render(false);
        });
      }, { rootMargin: '200px' });
      io.observe(sentinel);
    }

    render(true);
  }

  makeColumn('male', maleGrid);
  makeColumn('female', femaleGrid);
})();
