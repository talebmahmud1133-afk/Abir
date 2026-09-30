// টাঙ্গাইল জেলা — জনপ্রতিনিধি পেজ — ধরন (চিপ), ফর্মের ফিল্ড ও নমুনা ডেটা
// তালিকার ডেটা Supabase-এর public_representatives টেবিল থেকে আসে (js/public-rep-submit.js) — এই ফাইলে কোনো স্ট্যাটিক নমুনা নেই।

window.PR_UPAZILAS = [
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

// টাঙ্গাইল জেলায় জাতীয় সংসদের ৮টি আসন
window.PR_SEATS = [
  ["t1", "টাঙ্গাইল-১"], ["t2", "টাঙ্গাইল-২"], ["t3", "টাঙ্গাইল-৩"], ["t4", "টাঙ্গাইল-৪"],
  ["t5", "টাঙ্গাইল-৫"], ["t6", "টাঙ্গাইল-৬"], ["t7", "টাঙ্গাইল-৭"], ["t8", "টাঙ্গাইল-৮"]
];

window.PR_WARDS = [
  ["1", "১ নং ওয়ার্ড"], ["2", "২ নং ওয়ার্ড"], ["3", "৩ নং ওয়ার্ড"],
  ["4", "৪ নং ওয়ার্ড"], ["5", "৫ নং ওয়ার্ড"], ["6", "৬ নং ওয়ার্ড"],
  ["7", "৭ নং ওয়ার্ড"], ["8", "৮ নং ওয়ার্ড"], ["9", "৯ নং ওয়ার্ড"]
];

// সংরক্ষিত নারী সদস্য প্রতি ৩টি ওয়ার্ডের জন্য একজন
window.PR_WARD_GROUPS = [
  ["1-3", "১, ২ ও ৩ নং ওয়ার্ড"],
  ["4-6", "৪, ৫ ও ৬ নং ওয়ার্ড"],
  ["7-9", "৭, ৮ ও ৯ নং ওয়ার্ড"]
];

// ফিল্ড কী: seat, post, upazila, union, ward, wardGroup, name, party, phone, address, map, photo
// req = বাধ্যতামূলক ফিল্ডের তালিকা; বাকিগুলো ঐচ্ছিক
window.PR_TYPES = [
  {
    key: "mp", emoji: "🇧🇩", label: "সংসদ সদস্য",
    formTitle: "সংসদ সদস্যের তথ্য যোগ করুন",
    filter: "seat",                       // উপরের ফিল্টার: আসন
    fields: ["seat", "name", "party", "phone", "address", "map", "photo"],
    req: ["seat", "name", "phone", "address"],
    labels: { address: "কার্যালয়ের ঠিকানা" }
  },
  {
    key: "zp", emoji: "🏢", label: "জেলা পরিষদ",
    formTitle: "জেলা পরিষদ প্রতিনিধির তথ্য যোগ করুন",
    filter: "none",
    fields: ["post", "name", "party", "phone", "address", "map", "photo"],
    req: ["post", "name", "phone", "address"],
    posts: ["চেয়ারম্যান", "সদস্য", "সংরক্ষিত নারী সদস্য"],
    labels: { address: "কার্যালয়ের ঠিকানা" }
  },
  {
    key: "upzc", emoji: "🏛️", label: "উপজেলা চেয়ারম্যান",
    formTitle: "উপজেলা পরিষদ প্রতিনিধির তথ্য যোগ করুন",
    filter: "upazila",
    fields: ["post", "upazila", "name", "party", "phone", "address", "map", "photo"],
    req: ["post", "upazila", "name", "phone", "address"],
    posts: ["চেয়ারম্যান", "ভাইস চেয়ারম্যান", "মহিলা ভাইস চেয়ারম্যান"],
    labels: { address: "উপজেলা পরিষদ কার্যালয়ের ঠিকানা" }
  },
  {
    key: "mayor", emoji: "🏙️", label: "পৌর মেয়র",
    formTitle: "পৌর মেয়রের তথ্য যোগ করুন",
    filter: "upazila",
    fields: ["upazila", "name", "party", "phone", "address", "map", "photo"],
    req: ["upazila", "name", "phone", "address"],
    labels: { upazila: "পৌরসভা (উপজেলা)", address: "পৌরসভা কার্যালয়ের ঠিকানা" }
  },
  {
    key: "upc", emoji: "🏘️", label: "ইউপি চেয়ারম্যান",
    formTitle: "ইউপি চেয়ারম্যানের তথ্য যোগ করুন",
    filter: "upazila", search: "ইউনিয়ন বা নাম দিয়ে খুঁজুন",
    fields: ["upazila", "union", "name", "party", "phone", "address", "map", "photo"],
    req: ["upazila", "union", "name", "phone", "address"],
    labels: { address: "ইউনিয়ন পরিষদ কার্যালয়ের ঠিকানা" }
  },
  {
    key: "upm", emoji: "👤", label: "ইউপি সদস্য",
    formTitle: "ইউপি সদস্যের তথ্য যোগ করুন",
    filter: "upazila", search: "ইউনিয়ন বা নাম দিয়ে খুঁজুন",
    fields: ["upazila", "union", "ward", "name", "party", "phone", "address", "photo"],
    req: ["upazila", "union", "ward", "name", "phone"],
    labels: { address: "গ্রাম / এলাকা" }
  },
  {
    key: "upw", emoji: "👩", label: "সংরক্ষিত নারী সদস্য",
    formTitle: "সংরক্ষিত নারী সদস্যের তথ্য যোগ করুন",
    filter: "upazila", search: "ইউনিয়ন বা নাম দিয়ে খুঁজুন",
    fields: ["upazila", "union", "wardGroup", "name", "party", "phone", "address", "photo"],
    req: ["upazila", "union", "wardGroup", "name", "phone"],
    labels: { address: "গ্রাম / এলাকা" }
  }
];

window.PR_LAST_UPDATED = "2026-09-30";
