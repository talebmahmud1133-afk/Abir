// টাঙ্গাইল অ্যাম্বুলেন্স সার্ভিস — একক-পেজ ট্যাব টগল + Add বাটন ফ্লো
(function () {
  var backBtn = document.getElementById('ambBack');
  var tabProvider = document.getElementById('ambMainTabProvider');
  var tabRequest = document.getElementById('ambMainTabRequest');
  var viewOverview = document.getElementById('ambViewOverview');
  var viewProvider = document.getElementById('ambViewProvider');
  var viewRequest = document.getElementById('ambViewRequest');
  if (!viewOverview || !viewProvider || !viewRequest) return;

  var state = { tab: null }; // null = overview

  function applyState() {
    viewOverview.classList.toggle('is-active', state.tab === null);
    viewProvider.classList.toggle('is-active', state.tab === 'provider');
    viewRequest.classList.toggle('is-active', state.tab === 'request');
    if (tabProvider) tabProvider.classList.toggle('is-active', state.tab === 'provider');
    if (tabRequest) tabRequest.classList.toggle('is-active', state.tab === 'request');
  }

  function setTab(tab, opts) {
    opts = opts || {};
    if (state.tab === tab && !opts.force) {
      state.tab = null; // একই ট্যাবে আবার ক্লিক করলে ওভারভিউতে ফিরে যাবে
    } else {
      state.tab = tab;
    }
    applyState();
    if (opts.scroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  if (backBtn) {
    backBtn.addEventListener('click', function () {
      if (window.history.length > 1) { window.history.back(); }
      else { window.location.href = 'index.html'; }
    });
  }
  if (tabProvider) tabProvider.addEventListener('click', function () { setTab('provider', { scroll: true }); });
  if (tabRequest) tabRequest.addEventListener('click', function () { setTab('request', { scroll: true }); });

  var ovRequestBtn = document.getElementById('ambOvRequestBtn');
  if (ovRequestBtn) ovRequestBtn.addEventListener('click', function () { setTab('request', { force: true, scroll: true }); });

  // ---- জেনেরিক মোডাল খোলা/বন্ধ করা (Add-শিট ও প্রোভাইডার-ফর্ম মোডাল) ----
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  function wireModal(modal) {
    if (!modal) return;
    var backdrop = modal.querySelector('.amb-modal-backdrop');
    var closeBtn = modal.querySelector('.amb-modal-close');
    if (backdrop) backdrop.addEventListener('click', function () { closeModal(modal); });
    if (closeBtn) closeBtn.addEventListener('click', function () { closeModal(modal); });
  }

  var addSheet = document.getElementById('ambAddSheet');
  var providerModal = document.getElementById('ambProviderModal');
  var requestModal = document.getElementById('ambRequestModal');
  wireModal(addSheet);
  wireModal(providerModal);
  wireModal(requestModal);

  var addBtn = document.getElementById('ambAddBtn');
  if (addBtn) addBtn.addEventListener('click', function () { openModal(addSheet); });

  var addOptProvider = document.getElementById('ambAddOptProvider');
  if (addOptProvider) addOptProvider.addEventListener('click', function () {
    closeModal(addSheet);
    openModal(providerModal);
  });

  var addOptRequest = document.getElementById('ambAddOptRequest');
  if (addOptRequest) addOptRequest.addEventListener('click', function () {
    closeModal(addSheet);
    openModal(requestModal);
  });

  var ovProviderBtn = document.getElementById('ambOvProviderBtn');
  if (ovProviderBtn) ovProviderBtn.addEventListener('click', function () { openModal(providerModal); });

  // ---- প্রোভাইডার ফর্ম সফলভাবে জমা হলে মোডাল বন্ধ করে "প্রোভাইডার" ট্যাবে নিয়ে যাওয়া ----
  var provSuccess = document.getElementById('provSuccess');
  if (provSuccess && 'MutationObserver' in window) {
    var mo = new MutationObserver(function () {
      if (provSuccess.classList.contains('is-visible')) {
        setTimeout(function () {
          closeModal(providerModal);
          setTab('provider', { force: true, scroll: true });
        }, 1200);
      }
    });
    mo.observe(provSuccess, { attributes: true, attributeFilter: ['class'] });
  }

  // ---- রিকোয়েস্ট ফর্ম সফলভাবে জমা হলে মোডাল বন্ধ করে লিস্টে ফিরিয়ে আনা ----
  var reqSuccess = document.getElementById('reqSuccess');
  if (reqSuccess && 'MutationObserver' in window) {
    var moReq = new MutationObserver(function () {
      if (reqSuccess.classList.contains('is-visible')) {
        setTimeout(function () {
          closeModal(requestModal);
          setTab('request', { force: true, scroll: true });
        }, 1200);
      }
    });
    moReq.observe(reqSuccess, { attributes: true, attributeFilter: ['class'] });
  }

  // ---- থানা কভারেজ গ্রিড: ক্লিক করলে প্রোভাইডার ট্যাবে গিয়ে সেই থানা দিয়ে ফিল্টার ----
  var thanaGrid = document.getElementById('ambThanaGrid');
  var upazilaFilter = document.getElementById('ambUpazilaFilter');
  if (thanaGrid) {
    thanaGrid.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-upazila]');
      if (!btn) return;
      var upazilaId = btn.getAttribute('data-upazila');
      setTab('provider', { force: true, scroll: true });
      if (upazilaFilter) {
        // ফিল্টার সিলেক্টের অপশন বসতে ambulance-providers.js-এর একটু সময় লাগতে পারে
        setTimeout(function () {
          upazilaFilter.value = upazilaId;
          upazilaFilter.dispatchEvent(new Event('change'));
        }, 0);
      }
    });
  }

  // ---- পুরনো standalone পেজ থেকে রিডাইরেক্টের জন্য: ?tab=provider বা ?tab=request দিয়ে সরাসরি সেই ট্যাবে ওপেন হবে,
  //      আর ?open=register দিলে প্রোভাইডার নিবন্ধন ফর্মটাও সাথে সাথে খুলে যাবে ----
  try {
    var qs = new URLSearchParams(window.location.search);
    var initialTab = qs.get('tab');
    if (initialTab === 'provider' || initialTab === 'request') {
      state.tab = initialTab;
    }
    if (qs.get('open') === 'register') {
      setTimeout(function () { openModal(providerModal); }, 0);
    }
  } catch (e) { /* পুরনো ব্রাউজারে URLSearchParams না থাকলে ওভারভিউ দেখাবে */ }

  applyState();
})();
