// টাঙ্গাইল জেলা — ভাষা (বাংলা/English) ইঞ্জিন
// ব্যবহার: HTML এলিমেন্টে data-i18n="key" দিলে সেই key অনুযায়ী টেক্সট বসবে।
// placeholder-এর জন্য data-i18n-placeholder="key" ব্যবহার করুন।
// aria-label-এর জন্য data-i18n-aria="key" ব্যবহার করুন।

window.TZ_I18N = {
  dict: {
    // ===== হেডার / নেভিগেশন (সব পেজে কমন) =====
    "nav.home": { bn: "হোম", en: "Home" },
    "nav.about": { bn: "পরিচিতি", en: "About" },
    "nav.addListing": { bn: "তথ্য যোগ করুন", en: "Add Listing" },
    "nav.faq": { bn: "সাধারণ প্রশ্ন", en: "FAQ" },
    "nav.contact": { bn: "যোগাযোগ", en: "Contact" },
    "menu.open": { bn: "মেনু খুলুন", en: "Open Menu" },
    "menu.notifications": { bn: "বিজ্ঞপ্তি", en: "Notifications" },
    "menu.profile": { bn: "প্রোফাইল", en: "Profile" },
    "menu.more": { bn: "আরও", en: "More" },
    "menu.language": { bn: "ভাষা", en: "Language" },
    "menu.bangla": { bn: "বাংলা", en: "বাংলা" },
    "menu.english": { bn: "English", en: "English" },
    "brand.district": { bn: "জেলা", en: "জেলা" },

    // ===== বটম ন্যাভ =====
    "bottomnav.home": { bn: "হোম", en: "Home" },
    "bottomnav.contact": { bn: "যোগাযোগ", en: "Contact" },
    "bottomnav.members": { bn: "সদস্যরা", en: "Members" },
    "bottomnav.post": { bn: "পোস্ট", en: "Post" },
    "bottomnav.profile": { bn: "প্রোফাইল", en: "Profile" },

    // ===== হোমপেজ =====
    "home.title": { bn: "টাঙ্গাইল জেলা — স্থানীয় সেবা এক জায়গায়", en: "Tangail District — All Local Services in One Place" },
    "home.notice": { bn: "নতুন: প্রতিটি ক্যাটাগরিতে সার্চ ও তথ্য জমা দেওয়ার ফর্ম যুক্ত হয়েছে", en: "New: Search and submission forms added to every category" },
    "home.noticeTag": { bn: "নোটিশ", en: "Notice" },
    "home.searchPlaceholder": { bn: "কী খুঁজছেন? যেমন: ডাক্তার, রক্তদাতা, বাস...", en: "What are you looking for? e.g. doctor, blood donor, bus..." },
    "home.searchBtn": { bn: "খুঁজুন", en: "Search" },

    // ===== ক্যাটাগরি কার্ড =====
    "cat.eduInstitute.title": { bn: "শিক্ষা প্রতিষ্ঠান", en: "Educational Institution" },
    "cat.eduInstitute.desc": { bn: "স্কুল, কলেজ ও শিক্ষা প্রতিষ্ঠানের তালিকা ও যোগাযোগের তথ্য।", en: "List and contact information of schools, colleges and educational institutions." },
    "cat.entrepreneur.title": { bn: "উদ্যোক্তা", en: "Entrepreneur" },
    "cat.entrepreneur.desc": { bn: "নতুন উদ্যোক্তা ও স্থানীয় স্টার্টআপদের পরিচিতি ও যোগাযোগের তথ্য।", en: "Profiles and contact information of new entrepreneurs and local startups." },
    "cat.doctors.title": { bn: "ডাক্তার", en: "Doctor" },
    "cat.doctors.desc": { bn: "টাঙ্গাইল জেলার বিশেষজ্ঞ ডাক্তারদের তালিকা ও যোগাযোগ নম্বর।", en: "List of specialist doctors in Tangail with contact numbers." },
    "cat.travel.title": { bn: "ভ্রমণ", en: "Travel" },
    "cat.travel.desc": { bn: "টাঙ্গাইল জেলার ভ্রমণ, ট্যুর প্ল্যান ও ঘুরতে যাওয়ার তথ্য।", en: "Travel, tour planning, and sightseeing information for Tangail District." },
    "cat.jobs.title": { bn: "চাকরি", en: "Job" },
    "cat.jobs.desc": { bn: "টাঙ্গাইলের স্থানীয় চাকরি ও ব্যবসায়িক সুযোগের আপডেট।", en: "Updates on local jobs and business opportunities in Tangail." },
    "cat.houseRent.title": { bn: "বাসা ভাড়া", en: "House Rent" },
    "cat.houseRent.desc": { bn: "বাড়ি, ফ্ল্যাট কেনা-বেচা ও ভাড়ার হালনাগাদ তালিকা।", en: "Updated listings for buying, selling and renting houses & flats." },
    "cat.matrimonial.title": { bn: "পাত্র-পাত্রী", en: "Matrimonial" },
    "cat.matrimonial.desc": { bn: "বিশ্বস্ত পাত্র-পাত্রী খোঁজার প্ল্যাটফর্ম — পারিবারিকভাবে যোগাযোগের জন্য।", en: "A trusted matrimonial platform for family-arranged contact." },
    "cat.buySell.title": { bn: "ক্রয় ও বিক্রয়", en: "Buy & Sell" },
    "cat.buySell.desc": { bn: "পুরনো জিনিসপত্র ও ব্যবহৃত পণ্যের স্থানীয় কেনা-বেচার বাজার।", en: "Local marketplace for buying and selling used goods." },
    "cat.bloodDonors.title": { bn: "রক্তদান", en: "Blood Donation" },
    "cat.bloodDonors.desc": { bn: "জরুরি প্রয়োজনে নিকটস্থ রক্তদাতার সাথে দ্রুত যোগাযোগের তালিকা।", en: "Quick contact list of nearby blood donors for emergencies." },
    "cat.busSchedule.title": { bn: "বাসের সময়সূচি", en: "Bus Schedule" },
    "cat.busSchedule.desc": { bn: "টাঙ্গাইল থেকে স্থানীয় ও আন্তঃজেলা বাসের হালনাগাদ সময়সূচি।", en: "Updated local and inter-district bus schedules from Tangail." },
    "cat.restaurants.title": { bn: "রেস্টুরেন্ট", en: "Restaurant" },
    "cat.restaurants.desc": { bn: "টাঙ্গাইলের জনপ্রিয় স্থানীয় খাবারের দোকান ও রেস্টুরেন্ট।", en: "Popular local eateries and restaurants in Tangail." },
    "cat.handloom.title": { bn: "ভাইরাল প্লেস", en: "Viral Places" },
    "cat.handloom.desc": { bn: "টাঙ্গাইলের জনপ্রিয় ও ভাইরাল দর্শনীয় স্থান।", en: "Popular and viral places to visit in Tangail." },
    "cat.businessDirectory.title": { bn: "দোকান", en: "Shop" },
    "cat.businessDirectory.desc": { bn: "টাঙ্গাইলের স্থানীয় ব্যবসা প্রতিষ্ঠানের তালিকা ও প্রচারের জায়গা।", en: "Directory and promotion space for local businesses in Tangail." },
    "cat.teachersSchools.title": { bn: "ছাত্র-শিক্ষক", en: "Student-Teacher" },
    "cat.teachersSchools.desc": { bn: "প্রাইভেট টিউটর, কোচিং সেন্টার ও স্কুল-কলেজের যাচাইকৃত তথ্য।", en: "Verified information on private tutors, coaching centers and schools." },
    "cat.legalHelp.title": { bn: "আইনজীবী", en: "Lawyer" },
    "cat.legalHelp.desc": { bn: "আইনজীবী, নোটারি ও আইনি পরামর্শের জন্য যাচাইকৃত যোগাযোগ।", en: "Verified contacts for lawyers, notaries and legal advice." },
    "cat.electricityOffice.title": { bn: "বিদ্যুৎ অফিস", en: "Electricity Office" },
    "cat.electricityOffice.desc": { bn: "পল্লী বিদ্যুৎ ও বিদ্যুৎ অফিসের যোগাযোগ নম্বর ও অফিস সময়।", en: "Contact numbers and office hours for rural and city electricity offices." },
    "cat.houseboat.title": { bn: "হাউসবোট", en: "Houseboat" },
    "cat.houseboat.desc": { bn: "যমুনা ও ধলেশ্বরী নদীতে হাউসবোট ভ্রমণ ও বুকিং সংক্রান্ত তথ্য।", en: "Houseboat trips and booking info on the Jamuna and Dhaleshwari rivers." },
    "cat.hospitals.title": { bn: "হাসপাতাল", en: "Hospitals" },
    "cat.hospitals.desc": { bn: "সরকারি ও বেসরকারি হাসপাতালের তালিকা ও যোগাযোগ নম্বর।", en: "List and contact numbers of government and private hospitals." },
    "cat.diagnostic.title": { bn: "ডায়াগনস্টিক", en: "Diagnostic" },
    "cat.diagnostic.desc": { bn: "রক্ত পরীক্ষা, এক্স-রে, আল্ট্রাসনোগ্রামসহ ডায়াগনস্টিক সেবার তথ্য।", en: "Blood tests, X-ray, ultrasound and other diagnostic service info." },
    "cat.help.title": { bn: "সহায়তা", en: "Help" },
    "cat.help.desc": { bn: "বিপদে পড়া মানুষের জন্য সহায়তা ও স্বেচ্ছাসেবী সংগঠনের তথ্য।", en: "Support and volunteer organization info for people in distress." },
    "cat.carRent.title": { bn: "গাড়ি ভাড়া", en: "Car Rental" },
    "cat.carRent.desc": { bn: "সিএনজি, প্রাইভেট কার, মাইক্রোবাস ভাড়ার তথ্য।", en: "Rental info for CNG, private car and microbus." },
    "cat.emergencyNumbers.title": { bn: "জরুরি নাম্বার", en: "Emergency Number" },
    "cat.emergencyNumbers.desc": { bn: "জরুরি মুহূর্তে দ্রুত যোগাযোগের সকল নম্বর।", en: "All quick-contact numbers for emergency moments." },
    "cat.fireService.title": { bn: "ফায়ার সার্ভিস", en: "Fire Service" },
    "cat.fireService.desc": { bn: "ফায়ার সার্ভিস ও সিভিল ডিফেন্স স্টেশনের যোগাযোগ নম্বর।", en: "Contact numbers for fire service and civil defense stations." },
    "cat.police.title": { bn: "থানা-পুলিশ", en: "Police Stations" },
    "cat.police.desc": { bn: "বিভিন্ন থানার যোগাযোগ নম্বর।", en: "Contact numbers of various police stations." },
    "cat.flatLand.title": { bn: "ফ্ল্যাট ও জমি", en: "Flats & Land" },
    "cat.flatLand.desc": { bn: "ফ্ল্যাট, প্লট ও জমি কেনা-বেচার হালনাগাদ তালিকা।", en: "Updated listings for buying and selling flats, plots and land." },
    "cat.trainSchedule.title": { bn: "ট্রেনের সময়সূচি", en: "Train Schedule" },
    "cat.trainSchedule.desc": { bn: "বিভিন্ন রুটের ট্রেনের হালনাগাদ সময়সূচি।", en: "Updated train schedules for various routes." },
    "cat.hotel.title": { bn: "আবাসিক হোটেল", en: "Residential Hotels" },
    "cat.hotel.desc": { bn: "থাকার জন্য হোটেল ও গেস্ট হাউজের তালিকা।", en: "List of hotels and guest houses for accommodation." },
    "cat.touristSpot.title": { bn: "দর্শনীয় স্থান", en: "Tourist Spots" },
    "cat.touristSpot.desc": { bn: "বিখ্যাত দর্শনীয় স্থান ও পর্যটন কেন্দ্রের তথ্য।", en: "Information on famous sightseeing and tourist spots." },
    "cat.mechanic.title": { bn: "বুয়া", en: "Maid" },
    "cat.mechanic.desc": { bn: "ইলেকট্রিশিয়ান, প্লাম্বার ও মেরামত সেবার তালিকা।", en: "List of electricians, plumbers and repair services." },
    "cat.nursery.title": { bn: "নার্সারি", en: "Nursery" },
    "cat.nursery.desc": { bn: "ফুল, ফল ও শোভাবর্ধনকারী গাছের চারা বিক্রয়কারীর তথ্য।", en: "Info on sellers of flower, fruit and ornamental plant saplings." },
    "cat.courier.title": { bn: "কুরিয়ার সার্ভিস", en: "Courier Service" },
    "cat.courier.desc": { bn: "কুরিয়ার ও পার্সেল ডেলিভারি সার্ভিসের শাখা ও নম্বর।", en: "Branches and numbers for courier and parcel delivery services." },
    "cat.parlourSalon.title": { bn: "পার্লার ও সেলুন", en: "Parlour & Salon" },
    "cat.parlourSalon.desc": { bn: "নারী ও পুরুষদের পার্লার এবং সেলুন সার্ভিসের তালিকা।", en: "List of parlour and salon services for women and men." },
    "cat.websiteLinks.title": { bn: "নিউজ পেপার", en: "Newspapers" },
    "cat.websiteLinks.desc": { bn: "স্থানীয় ও জাতীয় নিউজ পেপার ও অনলাইন সংবাদ পোর্টালের তালিকা।", en: "Local and national newspapers and online news portals." },
    "cat.publicRep.title": { bn: "জনপ্রতিনিধি", en: "Public Representatives" },
    "cat.publicRep.desc": { bn: "সংসদ সদস্য, মেয়র ও চেয়ারম্যানদের কার্যালয়ের তথ্য।", en: "Office information of MPs, mayors and chairmen." },
    "cat.incomeExpense.title": { bn: "আয়-ব্যয়", en: "Income & Expense" },
    "cat.incomeExpense.desc": { bn: "স্থানীয় সরকার প্রতিষ্ঠানের আয়-ব্যয় ও স্বচ্ছতা সংক্রান্ত তথ্য।", en: "Income, expense and transparency info of local government bodies." },

    // ===== ফুটার =====
    "footer.brandDesc": { bn: "টাঙ্গাইল জেলার বাসিন্দা, নতুন আগন্তুক ও ব্যবসায়ীদের জন্য তৈরি একটি স্থানীয় সেবা প্ল্যাটফর্ম।", en: "A local service platform built for Tangail residents, newcomers and businesses." },
    "footer.pages": { bn: "পেজ", en: "Pages" },
    "footer.contactHeading": { bn: "যোগাযোগ", en: "Contact" },
    "footer.sitemap": { bn: "সাইটম্যাপ", en: "Sitemap" },
    "footer.privacy": { bn: "প্রাইভেসি পলিসি", en: "Privacy Policy" },
    "footer.terms": { bn: "শর্তাবলী", en: "Terms" },
    "footer.email": { bn: "ইমেইল: info@tangailzila.com", en: "Email: info@tangailzila.com" },
    "footer.phone": { bn: "ফোন: ০১৭XXXXXXXX", en: "Phone: 017XXXXXXXX" },
    "footer.address": { bn: "টাঙ্গাইল, বাংলাদেশ", en: "Tangail, Bangladesh" },
    "footer.facebook": { bn: "ফেসবুক পেজ", en: "Facebook Page" },
    "footer.whatsapp": { bn: "হোয়াটসঅ্যাপ", en: "WhatsApp" },
    "footer.bottom": { bn: "© ২০২৬ টাঙ্গাইল জেলা। সর্বস্বত্ব সংরক্ষিত।", en: "© 2026 Tangail Zila. All rights reserved." }
  },

  current: 'bn',

  init: function () {
    var saved = localStorage.getItem('tz_lang');
    this.current = saved === 'en' ? 'en' : 'bn';
    this.apply();
  },

  set: function (lang) {
    this.current = (lang === 'en') ? 'en' : 'bn';
    localStorage.setItem('tz_lang', this.current);
    this.apply();
  },

  t: function (key) {
    var entry = this.dict[key];
    if (!entry) return null;
    return entry[this.current] || entry.bn;
  },

  apply: function () {
    var lang = this.current;
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('data-lang', lang);

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var text = TZ_I18N.t(key);
      if (text !== null) el.textContent = text;
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var text = TZ_I18N.t(key);
      if (text !== null) el.setAttribute('placeholder', text);
    });

    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria');
      var text = TZ_I18N.t(key);
      if (text !== null) el.setAttribute('aria-label', text);
    });

    document.querySelectorAll('.lang-option').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-lang-choice') === lang);
    });

    document.dispatchEvent(new CustomEvent('tz:i18n-applied'));
  }
};

document.addEventListener('DOMContentLoaded', function () {
  TZ_I18N.init();

  // তিন-ডট (আরও) মেনু খোলা/বন্ধ করা
  var moreBtn = document.getElementById('moreMenuToggle');
  var moreMenu = document.getElementById('moreMenu');
  if (moreBtn && moreMenu) {
    moreBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      moreMenu.classList.toggle('open');
    });
    document.addEventListener('click', function (e) {
      if (!moreMenu.contains(e.target) && e.target !== moreBtn) {
        moreMenu.classList.remove('open');
      }
    });
  }

  // ভাষা অপশনে ক্লিক
  document.querySelectorAll('.lang-option').forEach(function (el) {
    el.addEventListener('click', function () {
      TZ_I18N.set(el.getAttribute('data-lang-choice'));
      if (moreMenu) moreMenu.classList.remove('open');
    });
  });
});
