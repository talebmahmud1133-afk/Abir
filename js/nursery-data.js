// টাঙ্গাইল জেলা — নার্সারি (nursery.html) — কনফিগ
// এই ফাইলই সব কিছুর "সিদ্ধান্ত-ফাইল": সাব-ক্যাটাগরি চিপ, কার্ডে কোন ফিল্ড দেখাবে, ফর্ম ফিল্ড সংজ্ঞা।
// চিপ যোগ করতে NR_CHIPS-এ একটা সারি যোগ করুন (এবং supabase/nursery-schema.sql-এর type check-এ key যোগ করুন)।
// চিপ: ফুলের গাছ • ফলজ গাছ • বনজ গাছ • ইনডোর গাছ • ঔষধি গাছ • সবজি চারা • শোভাবর্ধক গাছ • ক্যাকটাস • অর্কিড • বনসাই • অন্যান্য

window.NR_UPAZILAS = [
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
// প্রতিটা চিপের ফর্ম আলাদা (ইউজারের নির্দেশ): যেমন ফলজে চারার ধরন (কলম/বীজ), ইনডোর-অর্কিডে আলো ও টব,
// সবজিতে মৌসুম, ঔষধিতে উপকারিতা, বনসাইয়ে বয়স।
// facts  : কার্ডের শিরোনামের নিচে ছোট পিল (NR_FIELDS-এর কী)
// card   : কার্ডে সারি হিসেবে — শুধু সংক্ষিপ্ত ফিল্ড। লম্বা লেখা ("about") শুধু detail-এ
// detail : বিস্তারিত পেজে যে ফিল্ড যে ক্রমে (সম্পূর্ণ লেখাসহ)
// form   : ফর্মে যে ফিল্ড যে ক্রমে আসবে (NR_FORM_FIELDS-এর কী)
var NR_TAIL = ["delivery", "hours", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"];
function nrGroup(mid, facts, card) {
  var form = ["name", "plants"].concat(mid, ["price"], NR_TAIL);
  var detail = ["plants"].concat(mid, ["price", "delivery", "hours", "upazila", "address", "about"]);
  return { facts: facts, card: card || ["plants", "upazila", "address"], detail: detail, form: form };
}
window.NR_GROUPS = {
  flower:     nrGroup(["size", "pot", "sale_type"],            ["price", "size"]),
  fruit:      nrGroup(["seedling_type", "size", "sale_type"],  ["seedling_type", "price"]),
  timber:     nrGroup(["size", "sale_type"],                   ["sale_type", "price"]),
  indoor:     nrGroup(["pot", "light", "size"],                ["light", "price"]),
  herbal:     nrGroup(["uses", "size"],                        ["price", "size"]),
  veg:        nrGroup(["season", "sale_type"],                 ["season", "price"]),
  ornamental: nrGroup(["size", "pot"],                         ["size", "price"]),
  cactus:     nrGroup(["pot", "light"],                        ["pot", "price"]),
  orchid:     nrGroup(["pot", "light"],                        ["pot", "price"]),
  bonsai:     nrGroup(["age", "size", "pot"],                  ["age", "price"]),
  other:      nrGroup([],                                      ["price", "delivery"])
};

// ---------- সাব-ক্যাটাগরি চিপ (ক্রম ও ইমোজি ইউজারের দেওয়া) ----------
// key   : ডাটাবেসে `type` কলামে যাবে
// label : (চিপ, কার্ডের ট্যাগ ও ফর্মের "ধরন" ড্রপডাউন — সব জায়গায় একই)
// color : কার্ডের ট্যাগ/আইকনের রং (সাদা/হালকা ব্যাকগ্রাউন্ডে WCAG AA কনট্রাস্ট)
var NR_CHIPS = [
  ["flower",     "ফুলের গাছ",     "fa-spa",         "#B03A6B"],
  ["fruit",      "ফলজ গাছ",       "fa-lemon",       "#8a5a0b"],
  ["timber",     "বনজ গাছ",       "fa-tree",        "#1F6B3A"],
  ["indoor",     "ইনডোর গাছ",     "fa-house-chimney-window", "#0b7280"],
  ["herbal",     "ঔষধি গাছ",      "fa-mortar-pestle","#2F7A2F"],
  ["veg",        "সবজি চারা",     "fa-seedling",    "#4C7A12"],
  ["ornamental", "শোভাবর্ধক গাছ", "fa-leaf",        "#0F766E"],
  ["cactus",     "ক্যাকটাস",      "fa-seedling",      "#5B6B12"],
  ["orchid",     "অর্কিড",        "fa-fan",         "#A21CAF"],
  ["bonsai",     "বনসাই",         "fa-tree",        "#7A4B1E"],
  ["other",      "অন্যান্য",          "fa-ellipsis",    "#4a5560"]
];
window.NR_TYPES = NR_CHIPS.map(function (c) {
  var g = window.NR_GROUPS[c[0]];
  return { key: c[0], label: c[1], icon: c[2], color: c[3], layout: "person",
           facts: g.facts, card: g.card, detail: g.detail, form: g.form };
});

// ---------- কার্ডে দেখানোর ফিল্ড (আইকন + লেবেল + ফরম্যাট) ----------
// fmt: "clamp" = ২ লাইনে ছাঁটা, "upazila" = কী থেকে নাম
window.NR_FIELDS = {
  plants:        { label: "যেসব গাছ পাওয়া যায়",  icon: "fa-seedling", fmt: "clamp" },
  seedling_type: { label: "চারার ধরন",            icon: "fa-scissors" },
  size:          { label: "চারার আকার",            icon: "fa-ruler-vertical" },
  pot:           { label: "টব",                    icon: "fa-box" },
  light:         { label: "আলো",                   icon: "fa-sun" },
  season:        { label: "মৌসুম",                 icon: "fa-cloud-sun" },
  sale_type:     { label: "বিক্রি",                icon: "fa-basket-shopping" },
  uses:          { label: "উপকারিতা / ব্যবহার",    icon: "fa-heart-pulse", fmt: "clamp" },
  age:           { label: "গাছের বয়স",            icon: "fa-hourglass-half" },
  price:         { label: "দামের পরিসর",           icon: "fa-bangladeshi-taka-sign" },
  delivery:      { label: "হোম ডেলিভারি",          icon: "fa-truck" },
  hours:         { label: "খোলার সময়",            icon: "fa-clock" },
  upazila:       { label: "উপজেলা",                icon: "fa-location-dot", fmt: "upazila" },
  address:       { label: "ঠিকানা",                icon: "fa-map-location-dot" },
  about:         { label: "বিবরণ",                 icon: "fa-align-left", fmt: "clamp" }
};

// ---------- ফর্ম ফিল্ড সংজ্ঞা ----------
// type: text | number | tel | select | textarea | checkbox | file ; maxlen = DB constraint-এও একই থাকবে
// ব্যক্তিগত তথ্য: NID / সঠিক বাসার ঠিকানা চাওয়া হয় না; মোবাইল নম্বর ঐচ্ছিক — দিলে সম্মতি থাকলেই কার্ডে দেখায়।
window.NR_FORM_FIELDS = {
  name:          { label: "নার্সারির / দোকানের নাম", type: "text", required: true, maxlen: 80 },
  plants:        { label: "যেসব গাছ পাওয়া যায় (যেমন: গোলাপ, জবা, বেলি)", type: "text", required: true, maxlen: 150 },
  seedling_type: { label: "চারার ধরন", type: "select", required: false, options: ["কলমের চারা", "বীজের চারা", "গ্রাফটিং", "টিস্যু কালচার", "সব ধরনের"] },
  size:          { label: "চারার আকার", type: "select", required: false, options: ["ছোট চারা", "মাঝারি", "বড় গাছ", "সব আকারের"] },
  pot:           { label: "টব", type: "select", required: false, options: ["টবসহ", "টব ছাড়া", "দুটোই আছে"] },
  light:         { label: "আলোর প্রয়োজন", type: "select", required: false, options: ["কম আলো", "মাঝারি আলো", "সরাসরি রোদ"] },
  season:        { label: "চারার মৌসুম", type: "select", required: false, options: ["শীতকালীন", "গ্রীষ্মকালীন", "বর্ষাকালীন", "সারা বছর"] },
  sale_type:     { label: "বিক্রির ধরন", type: "select", required: false, options: ["খুচরা", "পাইকারি", "খুচরা ও পাইকারি"] },
  uses:          { label: "উপকারিতা / ব্যবহার (যেমন: সর্দি-কাশি, ত্বকের যত্ন)", type: "text", required: false, maxlen: 150 },
  age:           { label: "গাছের বয়স (যেমন: ৫ বছর)", type: "text", required: false, maxlen: 30 },
  price:         { label: "দামের পরিসর (যেমন: ৩০ – ৫০০ টাকা)", type: "text", required: false, maxlen: 60 },
  delivery:      { label: "হোম ডেলিভারি", type: "select", required: false, options: ["আছে", "নেই"] },
  hours:         { label: "খোলার সময় (যেমন: সকাল ৮টা – রাত ৮টা)", type: "text", required: false, maxlen: 60 },
  upazila:       { label: "উপজেলা", type: "select", required: true, options: "NR_UPAZILAS" },
  address:       { label: "ঠিকানা / কীভাবে যাবেন", type: "text", required: true, maxlen: 150 },
  about:         { label: "বিবরণ (নার্সারি সম্পর্কে, বিশেষ সেবা)", type: "textarea", required: false, maxlen: 300 },
  phone:         { label: "যোগাযোগের মোবাইল নম্বর (ঐচ্ছিক)", type: "tel", required: false, maxlen: 20, pattern: "^01[3-9][0-9]{8}$", msg: "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন" },
  phone_consent: { label: "আমার মোবাইল নম্বর কার্ডে প্রকাশ করা যাবে", type: "checkbox", required: false },
  photo:         { label: "প্রধান ছবি (ঐচ্ছিক)", type: "file", required: false, accept: "image/jpeg,image/png,image/webp,image/gif", maxMB: 5 },
  // আরও ছবি (ঐচ্ছিক): সর্বোচ্চ max টি। প্রধান ছবিতে ক্লিক করলে লাইটবক্সে এগুলোও দেখা যায়।
  photos:        { label: "আরও ছবি (ঐচ্ছিক)", type: "photos", required: false, max: 4, accept: "image/jpeg,image/png,image/webp,image/gif", maxMB: 5 }
};

// ---------- ডাটাবেস কলাম (nursery_entries টেবিল; ধাপ ৪-এ) ----------
// সব চিপের ফিল্ডের সংযোগ। submit/loader দুটোই এই তালিকা থেকে চলে।
window.NR_DB_TEXT_COLS = ["name", "plants", "seedling_type", "size", "pot", "light", "season", "sale_type", "uses", "age", "price", "delivery", "hours", "upazila", "address", "about", "phone"];

window.NR_LAST_UPDATED = "2026-09-30";

// ---------- তালিকা ----------
// স্ট্যাটিক ডেমো নেই। পেজের সব এন্ট্রি শুধু Supabase (`nursery_entries`, status='approved')
// থেকে আসে (js/nursery-submit.js) — অ্যাডমিন থেকে মুছলে পেজ থেকেও মুছে যায়।
window.NR_DEMO_PROFILES = [];
window.NR_PROFILES = [];
