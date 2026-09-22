// টাঙ্গাইল জেলা — matrimonial.html-এর উপরের নেভিগেশন বার (Back / পাত্র / পাত্রী / Add)
// পাত্র বা পাত্রী ট্যাবে ক্লিক করলে শুধু সেই gender-এর সম্পূর্ণ তালিকা (৩টি করে কলামে)
// ফুল-উইথে দেখায় এবং বাকি ওভারভিউ সেকশন (কুইক সার্চ, থানা লিস্ট, তথ্য) লুকিয়ে দেয়।
// আবার একই ট্যাবে ক্লিক করলে ওভারভিউতে ফিরে যায়। শুধুমাত্র matrimonial.html-এ লোড হয়।
(function () {
  var tabGroom = document.getElementById('matriTabGroom');
  var tabBride = document.getElementById('matriTabBride');
  var candidatesSection = document.getElementById('matriCandidatesSection');
  var candidatesGrid = candidatesSection ? candidatesSection.querySelector('.matri-candidates-grid') : null;
  var overviewSections = document.querySelectorAll('.matri-overview-section');
  if (!tabGroom || !tabBride || !candidatesSection || !candidatesGrid) return;

  var current = null;

  function applyState() {
    tabGroom.classList.toggle('is-active', current === 'male');
    tabBride.classList.toggle('is-active', current === 'female');
    tabGroom.setAttribute('aria-selected', current === 'male' ? 'true' : 'false');
    tabBride.setAttribute('aria-selected', current === 'female' ? 'true' : 'false');

    candidatesGrid.classList.remove('matri-only-male', 'matri-only-female');

    if (current) {
      overviewSections.forEach(function (el) { el.style.display = 'none'; });
      candidatesSection.style.display = '';
      candidatesGrid.classList.add(current === 'male' ? 'matri-only-male' : 'matri-only-female');
    } else {
      overviewSections.forEach(function (el) { el.style.display = ''; });
    }
  }

  function setActive(gender, opts) {
    current = (current === gender) ? null : gender;
    applyState();
    if (current && opts && opts.scroll !== false) {
      candidatesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  tabGroom.addEventListener('click', function () { setActive('male'); });
  tabBride.addEventListener('click', function () { setActive('female'); });

  document.querySelectorAll('.matri-col-viewall').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var gender = link.getAttribute('data-view-gender');
      if (!gender) return;
      current = gender; // সরাসরি সেই gender-এ সেট করে (টগল নয়)
      applyState();
      candidatesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  applyState();
})();
