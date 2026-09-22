// ============================================================
// teacher-module.html — Teacher & Student Platform
// ধাপ ১: Sticky Top Nav — Student/Teacher Dropdown Filtering
// ধাপ ২: Profile Card রেন্ডার + Sample Data + আসল Filtering +
//         Skeleton Loading + View Profile টোস্ট
// ধাপ ৩: Floating Rate বাটন + ক্যাটাগরি মোডাল + Rating Form
// ধাপ ৪: Search (নাম/জেলা/প্রতিষ্ঠান/বিষয়) + Sort (রেটিং/নতুন/রিভিউ/A-Z)
//         — নির্বাচিত ক্যাটাগরির মধ্যেই, No page reload, Instant update
// ধাপ ৫: Rating সাবমিশন এখন Supabase টেবিলে (tsp_category_ratings) জমা হয় —
//         localStorage শুধু অফলাইন/এরর fallback হিসেবে থেকে গেছে। প্রতিটি
//         ক্যাটাগরির সামগ্রিক গড় রেটিং ও মোট জমার সংখ্যা লাইভ দেখানো হয়।
// (Modular, শুধু এই পেজের জন্য — অন্য কোনো পেজ/স্ক্রিপ্ট স্পর্শ করে না)
// ============================================================
(function () {
  'use strict';

  var page = document.querySelector('.tm-page');
  if (!page) return;

  // সুপাবেস ক্লায়েন্ট — না থাকলে (স্ক্রিপ্ট লোড ব্যর্থ হলে বা কনফিগ অনুপস্থিত থাকলে)
  // পুরো ফিচারটা নীরবে localStorage-only মোডে চলতে থাকে, কিছু ভাঙে না।
  var sbClient = (window.supabase && window.TANGAIL_SUPABASE)
    ? window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key)
    : null;
  var RATINGS_TABLE = 'tsp_category_ratings';

  var dropdowns = Array.prototype.slice.call(document.querySelectorAll('.tsp-dd'));
  var statusBar = document.getElementById('tspStatusBar');
  var statusText = document.getElementById('tspStatusText');
  var clearBtn = document.getElementById('tspClearFilter');
  var placeholder = document.getElementById('tspPlaceholder');
  var emptyState = document.getElementById('tspEmptyState');
  var grid = document.getElementById('tspGrid');
  var liveRatingBar = document.getElementById('tspLiveRating');
  var liveRatingText = document.getElementById('tspLiveRatingText');

  var SAMPLE_DATA = window.TSP_SAMPLE_DATA || {};
  // যুক্ত হওয়ার ফর্ম থেকে Supabase-এ status=approved হওয়া প্রোফাইল এখানে ক্যাশ হয়ে থাকে
  // (SAMPLE_DATA-এর পাশাপাশি দেখানোর জন্য) — ধাপ ৬ দ্রষ্টব্য
  var LIVE_DATA = {};
  function getCategoryItems(category) {
    return (SAMPLE_DATA[category] || []).concat(LIVE_DATA[category] || []);
  }

  // মানুষের চোখে পড়ার মতো নাম — status bar ও card badge-এ ব্যবহার হবে
  var CATEGORY_LABELS = {
    'everyone': 'সব শিক্ষক ও শিক্ষার্থী',
    'student-all': 'সব Student',
    'student-male': 'ছাত্র',
    'student-female': 'ছাত্রী',
    'teacher-all': 'সব Teacher',
    'teacher-male': 'ছেলে Teacher',
    'teacher-female': 'মেয়ে Teacher'
  };

  // পেজ খোলার সাথে সাথেই এই বিশেষ ক্যাটাগরিটাই ডিফল্ট — কোনো ড্রপডাউন থেকে কিছু
  // সিলেক্ট না করা পর্যন্ত এটি দেখায়, এবং শিক্ষক+শিক্ষার্থী উভয় টেবিল থেকে একসাথে
  // ডেটা টেনে মিশিয়ে দেখায় (নিচে fetchApprovedForCategory()-এ হ্যান্ডল করা হয়েছে)
  var EVERYONE_CATEGORY = 'everyone';

  var activeCategory = null;
  var loadToken = 0; // দ্রুত ক্যাটাগরি পাল্টালে পুরনো skeleton timeout বাতিল করতে ব্যবহৃত হয়

  // ---------- ধাপ ৪: Search + Sort ----------
  var searchBox = document.querySelector('.tsp-search-box');
  var searchInput = document.getElementById('tspSearchInput');
  var searchClearBtn = document.getElementById('tspSearchClear');
  var sortDD = document.querySelector('.tsp-sort-dd');

  var SORT_LABELS = {
    rating: 'রেটিং অনুযায়ী',
    newest: 'সর্বশেষ যোগ হয়েছে',
    reviews: 'সর্বাধিক রিভিউ',
    alpha: 'বর্ণানুক্রমিক (A-Z)'
  };

  var searchQuery = '';
  var activeSort = 'rating';
  var searchDebounceTimer = null;

  function closeAllDropdowns(except) {
    dropdowns.forEach(function (dd) {
      if (dd !== except) {
        dd.classList.remove('open');
        var btn = dd.querySelector('.tsp-dd-btn');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function toggleDropdown(dd) {
    var isOpen = dd.classList.contains('open');
    closeAllDropdowns(dd);
    dd.classList.toggle('open', !isOpen);
    var btn = dd.querySelector('.tsp-dd-btn');
    if (btn) btn.setAttribute('aria-expanded', String(!isOpen));
  }

  function resetSearchBox() {
    searchQuery = '';
    if (searchInput) searchInput.value = '';
    if (searchClearBtn) searchClearBtn.hidden = true;
  }

  // এই ক্যাটাগরির জন্য Supabase-এ জমা হওয়া সব রেটিং থেকে গড় ও মোট সংখ্যা
  // হিসাব করে স্ট্যাটাস বারের নিচে একটা ছোট লাইভ ব্যাজ হিসেবে দেখায়।
  var liveRatingToken = 0;
  function refreshLiveRating(category) {
    if (!liveRatingBar || !liveRatingText) return;
    if (!category || !sbClient) {
      liveRatingBar.hidden = true;
      return;
    }
    var myToken = ++liveRatingToken;
    sbClient.from(RATINGS_TABLE).select('rating').eq('category', category)
      .then(function (res) {
        if (myToken !== liveRatingToken) return; // ইতিমধ্যে অন্য ক্যাটাগরিতে চলে গেছে
        var rows = (res && res.data) || [];
        if (!rows.length) { liveRatingBar.hidden = true; return; }
        var sum = rows.reduce(function (acc, r) { return acc + (Number(r.rating) || 0); }, 0);
        var avg = sum / rows.length;
        liveRatingText.textContent =
          'ব্যবহারকারীদের সামগ্রিক রেটিং: ' + bnDigits(avg.toFixed(1)) +
          ' (' + bnDigits(rows.length) + ' জন রেট করেছেন)';
        liveRatingBar.hidden = false;
      })
      .catch(function () { liveRatingBar.hidden = true; /* fallback — কিছু ভাঙবে না */ });
  }

  // Supabase-এর teachers/students টেবিল থেকে status=approved প্রোফাইল এনে
  // buildCard()-এর কার্ড আকারে ম্যাপ করে — RLS নিজেই শুধু approved সারি ফেরত দেয়।
  function mapTeacherRow(row) {
    return {
      id: 't-' + row.id,
      rawId: row.id,
      type: 'teacher',
      name: row.name,
      gender: row.gender === 'female' ? 'মহিলা' : 'পুরুষ',
      classOrSubject: [row.subject, row.class_range].filter(Boolean).join(' | '),
      institution: row.education || row.medium || '',
      district: row.upazila || '',
      rating: Number(row.rating) || 5,
      reviews: Number(row.reviews) || 0,
      desc: row.bio || ''
    };
  }

  function mapStudentRow(row) {
    return {
      id: 's-' + row.id,
      rawId: row.id,
      type: 'student',
      name: row.name,
      gender: row.gender === 'female' ? 'মেয়ে' : 'ছেলে',
      classOrSubject: [row.class_range, row.required_subject].filter(Boolean).join(' | '),
      institution: row.institution || '',
      district: row.upazila || '',
      rating: 5,
      reviews: 0,
      desc: row.about || ''
    };
  }

  function fetchApprovedForCategory(category) {
    if (!sbClient) return Promise.resolve([]);

    // "সব শিক্ষক ও শিক্ষার্থী" — teachers ও students দুই টেবিল থেকেই একসাথে
    // approved রেকর্ড এনে একটাই মিশ্র তালিকায় দেখানো হয়
    if (category === EVERYONE_CATEGORY) {
      return Promise.all([
        sbClient.from('teachers').select('*').eq('status', 'approved'),
        sbClient.from('students').select('*').eq('status', 'approved')
      ]).then(function (results) {
        var teacherRows = (results[0] && results[0].data) || [];
        var studentRows = (results[1] && results[1].data) || [];
        return teacherRows.map(mapTeacherRow).concat(studentRows.map(mapStudentRow));
      }).catch(function () { return []; });
    }

    var isTeacher = category.indexOf('teacher') === 0;
    var isAllGenders = category.indexOf('-all') !== -1;
    var gender = category.indexOf('-male') !== -1 ? 'male' : 'female';
    var table = isTeacher ? 'teachers' : 'students';
    var query = sbClient.from(table).select('*').eq('status', 'approved');
    if (!isAllGenders) query = query.eq('gender', gender);
    return query
      .then(function (res) {
        if (!res || res.error || !res.data) return [];
        return res.data.map(isTeacher ? mapTeacherRow : mapStudentRow);
      })
      .catch(function () { return []; });
  }

  function selectCategory(value) {
    activeCategory = value;
    resetSearchBox(); // নতুন ক্যাটাগরিতে আগের সার্চ টেক্সট বহন করে না
    refreshLiveRating(value);

    // সব ড্রপডাউনের নিজস্ব active/selected স্টেট রিসেট করে শুধু সঠিকটা বসানো —
    // একসাথে একাধিক ক্যাটাগরি সিলেক্ট করা যাবে না (spec অনুযায়ী)
    dropdowns.forEach(function (dd) {
      var opts = dd.querySelectorAll('.tsp-dd-opt');
      var matched = false;
      opts.forEach(function (opt) {
        var isMatch = opt.getAttribute('data-value') === value;
        opt.classList.toggle('selected', isMatch);
        opt.setAttribute('aria-selected', String(isMatch));
        if (isMatch) matched = true;
      });
      dd.classList.toggle('tsp-dd-active', matched);
      var label = dd.querySelector('.tsp-dd-label');
      if (matched && label) {
        label.textContent = CATEGORY_LABELS[value];
      } else if (label) {
        label.textContent = dd.getAttribute('data-default-label');
      }
    });

    closeAllDropdowns(null);
    updateResultsArea();
  }

  function clearCategory() {
    activeCategory = EVERYONE_CATEGORY;
    if (liveRatingBar) liveRatingBar.hidden = true;
    dropdowns.forEach(function (dd) {
      dd.classList.remove('tsp-dd-active');
      var label = dd.querySelector('.tsp-dd-label');
      if (label) label.textContent = dd.getAttribute('data-default-label');
      dd.querySelectorAll('.tsp-dd-opt').forEach(function (opt) {
        opt.classList.remove('selected');
        opt.setAttribute('aria-selected', 'false');
      });
    });
    updateResultsArea();
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function bnDigits(num) {
    var map = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, function (d) { return map[+d]; });
  }

  function starIcons(rating) {
    var full = Math.round(rating * 2) / 2; // nearest 0.5 এর কাছাকাছি
    var html = '';
    for (var i = 1; i <= 5; i++) {
      if (full >= i) html += '<i class="fa-solid fa-star" aria-hidden="true"></i>';
      else if (full >= i - 0.5) html += '<i class="fa-solid fa-star-half-stroke" aria-hidden="true"></i>';
      else html += '<i class="fa-regular fa-star" aria-hidden="true"></i>';
    }
    return html;
  }

  function buildCard(item, category, index) {
    // মিশ্র (সব শিক্ষক+শিক্ষার্থী) তালিকায় category একটাই থাকে ('everyone'),
    // তাই আসল teacher/student পার্থক্য বোঝার জন্য প্রথমে item.type দেখা হয়,
    // না থাকলে (পুরনো ডেটার জন্য fallback) category থেকে অনুমান করা হয়
    var isTeacher = item.type ? item.type === 'teacher' : category.indexOf('teacher') === 0;
    var badgeClass = isTeacher ? 'tsp-badge-teacher' : 'tsp-badge-student';
    var badgeLabel = isTeacher ? 'শিক্ষক' : 'শিক্ষার্থী';
    var initial = (item.name || '?').trim().charAt(0);

    var card = document.createElement('article');
    card.className = 'tsp-card';
    card.style.setProperty('--tsp-card-delay', Math.min(index, 8) * 45 + 'ms');
    card.innerHTML =
      '<div class="tsp-card-top">' +
        '<div class="tsp-avatar" aria-hidden="true">' + escapeHtml(initial) + '</div>' +
        '<div class="tsp-card-id">' +
          '<div class="tsp-card-name">' + escapeHtml(item.name) +
            '<span class="tsp-badge ' + badgeClass + '">' + badgeLabel + '</span>' +
          '</div>' +
          '<div class="tsp-card-gender">' + escapeHtml(item.gender) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="tsp-card-meta">' +
        '<span><i class="fa-solid fa-book" aria-hidden="true"></i>' + escapeHtml(item.classOrSubject) + '</span>' +
        '<span><i class="fa-solid fa-school" aria-hidden="true"></i>' + escapeHtml(item.institution) + '</span>' +
        '<span><i class="fa-solid fa-location-dot" aria-hidden="true"></i>' + escapeHtml(item.district) + '</span>' +
      '</div>' +
      '<div class="tsp-card-rating">' +
        starIcons(item.rating) +
        '<span>' + bnDigits(item.rating.toFixed(1)) + '</span>' +
        '<small>(' + bnDigits(item.reviews) + ' রিভিউ)</small>' +
      '</div>' +
      '<p class="tsp-card-desc">' + escapeHtml(item.desc) + '</p>' +
      '<button type="button" class="tsp-card-view" data-name="' + escapeHtml(item.name) + '">' +
        'প্রোফাইল দেখুন <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>' +
      '</button>';

    var viewBtn = card.querySelector('.tsp-card-view');
    if (viewBtn) {
      viewBtn.addEventListener('click', function () {
        if (item.rawId) {
          var profilePage = isTeacher ? 'teacher-profile.html' : 'student-profile.html';
          window.location.href = profilePage + '?id=' + encodeURIComponent(item.rawId);
        } else {
          // rawId না থাকলে (যেমন ভবিষ্যতে কোনো ডেমো এন্ট্রি যোগ হলে) আগের মতোই টোস্ট দেখানো হবে
          showToast(item.name + ' — বিস্তারিত প্রোফাইল পেজ শীঘ্রই যুক্ত হবে।');
        }
      });
    }
    return card;
  }

  function renderSkeleton(count) {
    if (!grid) return;
    grid.innerHTML = '';
    for (var i = 0; i < count; i++) {
      var sk = document.createElement('div');
      sk.className = 'tsp-skeleton-card';
      sk.innerHTML =
        '<div class="tsp-skel-row">' +
          '<div class="tsp-skel tsp-skel-avatar"></div>' +
          '<div class="tsp-skel-lines">' +
            '<div class="tsp-skel tsp-skel-line w-60"></div>' +
            '<div class="tsp-skel tsp-skel-line w-40"></div>' +
          '</div>' +
        '</div>' +
        '<div class="tsp-skel tsp-skel-block w-80"></div>' +
        '<div class="tsp-skel tsp-skel-block"></div>' +
        '<div class="tsp-skel tsp-skel-block w-80"></div>' +
        '<div class="tsp-skel tsp-skel-btn"></div>';
      grid.appendChild(sk);
    }
    grid.hidden = false;
  }

  function renderCards(items, category) {
    if (!grid) return;
    grid.innerHTML = '';
    items.forEach(function (item, i) {
      grid.appendChild(buildCard(item, category, i));
    });
    grid.hidden = false;
  }

  var toastEl = null;
  var toastTimer = null;
  function showToast(message) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'tsp-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    // reflow যাতে বারবার ক্লিকে transition ঠিকভাবে রিস্টার্ট হয়
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 2200);
  }

  function normalize(str) {
    return String(str == null ? '' : str).toLowerCase().trim();
  }

  function matchesSearch(item, query) {
    if (!query) return true;
    var nq = normalize(query);
    return normalize(item.name).indexOf(nq) !== -1 ||
      normalize(item.district).indexOf(nq) !== -1 ||
      normalize(item.institution).indexOf(nq) !== -1 ||
      normalize(item.classOrSubject).indexOf(nq) !== -1;
  }

  function sortItems(items, sortKey) {
    var arr = items.slice();
    switch (sortKey) {
      case 'newest':
        // মূল অ্যারেতে পরে যোগ হওয়া প্রোফাইল শেষে থাকে ধরে নিয়ে — উল্টে দিলে নতুনগুলো আগে আসে
        arr.reverse();
        break;
      case 'reviews':
        arr.sort(function (a, b) { return b.reviews - a.reviews; });
        break;
      case 'alpha':
        arr.sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'bn'); });
        break;
      case 'rating':
      default:
        arr.sort(function (a, b) { return b.rating - a.rating; });
    }
    return arr;
  }

  function toggleSearchSortEnabled(enabled) {
    if (searchBox) searchBox.classList.toggle('tsp-disabled', !enabled);
    if (searchInput) searchInput.disabled = !enabled;
    if (sortDD) {
      sortDD.classList.toggle('tsp-disabled', !enabled);
      var sBtn = sortDD.querySelector('.tsp-dd-btn');
      if (sBtn) sBtn.disabled = !enabled;
    }
  }

  function updateStatusBar(shown, total) {
    if (!statusBar || !statusText) return;
    var label = CATEGORY_LABELS[activeCategory];
    if (searchQuery) {
      statusText.textContent = 'নির্বাচিত ক্যাটাগরি: ' + label + ' — ' +
        bnDigits(shown) + ' টি ফলাফল (মোট ' + bnDigits(total) + ')';
    } else {
      statusText.textContent = 'নির্বাচিত ক্যাটাগরি: ' + label + ' — মোট ' + bnDigits(total) + ' টি প্রোফাইল';
    }
    statusBar.hidden = false;
  }

  function showEmpty(isSearchEmpty) {
    if (!emptyState) return;
    var p = emptyState.querySelector('p');
    var icon = emptyState.querySelector('i');
    if (isSearchEmpty) {
      if (p) p.textContent = '"' + searchQuery + '" — এই লেখার সাথে মিলে এমন কোনো প্রোফাইল পাওয়া যায়নি।';
      if (icon) icon.className = 'fa-solid fa-magnifying-glass tsp-empty-ic';
    } else {
      if (p) p.textContent = 'এই ক্যাটাগরিতে এখনো কোনো প্রোফাইল যোগ করা হয়নি।';
      if (icon) icon.className = 'fa-regular fa-folder-open tsp-empty-ic';
    }
    emptyState.hidden = false;
  }

  // ক্যাটাগরি পাল্টানোর সময় ডাকা হয় — Skeleton Loading সহ পুরো তালিকা রিলোড করে
  function updateResultsArea() {
    loadToken++;
    var myToken = loadToken;

    toggleSearchSortEnabled(!!activeCategory);

    if (!activeCategory) {
      if (statusBar) statusBar.hidden = true;
      if (placeholder) placeholder.hidden = false;
      if (emptyState) emptyState.hidden = true;
      if (grid) { grid.hidden = true; grid.innerHTML = ''; }
      resetSearchBox();
      return;
    }

    if (placeholder) placeholder.hidden = true;

    // সংক্ষিপ্ত Skeleton Loading — নতুন ডেটা লোড হচ্ছে এমন অনুভূতি দিতে ও
    // দ্রুত connection-এও একটা স্মুথ transition তৈরি করতে; একই সময়ে Supabase
    // থেকে status=approved হওয়া নতুন যুক্ত হওয়া প্রোফাইলও লোড হয়
    renderSkeleton(Math.min((SAMPLE_DATA[activeCategory] || []).length || 3, 6));
    var minDelay = new Promise(function (res) { setTimeout(res, 320); });
    Promise.all([fetchApprovedForCategory(activeCategory), minDelay]).then(function (results) {
      if (myToken !== loadToken) return; // ইতিমধ্যে অন্য ক্যাটাগরি সিলেক্ট হয়ে গেছে
      LIVE_DATA[activeCategory] = results[0];
      renderFilteredResults();
    });
  }

  // সার্চ/সর্ট পরিবর্তনের সময় ডাকা হয় — একই ক্যাটাগরির মধ্যেই তাৎক্ষণিক
  // (No page reload) ফিল্টার/সর্ট করে, Skeleton ছাড়াই ইনস্ট্যান্ট আপডেট
  function renderFilteredResults() {
    if (!activeCategory) return;
    var rawItems = getCategoryItems(activeCategory);
    if (rawItems.length === 0) {
      updateStatusBar(0, 0);
      if (grid) { grid.hidden = true; grid.innerHTML = ''; }
      showEmpty(false);
      return;
    } // updateResultsArea ইতিমধ্যে এম্পটি-স্টেট দেখিয়েছে

    var filtered = rawItems.filter(function (item) { return matchesSearch(item, searchQuery); });
    var sorted = sortItems(filtered, activeSort);

    updateStatusBar(sorted.length, rawItems.length);

    if (sorted.length === 0) {
      if (grid) { grid.hidden = true; grid.innerHTML = ''; }
      showEmpty(true);
      return;
    }
    if (emptyState) emptyState.hidden = true;
    renderCards(sorted, activeCategory);
  }

  function selectSort(value) {
    activeSort = value;
    if (sortDD) {
      var label = sortDD.querySelector('.tsp-dd-label');
      if (label) label.textContent = SORT_LABELS[value];
      sortDD.querySelectorAll('.tsp-dd-opt').forEach(function (opt) {
        var isMatch = opt.getAttribute('data-value') === value;
        opt.classList.toggle('selected', isMatch);
        opt.setAttribute('aria-selected', String(isMatch));
      });
    }
    closeAllDropdowns(null);
    renderFilteredResults(); // তাৎক্ষণিক রি-সর্ট — Skeleton দরকার নেই
  }

  // ---------- Event bindings ----------
  dropdowns.forEach(function (dd) {
    var btn = dd.querySelector('.tsp-dd-btn');
    if (btn) {
      btn.addEventListener('click', function (e) {
        if (btn.disabled) return;
        e.stopPropagation();
        toggleDropdown(dd);
      });
    }
    var isSortDD = dd.getAttribute('data-dd') === 'sort';
    dd.querySelectorAll('.tsp-dd-opt').forEach(function (opt) {
      opt.addEventListener('click', function (e) {
        e.stopPropagation();
        if (isSortDD) {
          selectSort(opt.getAttribute('data-value'));
        } else {
          selectCategory(opt.getAttribute('data-value'));
        }
      });
    });
  });

  // ---------- ধাপ ৪: Search বাইন্ডিং ----------
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      if (searchClearBtn) searchClearBtn.hidden = !searchInput.value;
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(function () {
        searchQuery = searchInput.value.trim();
        renderFilteredResults();
      }, 180); // হালকা debounce — প্রতিটা key-stroke-এ নয়, টাইপিং থামলে সার্চ হবে
    });
  }
  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', function () {
      resetSearchBox();
      renderFilteredResults();
      if (searchInput) searchInput.focus();
    });
  }

  document.addEventListener('click', function () {
    closeAllDropdowns(null);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (joinModal && joinModal.classList.contains('open')) { closeModal(joinModal); return; }
      if (categoryModal && categoryModal.classList.contains('open')) { closeModal(categoryModal); return; }
      closeAllDropdowns(null);
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', clearCategory);
  }

  // ============================================================
  // ধাপ ৩ (নতুন): Floating যুক্ত হওয়ার বাটন + ক্যাটাগরি সিলেকশন মোডাল +
  //         যুক্ত হওয়ার ফর্ম — সরাসরি Supabase-এর teachers/students
  //         টেবিলে জমা হয় (status='approved' — অনুমোদনের প্রয়োজন নেই,
  //         জমা দেওয়া মাত্রই পাবলিক তালিকায় দেখা যায়)
  // ============================================================
  var fabJoin = document.getElementById('tspFabJoin');
  var categoryModal = document.getElementById('tspCategoryModal');
  var categoryModalClose = document.getElementById('tspCategoryModalClose');
  var categoryRadios = categoryModal
    ? Array.prototype.slice.call(categoryModal.querySelectorAll('input[name="tspRateCategory"]'))
    : [];
  var categoryContinueBtn = document.getElementById('tspCategoryContinue');

  var joinModal = document.getElementById('tspJoinModal');
  var joinModalClose = document.getElementById('tspJoinModalClose');
  var joinCategoryLabel = document.getElementById('tspJoinCategoryLabel');
  var joinName = document.getElementById('tspJoinName');
  var joinPhone = document.getElementById('tspJoinPhone');
  var joinFieldA = document.getElementById('tspJoinFieldA');
  var joinFieldALabel = document.getElementById('tspJoinFieldALabel');
  var joinFieldB = document.getElementById('tspJoinFieldB');
  var joinFieldBLabel = document.getElementById('tspJoinFieldBLabel');
  var joinFieldC = document.getElementById('tspJoinFieldC');
  var joinFieldCLabel = document.getElementById('tspJoinFieldCLabel');
  var joinFieldD = document.getElementById('tspJoinFieldD');
  var joinFieldDLabel = document.getElementById('tspJoinFieldDLabel');
  var joinFieldEGroup = document.getElementById('tspJoinFieldEGroup');
  var joinFieldE = document.getElementById('tspJoinFieldE');
  var joinFieldFGroup = document.getElementById('tspJoinFieldFGroup');
  var joinFieldF = document.getElementById('tspJoinFieldF');
  var joinUpazila = document.getElementById('tspJoinUpazila');
  var joinAbout = document.getElementById('tspJoinAbout');
  var joinAboutLabel = document.getElementById('tspJoinAboutLabel');
  var joinError = document.getElementById('tspJoinError');
  var joinCancelBtn = document.getElementById('tspJoinCancel');
  var joinSubmitBtn = document.getElementById('tspJoinSubmit');

  var selectedJoinCategory = null;
  var lastFocusedEl = null;

  function isAnyTspModalOpen() {
    return (categoryModal && categoryModal.classList.contains('open')) ||
           (joinModal && joinModal.classList.contains('open'));
  }

  function openModal(modal) {
    if (!modal) return;
    lastFocusedEl = document.activeElement;
    modal.hidden = false;
    // reflow যাতে পরে .open ক্লাস যোগ করলে transition ঠিকভাবে কাজ করে
    void modal.offsetWidth;
    modal.classList.add('open');
    document.body.classList.add('tsp-modal-open');
    var focusable = modal.querySelector('input, button, textarea');
    if (focusable) focusable.focus();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    modal.hidden = true;
    if (!isAnyTspModalOpen()) {
      document.body.classList.remove('tsp-modal-open');
    }
    if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
      lastFocusedEl.focus();
    }
  }

  function setRadioSelected(value) {
    categoryRadios.forEach(function (r) {
      var opt = r.closest('.tsp-radio-opt');
      var isMatch = r.value === value;
      r.checked = isMatch;
      if (opt) opt.classList.toggle('selected', isMatch);
    });
    if (categoryContinueBtn) categoryContinueBtn.disabled = !value;
  }

  function resetCategoryModal() {
    setRadioSelected(null);
  }

  // নির্বাচিত ক্যাটাগরি (ছাত্র/শিক্ষক) অনুযায়ী ফর্মের লেবেল ও ফিল্ড বদলায় —
  // যেই ক্যাটাগরিতে ফর্ম পূরণ হবে, সেই ক্যাটাগরিতেই (উপরের Student/Teacher
  // ড্রপডাউন থেকে নির্বাচন করলে) প্রোফাইলটি দেখা যাবে
  function applyJoinFormRole(category) {
    var isTeacher = category.indexOf('teacher') === 0;
    if (isTeacher) {
      if (joinFieldALabel) joinFieldALabel.textContent = 'শিক্ষাগত যোগ্যতা';
      if (joinFieldA) joinFieldA.placeholder = 'যেমনঃ বি.এসসি (অনার্স), এম.এসসি';
      if (joinFieldBLabel) joinFieldBLabel.textContent = 'ক্লাস রেঞ্জ';
      if (joinFieldB) joinFieldB.placeholder = 'যেমনঃ ৬ষ্ঠ–SSC';
      if (joinFieldCLabel) joinFieldCLabel.textContent = 'বিষয়';
      if (joinFieldC) joinFieldC.placeholder = 'যেমনঃ গণিত, ইংরেজি';
      if (joinFieldDLabel) joinFieldDLabel.textContent = 'প্রত্যাশিত বেতন (৳/মাস)';
      if (joinFieldEGroup) joinFieldEGroup.hidden = false;
      if (joinFieldFGroup) joinFieldFGroup.hidden = false;
      if (joinAboutLabel) joinAboutLabel.textContent = 'নিজের সম্পর্কে লিখুন (বায়ো)';
    } else {
      if (joinFieldALabel) joinFieldALabel.textContent = 'প্রতিষ্ঠানের নাম';
      if (joinFieldA) joinFieldA.placeholder = 'যেমনঃ টাঙ্গাইল সরকারি উচ্চ বিদ্যালয়';
      if (joinFieldBLabel) joinFieldBLabel.textContent = 'ক্লাস / শ্রেণী';
      if (joinFieldB) joinFieldB.placeholder = 'যেমনঃ ক্লাস ৯ম';
      if (joinFieldCLabel) joinFieldCLabel.textContent = 'প্রয়োজনীয় বিষয়';
      if (joinFieldC) joinFieldC.placeholder = 'যেমনঃ গণিত, বিজ্ঞান';
      if (joinFieldDLabel) joinFieldDLabel.textContent = 'মাসিক বাজেট (৳)';
      if (joinFieldEGroup) joinFieldEGroup.hidden = true;
      if (joinFieldFGroup) joinFieldFGroup.hidden = true;
      if (joinAboutLabel) joinAboutLabel.textContent = 'নিজের সম্পর্কে লিখুন';
    }
  }

  function resetJoinForm() {
    if (joinName) joinName.value = '';
    if (joinPhone) joinPhone.value = '';
    if (joinFieldA) joinFieldA.value = '';
    if (joinFieldB) joinFieldB.value = '';
    if (joinFieldC) joinFieldC.value = '';
    if (joinFieldD) joinFieldD.value = '';
    if (joinFieldE) joinFieldE.value = '';
    if (joinFieldF) joinFieldF.value = 'offline';
    if (joinUpazila) joinUpazila.value = '';
    if (joinAbout) joinAbout.value = '';
    if (joinError) joinError.hidden = true;
  }

  // FAB ক্লিক করলে ক্যাটাগরি মোডাল খোলে — যদি ইতিমধ্যে উপরে কোনো
  // ক্যাটাগরি ফিল্টার করা থাকে, সেটাই প্রি-সিলেক্ট করে রাখে
  if (fabJoin) {
    fabJoin.addEventListener('click', function () {
      resetCategoryModal();
      if (activeCategory) setRadioSelected(activeCategory);
      openModal(categoryModal);
    });
  }

  categoryRadios.forEach(function (r) {
    r.addEventListener('change', function () {
      if (r.checked) setRadioSelected(r.value);
    });
  });

  if (categoryContinueBtn) {
    categoryContinueBtn.addEventListener('click', function () {
      var checked = categoryRadios.filter(function (r) { return r.checked; })[0];
      if (!checked) return;
      selectedJoinCategory = checked.value;
      closeModal(categoryModal);
      resetJoinForm();
      applyJoinFormRole(selectedJoinCategory);
      if (joinCategoryLabel) {
        joinCategoryLabel.textContent = 'ক্যাটাগরি: ' + CATEGORY_LABELS[selectedJoinCategory];
      }
      openModal(joinModal);
    });
  }

  // localStorage-এ ব্যাকআপ হিসেবে সংরক্ষণ — Supabase কল ব্যর্থ হলে বা
  // ক্লায়েন্ট অনুপলব্ধ থাকলেও ইউজারের জমা দেওয়া আবেদন হারিয়ে যায় না।
  function saveJoinLocally(table, payload) {
    try {
      var key = 'tsp_' + table + '_pending';
      var list = JSON.parse(localStorage.getItem(key) || '[]');
      list.push(payload);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) { /* localStorage অনুপলব্ধ হলে নীরবে উপেক্ষা করা হলো */ }
  }

  if (joinSubmitBtn) {
    joinSubmitBtn.addEventListener('click', function () {
      var name = (joinName && joinName.value || '').trim();
      var phone = (joinPhone && joinPhone.value || '').trim();
      if (!name || !phone) {
        if (joinError) joinError.hidden = false;
        return;
      }
      if (joinError) joinError.hidden = true;

      var category = selectedJoinCategory;
      var isTeacher = category.indexOf('teacher') === 0;
      var gender = category.indexOf('-male') !== -1 ? 'male' : 'female';
      var table = isTeacher ? 'teachers' : 'students';

      var payload = isTeacher ? {
        name: name,
        phone: phone,
        gender: gender,
        subject: (joinFieldC && joinFieldC.value || '').trim(),
        class_range: (joinFieldB && joinFieldB.value || '').trim(),
        education: (joinFieldA && joinFieldA.value || '').trim(),
        monthly_fee: Number(joinFieldD && joinFieldD.value) || 0,
        experience_years: Number(joinFieldE && joinFieldE.value) || 0,
        mode: (joinFieldF && joinFieldF.value) || 'offline',
        upazila: (joinUpazila && joinUpazila.value || '').trim(),
        bio: (joinAbout && joinAbout.value || '').trim(),
        status: 'approved' // অনুমোদনের প্রয়োজন নেই — জমা দেওয়া মাত্রই পাবলিক তালিকায় দেখা যাবে
      } : {
        name: name,
        phone: phone,
        gender: gender,
        institution: (joinFieldA && joinFieldA.value || '').trim(),
        class_range: (joinFieldB && joinFieldB.value || '').trim(),
        required_subject: (joinFieldC && joinFieldC.value || '').trim(),
        budget: Number(joinFieldD && joinFieldD.value) || 0,
        upazila: (joinUpazila && joinUpazila.value || '').trim(),
        about: (joinAbout && joinAbout.value || '').trim(),
        status: 'approved' // অনুমোদনের প্রয়োজন নেই — জমা দেওয়া মাত্রই পাবলিক তালিকায় দেখা যাবে
      };

      joinSubmitBtn.disabled = true;

      function finishSubmit() {
        joinSubmitBtn.disabled = false;
        closeModal(joinModal);
        showToast('ধন্যবাদ! আপনার প্রোফাইল সফলভাবে যুক্ত হয়েছে।');
        if (category === activeCategory) updateResultsArea(); // তালিকায় থাকলে তাৎক্ষণিক রিফ্রেশ করে নতুন প্রোফাইল দেখায়
      }

      if (sbClient) {
        sbClient.from(table).insert(payload).then(function (res) {
          if (res && res.error) saveJoinLocally(table, payload); // insert ব্যর্থ হলে fallback
          finishSubmit();
        }).catch(function () {
          saveJoinLocally(table, payload);
          finishSubmit();
        });
      } else {
        saveJoinLocally(table, payload);
        finishSubmit();
      }
    });
  }

  if (joinCancelBtn) joinCancelBtn.addEventListener('click', function () { closeModal(joinModal); });
  if (categoryModalClose) categoryModalClose.addEventListener('click', function () { closeModal(categoryModal); });
  if (joinModalClose) joinModalClose.addEventListener('click', function () { closeModal(joinModal); });

  [categoryModal, joinModal].forEach(function (modal) {
    if (!modal) return;
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal(modal);
    });
  });

  // প্রাথমিক অবস্থা — ডিফল্টভাবে "সব শিক্ষক ও শিক্ষার্থী" (উভয় টেবিল একসাথে মিশিয়ে)
  // দেখানো হয়, যাতে পেজ খোলার সাথে সাথেই কোনো ড্রপডাউন সিলেক্ট না করেও সবাই দেখা যায়
  selectCategory(EVERYONE_CATEGORY);
})();
