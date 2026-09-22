// টাঙ্গাইল জেলা — পাত্র-পাত্রী (matrimony.html) — কনফিগ + ডেমো ডেটা
// এই ফাইলই সব কিছুর "সিদ্ধান্ত-ফাইল": সাব-ক্যাটাগরি চিপ, কার্ডে কোন ফিল্ড দেখাবে, ফর্ম ফিল্ড সংজ্ঞা।
// নতুন চিপ/ফিল্ড যোগ করতে শুধু এখানে বদলান — js/matrimony.js নিজে থেকেই মানিয়ে নেবে।

window.MM_UPAZILAS = [
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
// layout   : কার্ডের ধরন — person (ছবি-টাইল সহ প্রোফাইল), agent (ঘটক, গোল অ্যাভাটার), guardian (উদ্ধৃতি-ব্লক)
// facts    : কার্ডের শিরোনামের নিচে ছোট পিল হিসেবে (MM_FIELDS-এর কী)
// quote    : (guardian) হাইলাইট ব্লকে দেখানো ফিল্ড
// card     : কার্ডে সারি হিসেবে এই ক্রমে — শুধু ছোট/সংক্ষিপ্ত ফিল্ড। লম্বা লেখার ফিল্ড (পরিবার, প্রত্যাশা…) কার্ডে থাকবে না,
//            সেগুলো শুধু "detail"-এ (বিস্তারিত পেজে) — নিচের detail দেখুন (MM_FIELDS-এর কী)
// form     : ধাপ ৩-এর ফর্মে যে ফিল্ডগুলো এই ক্রমে আসবে (MM_FORM_FIELDS-এর কী)
// detail   : কার্ডের লেখায় ক্লিক করলে খোলা "বিস্তারিত পেজ"-এ যে ফিল্ডগুলো এই ক্রমে (সম্পূর্ণ লেখাসহ) দেখাবে (MM_FIELDS-এর কী)
window.MM_TYPES = [
  { key: "groom", label: "পাত্র", icon: "fa-mars", color: "#0B6B8C",
    layout: "person", facts: ["age", "height"],
    card: ["education", "occupation", "upazila", "religion"],
    detail: ["age", "height", "education", "occupation", "religion", "upazila", "address", "family", "expectation"],
    form: ["name", "age", "height", "education", "occupation", "upazila", "address", "religion", "whatsapp", "family", "expectation", "phone", "phone_consent", "photo", "photos"] },
  { key: "bride", label: "পাত্রী", icon: "fa-venus", color: "#A83D5E",
    layout: "person", facts: ["age", "height"],
    card: ["education", "occupation", "upazila", "religion"],
    detail: ["age", "height", "education", "occupation", "religion", "upazila", "address", "family", "expectation"],
    form: ["name", "age", "height", "education", "occupation", "upazila", "address", "religion", "whatsapp", "family", "expectation", "phone", "phone_consent", "photo", "photos"] },
  { key: "ghotok", label: "ঘটক", icon: "fa-handshake", color: "#8a5a0b",
    layout: "agent", facts: ["experience"],
    card: ["upazila", "address"],
    detail: ["experience", "upazila", "address"],
    form: ["name", "upazila", "address", "experience", "phone", "phone_consent", "photo", "photos"] },
  { key: "guardian", label: "অভিভাবক", icon: "fa-people-roof", color: "#0b7280",
    layout: "guardian", facts: ["for_whom"], quote: "summary",
    card: ["relation", "upazila"],
    detail: ["relation", "for_whom", "upazila", "address", "expectation"],
    form: ["name", "relation", "for_whom", "summary", "upazila", "address", "expectation", "phone", "phone_consent"] },
  // ধরে নেওয়া: বিবাহিত/বিবাহিতা = পূর্বে বিবাহিত (তালাকপ্রাপ্ত / বিধবা / বিপত্নীক) — পুনর্বিবাহ প্রত্যাশী। (রোডম্যাপের "খোলা প্রশ্ন" দেখুন)
  { key: "married_m", label: "বিবাহিত", icon: "fa-mars", color: "#4b52ad",
    layout: "person", facts: ["age", "prev_status"],
    card: ["children", "education", "occupation", "upazila", "religion"],
    detail: ["age", "height", "prev_status", "children", "education", "occupation", "religion", "upazila", "address", "family", "expectation"],
    form: ["name", "age", "height", "education", "occupation", "upazila", "address", "religion", "prev_status", "children", "family", "expectation", "phone", "phone_consent", "photo", "photos"] },
  { key: "married_f", label: "বিবাহিতা", icon: "fa-venus", color: "#84479f",
    layout: "person", facts: ["age", "prev_status"],
    card: ["children", "education", "occupation", "upazila", "religion"],
    detail: ["age", "height", "prev_status", "children", "education", "occupation", "religion", "upazila", "address", "family", "expectation"],
    form: ["name", "age", "height", "education", "occupation", "upazila", "address", "religion", "prev_status", "children", "family", "expectation", "phone", "phone_consent", "photo", "photos"] }
];

// ---------- কার্ডে দেখানোর ফিল্ড (আইকন + লেবেল + ফরম্যাট) ----------
// fmt: "age" = বাংলা সংখ্যা + " বছর", "clamp" = ২ লাইনে ছাঁটা, "upazila" = কী থেকে নাম, "exp" = " বছরের অভিজ্ঞতা"
window.MM_FIELDS = {
  age:         { label: "বয়স",             icon: "fa-cake-candles",     fmt: "age" },
  height:      { label: "উচ্চতা",           icon: "fa-ruler-vertical" },
  education:   { label: "শিক্ষা",           icon: "fa-graduation-cap" },
  occupation:  { label: "পেশা",             icon: "fa-briefcase" },
  upazila:     { label: "উপজেলা",           icon: "fa-location-dot",     fmt: "upazila" },
  address:     { label: "এলাকা",            icon: "fa-map-location-dot" },
  religion:    { label: "ধর্ম",             icon: "fa-star-and-crescent" },
  family:      { label: "পরিবার",           icon: "fa-house-user",       fmt: "clamp" },
  expectation: { label: "প্রত্যাশা",        icon: "fa-heart",            fmt: "clamp" },
  experience:  { label: "অভিজ্ঞতা",        icon: "fa-award",            fmt: "exp" },
  relation:    { label: "সম্পর্ক",          icon: "fa-user-group" },
  for_whom:    { label: "কার জন্য",         icon: "fa-child-reaching" },
  summary:     { label: "পাত্র/পাত্রীর তথ্য", icon: "fa-id-card",          fmt: "clamp" },
  prev_status: { label: "বৈবাহিক অবস্থা",   icon: "fa-ring" },
  children:    { label: "সন্তান",           icon: "fa-baby" }
};

// ---------- ফর্ম ফিল্ড সংজ্ঞা (ধাপ ৩-এ ব্যবহার হবে; এখন শুধু সংজ্ঞা) ----------
// type: text | number | tel | select | textarea | checkbox | file ; min/max = সংখ্যার সীমা ; maxlen = DB constraint-এও একই থাকবে
// ব্যক্তিগত তথ্য: NID / সঠিক বাসার ঠিকানা চাওয়া হবে না; মোবাইল প্রকাশের সম্মতি বাধ্যতামূলক চেকবক্স।
window.MM_FORM_FIELDS = {
  name:        { label: "নাম (বা ডাকনাম)", type: "text", required: true, maxlen: 80 },
  age:         { label: "বয়স", type: "number", required: true, min: 18, max: 80, msg: "বয়স ১৮ থেকে ৮০ এর মধ্যে দিন" },
  height:      { label: "উচ্চতা (যেমন: ৫ ফুট ৭ ইঞ্চি)", type: "text", required: false, maxlen: 30 },
  education:   { label: "শিক্ষাগত যোগ্যতা", type: "text", required: true, maxlen: 100 },
  occupation:  { label: "পেশা", type: "text", required: true, maxlen: 100 },
  upazila:     { label: "উপজেলা", type: "select", required: true, options: "MM_UPAZILAS" },
  address:     { label: "এলাকা / গ্রাম (সঠিক বাসার ঠিকানা নয়)", type: "text", required: false, maxlen: 150 },
  religion:    { label: "ধর্ম", type: "select", required: true, options: ["ইসলাম", "হিন্দু", "বৌদ্ধ", "খ্রিস্টান", "অন্যান্য"] },
  whatsapp:    { label: "হোয়াটসঅ্যাপ নম্বর (ঐচ্ছিক)", type: "tel", required: false, maxlen: 20, pattern: "^01[3-9][0-9]{8}$", msg: "সঠিক ১১ ডিজিটের হোয়াটসঅ্যাপ নম্বর দিন" },
  prev_status: { label: "বর্তমান বৈবাহিক অবস্থা", type: "select", required: true, options: ["তালাকপ্রাপ্ত", "বিধবা / বিপত্নীক", "অন্যান্য"] },
  children:    { label: "সন্তান আছে কি?", type: "select", required: true, options: ["নেই", "১ জন", "২ জন", "৩ বা তার বেশি"] },
  family:      { label: "পরিবারের সংক্ষিপ্ত তথ্য", type: "textarea", required: false, maxlen: 300 },
  expectation: { label: "প্রত্যাশা", type: "textarea", required: false, maxlen: 300 },
  experience:  { label: "অভিজ্ঞতা (বছর)", type: "number", required: false, min: 0, max: 60 },
  relation:    { label: "পাত্র/পাত্রীর সাথে সম্পর্ক", type: "select", required: true, options: ["বাবা", "মা", "ভাই", "বোন", "চাচা/মামা", "অন্যান্য অভিভাবক"] },
  for_whom:    { label: "কার জন্য খুঁজছেন", type: "select", required: true, options: ["পাত্রের জন্য", "পাত্রীর জন্য"] },
  summary:     { label: "পাত্র/পাত্রীর বয়স, শিক্ষা ও পেশা (সংক্ষেপে)", type: "textarea", required: true, maxlen: 300 },
  phone:       { label: "মোবাইল নম্বর", type: "tel", required: true, maxlen: 20, pattern: "^01[3-9][0-9]{8}$", msg: "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন" },
  phone_consent: { label: "আমি সম্মত — আমার মোবাইল নম্বর প্রকাশ করা যাবে", type: "checkbox", required: true, msg: "নম্বর প্রকাশের সম্মতি না দিলে জমা দেওয়া যাবে না" },
  photo:       { label: "ছবি (ঐচ্ছিক)", type: "file", required: false, accept: "image/jpeg,image/png,image/webp,image/gif", maxMB: 5 },
  // আরও ছবি (ঐচ্ছিক): সর্বোচ্চ max টি। প্রোফাইল ছবিতে ক্লিক করলে লাইটবক্সে প্রধান ছবির সাথে এগুলোও দেখা যায়।
  // কোনো ধরনের ফর্মে এটা চান না? সেই ধরনের form তালিকা থেকে "photos" বাদ দিন।
  photos:      { label: "আরও ছবি (ঐচ্ছিক)", type: "photos", required: false, max: 4, accept: "image/jpeg,image/png,image/webp,image/gif", maxMB: 5 }
};

window.MM_LAST_UPDATED = "2026-09-20";

// ---------- প্রোফাইল তালিকা ----------
// স্ট্যাটিক ডেমো প্রোফাইল সম্পূর্ণ সরানো হয়েছে। পেজের সব প্রোফাইল এখন শুধু Supabase (`matrimony_entries`, status='approved')
// থেকে আসে (js/matrimony-submit.js) — অ্যাডমিন থেকে মুছলে পেজ থেকেও মুছে যায়।
window.MM_DEMO_PROFILES = [];
window.MM_PROFILES = [];
