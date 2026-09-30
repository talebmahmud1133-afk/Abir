// টাঙ্গাইল জেলা — ভাইরাল প্লেস (viral.html) — কনফিগ
// এই ফাইলই সব কিছুর "সিদ্ধান্ত-ফাইল": সাব-ক্যাটাগরি চিপ, কার্ডে কোন ফিল্ড দেখাবে, ফর্ম ফিল্ড সংজ্ঞা।
// চিপ যোগ করতে নিচের VR_GROUPS থেকে একটা গ্রুপ বেছে VR_CHIPS-এ একটা সারি যোগ করুন
// (এবং supabase/viral-schema.sql-এর type check-এ key যোগ করুন)।
// চিপ: ফুচকা • মিষ্টি • দেশি খাবার • ফুড কোর্ট • ক্যাফে • আড্ডা • ফ্যামিলি • পার্ক • লেক • পিকনিক • ফটোস্পট • সিনেমা

window.VR_UPAZILAS = [
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

// ---------- ফর্ম/কার্ডের ফিল্ড-সেট (গ্রুপ) ----------
// ফর্ম চিপ অনুযায়ী বদলায়: খাবারের চিপে আইটেম + দাম; ঘোরার জায়গায় সেরা সময় + প্রবেশ ফি + সুবিধা; সিনেমায় টিকিটের দাম।
// facts  : কার্ডের শিরোনামের নিচে ছোট পিল (VR_FIELDS-এর কী)
// card   : কার্ডে সারি হিসেবে — শুধু সংক্ষিপ্ত ফিল্ড। লম্বা লেখা ("about") শুধু detail-এ
// detail : বিস্তারিত পেজে যে ফিল্ড যে ক্রমে (সম্পূর্ণ লেখাসহ)
// form   : ফর্মে যে ফিল্ড যে ক্রমে আসবে (VR_FORM_FIELDS-এর কী)
var VR_TAIL = ["upazila", "address", "about", "phone", "phone_consent", "photo", "photos"];
window.VR_GROUPS = {
  food:    { facts: ["speciality", "price"], card: ["hours", "upazila", "address"],
             detail: ["speciality", "price", "hours", "upazila", "address", "about"],
             form: ["name", "speciality", "price", "hours"].concat(VR_TAIL) },
  eatery:  { facts: ["speciality", "price"], card: ["hours", "upazila", "address"],
             detail: ["speciality", "price", "hours", "facilities", "upazila", "address", "about"],
             form: ["name", "speciality", "price", "hours", "facilities"].concat(VR_TAIL) },
  spot:    { facts: ["best_time", "entry_fee"], card: ["hours", "upazila", "address"],
             detail: ["best_time", "entry_fee", "hours", "facilities", "upazila", "address", "about"],
             form: ["name", "best_time", "entry_fee", "hours", "facilities"].concat(VR_TAIL) },
  cinema:  { facts: ["price", "hours"], card: ["facilities", "upazila", "address"],
             detail: ["price", "hours", "facilities", "upazila", "address", "about"],
             form: ["name", "price", "hours", "facilities"].concat(VR_TAIL) }
};

// ---------- সাব-ক্যাটাগরি চিপ (ক্রম ইউজারের দেওয়া) ----------
// key   : ডাটাবেসে `type` কলামে যাবে
// color : কার্ডের ট্যাগ/আইকনের রং (সাদা/হালকা ব্যাকগ্রাউন্ডে WCAG AA কনট্রাস্ট)
var VR_CHIPS = [
  ["phuchka",   "ফুচকা",       "fa-bowl-food",     "#B45309", "food"],
  ["sweets",    "মিষ্টি",       "fa-cookie-bite",   "#A83D5E", "food"],
  ["desi_food", "দেশি খাবার",   "fa-utensils",      "#9F1D1D", "food"],
  ["food_court","ফুড কোর্ট",    "fa-burger",        "#C2410C", "eatery"],
  ["cafe",      "ক্যাফে",       "fa-mug-hot",       "#8a5a0b", "eatery"],
  ["adda",      "আড্ডা",        "fa-comments",      "#4b52ad", "spot"],
  ["family",    "ফ্যামিলি",     "fa-users",         "#0b7280", "spot"],
  ["park",      "পার্ক",        "fa-tree",          "#1F7A3D", "spot"],
  ["lake",      "লেক",          "fa-water",         "#0B6B8C", "spot"],
  ["picnic",    "পিকনিক",       "fa-campground",    "#8a5a0b", "spot"],
  ["photospot", "ফটোস্পট",      "fa-camera-retro",  "#A83D5E", "spot"],
  ["cinema",    "সিনেমা",       "fa-film",          "#5B21B6", "cinema"]
];
window.VR_TYPES = VR_CHIPS.map(function (c) {
  var g = window.VR_GROUPS[c[4]];
  return { key: c[0], label: c[1], icon: c[2], color: c[3], layout: "person",
           facts: g.facts, card: g.card, detail: g.detail, form: g.form };
});

// ---------- কার্ডে দেখানোর ফিল্ড (আইকন + লেবেল + ফরম্যাট) ----------
// fmt: "clamp" = ২ লাইনে ছাঁটা, "upazila" = কী থেকে নাম
window.VR_FIELDS = {
  speciality: { label: "বিখ্যাত আইটেম",        icon: "fa-star" },
  price:      { label: "আনুমানিক দাম",         icon: "fa-bangladeshi-taka-sign" },
  hours:      { label: "খোলার সময়",           icon: "fa-clock" },
  best_time:  { label: "ঘোরার সেরা সময়",       icon: "fa-sun" },
  entry_fee:  { label: "প্রবেশ ফি",            icon: "fa-ticket" },
  facilities: { label: "সুবিধা",               icon: "fa-circle-check" },
  upazila:    { label: "উপজেলা",               icon: "fa-location-dot", fmt: "upazila" },
  address:    { label: "ঠিকানা",               icon: "fa-map-location-dot" },
  about:      { label: "বিবরণ",                icon: "fa-align-left", fmt: "clamp" }
};

// ---------- ফর্ম ফিল্ড সংজ্ঞা ----------
// type: text | number | tel | select | textarea | checkbox | file ; maxlen = DB constraint-এও একই থাকবে
// ব্যক্তিগত তথ্য: NID / সঠিক বাসার ঠিকানা চাওয়া হয় না; মোবাইল নম্বর ঐচ্ছিক — দিলে সম্মতি থাকলেই কার্ডে দেখায়।
window.VR_FORM_FIELDS = {
  name:         { label: "স্থানের / দোকানের নাম", type: "text", required: true, maxlen: 80 },
  speciality:   { label: "বিখ্যাত আইটেম (যেমন: ফুচকা, চটপটি, রসমালাই)", type: "text", required: false, maxlen: 100 },
  price:        { label: "আনুমানিক দাম / টিকিট (যেমন: ২০ টাকা, ১৫০ টাকা)", type: "text", required: false, maxlen: 60 },
  hours:        { label: "খোলার সময় (যেমন: সকাল ১০টা – রাত ১০টা)", type: "text", required: false, maxlen: 60 },
  best_time:    { label: "ঘোরার সেরা সময়", type: "select", required: false, options: ["সকাল", "দুপুর", "বিকেল", "সন্ধ্যা", "রাত", "সারাদিন", "শীতকাল", "বর্ষাকাল"] },
  entry_fee:    { label: "প্রবেশ ফি / খরচ (যেমন: ফ্রি, ২০ টাকা)", type: "text", required: false, maxlen: 60 },
  facilities:   { label: "সুবিধা (যেমন: পার্কিং, ওয়াশরুম, বসার জায়গা)", type: "text", required: false, maxlen: 150 },
  upazila:      { label: "উপজেলা", type: "select", required: true, options: "VR_UPAZILAS" },
  address:      { label: "ঠিকানা / কীভাবে যাবেন", type: "text", required: true, maxlen: 150 },
  about:        { label: "বিবরণ (কেন ভাইরাল, কী বিশেষ)", type: "textarea", required: false, maxlen: 300 },
  phone:        { label: "যোগাযোগের মোবাইল নম্বর (ঐচ্ছিক)", type: "tel", required: false, maxlen: 20, pattern: "^01[3-9][0-9]{8}$", msg: "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন" },
  phone_consent:{ label: "আমার মোবাইল নম্বর কার্ডে প্রকাশ করা যাবে", type: "checkbox", required: false },
  photo:        { label: "প্রধান ছবি (ঐচ্ছিক)", type: "file", required: false, accept: "image/jpeg,image/png,image/webp,image/gif", maxMB: 5 },
  // আরও ছবি (ঐচ্ছিক): সর্বোচ্চ max টি। প্রধান ছবিতে ক্লিক করলে লাইটবক্সে এগুলোও দেখা যায়।
  photos:       { label: "আরও ছবি (ঐচ্ছিক)", type: "photos", required: false, max: 4, accept: "image/jpeg,image/png,image/webp,image/gif", maxMB: 5 }
};

// ---------- ডাটাবেস কলাম (viral_entries টেবিল; ধাপ ৪-এ) ----------
// সব চিপের ফিল্ডের সংযোগ। submit/loader দুটোই এই তালিকা থেকে চলে।
window.VR_DB_TEXT_COLS = ["name", "speciality", "price", "hours", "best_time", "entry_fee", "facilities", "upazila", "address", "about", "phone"];

window.VR_LAST_UPDATED = "2026-09-30";

// ---------- তালিকা ----------
// স্ট্যাটিক ডেমো নেই। পেজের সব এন্ট্রি শুধু Supabase (`viral_entries`, status='approved')
// থেকে আসে (js/viral-submit.js) — অ্যাডমিন থেকে মুছলে পেজ থেকেও মুছে যায়।
window.VR_DEMO_PROFILES = [];
window.VR_PROFILES = [];
