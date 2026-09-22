// টাঙ্গাইল জেলা — দোকান ডিরেক্টরি মডিউল: ক্যাটাগরি তালিকা ও নমুনা/ডেমো ডেটা
// টেবিল: shops | স্টোরেজ বাকেট: market-media (বিদ্যমান বাকেট পুনর্ব্যবহার করা হয়েছে)
// এই ফাইলটি business-directory.html ও add-shop.html — দুটো পেজেই ব্যবহৃত হয়।
(function () {
  // slug — shops.category কলামের মান। 'all' কোনো কলামের মান নয়, বরং সব ক্যাটাগরি
  // একসাথে দেখানোর জন্য ব্যবহৃত একটি বিশেষ slug।
  var CATEGORIES = [
    { slug: 'all',        label: 'সব ক্যাটাগরি',      icon: 'fa-grip' },
    { slug: 'sweets',     label: 'মিষ্টির দোকান',     icon: 'fa-cake-candles' },
    { slug: 'mobile',     label: 'মোবাইলের দোকান',    icon: 'fa-mobile-screen-button' },
    { slug: 'cloth',      label: 'শাড়ি ও কাপড়',      icon: 'fa-shirt' },
    { slug: 'pharmacy',   label: 'ফার্মেসি',           icon: 'fa-pills' },
    { slug: 'restaurant', label: 'রেস্টুরেন্ট',         icon: 'fa-utensils' },
    { slug: 'jewelry',    label: 'জুয়েলারি',          icon: 'fa-gem' },
    { slug: 'shoes',      label: 'জুতার দোকান',       icon: 'fa-shoe-prints' },
    { slug: 'super',      label: 'সুপার শপ',          icon: 'fa-basket-shopping' },
    { slug: 'books',      label: 'বইয়ের দোকান',       icon: 'fa-book' },
    { slug: 'computer',   label: 'কম্পিউটার ও আইটি',  icon: 'fa-laptop' },
    { slug: 'bags',       label: 'ব্যাগের দোকান',      icon: 'fa-suitcase' },
    { slug: 'motorparts', label: 'মোটর পার্টস',        icon: 'fa-motorcycle' },
    { slug: 'other',      label: 'আরও',                icon: 'fa-ellipsis' }
  ];

  function catMeta(slug) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].slug === slug) return CATEGORIES[i];
    }
    return CATEGORIES[CATEGORIES.length - 1];
  }

  // shops টেবিলে এখনো কোনো অনুমোদিত (approved) দোকান না থাকলে, পেজটি খালি না
  // দেখিয়ে এই নমুনা ডেটা প্রিভিউ হিসেবে দেখানো হয় — বাস্তব ডেটা যুক্ত হলে
  // স্বয়ংক্রিয়ভাবে এটি প্রতিস্থাপিত হয়ে যাবে।
  var SAMPLE_SHOPS = [
    { id: 's1',  name: 'মা সুইটস',              category: 'sweets',     rating: 4.8, reviews: 124, upazila: 'টাঙ্গাইল সদর', phone: '01712345678', whatsapp: '01712345678', maps: '', website: '', verified: true },
    { id: 's2',  name: 'Mobile World',           category: 'mobile',     rating: 4.6, reviews: 98,  upazila: 'টাঙ্গাইল সদর', phone: '01711223344', whatsapp: '01711223344', maps: '', website: 'https://example.com', verified: true },
    { id: 's3',  name: 'রূপসী শাড়ি ঘর',          category: 'cloth',      rating: 4.7, reviews: 86,  upazila: 'টাঙ্গাইল সদর', phone: '01716778899', whatsapp: '', maps: '', website: '', verified: false },
    { id: 's4',  name: 'নাজিয়া ফার্মেসি',        category: 'pharmacy',   rating: 4.5, reviews: 72,  upazila: 'টাঙ্গাইল সদর', phone: '01715667788', whatsapp: '01715667788', maps: '', website: '', verified: true },
    { id: 's5',  name: 'আল-আমিন রেস্টুরেন্ট',     category: 'restaurant', rating: 4.6, reviews: 58,  upazila: 'মির্জাপুর',     phone: '01714556677', whatsapp: '', maps: '', website: '', verified: false },
    { id: 's6',  name: 'রূপালী জুয়েলার্স',       category: 'jewelry',    rating: 4.8, reviews: 102, upazila: 'টাঙ্গাইল সদর', phone: '01713445566', whatsapp: '01713445566', maps: '', website: '', verified: true },
    { id: 's7',  name: 'টেন আপ শু',              category: 'shoes',      rating: 4.4, reviews: 64,  upazila: 'কালিহাতী',      phone: '01712998877', whatsapp: '', maps: '', website: '', verified: false },
    { id: 's8',  name: 'নিউ ফ্রেন্ডস সুপার শপ',    category: 'super',      rating: 4.3, reviews: 46,  upazila: 'ঘাটাইল',        phone: '01716334455', whatsapp: '01716334455', maps: '', website: '', verified: false },
    { id: 's9',  name: 'বুক কর্নার লাইব্রেরি',     category: 'books',      rating: 4.5, reviews: 39,  upazila: 'টাঙ্গাইল সদর', phone: '01711000011', whatsapp: '', maps: '', website: '', verified: false },
    { id: 's10', name: 'কম্পিউটার জোন',           category: 'computer',   rating: 4.6, reviews: 51,  upazila: 'মির্জাপুর',     phone: '01711000022', whatsapp: '01711000022', maps: '', website: 'https://example.com', verified: true },
    { id: 's11', name: 'স্টাইল ব্যাগ হাউজ',       category: 'bags',       rating: 4.2, reviews: 28,  upazila: 'নাগরপুর',       phone: '01711000033', whatsapp: '', maps: '', website: '', verified: false },
    { id: 's12', name: 'হিরো মোটরস পার্টস',       category: 'motorparts', rating: 4.5, reviews: 67,  upazila: 'ভূঞাপুর',       phone: '01711000044', whatsapp: '01711000044', maps: '', website: '', verified: true }
  ];

  // এই ১২টি নমুনা দোকান এখন shops টেবিলে আসল approved সারি হিসেবে যোগ করা
  // হয়ে গেছে, তাই এখানে আর দেখানোর দরকার নেই — admin.html এর "দোকান" ট্যাব
  // থেকেই এখন সেগুলো এডিট/ডিলিট করা যাবে।
  var SHOW_SAMPLE_SHOPS = false;

  window.TZ_SHOP = { CATEGORIES: CATEGORIES, catMeta: catMeta, SAMPLE_SHOPS: SAMPLE_SHOPS, SHOW_SAMPLE_SHOPS: SHOW_SAMPLE_SHOPS };
})();
