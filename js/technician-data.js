// টাঙ্গাইল জেলা — টেকনিশিয়ান (technician.html) — কনফিগ
// এই ফাইলই সব কিছুর "সিদ্ধান্ত-ফাইল": সাব-ক্যাটাগরি চিপ, কার্ডে কোন ফিল্ড দেখাবে, ফর্ম ফিল্ড সংজ্ঞা।
// নতুন চিপ যোগ করতে শুধু TC_TYPES-এ একটা সারি যোগ করুন (এবং supabase/technician-schema.sql-এর type check-এ key যোগ করুন)।
// চিপগুলো গ্রুপ অনুযায়ী সাজানো: বিদ্যুৎ · পানি ও স্যানিটারি · যন্ত্র মেরামত · নির্মাণ · বাসা · যানবাহন · অন্যান্য

window.TC_UPAZILAS = [
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

// ---------- সাব-ক্যাটাগরি চিপ ----------
// key    : ডাটাবেসে `type` কলামে যাবে
// color  : কার্ডের ট্যাগ/আইকনের রং (সাদা/হালকা ব্যাকগ্রাউন্ডে WCAG AA কনট্রাস্ট)
// layout : সব চিপে person (ছবি-টাইল সহ প্রোফাইল)
// facts  : কার্ডের শিরোনামের নিচে ছোট পিল (TC_FIELDS-এর কী)
// card   : কার্ডে সারি হিসেবে — শুধু সংক্ষিপ্ত ফিল্ড। লম্বা লেখা ("about") শুধু detail-এ
// form   : ফর্মে যে ফিল্ড যে ক্রমে আসবে (TC_FORM_FIELDS-এর কী)
// detail : বিস্তারিত পেজে যে ফিল্ড যে ক্রমে (সম্পূর্ণ লেখাসহ)
window.TC_TYPES = [
  { key: "electrician", label: "ইলেকট্রিশিয়ান", icon: "fa-bolt", color: "#B45309",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "solar_ips", label: "সোলার / IPS", icon: "fa-solar-panel", color: "#B45309",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "cctv", label: "CCTV ও সিকিউরিটি", icon: "fa-video", color: "#B45309",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "plumber", label: "প্লাম্বার", icon: "fa-faucet-drip", color: "#0B6B8C",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "tubewell_pump", label: "টিউবওয়েল / পাম্প", icon: "fa-water", color: "#0B6B8C",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "tank_clean", label: "ট্যাংক পরিষ্কার", icon: "fa-droplet", color: "#0B6B8C",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "ac_fridge", label: "AC / ফ্রিজ", icon: "fa-snowflake", color: "#4b52ad",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "washing_machine", label: "ওয়াশিং মেশিন", icon: "fa-soap", color: "#4b52ad",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "tv_electronics", label: "TV / ইলেকট্রনিক্স", icon: "fa-tv", color: "#4b52ad",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "mobile_repair", label: "মোবাইল মেরামত", icon: "fa-mobile-screen", color: "#4b52ad",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "computer_printer", label: "কম্পিউটার / প্রিন্টার", icon: "fa-computer", color: "#4b52ad",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "mason", label: "রাজমিস্ত্রি", icon: "fa-trowel-bricks", color: "#8a5a0b",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "painter", label: "রঙ মিস্ত্রি", icon: "fa-paint-roller", color: "#8a5a0b",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "tiles", label: "টাইলস মিস্ত্রি", icon: "fa-border-all", color: "#8a5a0b",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "carpenter", label: "কাঠমিস্ত্রি / ফার্নিচার", icon: "fa-hammer", color: "#8a5a0b",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "welding_grill", label: "গ্রিল / ওয়েল্ডিং", icon: "fa-fire-flame-curved", color: "#8a5a0b",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "roof_casting", label: "ছাদ ঢালাই", icon: "fa-house-chimney", color: "#8a5a0b",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "pest_control", label: "পেস্ট কন্ট্রোল", icon: "fa-bug", color: "#0b7280",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "house_cleaning", label: "বাসা ক্লিনিং", icon: "fa-broom", color: "#0b7280",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "dish_internet", label: "ডিশ / ইন্টারনেট লাইন", icon: "fa-satellite-dish", color: "#0b7280",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "gas_stove", label: "গ্যাস চুলা / সিলিন্ডার", icon: "fa-fire-burner", color: "#0b7280",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "bike_mechanic", label: "বাইক মেকানিক", icon: "fa-motorcycle", color: "#A83D5E",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "car_mechanic", label: "গাড়ির মেকানিক", icon: "fa-car", color: "#A83D5E",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] },
  { key: "other", label: "অন্যান্য", icon: "fa-screwdriver-wrench", color: "#5b6472",
    layout: "person", facts: ["experience", "rate"],
    card: ["availability", "upazila", "address"],
    detail: ["experience", "rate", "availability", "upazila", "address", "about"],
    form: ["name", "experience", "rate", "availability", "upazila", "address", "about", "phone", "phone_consent", "photo", "photos"] }
];

// ---------- কার্ডে দেখানোর ফিল্ড (আইকন + লেবেল + ফরম্যাট) ----------
// fmt: "exp" = বাংলা সংখ্যা + " বছরের অভিজ্ঞতা", "clamp" = ২ লাইনে ছাঁটা, "upazila" = কী থেকে নাম
window.TC_FIELDS = {
  experience:   { label: "অভিজ্ঞতা",          icon: "fa-award",            fmt: "exp" },
  rate:         { label: "মজুরি / ভিজিট",     icon: "fa-bangladeshi-taka-sign" },
  availability: { label: "সেবার সময়",        icon: "fa-clock" },
  upazila:      { label: "উপজেলা",            icon: "fa-location-dot",     fmt: "upazila" },
  address:      { label: "কাজের এলাকা",       icon: "fa-map-location-dot" },
  about:        { label: "কাজের বিবরণ",       icon: "fa-screwdriver-wrench", fmt: "clamp" }
};

// ---------- ফর্ম ফিল্ড সংজ্ঞা ----------
// type: text | number | tel | select | textarea | checkbox | file ; min/max = সংখ্যার সীমা ; maxlen = DB constraint-এও একই থাকবে
// ব্যক্তিগত তথ্য: NID / সঠিক বাসার ঠিকানা চাওয়া হবে না; মোবাইল প্রকাশের সম্মতি বাধ্যতামূলক চেকবক্স।
window.TC_FORM_FIELDS = {
  name:         { label: "নাম (বা দোকান/প্রতিষ্ঠানের নাম)", type: "text", required: true, maxlen: 80 },
  experience:   { label: "অভিজ্ঞতা (বছর)", type: "number", required: false, min: 0, max: 60, msg: "অভিজ্ঞতা ০ থেকে ৬০ বছরের মধ্যে দিন" },
  rate:         { label: "মজুরি / ভিজিট (যেমন: ভিজিট ২০০ টাকা)", type: "text", required: false, maxlen: 60 },
  availability: { label: "সেবার সময়", type: "select", required: false, options: ["সকাল থেকে সন্ধ্যা", "২৪ ঘণ্টা (জরুরি সেবা)", "শুধু ছুটির দিন", "ফোনে জেনে নিন"] },
  upazila:      { label: "উপজেলা", type: "select", required: true, options: "TC_UPAZILAS" },
  address:      { label: "কাজের এলাকা / বাজার (সঠিক বাসার ঠিকানা নয়)", type: "text", required: false, maxlen: 150 },
  about:        { label: "কাজের বিবরণ (আরও যেসব কাজ পারেন)", type: "textarea", required: false, maxlen: 300 },
  phone:        { label: "মোবাইল নম্বর", type: "tel", required: true, maxlen: 20, pattern: "^01[3-9][0-9]{8}$", msg: "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন" },
  phone_consent:{ label: "আমি সম্মত — আমার মোবাইল নম্বর প্রকাশ করা যাবে", type: "checkbox", required: true, msg: "নম্বর প্রকাশের সম্মতি না দিলে জমা দেওয়া যাবে না" },
  photo:        { label: "প্রোফাইল ছবি (ঐচ্ছিক)", type: "file", required: false, accept: "image/jpeg,image/png,image/webp,image/gif", maxMB: 5 },
  // আরও ছবি (ঐচ্ছিক): সর্বোচ্চ max টি — কাজের নমুনা। প্রোফাইল ছবিতে ক্লিক করলে লাইটবক্সে এগুলোও দেখা যায়।
  photos:       { label: "কাজের নমুনা ছবি (ঐচ্ছিক)", type: "photos", required: false, max: 4, accept: "image/jpeg,image/png,image/webp,image/gif", maxMB: 5 }
};

window.TC_LAST_UPDATED = "2026-09-29";

// ---------- তালিকা ----------
// স্ট্যাটিক ডেমো নেই। পেজের সব এন্ট্রি শুধু Supabase (`technician_entries`, status='approved')
// থেকে আসে (js/technician-submit.js) — অ্যাডমিন থেকে মুছলে পেজ থেকেও মুছে যায়।
window.TC_DEMO_PROFILES = [];
window.TC_PROFILES = [];
