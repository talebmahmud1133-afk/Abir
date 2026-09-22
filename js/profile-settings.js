// টাঙ্গাইল জেলা — প্রাইভেসি সেটিংস (ইউজার প্রোফাইল সিস্টেম, ধাপ ৪)
// profiles টেবিলের is_public / show_address / show_phone কলাম পড়ে ও আপডেট করে।
// RLS: শুধু নিজের row (auth.uid() = id) আপডেট করা যায়; is_verified/role ট্রিগারে সুরক্ষিত — এখানে ছোঁয়া হয় না।
(function () {
  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);

  var loadingEl = document.getElementById('psLoading');
  var cardEl = document.getElementById('psCard');
  var msgEl = document.getElementById('psMsg');
  var noUsernameEl = document.getElementById('psNoUsername');
  var optPublic = document.getElementById('optPublic');
  var optAddress = document.getElementById('optAddress');
  var optPhone = document.getElementById('optPhone');
  var switches = [optPublic, optAddress, optPhone];

  var userId = null;
  var hasUsername = false;
  var busy = false;

  function setMsg(text, ok) {
    msgEl.textContent = text || '';
    msgEl.className = 'auth-msg ps-status' + (ok ? ' ok' : '');
  }

  // is_public বন্ধ থাকলে ঠিকানা/ফোনের সুইচ অর্থহীন — ধূসর করে দেওয়া হয় (মান অপরিবর্তিত থাকে)
  function syncDependentRows() {
    var publicOn = optPublic.checked;
    [['rowAddress', optAddress], ['rowPhone', optPhone]].forEach(function (pair) {
      document.getElementById(pair[0]).classList.toggle('is-disabled', !publicOn);
    });
  }

  function setSwitchesDisabled(disabled) {
    switches.forEach(function (el) { el.disabled = disabled; });
  }

  function applyRow(row) {
    optPublic.checked = row.is_public !== false;     // null/undefined হলে ডিফল্ট true (ডাটাবেজ ডিফল্টের মতো)
    optAddress.checked = row.show_address === true;
    optPhone.checked = row.show_phone === true;
    hasUsername = !!row.username;
    noUsernameEl.hidden = hasUsername;
    var viewLink = document.getElementById('psViewPublic');
    if (viewLink) {
      viewLink.hidden = !hasUsername;
      if (hasUsername) { viewLink.href = 'public-profile.html?u=' + encodeURIComponent(row.username); }
    }
    syncDependentRows();
  }

  client.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (!session) { window.location.href = 'login.html?next=profile-settings.html'; return; }
    userId = session.user.id;

    client.from('profiles')
      .select('username, is_public, show_address, show_phone')
      .eq('id', userId).maybeSingle()
      .then(function (r) {
        loadingEl.hidden = true;
        cardEl.hidden = false;
        if (r.error || !r.data) {
          setMsg('সেটিংস লোড করা যায়নি' + (r.error && r.error.message ? ': ' + r.error.message : ' — প্রোফাইল রেকর্ড পাওয়া যায়নি।'));
          return;
        }
        applyRow(r.data);
        setSwitchesDisabled(false);
      });
  });

  // প্রতিটি সুইচ বদলালেই সাথে সাথে সেভ; ব্যর্থ হলে আগের অবস্থায় ফিরিয়ে দেওয়া হয়
  switches.forEach(function (el) {
    el.addEventListener('change', function () {
      if (busy || !userId) { el.checked = !el.checked; return; }
      var col = el.getAttribute('data-col');
      var value = el.checked;
      var payload = {};
      payload[col] = value;

      busy = true;
      setSwitchesDisabled(true);
      setMsg('সংরক্ষণ হচ্ছে…', true);

      client.from('profiles').update(payload).eq('id', userId).select('is_public, show_address, show_phone')
        .then(function (r) {
          if (r.error || !r.data || !r.data.length) {
            el.checked = !value;                    // রিভার্ট
            setMsg('সংরক্ষণ করা যায়নি' + (r.error && r.error.message ? ': ' + r.error.message : '।'));
            return;
          }
          var row = r.data[0];
          optPublic.checked = row.is_public !== false;
          optAddress.checked = row.show_address === true;
          optPhone.checked = row.show_phone === true;
          setMsg(col === 'is_public' && !value
            ? 'আপনার প্রোফাইল এখন পাবলিক নয়।'
            : 'সংরক্ষণ হয়েছে।', true);
        })
        .catch(function () {
          el.checked = !value;
          setMsg('নেটওয়ার্ক সমস্যা — সংরক্ষণ করা যায়নি।');
        })
        .finally(function () {
          busy = false;
          setSwitchesDisabled(false);
          syncDependentRows();
        });
    });
  });

  client.auth.onAuthStateChange(function (event, session) {
    if (event === 'SIGNED_OUT' || !session) { window.location.href = 'login.html'; }
  });
})();
