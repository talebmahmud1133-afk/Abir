// টাঙ্গাইল জেলা — উপরের নোটিশ বার: অ্যাডমিন প্যানেল থেকে দেওয়া বার্তা লোড করে
// ডানে থেকে বামে চলমান (marquee) টেক্সট হিসেবে দেখানো হয়।
// index.html / বিভাগ পেজ (Supabase থেকে fetch করে) এবং admin.html (মেমরি থেকে সরাসরি প্রিভিউ)
// উভয় জায়গা থেকেই এই একই renderMarquee ফাংশন দিয়ে দেখানো হয়।

window.TangailNotice = (function () {
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderMarquee(textEl, text) {
    textEl.innerHTML =
      '<span class="notice-text-inner"><span>' + escapeHtml(text) + '</span><span>' + escapeHtml(text) + '</span></span>';
    var inner = textEl.querySelector('.notice-text-inner');
    requestAnimationFrame(function () {
      var oneCopyWidth = inner.scrollWidth / 2;
      var pxPerSecond = 60;
      var duration = Math.max(oneCopyWidth / pxPerSecond, 6);
      inner.style.animationDuration = duration + 's';
    });
  }

  return { renderMarquee: renderMarquee };
})();

(function () {
  var barEl = document.querySelector('.notice-bar');
  var textEl = document.querySelector('.notice-bar .notice-text');
  if (!barEl || !textEl) return;

  function hideBar() { barEl.style.display = 'none'; }

  var fallbackText = textEl.textContent.trim();

  if (!window.supabase || !window.TANGAIL_SUPABASE) {
    window.TangailNotice.renderMarquee(textEl, fallbackText);
    return;
  }

  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);

  client.from('site_notice').select('text, enabled, text_color').eq('id', 1).single()
    .then(function (res) {
      if (res.error || !res.data) { window.TangailNotice.renderMarquee(textEl, fallbackText); return; }
      if (res.data.enabled === false) { hideBar(); return; }
      if (res.data.text_color) textEl.style.color = res.data.text_color;
      window.TangailNotice.renderMarquee(textEl, res.data.text || fallbackText);
    })
    .catch(function () { window.TangailNotice.renderMarquee(textEl, fallbackText); });
})();
