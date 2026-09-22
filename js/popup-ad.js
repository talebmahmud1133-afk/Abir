// টাঙ্গাইল জেলা — হোমপেজে ঢোকার সময় দেখানো ইমেজ পপ-আপ বিজ্ঞাপন
// popup_ad টেবিল (id=1) থেকে ছবি লোড করে দেখায়। অ্যাডমিন প্যানেল থেকে
// ছবি বদলানো ও চালু/বন্ধ করা যায় — কোনো কোড পরিবর্তনের দরকার নেই।
// প্রতি ব্রাউজার সেশনে একবার দেখানো হয় (ক্রস চাপার পর একই সেশনে আর দেখাবে না)।
// ক্রস না চাপলেও ৫ সেকেন্ড পর নিজে থেকেই বন্ধ হয়ে যাবে।

(function () {
  if (!window.supabase || !window.TANGAIL_SUPABASE) return;

  var SESSION_KEY = 'tangailPopupAdShown';
  if (sessionStorage.getItem(SESSION_KEY)) return;

  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);

  client.from('popup_ad').select('enabled, image_url, link_url').eq('id', 1).single()
    .then(function (res) {
      if (res.error || !res.data) return;
      var data = res.data;
      if (!data.enabled || !data.image_url) return;
      showPopupAd(data.image_url, data.link_url);
    })
    .catch(function () { /* সাইলেন্টলি উপেক্ষা করা হলো — বিজ্ঞাপন লোড না হলেও সাইট স্বাভাবিক থাকবে */ });

  function showPopupAd(imageUrl, linkUrl) {
    sessionStorage.setItem(SESSION_KEY, '1');

    var overlay = document.createElement('div');
    overlay.className = 'popup-ad-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'বিজ্ঞাপন');

    var box = document.createElement('div');
    box.className = 'popup-ad-box';

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'popup-ad-close';
    closeBtn.setAttribute('aria-label', 'বন্ধ করুন');
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';

    var imgEl;
    if (linkUrl && linkUrl.trim()) {
      imgEl = document.createElement('a');
      imgEl.href = linkUrl.trim();
      imgEl.target = '_blank';
      imgEl.rel = 'noopener noreferrer';
      var img = document.createElement('img');
      img.src = imageUrl;
      img.alt = 'বিজ্ঞাপন';
      img.className = 'popup-ad-img';
      imgEl.appendChild(img);
    } else {
      imgEl = document.createElement('img');
      imgEl.src = imageUrl;
      imgEl.alt = 'বিজ্ঞাপন';
      imgEl.className = 'popup-ad-img';
    }

    box.appendChild(closeBtn);
    box.appendChild(imgEl);
    overlay.appendChild(box);

    var autoCloseTimer = setTimeout(closePopup, 5000);

    function closePopup() {
      clearTimeout(autoCloseTimer);
      overlay.classList.add('popup-ad-closing');
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        document.body.classList.remove('popup-ad-open');
      }, 180);
    }

    closeBtn.addEventListener('click', function (e) {
      e.preventDefault();
      closePopup();
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closePopup();
    });

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        closePopup();
        document.removeEventListener('keydown', escHandler);
      }
    });

    document.body.classList.add('popup-ad-open');
    document.body.appendChild(overlay);
  }
})();
