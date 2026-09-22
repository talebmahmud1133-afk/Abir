// টাঙ্গাইল জেলা — সাইটজুড়ে শেয়ার্ড ফ্লোটিং বাটন (Back-to-Top + WhatsApp)
// এই ফাইলটি সম্পূর্ণ স্বয়ংসম্পূর্ণ ও অ্যাডিটিভ — কোনো এক্সিস্টিং আইডি, ফাংশন,
// ইভেন্ট লিসেনার, বা অন্য কোনো JS ফাইল স্পর্শ করে না। শুধু DOM-এ দুটো নতুন
// বাটন যুক্ত করে এবং সেগুলোর নিজস্ব ছোট বিহেভিয়ার চালায়।
(function () {
  if (document.getElementById('globalFabStack')) return; // দুইবার লোড হলে ডুপ্লিকেট আটকানো

  var stack = document.createElement('div');
  stack.className = 'global-fab-stack';
  stack.id = 'globalFabStack';

  var topBtn = document.createElement('button');
  topBtn.type = 'button';
  topBtn.className = 'global-fab global-fab-top';
  topBtn.id = 'globalBackToTop';
  topBtn.setAttribute('aria-label', 'উপরে যান');
  topBtn.innerHTML = '<i class="fa-solid fa-arrow-up" aria-hidden="true"></i>';
  topBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  stack.appendChild(topBtn);

  function mount() {
    document.body.appendChild(stack);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);

  // স্ক্রল করলে ব্যাক-টু-টপ বাটন দেখানো
  function toggleTopBtn() {
    if (window.scrollY > 420) topBtn.classList.add('show');
    else topBtn.classList.remove('show');
  }
  window.addEventListener('scroll', toggleTopBtn, { passive: true });
  toggleTopBtn();

  // কিছু পেজে (যেমন পোস্ট ডিটেইল) নিচে একটা স্টিকি কমেন্ট-বার থাকে, যা JS দিয়ে
  // পরে DOM-এ যুক্ত হয় — সেটা থাকলে ফ্লোটিং স্ট্যাককে আরেকটু উপরে তুলে দেওয়া হয়,
  // যাতে একটা অন্যটার উপর বসে না যায়।
  function syncStickyBarOffset() {
    var hasStickyBar = !!document.querySelector('.comment-form-sticky');
    stack.classList.toggle('above-sticky-bar', hasStickyBar);
  }
  syncStickyBarOffset();
  if (window.MutationObserver) {
    new MutationObserver(syncStickyBarOffset).observe(document.body, { childList: true, subtree: true });
  }
})();
