// টাঙ্গাইল অ্যাম্বুলেন্স সার্ভিস — ডেমো রিকোয়েস্ট ডেটা (পরে Supabase দিয়ে প্রতিস্থাপিত হবে)
// নির্ভর করে js/ambulance-providers-data.js এর window.AMB_UPAZILAS ও window.AMB_TYPES এর উপর।
window.AMB_LEVELS = [
  ["critical", "জরুরি (Critical)"],
  ["serious", "গুরুতর (Serious)"],
  ["normal", "সাধারণ (Normal)"]
];

(function () {
  var now = Date.now();
  var MIN = 60 * 1000;
  var HOUR = 60 * MIN;
  var DAY = 24 * HOUR;

  window.AMB_REQUESTS_SEED = [];
})();
