// টাঙ্গাইল জেলা — হাসপাতাল (hospital.html) — কনফিগ
// এই ফাইলই সব কিছুর "সিদ্ধান্ত-ফাইল": সাব-ক্যাটাগরি চিপ, কার্ডে কোন ফিল্ড দেখাবে, ফর্ম ফিল্ড সংজ্ঞা, ডাটাবেস কলাম তালিকা।
// নতুন চিপ/ফিল্ড যোগ করতে শুধু এখানে বদলান — js/hospital.js ও js/hospital-submit.js নিজে থেকেই মানিয়ে নেবে।
// (lawyer.html-এর js/lawyer-data.js থেকে কপি করা — নিয়ম: CATEGORY_ROADMAP.md / MASTER_PROMPT.md)
// ১০টি চিপই একই ফিল্ড-সেট ব্যবহার করে (আইনজীবীর মতো চিপ-ভিত্তিক over নেই) — এগুলো সবই "প্রতিষ্ঠান" ধরনের এন্ট্রি,
// শুধু ধরন (type) আলাদা। চিপের key আগের listing.html?cat=... প্যারামিটারের সাথে হুবহু মিলিয়ে রাখা হয়েছে।

window.HP_UPAZILAS = [
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

// ---------- সব চিপে একই ফর্ম-ফিল্ড ক্রম ----------
var HP_FORM = ["name", "address", "upazila", "services", "hours", "emergency24",
               "whatsapp", "maps_url", "phone", "phone_consent", "photo", "photos"];

// ---------- সাব-ক্যাটাগরি চিপ (হাসপাতাল পেজের আগের ১০টি চিপের ক্রম ও key অপরিবর্তিত) ----------
// key      : ডাটাবেসে `type` কলামে যাবে (আগের listing.html?cat=... এর সাথে হুবহু মিল)
// color    : কার্ডের ব্যাজ/আইকনের রং (WCAG AA)
// layout   : agent (গোল আইকন/ছবি, কম্প্যাক্ট প্রতিষ্ঠান-কার্ড) — সব চিপে একই
// facts    : কার্ডের শিরোনামের নিচে ছোট পিল হিসেবে
// card     : কার্ডে সংক্ষিপ্ত সারি (লম্বা লেখা নেই)
// detail   : বিস্তারিত পেজে পুরো লেখাসহ
// form     : "+" ফর্মে ফিল্ড ক্রম (HP_FORM_FIELDS-এর কী)
window.HP_TYPES = [
  { key: "hospital-govt", label: "সরকারি হাসপাতাল", icon: "fa-hospital", color: "#A12B2B",
    layout: "agent", facts: ["upazila"], card: ["address", "hours"], detail: ["services", "hours", "address", "upazila"], form: HP_FORM },
  { key: "hospital-private", label: "বেসরকারি হাসপাতাল", icon: "fa-hospital", color: "#7A1F1F",
    layout: "agent", facts: ["upazila"], card: ["address", "hours"], detail: ["services", "hours", "address", "upazila"], form: HP_FORM },
  { key: "hospital-medical-college", label: "মেডিকেল কলেজ", icon: "fa-hospital", color: "#8a5a0b",
    layout: "agent", facts: ["upazila"], card: ["address", "hours"], detail: ["services", "hours", "address", "upazila"], form: HP_FORM },
  { key: "hospital-upazila-health-complex", label: "উপজেলা স্বাস্থ্য কমপ্লেক্স", icon: "fa-hospital", color: "#1b6b3e",
    layout: "agent", facts: ["upazila"], card: ["address", "hours"], detail: ["services", "hours", "address", "upazila"], form: HP_FORM },
  { key: "hospital-diagnostic", label: "ডায়াগনস্টিক", icon: "fa-flask", color: "#0E8A93",
    layout: "agent", facts: ["upazila"], card: ["address", "hours"], detail: ["services", "hours", "address", "upazila"], form: HP_FORM },
  { key: "hospital-eye", label: "চক্ষু চিকিৎসা", icon: "fa-eye", color: "#3d5a80",
    layout: "agent", facts: ["upazila"], card: ["address", "hours"], detail: ["services", "hours", "address", "upazila"], form: HP_FORM },
  { key: "hospital-dental", label: "ডেন্টাল", icon: "fa-tooth", color: "#0b6b7a",
    layout: "agent", facts: ["upazila"], card: ["address", "hours"], detail: ["services", "hours", "address", "upazila"], form: HP_FORM },
  { key: "hospital-specialized", label: "বিশেষায়িত হাসপাতাল", icon: "fa-heart-pulse", color: "#a3400f",
    layout: "agent", facts: ["upazila"], card: ["address", "hours"], detail: ["services", "hours", "address", "upazila"], form: HP_FORM },
  { key: "hospital-maternal-child", label: "মাতৃ ও শিশু", icon: "fa-baby", color: "#7a3c9e",
    layout: "agent", facts: ["upazila"], card: ["address", "hours"], detail: ["services", "hours", "address", "upazila"], form: HP_FORM },
  { key: "hospital-community-clinic", label: "কমিউনিটি ক্লিনিক", icon: "fa-house-medical", color: "#2C4373",
    layout: "agent", facts: ["upazila"], card: ["address", "hours"], detail: ["services", "hours", "address", "upazila"], form: HP_FORM }
];

// ---------- কার্ড/বিস্তারিত পেজে দেখানোর ফিল্ড (আইকন + লেবেল + ফরম্যাট) ----------
// fmt: "clamp" = কার্ডে ২ লাইনে ছাঁটা (বিস্তারিত পেজে পুরোটা), "upazila" = কী থেকে নাম
window.HP_FIELDS = {
  address:  { label: "ঠিকানা",        icon: "fa-map-location-dot" },
  upazila:  { label: "উপজেলা",        icon: "fa-location-dot", fmt: "upazila" },
  services: { label: "সেবা",          icon: "fa-list-check",  fmt: "clamp" },
  hours:    { label: "সময়",          icon: "fa-clock" }
};

// ---------- ফর্ম ফিল্ড সংজ্ঞা ----------
// type: text | number | tel | url | select | textarea | checkbox | file | photos ; maxlen = DB constraint-এও একই থাকবে
// মোবাইল প্রকাশের সম্মতি বাধ্যতামূলক চেকবক্স। ব্যক্তিগত তথ্য (NID ইত্যাদি) চাওয়া হবে না।
window.HP_FORM_FIELDS = {
  name:         { label: "প্রতিষ্ঠানের নাম", type: "text", required: true, maxlen: 100 },
  address:      { label: "ঠিকানা", type: "text", required: true, maxlen: 200 },
  upazila:      { label: "উপজেলা", type: "select", required: true, options: "HP_UPAZILAS" },
  services:     { label: "সেবার সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)", type: "textarea", required: false, maxlen: 300 },
  hours:        { label: "খোলার সময় (ঐচ্ছিক, যেমন: ২৪ ঘণ্টা / সকাল ৮টা–রাত ১০টা)", type: "text", required: false, maxlen: 100 },
  emergency24:  { label: "২৪ ঘণ্টা জরুরি সেবা আছে", type: "checkbox", required: false },
  whatsapp:     { label: "হোয়াটসঅ্যাপ নম্বর (ঐচ্ছিক)", type: "tel", required: false, maxlen: 20, pattern: "^01[3-9][0-9]{8}$", msg: "সঠিক ১১ ডিজিটের হোয়াটসঅ্যাপ নম্বর দিন" },
  maps_url:     { label: "Google Map লিংক (ঐচ্ছিক)", type: "url", required: false, maxlen: 500,
                  msg: "Google Map-এর লিংক দিন — https://maps.app.goo.gl/… বা https://www.google.com/maps/… ধাঁচের" },
  phone:        { label: "মোবাইল নম্বর", type: "tel", required: true, maxlen: 20, pattern: "^01[3-9][0-9]{8}$", msg: "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন" },
  phone_consent:{ label: "আমি সম্মত — এই মোবাইল নম্বর প্রকাশ করা যাবে", type: "checkbox", required: true, msg: "নম্বর প্রকাশের সম্মতি না দিলে জমা দেওয়া যাবে না" },
  photo:        { label: "প্রধান ছবি (ঐচ্ছিক)", type: "file", required: false, accept: "image/jpeg,image/png,image/webp,image/gif", maxMB: 5 },
  // আরও ছবি (ঐচ্ছিক): সর্বোচ্চ ৪টি। ছবিতে ক্লিক করলে লাইটবক্সে প্রধান ছবির সাথে এগুলোও দেখা যায়।
  photos:       { label: "আরও ছবি (ঐচ্ছিক)", type: "photos", required: false, max: 4, accept: "image/jpeg,image/png,image/webp,image/gif", maxMB: 5 }
};

// ---------- ডাটাবেস কলাম (ভবিষ্যতে টেবিল hospital_entries — এখনো তৈরি হয়নি) ----------
// এর বাইরে সবসময় থাকবে: id, created_at, type, phone_public, photo_url, extra_photos, is_verified, is_demo, status
window.HP_DB_TEXT_COLS = ["name", "address", "upazila", "services", "hours", "whatsapp", "maps_url", "phone"];
window.HP_DB_NUM_COLS = [];
window.HP_DB_BOOL_COLS = ["emergency24"];

// ---------- Google Map লিংক যাচাই (শুধু https + গুগল ম্যাপের নিজস্ব ঠিকানা) — ফর্ম ও কার্ড দুই জায়গাতেই ----------
window.HP_isMapsUrl = function (u) {
  try {
    var x = new URL(String(u || ''));
    if (x.protocol !== 'https:') return false;
    var h = x.hostname.toLowerCase();
    if (h === 'maps.app.goo.gl' || h === 'maps.google.com') return true;
    if (/^(www\.)?google\.(com|com\.bd)$/.test(h) || h === 'goo.gl') return /^\/maps(\/|$)/.test(x.pathname);
    return false;
  } catch (e) { return false; }
};

window.HP_LAST_UPDATED = "2026-09-26";

// লোড-অবস্থার ফ্ল্যাগ: js/hospital.js প্রথমবার আঁকার আগেই "লোড হচ্ছে" ধরা থাকে।
// js/hospital-submit.js ব্যাকএন্ড টেবিল hospital_entries তৈরি হওয়ার পর (ধাপ ৪, ইউজারের অনুমতি সাপেক্ষে) লোড শেষে
// এগুলো বদলে ইভেন্ট পাঠাবে। এখন পর্যন্ত টেবিল নেই — তাই লোড ব্যর্থ দেখাবে (নিচে দেখুন MASTER_PROMPT.md ধারা ৭)।
window.HP_LOADING = true;
window.HP_LOADED = false;
window.HP_LOAD_FAILED = false;

// ---------- তালিকা ----------
// স্ট্যাটিক ডেমো নেই (MASTER_PROMPT.md ধারা ৮)। পেজের সব এন্ট্রি শুধু Supabase (`hospital_entries`, status='approved')
// থেকে আসবে — ব্যাকএন্ড তৈরি না হওয়া পর্যন্ত তালিকা খালি/লোড-ব্যর্থ দেখাবে।
window.HP_DEMO_PROFILES = [];
window.HP_PROFILES = [];
