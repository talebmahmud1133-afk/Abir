// টাঙ্গাইল জেলা — "টিউশন পোস্ট করুন" ফর্ম লজিক (Supabase: tuition_posts টেবিল)
(function () {
  var form = document.getElementById('tuitionPostForm');
  if (!form) return;

  var msg = document.getElementById('tpMsg');
  var submitBtn = document.getElementById('tpSubmitBtn');
  var listEl = document.getElementById('tpMyPostsList');
  var emptyEl = document.getElementById('tpMyPostsEmpty');

  var client = (window.supabase && window.TANGAIL_SUPABASE)
    ? window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key)
    : null;

  function setMsg(text, ok) {
    if (!msg) return;
    msg.textContent = text || '';
    msg.className = 'auth-msg' + (ok ? ' ok' : '');
  }

  // ---- এই ডিভাইস থেকে পাঠানো পোস্ট স্থানীয়ভাবে মনে রাখা ----
  // (pending অবস্থায় থাকা রেকর্ড পাবলিক RLS দিয়ে সার্ভার থেকে আবার পড়া যায় না,
  //  তাই সাবমিট করা তথ্য দিয়েই লোকালি কার্ড দেখানো হয়, approved হলে সার্ভার থেকে হালনাগাদ যাচাই করা হয়)
  var MY_POSTS_KEY = 'tpMyTuitionPosts';
  function loadMyPosts() {
    try {
      var raw = window.localStorage.getItem(MY_POSTS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return [];
  }
  function saveMyPosts(list) {
    try { window.localStorage.setItem(MY_POSTS_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }
  function newId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }
  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }
  function timeAgo(iso) {
    var diff = Date.now() - new Date(iso).getTime();
    var min = Math.floor(diff / 60000);
    if (min < 1) return 'এইমাত্র';
    if (min < 60) return min + ' মিনিট আগে';
    var hr = Math.floor(min / 60);
    if (hr < 24) return hr + ' ঘণ্টা আগে';
    var day = Math.floor(hr / 24);
    return day + ' দিন আগে';
  }
  function statusBadge(status) {
    if (status === 'approved') return '<span class="tp-badge tp-badge-approved"><i class="fa-solid fa-circle-check" style="font-size:10px"></i> অনুমোদিত — প্রকাশিত</span>';
    return '<span class="tp-badge tp-badge-pending"><i class="fa-solid fa-hourglass-half" style="font-size:10px"></i> অনুমোদনের অপেক্ষায়</span>';
  }
  function cardHTML(p) {
    return (
      '<article class="tp-post-card" data-id="' + p.id + '">' +
        '<div class="tp-post-card-top">' +
          '<div class="tp-post-card-title">' + esc(p.subject) + ' • ক্লাস ' + esc(p.class_range) + '</div>' +
          statusBadge(p.status) +
        '</div>' +
        '<div class="tp-post-card-meta">' +
          '<span><i class="fa-solid fa-location-dot"></i> ' + esc(p.upazila) + '</span>' +
          '<span><i class="fa-solid fa-sack-dollar"></i> ৳' + esc(p.budget) + '/মাস</span>' +
          '<span><i class="fa-solid fa-clock"></i> ' + timeAgo(p.created_at) + '</span>' +
        '</div>' +
      '</article>'
    );
  }
  function renderMyPosts() {
    if (!listEl) return;
    var posts = loadMyPosts();
    if (!posts.length) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    listEl.innerHTML = posts.map(cardHTML).join('');
    if (emptyEl) emptyEl.style.display = 'none';

    if (!client) return;
    var pendingIds = posts.filter(function (p) { return p.status !== 'approved'; }).map(function (p) { return p.id; });
    if (!pendingIds.length) return;
    client.from('tuition_posts').select('id').in('id', pendingIds).eq('status', 'approved')
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) return;
        var approvedIds = res.data.map(function (r) { return r.id; });
        var changed = false;
        posts.forEach(function (p) {
          if (approvedIds.indexOf(p.id) !== -1 && p.status !== 'approved') { p.status = 'approved'; changed = true; }
        });
        if (changed) {
          saveMyPosts(posts);
          listEl.innerHTML = posts.map(cardHTML).join('');
        }
      });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var name = document.getElementById('tp-name').value.trim();
    var phone = document.getElementById('tp-phone').value.trim();
    var subject = document.getElementById('tp-subject').value;
    var classRange = document.getElementById('tp-class').value;
    var budget = document.getElementById('tp-budget').value.trim();
    var upazila = document.getElementById('tp-upazila').value;
    var description = document.getElementById('tp-desc').value.trim();

    if (!name) { setMsg('নাম লিখুন।'); return; }
    if (!phone || phone.replace(/\D/g, '').length < 11) { setMsg('সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন।'); return; }
    if (!subject) { setMsg('বিষয় নির্বাচন করুন।'); return; }
    if (!classRange) { setMsg('ক্লাস নির্বাচন করুন।'); return; }
    if (!budget) { setMsg('মাসিক বাজেট লিখুন।'); return; }
    if (!upazila) { setMsg('উপজেলা নির্বাচন করুন।'); return; }

    if (!client) {
      setMsg('দুঃখিত, এই মুহূর্তে পোস্ট জমা দেওয়া যাচ্ছে না। একটু পর আবার চেষ্টা করুন।');
      return;
    }

    var id = newId();
    var row = {
      id: id,
      poster_name: name,
      poster_phone: phone.replace(/\D/g, ''),
      subject: subject,
      class_range: classRange,
      budget: parseFloat(budget) || 0,
      upazila: upazila,
      description: description
    };

    submitBtn.disabled = true;
    setMsg('পোস্ট জমা দেওয়া হচ্ছে…', true);

    // .select() ব্যবহার করা হচ্ছে না ইচ্ছাকৃতভাবে — নতুন রেকর্ড status='pending' থাকায়
    // পাবলিক RLS পলিসি সাথে সাথে সেটা "রিটার্ন" করতে দেয় না (শুধু approved হলেই পড়া যায়)
    client.from('tuition_posts').insert(row).then(function (res) {
      submitBtn.disabled = false;

      if (res.error) {
        setMsg('পোস্ট জমা দিতে সমস্যা হয়েছে: ' + res.error.message);
        return;
      }

      var posts = loadMyPosts();
      posts.unshift({
        id: id,
        subject: subject,
        class_range: classRange,
        budget: row.budget,
        upazila: upazila,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      saveMyPosts(posts);

      form.reset();
      setMsg('ধন্যবাদ! আপনার পোস্ট জমা হয়েছে, অনুমোদনের পর প্রকাশিত হবে।', true);
      renderMyPosts();
    });
  });

  renderMyPosts();
})();
