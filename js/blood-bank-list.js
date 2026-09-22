// টাঙ্গাইল জেলা — ব্লাড ব্যাংক তালিকা পেজ (blood-bank-list.html)
(function () {
  if (!window.TANGAIL_SUPABASE) return;
  var listEl = document.getElementById('bankList');
  if (!listEl) return;

  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
  var countEl = document.getElementById('bankCount');
  var allBanks = [];

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function bankCardHtml(b) {
    var phoneDigits = (b.phone || '').replace(/\D/g, '');
    var locBits = [b.thana, b.address].filter(Boolean).join(' · ');

    return '' +
      '<div class="donor-card">' +
        '<div class="donor-card-top">' +
          '<div class="donor-avatar"><i class="fa-solid fa-hospital" aria-hidden="true"></i></div>' +
          '<div class="donor-info">' +
            '<div class="donor-name-row">' +
              '<h3 class="donor-name">' + escapeHtml(b.name) + '</h3>' +
            '</div>' +
            (locBits ? '<div class="donor-loc"><span><i class="fa-solid fa-location-dot" aria-hidden="true"></i></span><span>' + escapeHtml(locBits) + '</span></div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="donor-stats">' +
          (b.available_groups ? '<span><i class="fa-solid fa-droplet" aria-hidden="true"></i> গ্রুপ: ' + escapeHtml(b.available_groups) + '</span>' : '') +
          (b.open_hours ? '<span><i class="fa-solid fa-clock" aria-hidden="true"></i> ' + escapeHtml(b.open_hours) + '</span>' : '') +
        '</div>' +
        '<div class="donor-actions">' +
          '<a class="call-btn" href="tel:' + escapeHtml(phoneDigits) + '"><i class="fa-solid fa-phone" aria-hidden="true"></i> কল</a>' +
          '<a class="msg-btn" href="sms:' + escapeHtml(phoneDigits) + '"><i class="fa-solid fa-comment" aria-hidden="true"></i> মেসেজ</a>' +
        '</div>' +
      '</div>';
  }

  function renderList(banks) {
    countEl.textContent = banks.length + 'টি ব্লাড ব্যাংক';
    if (!banks.length) {
      listEl.innerHTML = '<div class="donor-empty"><div class="donor-empty-icon"><i class="fa-solid fa-hospital" aria-hidden="true"></i></div>এখনো কোনো ব্লাড ব্যাংক যুক্ত হয়নি।<br>নিচের + বাটনে ক্লিক করে প্রথমটি যুক্ত করুন।</div>';
      return;
    }
    listEl.innerHTML = banks.map(bankCardHtml).join('');
  }

  function loadBanks() {
    listEl.innerHTML = '<p class="donor-empty">লোড হচ্ছে…</p>';
    client.from('blood_banks').select('*').eq('status', 'approved').order('created_at', { ascending: false }).then(function (res) {
      if (res.error) {
        listEl.innerHTML = '<p class="donor-empty">তালিকা লোড করতে সমস্যা হয়েছে।</p>';
        return;
      }
      allBanks = res.data || [];
      renderList(allBanks);
    });
  }

  loadBanks();

  // সার্চ ফিল্টার
  var searchForm = document.getElementById('bankSearchForm');
  var searchInput = document.getElementById('bankSearchInput');
  if (searchForm && searchInput) searchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = searchInput.value.trim().toLowerCase();
    if (!q) { renderList(allBanks); return; }
    var filtered = allBanks.filter(function (b) {
      return (b.name || '').toLowerCase().indexOf(q) !== -1 ||
             (b.thana || '').toLowerCase().indexOf(q) !== -1 ||
             (b.address || '').toLowerCase().indexOf(q) !== -1;
    });
    renderList(filtered);
  });
  searchInput.addEventListener('input', function () {
    if (searchInput.value.trim() === '') renderList(allBanks);
  });

  // ফ্লোটিং + বাটন ও মোডাল
  var fabBtn = document.getElementById('fabAddBank');
  var modal = document.getElementById('bankModal');
  var form = document.getElementById('bankForm');
  var msg = document.getElementById('bankFormMsg');
  var submitBtn = document.getElementById('bankSubmitBtn');

  function setMsg(text, ok) {
    msg.textContent = text || '';
    msg.className = 'auth-msg' + (ok ? ' ok' : '');
  }

  function openModal() {
    setMsg('');
    modal.classList.add('open');
  }
  function closeModal() {
    modal.classList.remove('open');
  }

  fabBtn.addEventListener('click', openModal);
  document.getElementById('bankCancelBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var name = document.getElementById('bankName').value.trim();
    var phone = document.getElementById('bankPhone').value.trim();
    var thana = document.getElementById('bankThana').value;
    var address = document.getElementById('bankAddress').value.trim();
    var groups = document.getElementById('bankGroups').value.trim();
    var hours = document.getElementById('bankHours').value.trim();
    var comment = document.getElementById('bankComment').value.trim();

    if (!name) { setMsg('ব্লাড ব্যাংকের নাম লিখুন।'); return; }
    if (!phone || phone.replace(/\D/g, '').length < 11) { setMsg('সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন।'); return; }

    submitBtn.disabled = true;
    setMsg('জমা দেওয়া হচ্ছে…', true);

    client.from('blood_banks').insert({
      name: name,
      phone: phone.replace(/\D/g, ''),
      thana: thana,
      address: address,
      available_groups: groups,
      open_hours: hours,
      comment: comment,
      status: 'approved'
    }).select().then(function (res) {
      submitBtn.disabled = false;
      if (res.error) {
        setMsg('জমা দিতে সমস্যা হয়েছে, একটু পর আবার চেষ্টা করুন।');
        return;
      }
      setMsg('ধন্যবাদ! ব্লাড ব্যাংকটি তালিকায় যুক্ত হয়েছে।', true);
      form.reset();
      var added = (res.data && res.data[0]) || null;
      if (added) {
        allBanks.unshift(added);
        renderList(allBanks);
      }
      setTimeout(closeModal, 900);
    });
  });
})();
