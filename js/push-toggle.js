/*
  push-toggle.js — notifications.html-এর "ব্রাউজার নোটিফিকেশন" বাটন নিয়ন্ত্রণ করে।
  window.TangailPush (js/push-notifications.js) ব্যবহার করে।
*/
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var section = document.getElementById("pushSection");
    var btn = document.getElementById("pushToggleBtn");
    var desc = document.getElementById("pushDesc");
    if (!section || !btn || !window.TangailPush) return;

    if (!window.TangailPush.isSupported()) {
      return; // পুরনো ব্রাউজার/ওয়েবভিউ — সেকশন লুকানোই থাকবে
    }

    section.hidden = false;

    function render(status) {
      if (status === "denied") {
        btn.textContent = "ব্রাউজার সেটিংসে পারমিশন দিন";
        btn.disabled = true;
        desc.textContent = "নোটিফিকেশন পারমিশন বন্ধ করা আছে — ব্রাউজারের সাইট সেটিংস থেকে চালু করুন।";
      } else if (status === "subscribed") {
        btn.textContent = "বন্ধ করুন";
        btn.disabled = false;
        desc.textContent = "ব্রাউজার নোটিফিকেশন চালু আছে।";
      } else {
        btn.textContent = "চালু করুন";
        btn.disabled = false;
        desc.textContent = "অ্যাপ বন্ধ থাকলেও মিসড কল ও ফলোয়ারের অ্যালার্ট পেতে চালু করুন।";
      }
    }

    function refresh() {
      window.TangailPush.getStatus().then(render).catch(function () {
        render("unsubscribed");
      });
    }

    btn.addEventListener("click", function () {
      btn.disabled = true;
      var originalText = btn.textContent;
      btn.textContent = "অপেক্ষা করুন…";

      window.TangailPush.getStatus()
        .then(function (status) {
          if (status === "subscribed") {
            return window.TangailPush.unsubscribe();
          }
          return window.TangailPush.subscribe();
        })
        .then(refresh)
        .catch(function (err) {
          alert((err && err.message) || "একটা সমস্যা হয়েছে, আবার চেষ্টা করুন");
          btn.textContent = originalText;
          btn.disabled = false;
        });
    });

    refresh();
  });
})();
