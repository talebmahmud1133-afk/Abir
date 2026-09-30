// টাঙ্গাইল জেলা — সব ফর্মের "Google Map লিংক" ঘরের নিচে "আমার লোকেশন যোগ করুন" বাটন (আবাসিক হোটেল ফর্মের মতো)
// • এক ক্লিকে ডিভাইসের লোকেশন নিয়ে https://www.google.com/maps?q=lat,lng লিংক ঘরে বসিয়ে দেয়
// • ডাইনামিক ফর্ম (হাসপাতাল, আইনি সহায়তা, জনপ্রতিনিধি) পরে আঁকা হলেও MutationObserver দিয়ে বাটন বসে
// • বাটনের রং ফর্মের "জমা দিন" বাটনের রং থেকে নেওয়া হয়, তাই প্রতিটি পেজের থিমের সাথে মেলে
// • হোটেল ফর্মে নিজস্ব বাটন আছে (js/hotel-submit.js) — সেখানে এই স্ক্রিপ্ট কিছু যোগ করে না
(function () {
  var SEL = 'input[type="url"]';
  var ID_RE = /map/i;

  function accentFor(input) {
    var form = input.closest('form') || document;
    var b = form.querySelector('button[type="submit"]');
    if (b) {
      var c = getComputedStyle(b).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
    }
    return '#0B6B8C';
  }

  function attach(input) {
    if (input.getAttribute('data-geo-ready')) return;
    if (!ID_RE.test(input.id || '')) return;
    var next = input.nextElementSibling;
    if (next && /loc-btn/.test(next.className || '')) return; // হোটেল ফর্মে আগে থেকেই আছে
    input.setAttribute('data-geo-ready', '1');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'geo-loc-btn';
    btn.innerHTML = '<i class="fa-solid fa-location-crosshairs" aria-hidden="true"></i><span>আমার লোকেশন যোগ করুন</span>';
    var note = document.createElement('p');
    note.className = 'geo-loc-note';
    note.setAttribute('role', 'status');
    note.hidden = true;
    input.insertAdjacentElement('afterend', btn);
    btn.insertAdjacentElement('afterend', note);

    function setNote(t, err) { note.textContent = t || ''; note.hidden = !t; note.classList.toggle('is-err', !!err); }
    function setBusy(on) {
      btn.disabled = on;
      btn.querySelector('span').textContent = on ? 'লোকেশন নেওয়া হচ্ছে…' : 'আমার লোকেশন যোগ করুন';
    }

    btn.addEventListener('click', function () {
      btn.style.setProperty('--geo-accent', accentFor(input));
      setNote('');
      if (!navigator.geolocation) { setNote('আপনার ব্রাউজারে লোকেশন সাপোর্ট নেই। Google Map লিংক নিজে বসান।', true); return; }
      setBusy(true);
      navigator.geolocation.getCurrentPosition(function (pos) {
        var lat = pos.coords.latitude.toFixed(6), lng = pos.coords.longitude.toFixed(6);
        input.value = 'https://www.google.com/maps?q=' + lat + ',' + lng;
        input.removeAttribute('aria-invalid');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        setBusy(false);
        setNote('লোকেশন যোগ হয়েছে। ঠিক জায়গায় দাঁড়িয়ে থাকলে সঠিক লোকেশন আসবে।');
      }, function (err) {
        setBusy(false);
        var t = 'লোকেশন পাওয়া যায়নি। Google Map লিংক নিজে বসান।';
        if (err && err.code === 1) t = 'লোকেশনের অনুমতি দেওয়া হয়নি। ব্রাউজার/ফোনের সেটিংসে লোকেশন চালু করে আবার চেষ্টা করুন।';
        else if (err && err.code === 3) t = 'লোকেশন পেতে বেশি সময় লাগছে। খোলা জায়গায় গিয়ে আবার চেষ্টা করুন।';
        setNote(t, true);
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    });
  }

  function scan() {
    var list = document.querySelectorAll(SEL);
    for (var i = 0; i < list.length; i++) attach(list[i]);
  }
  scan();
  if (window.MutationObserver) new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
})();
