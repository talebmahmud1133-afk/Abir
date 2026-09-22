/*
  notif-filter.js
  -----------------------------------------------------------
  notifications.html-এর উপরের ট্যাব (সব | কল | রিকোয়েস্ট | ঘোষণা) নিয়ন্ত্রণ করে।
  এই স্ক্রিপ্ট শুধু দেখানো/লুকানো নিয়ন্ত্রণ করে — ডেটা লোড করা, "নতুন" মার্ক করা ইত্যাদি
  আগের মতোই friend-requests.js/missed-calls.js/notifications.js নিজেরাই করে
  (তারা প্রতিটা সেকশনের `hidden` অ্যাট্রিবিউট সেট করে যখন সেই টাইপের ডেটা খালি থাকে)।

  ফিল্টার প্রয়োগ হয় আলাদা CSS ক্লাস (.notif-filter-hidden) দিয়ে, তাই `hidden`
  অ্যাট্রিবিউটের সাথে কোনো সংঘর্ষ নেই — দুটো শর্তের যেকোনো একটা true হলেই সেকশন লুকানো থাকে।
*/
(function () {
  "use strict";

  var tabs = document.getElementById("notifTabs");
  if (!tabs) return;

  var msgSection = document.getElementById("msgSection");
  var mcSection = document.getElementById("mcSection");
  var frSection = document.getElementById("frSection");
  var announceWrap = document.getElementById("notifAnnounceWrap");
  var announceEmpty = document.getElementById("notifEmpty");
  var announceLoading = document.getElementById("notifLoading");
  var filterEmptyEl = document.getElementById("notifFilterEmpty");
  var buttons = Array.prototype.slice.call(tabs.querySelectorAll(".notif-tab"));
  var current = "all";

  var FILTER_LABEL = { message: "মেসেজ", call: "কল", request: "রিকোয়েস্ট", announcement: "ঘোষণা" };

  function isVisible(el) {
    return !!el && !el.hidden && !el.classList.contains("notif-filter-hidden");
  }

  function apply() {
    var showMsg = current === "all" || current === "message";
    var showMc = current === "all" || current === "call";
    var showFr = current === "all" || current === "request";
    var showAnn = current === "all" || current === "announcement";

    if (msgSection) msgSection.classList.toggle("notif-filter-hidden", !showMsg);
    if (mcSection) mcSection.classList.toggle("notif-filter-hidden", !showMc);
    if (frSection) frSection.classList.toggle("notif-filter-hidden", !showFr);
    if (announceWrap) announceWrap.classList.toggle("notif-filter-hidden", !showAnn);

    updateFilterEmptyMsg();
  }

  function updateFilterEmptyMsg() {
    if (!filterEmptyEl) return;
    if (current === "all") {
      filterEmptyEl.hidden = true;
      return;
    }
    var sectionVisible =
      (current === "message" && isVisible(msgSection)) ||
      (current === "call" && isVisible(mcSection)) ||
      (current === "request" && isVisible(frSection)) ||
      (current === "announcement" &&
        announceWrap && !announceWrap.classList.contains("notif-filter-hidden") &&
        !(announceLoading && !announceLoading.hidden) &&
        !(announceEmpty && !announceEmpty.hidden));
    filterEmptyEl.hidden = !!sectionVisible;
    filterEmptyEl.textContent = "এখন কোনো নতুন " + (FILTER_LABEL[current] || "") + " নেই।";
  }

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.getAttribute("data-filter") === current) return;
      current = btn.getAttribute("data-filter");
      buttons.forEach(function (b) {
        var isActive = b === btn;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      apply();
    });
  });

  // অন্য স্ক্রিপ্টগুলো অ্যাসিঙ্ক্রোনাসভাবে সেকশন hidden/দেখানো পাল্টায় — সেটা লক্ষ্য রেখে
  // "এই ফিল্টারে কিছু নেই" মেসেজটা আপডেট রাখা হয়
  [msgSection, mcSection, frSection, announceEmpty, announceLoading].forEach(function (el) {
    if (!el || !window.MutationObserver) return;
    new MutationObserver(updateFilterEmptyMsg).observe(el, { attributes: true, attributeFilter: ["hidden"] });
  });

  apply();
})();
