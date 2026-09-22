// টাঙ্গাইল জেলা — প্রতিটা পেজের সার্চ বারে স্মার্ট সাজেশন ড্রপডাউন জুড়ে দেওয়া
// টাইপ করার সাথে সাথে সঠিক পেজ সাজেস্ট করে (বানান ভুল হলেও, বা স্বাভাবিক ভাষায় লিখলেও)
(function () {
  var form = document.getElementById('searchForm');
  var input = document.getElementById('searchInput');
  if (!form || !input || !window.TZSmartSearch) return;

  var box = document.createElement('div');
  box.className = 'search-suggest';
  box.setAttribute('role', 'listbox');
  form.appendChild(box);

  var activeIndex = -1;
  var currentResults = [];
  var debounceTimer = null;
  var aiThinking = false;

  // Supabase Edge Function এর ঠিকানা (real AI দিয়ে প্রাকৃতিক-ভাষা বোঝার জন্য, ঐচ্ছিক)
  var AI_ENDPOINT = (window.TANGAIL_SUPABASE && window.TANGAIL_SUPABASE.url)
    ? window.TANGAIL_SUPABASE.url + '/functions/v1/ai-search'
    : null;

  function currentPage() {
    return (location.pathname.split('/').pop() || 'index.html');
  }

  function findEntryByUrl(url) {
    var idx = window.TZ_SEARCH_INDEX || [];
    for (var i = 0; i < idx.length; i++) {
      if (idx[i].url === url) return idx[i];
    }
    return null;
  }

  function showThinking() {
    aiThinking = true;
    box.innerHTML = '<div class="search-suggest-loading">🤖 AI বুঝে দেখছে...</div>';
    box.classList.add('open');
  }

  function hideThinking() {
    aiThinking = false;
  }

  // স্থানীয় ফাজি-ম্যাচিং যথেষ্ট নিশ্চিত না হলে, এবং লেখাটা একটা পূর্ণ বাক্যের মতো লম্বা হলে,
  // Anthropic AI (Supabase Edge Function এর মাধ্যমে) দিয়ে বুঝে সঠিক পেজ খোঁজা হয়।
  // এই ফাংশন ডিপ্লয় করা না থাকলে বা ব্যর্থ হলে চুপচাপ থেমে যাবে — সাইটের বাকি অংশে কোনো প্রভাব পড়বে না।
  function aiLookup(query) {
    if (!AI_ENDPOINT || !window.TANGAIL_SUPABASE.key) return Promise.resolve(null);
    return fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'apikey': window.TANGAIL_SUPABASE.key,
        'authorization': 'Bearer ' + window.TANGAIL_SUPABASE.key
      },
      body: JSON.stringify({ query: query })
    }).then(function (r) { return r.json(); }).catch(function () { return null; });
  }

  function render(results) {
    currentResults = results;
    activeIndex = -1;
    if (!results.length) {
      box.classList.remove('open');
      box.innerHTML = '';
      return;
    }
    box.innerHTML = results.map(function (r, i) {
      var e = r.entry;
      return '<button type="button" class="search-suggest-item" data-idx="' + i + '">' +
        '<span class="ssi-icon" aria-hidden="true">' + (e.icon || '🔎') + '</span>' +
        '<span class="ssi-text"><span class="ssi-title"></span>' +
        '<span class="ssi-cat"></span></span>' +
        '</button>';
    }).join('');
    // XSS এড়াতে টাইটেল/ক্যাটাগরি টেক্সট textContent দিয়ে বসানো হচ্ছে
    var items = box.querySelectorAll('.search-suggest-item');
    items.forEach(function (item, i) {
      item.querySelector('.ssi-title').textContent = results[i].entry.title;
      item.querySelector('.ssi-cat').textContent = results[i].entry.category || '';
    });
    box.classList.add('open');
  }

  function go(entry) {
    if (!entry) return;
    box.classList.remove('open');
    if (entry.url === currentPage()) return;
    window.location.href = entry.url;
  }

  function updateActive(items) {
    items.forEach(function (it, i) { it.classList.toggle('active', i === activeIndex); });
    if (activeIndex >= 0 && items[activeIndex]) {
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  input.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    var q = input.value;
    debounceTimer = setTimeout(function () {
      if (q.trim().length < 2) { render([]); return; }
      render(window.TZSmartSearch.search(q, 6));
    }, 120);
  });

  input.addEventListener('keydown', function (e) {
    if (!box.classList.contains('open')) return;
    var items = box.querySelectorAll('.search-suggest-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      updateActive(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActive(items);
    } else if (e.key === 'Escape') {
      box.classList.remove('open');
    }
  });

  box.addEventListener('click', function (e) {
    var btn = e.target.closest('.search-suggest-item');
    if (!btn) return;
    var idx = Number(btn.getAttribute('data-idx'));
    go(currentResults[idx] && currentResults[idx].entry);
  });

  // ফর্ম সাবমিট (এন্টার চাপা / খুঁজুন বাটন) হলে — সরাসরি সবচেয়ে মিলে যাওয়া পেজে নিয়ে যাওয়া হয়
  form.addEventListener('submit', function (e) {
    if (activeIndex >= 0 && currentResults[activeIndex]) {
      e.preventDefault();
      go(currentResults[activeIndex].entry);
      return;
    }
    if (currentResults.length && currentResults[0].score >= 6) {
      e.preventDefault();
      go(currentResults[0].entry);
      return;
    }
    // স্থানীয়ভাবে ভালো মিল পাওয়া না গেলে, আর লেখাটা একটা পূর্ণ প্রশ্ন/বাক্যের মতো লম্বা হলে —
    // AI দিয়ে বোঝার চেষ্টা করা হয় (AI ফাংশন ডিপ্লয় করা থাকলে)
    var q = input.value.trim();
    if (q.length >= 6 && AI_ENDPOINT) {
      e.preventDefault();
      showThinking();
      aiLookup(q).then(function (res) {
        hideThinking();
        var entry = res && res.match ? findEntryByUrl(res.match) : null;
        if (entry && res.confidence >= 0.5) {
          go(entry);
        } else {
          box.classList.remove('open');
        }
        // না মিললে — আগের মতোই এই পেজের ভেতরের তালিকা-ফিল্টার (script.js, input ইভেন্টে আগেই চলেছে) থেকে যাবে
      });
    }
    // মিল যথেষ্ট শক্তিশালী না হলে ও AI না থাকলে — আগের মতোই এই পেজের ভেতরে তালিকা ফিল্টার হবে (script.js)
  });

  document.addEventListener('click', function (e) {
    if (!form.contains(e.target)) {
      box.classList.remove('open');
    }
  });
})();
