// টাঙ্গাইল জেলা — কুরিয়ার সার্ভিস পেজ — ডেমো অফিস ডেটা


window.COURIER_UPAZILAS = [
  ["sadar", "টাঙ্গাইল সদর"],
  ["basail", "বাসাইল"],
  ["delduar", "দেলদুয়ার"],
  ["dhanbari", "ধনবাড়ী"],
  ["ghatail", "ঘাটাইল"],
  ["gopalpur", "গোপালপুর"],
  ["kalihati", "কালিহাতী"],
  ["madhupur", "মধুপুর"],
  ["mirzapur", "মির্জাপুর"],
  ["nagarpur", "নাগরপুর"],
  ["sakhipur", "সখীপুর"],
  ["bhuapur", "ভূঞাপুর"]
];

// কুরিয়ার কোম্পানি ক্যাটাগরি (অফিসের `company` ফিল্ডের কী এর সাথে মেলে)
window.COURIER_COMPANIES = [
  ["sundarban", "সুন্দরবন"],
  ["sa", "SA পরিবহন"],
  ["jononi", "জননী"],
  ["redx", "রেডএক্স"],
  ["pathao", "পাঠাও"],
  ["steadfast", "Steadfast"],
  ["paperfly", "Paperfly"],
  ["ecourier", "eCourier"],
  ["deliverytiger", "Delivery Tiger"],
  ["dhl", "DHL"]
];

window.COURIER_LAST_UPDATED = "2026-09-19";

// অফিসের তালিকা এখন Supabase `courier_offices` টেবিল থেকে লোড হয় (js/courier-submit.js)।
// আগের ২৮টি ডেমো অফিস ডাটাবেসে is_demo=true হিসেবে আছে — কোনো উপজেলায় আসল অফিস অনুমোদন হলে ওই
// উপজেলার ডেমো অফিস অটো মুছে যায়; অ্যাডমিন "কুরিয়ার" ট্যাব থেকেও মোছা যায়।
window.COURIER_OFFICES = [];
