// টাঙ্গাইল জেলা — আইনজীবী (lawyer.html) — কনফিগ
// এই ফাইলই সব কিছুর "সিদ্ধান্ত-ফাইল": সাব-ক্যাটাগরি চিপ, কার্ডে কোন ফিল্ড দেখাবে, ফর্ম ফিল্ড সংজ্ঞা, ডাটাবেস কলাম তালিকা।
// নতুন চিপ/ফিল্ড যোগ করতে শুধু এখানে বদলান — js/lawyer.js ও js/lawyer-submit.js নিজে থেকেই মানিয়ে নেবে।
// (পাত্র-পাত্রী পেজ js/matrimony-data.js থেকে কপি করা — নিয়ম: CLONE_PROMPT.md)

window.LW_UPAZILAS = [
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

// ---------- সাব-ক্যাটাগরি চিপ (ইউজার নির্ধারিত ক্রম) ----------
// key      : ডাটাবেসে `type` কলামে যাবে
// color    : কার্ডের ট্যাগ/আইকনের রং (সাদা/হালকা ব্যাকগ্রাউন্ডে WCAG AA কনট্রাস্ট)
// layout   : কার্ডের ধরন — person (ছবি-টাইল সহ প্রোফাইল), agent (গোল লোগো/অ্যাভাটার)
// facts    : কার্ডের শিরোনামের নিচে ছোট পিল হিসেবে (LW_FIELDS-এর কী)
// card     : কার্ডে সারি হিসেবে এই ক্রমে — শুধু ছোট/সংক্ষিপ্ত ফিল্ড। লম্বা লেখা শুধু "detail"-এ (বিস্তারিত পেজে)
// detail   : কার্ডের লেখায় ক্লিক করলে খোলা "বিস্তারিত পেজ"-এ যে ফিল্ডগুলো এই ক্রমে (সম্পূর্ণ লেখাসহ) দেখাবে
// form     : "+" ফর্মে যে ফিল্ডগুলো এই ক্রমে আসবে (LW_FORM_FIELDS-এর কী)
// over     : শুধু এই চিপের জন্য ফিল্ড-বদল — label (ফর্মের লেবেল), dl (কার্ড/বিস্তারিত পেজের লেবেল), required (আবশ্যক কিনা)
//            (একই ডাটাবেস কলাম চিপ অনুযায়ী আলাদা নামে দেখানোর জন্য — যেমন office_name = "চেম্বার" বনাম "অফিস")
var LW_LAWYER_FORM = ["name", "office_name", "court", "experience", "education", "case_types", "reg_no", "address", "upazila", "hours",
                      "summary", "whatsapp", "maps_url", "phone", "phone_consent", "photo", "photos"];
var LW_LAWYER_OVER = {
  office_name: { label: "চেম্বার / ল' ফার্মের নাম", dl: "চেম্বার" },
  experience:  { required: true },
  reg_no:      { label: "বার সনদ / সদস্য নম্বর", dl: "বার সনদ নম্বর" },
  address:     { label: "চেম্বারের ঠিকানা", dl: "চেম্বারের ঠিকানা" },
  hours:       { label: "পরামর্শের সময়", dl: "পরামর্শের সময়" }
};
var LW_OFFICE_FORM = ["name", "office_name", "services", "reg_no", "experience", "address", "upazila", "hours",
                      "whatsapp", "maps_url", "phone", "phone_consent", "photo", "photos"];
var LW_OFFICE_OVER = {
  office_name: { label: "অফিসের নাম", dl: "অফিস" },
  services:    { label: "সেবার ধরন (হলফনামা, দলিল লেখা…)", dl: "সেবা" },
  reg_no:      { label: "লাইসেন্স / নিবন্ধন নম্বর", dl: "লাইসেন্স নম্বর" },
  address:     { label: "অফিসের ঠিকানা", dl: "অফিসের ঠিকানা" },
  hours:       { label: "অফিস সময়", dl: "অফিস সময়" },
  photo:       { label: "লোগো / ছবি (ঐচ্ছিক)" }
};

window.LW_TYPES = [
  { key: "civil", label: "দেওয়ানী", icon: "fa-scale-balanced", color: "#2C4373",
    layout: "person", facts: ["experience"],
    card: ["office_name", "court", "education", "upazila"],
    detail: ["experience", "office_name", "court", "education", "reg_no", "case_types", "summary", "upazila", "address", "hours"],
    form: LW_LAWYER_FORM, over: LW_LAWYER_OVER },
  { key: "criminal", label: "ফৌজদারী", icon: "fa-gavel", color: "#a12b2b",
    layout: "person", facts: ["experience"],
    card: ["office_name", "court", "education", "upazila"],
    detail: ["experience", "office_name", "court", "education", "reg_no", "case_types", "summary", "upazila", "address", "hours"],
    form: LW_LAWYER_FORM, over: LW_LAWYER_OVER },
  { key: "family", label: "পারিবারিক", icon: "fa-people-roof", color: "#7a3c9e",
    layout: "person", facts: ["experience"],
    card: ["office_name", "court", "education", "upazila"],
    detail: ["experience", "office_name", "court", "education", "reg_no", "case_types", "summary", "upazila", "address", "hours"],
    form: LW_LAWYER_FORM, over: LW_LAWYER_OVER },
  { key: "land", label: "ভূমি ও সম্পত্তি", icon: "fa-house-chimney", color: "#1b6b3e",
    layout: "person", facts: ["experience"],
    card: ["office_name", "court", "education", "upazila"],
    detail: ["experience", "office_name", "court", "education", "reg_no", "case_types", "summary", "upazila", "address", "hours"],
    form: LW_LAWYER_FORM, over: LW_LAWYER_OVER },
  { key: "notary", label: "নোটারি", icon: "fa-stamp", color: "#8a5a0b",
    layout: "agent", facts: ["experience"],
    card: ["office_name", "upazila", "address"],
    detail: ["experience", "office_name", "services", "reg_no", "upazila", "address", "hours"],
    form: LW_OFFICE_FORM, over: LW_OFFICE_OVER },
  { key: "deed_writer", label: "দলিল লেখক", icon: "fa-file-signature", color: "#0b6b7a",
    layout: "agent", facts: ["experience"],
    card: ["office_name", "upazila", "address"],
    detail: ["experience", "office_name", "services", "reg_no", "upazila", "address", "hours"],
    form: LW_OFFICE_FORM, over: LW_OFFICE_OVER },
  { key: "legal_aid", label: "আইনি সহায়তা", icon: "fa-handshake-angle", color: "#a3400f",
    layout: "agent", facts: ["org_type"],
    card: ["upazila", "address"],
    detail: ["org_type", "services", "upazila", "address", "hours"],
    form: ["name", "org_type", "services", "address", "upazila", "hours", "whatsapp", "maps_url", "phone", "phone_consent", "photo", "photos"],
    over: {
      name:     { label: "প্রতিষ্ঠানের নাম" },
      services: { label: "কী সহায়তা দেওয়া হয়", dl: "সহায়তা", required: true },
      address:  { label: "ঠিকানা", dl: "ঠিকানা" },
      hours:    { label: "অফিস সময়", dl: "অফিস সময়" },
      photo:    { label: "লোগো / ছবি (ঐচ্ছিক)" }
    } }
];

// ---------- কার্ড/বিস্তারিত পেজে দেখানোর ফিল্ড (আইকন + লেবেল + ফরম্যাট) ----------
// fmt: "exp" = " বছরের অভিজ্ঞতা", "clamp" = কার্ডে ২ লাইনে ছাঁটা (বিস্তারিত পেজে পুরোটা), "upazila" = কী থেকে নাম
window.LW_FIELDS = {
  office_name: { label: "চেম্বার / অফিস",  icon: "fa-building" },
  court:       { label: "প্রধান আদালত",    icon: "fa-landmark" },
  experience:  { label: "অভিজ্ঞতা",        icon: "fa-award",         fmt: "exp" },
  education:   { label: "শিক্ষা",          icon: "fa-graduation-cap" },
  case_types:  { label: "মামলার ধরন",      icon: "fa-folder-open",   fmt: "clamp" },
  reg_no:      { label: "সনদ / লাইসেন্স নম্বর", icon: "fa-id-badge" },
  services:    { label: "সেবা",            icon: "fa-list-check",    fmt: "clamp" },
  org_type:    { label: "ধরন",             icon: "fa-layer-group" },
  upazila:     { label: "উপজেলা",          icon: "fa-location-dot",  fmt: "upazila" },
  address:     { label: "ঠিকানা",          icon: "fa-map-location-dot" },
  hours:       { label: "সময়",            icon: "fa-clock" },
  summary:     { label: "পরিচিতি",         icon: "fa-id-card",       fmt: "clamp" }
};

// ---------- ফর্ম ফিল্ড সংজ্ঞা ----------
// type: text | number | tel | url | select | textarea | checkbox | file | photos ; min/max = সংখ্যার সীমা ; maxlen = DB constraint-এও একই থাকবে
// মোবাইল প্রকাশের সম্মতি বাধ্যতামূলক চেকবক্স। ব্যক্তিগত তথ্য (NID ইত্যাদি) চাওয়া হবে না।
window.LW_FORM_FIELDS = {
  name:        { label: "নাম", type: "text", required: true, maxlen: 80 },
  office_name: { label: "চেম্বার / অফিসের নাম", type: "text", required: false, maxlen: 100 },
  court:       { label: "প্রধান আদালত", type: "select", required: true, maxlen: 60,
                 options: ["জেলা জজ আদালত", "চিফ জুডিশিয়াল ম্যাজিস্ট্রেট আদালত", "সহকারী জজ আদালত", "হাইকোর্ট বিভাগ", "অন্যান্য"] },
  experience:  { label: "অভিজ্ঞতা (বছর)", type: "number", required: false, min: 0, max: 60, msg: "অভিজ্ঞতা ০ থেকে ৬০ বছরের মধ্যে দিন" },
  education:   { label: "শিক্ষাগত যোগ্যতা", type: "text", required: true, maxlen: 100 },
  case_types:  { label: "যেসব মামলায় বেশি কাজ করেন", type: "textarea", required: false, maxlen: 300 },
  reg_no:      { label: "বার সনদ / সদস্য নম্বর", type: "text", required: false, maxlen: 50 },
  services:    { label: "সেবার ধরন", type: "textarea", required: false, maxlen: 300 },
  org_type:    { label: "ধরন", type: "select", required: true, maxlen: 40, options: ["সরকারি লিগ্যাল এইড", "এনজিও", "বার সমিতি", "অন্যান্য"] },
  address:     { label: "ঠিকানা", type: "text", required: true, maxlen: 200 },
  upazila:     { label: "উপজেলা", type: "select", required: true, options: "LW_UPAZILAS" },
  hours:       { label: "সময়", type: "text", required: false, maxlen: 100 },
  summary:     { label: "সংক্ষিপ্ত পরিচিতি", type: "textarea", required: false, maxlen: 300 },
  whatsapp:    { label: "হোয়াটসঅ্যাপ নম্বর (ঐচ্ছিক)", type: "tel", required: false, maxlen: 20, pattern: "^01[3-9][0-9]{8}$", msg: "সঠিক ১১ ডিজিটের হোয়াটসঅ্যাপ নম্বর দিন" },
  maps_url:    { label: "Google Map লিংক (ঐচ্ছিক)", type: "url", required: false, maxlen: 500,
                 msg: "Google Map-এর লিংক দিন — https://maps.app.goo.gl/… বা https://www.google.com/maps/… ধাঁচের" },
  phone:       { label: "মোবাইল নম্বর", type: "tel", required: true, maxlen: 20, pattern: "^01[3-9][0-9]{8}$", msg: "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন" },
  phone_consent: { label: "আমি সম্মত — আমার মোবাইল নম্বর প্রকাশ করা যাবে", type: "checkbox", required: true, msg: "নম্বর প্রকাশের সম্মতি না দিলে জমা দেওয়া যাবে না" },
  photo:       { label: "ছবি (ঐচ্ছিক)", type: "file", required: false, accept: "image/jpeg,image/png,image/webp,image/gif", maxMB: 5 },
  // আরও ছবি (ঐচ্ছিক): সর্বোচ্চ max টি। ছবিতে ক্লিক করলে লাইটবক্সে প্রধান ছবির সাথে এগুলোও দেখা যায়।
  // কোনো চিপের ফর্মে এটা চান না? সেই চিপের form তালিকা থেকে "photos" বাদ দিন।
  photos:      { label: "আরও ছবি (ঐচ্ছিক)", type: "photos", required: false, max: 4, accept: "image/jpeg,image/png,image/webp,image/gif", maxMB: 5 }
};

// ---------- ডাটাবেস কলাম (টেবিল lawyer_entries) — লোডার ও ফর্ম-জমা দুটোই এখান থেকে ----------
// এর বাইরে সবসময় থাকবে: id, created_at, type, phone_public, photo_url, extra_photos, is_verified, is_demo, status
window.LW_DB_TEXT_COLS = ["name", "office_name", "court", "education", "case_types", "reg_no", "services", "org_type",
                          "address", "upazila", "hours", "summary", "whatsapp", "maps_url", "phone"];
window.LW_DB_NUM_COLS = ["experience"];

// ---------- Google Map লিংক যাচাই (শুধু https + গুগল ম্যাপের নিজস্ব ঠিকানা) — ফর্ম ও কার্ড দুই জায়গাতেই ----------
window.LW_isMapsUrl = function (u) {
  try {
    var x = new URL(String(u || ''));
    if (x.protocol !== 'https:') return false;
    var h = x.hostname.toLowerCase();
    if (h === 'maps.app.goo.gl' || h === 'maps.google.com') return true;
    if (/^(www\.)?google\.(com|com\.bd)$/.test(h) || h === 'goo.gl') return /^\/maps(\/|$)/.test(x.pathname);
    return false;
  } catch (e) { return false; }
};

window.LW_LAST_UPDATED = "2026-09-20";

// লোড-অবস্থার ফ্ল্যাগ: js/lawyer.js প্রথমবার আঁকার আগেই "লোড হচ্ছে" ধরা থাকে (নইলে ডাটা আসার আগে এক ঝলক
// "এখনো কেউ যুক্ত হননি" বার্তা দেখাত)। js/lawyer-submit.js লোড শেষে এগুলো বদলে ইভেন্ট পাঠায়।
window.LW_LOADING = true;
window.LW_LOADED = false;
window.LW_LOAD_FAILED = false;

// ---------- তালিকা ----------
// স্ট্যাটিক ডেমো নেই। পেজের সব এন্ট্রি শুধু Supabase (`lawyer_entries`, status='approved') থেকে আসে (js/lawyer-submit.js) —
// অ্যাডমিন থেকে মুছলে পেজ থেকেও মুছে যায়।
window.LW_DEMO_PROFILES = [];
window.LW_PROFILES = [];
