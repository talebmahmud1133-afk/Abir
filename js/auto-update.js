/*
  auto-update.js
  -----------------------------------------------------------
  কাজ: এডমিন প্যানেল থেকে সাইট আপডেট হলে, ইউজারের ব্রাউজার/অ্যাপে
  ইউজারের পুরো cache মুছে না ফেলেই নতুন আপডেট জানিয়ে দেওয়া।

  কীভাবে কাজ করে:
  1) নিয়মিত বিরতিতে (ডিফল্ট ৩ মিনিট) version.json ফাইলটা
     no-store মোডে fetch করে (এটা খুবই ছোট ফাইল, দ্রুত লোড হয়)।
  2) যদি version.json এর ভার্সন আগে সংরক্ষিত ভার্সনের চেয়ে আলাদা হয়,
     তার মানে এডমিন নতুন কিছু আপডেট দিয়েছে।
  3) তখন পেজের নিচে একটা ছোট ব্যানার দেখানো হয়, ইউজার ট্যাপ করলে
     পেজ রিফ্রেশ হয়ে নতুন কন্টেন্ট চলে আসে।
  4) পুরো localStorage/cache মোছা হয় না, তাই ছবি, ফন্ট ইত্যাদি
     আগের মতোই cache থেকে দ্রুত লোড হতে থাকে — শুধু যেসব
     JS/CSS/HTML বদলেছে সেগুলোই নতুন করে আসে (bump-version.sh
     এর তৈরি করা ?v= ভার্সন নম্বরের কারণে)।
*/
(function () {
  "use strict";

  var VERSION_FILE = "/version.json";
  var STORAGE_KEY = "site_version";
  var CHECK_INTERVAL_MS = 3 * 60 * 1000; // ৩ মিনিট পরপর চেক
  var BANNER_ID = "site-update-banner";

  function getBasePath() {
    // যদি সাইট সাব-ফোল্ডারে হোস্ট করা থাকে, তাহলেও ঠিকভাবে কাজ করার জন্য
    var path = window.location.pathname;
    var idx = path.lastIndexOf("/");
    return idx >= 0 ? path.substring(0, idx + 1) : "/";
  }

  function fetchVersion() {
    var url = getBasePath() + "version.json?_=" + Date.now();
    return fetch(url, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("version.json not ok");
        return res.json();
      })
      .then(function (data) {
        return data && data.version ? String(data.version) : null;
      });
  }

  function showUpdateBanner(newVersion) {
    if (document.getElementById(BANNER_ID)) return; // আগে থেকেই দেখানো আছে

    var bar = document.createElement("div");
    bar.id = BANNER_ID;
    bar.setAttribute(
      "style",
      [
        "position:fixed",
        "left:0",
        "right:0",
        "bottom:0",
        "z-index:999999",
        "background:var(--maroon,#0E6B3A)",
        "color:#fff",
        "padding:10px 14px",
        "font-family:inherit",
        "font-size:14px",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "gap:12px",
        "box-shadow:0 -2px 8px rgba(0,0,0,.2)",
      ].join(";")
    );

    var text = document.createElement("span");
    text.textContent = "সাইটে নতুন আপডেট এসেছে।";

    var btn = document.createElement("button");
    btn.textContent = "এখনই রিফ্রেশ করুন";
    btn.setAttribute(
      "style",
      [
        "background:#fff",
        "color:var(--maroon,#0E6B3A)",
        "border:none",
        "padding:6px 14px",
        "border-radius:6px",
        "font-weight:bold",
        "cursor:pointer",
      ].join(";")
    );
    btn.addEventListener("click", function () {
      try {
        localStorage.setItem(STORAGE_KEY, newVersion);
      } catch (e) {}
      // ক্যাশ পুরোপুরি না মুছেই হার্ড রিলোড — ভার্সন-কুয়েরি স্ট্রিং
      // বদলানোর কারণে নতুন js/css এমনিতেই নেটওয়ার্ক থেকে আসবে
      window.location.reload();
    });

    bar.appendChild(text);
    bar.appendChild(btn);
    document.body.appendChild(bar);
  }

  function checkForUpdate() {
    fetchVersion()
      .then(function (newVersion) {
        if (!newVersion) return;
        var stored;
        try {
          stored = localStorage.getItem(STORAGE_KEY);
        } catch (e) {
          stored = null;
        }

        if (!stored) {
          // প্রথমবার — শুধু সংরক্ষণ করে রাখা, ব্যানার দেখানোর দরকার নেই
          try {
            localStorage.setItem(STORAGE_KEY, newVersion);
          } catch (e) {}
          return;
        }

        if (stored !== newVersion) {
          showUpdateBanner(newVersion);
        }
      })
      .catch(function () {
        // নেটওয়ার্ক সমস্যা হলে চুপচাপ পরের চেষ্টার জন্য অপেক্ষা করবে
      });
  }

  // পেজ লোড হওয়ার পর প্রথম চেক
  if (document.readyState === "complete" || document.readyState === "interactive") {
    checkForUpdate();
  } else {
    document.addEventListener("DOMContentLoaded", checkForUpdate);
  }

  // নিয়মিত বিরতিতে চেক
  setInterval(checkForUpdate, CHECK_INTERVAL_MS);

  // ইউজার ট্যাব/অ্যাপে ফিরে এলে সাথে সাথে চেক (mobile app-এ এটা জরুরি)
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") checkForUpdate();
  });

  // অনলাইনে ফিরলে চেক (নেট চলে গিয়ে আবার এলে)
  window.addEventListener("online", checkForUpdate);
})();
