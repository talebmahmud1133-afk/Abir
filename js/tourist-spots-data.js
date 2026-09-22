/* tourist-spots-data.js
   Data source for the দর্শনীয় স্থান (Tourist Spot) feature.
   window.getTouristSpots() is what pages should call: it fetches the live
   "tourist_spots" table from Supabase (public.tourist_spots, enabled=true,
   ordered by position) and falls back to the bundled sample array below
   if Supabase isn't reachable, so the page still renders offline / during
   setup. window.TOURIST_SPOTS stays available as that static fallback list.
*/
window.TOURIST_SPOTS = [
  {
    id: "mohera-jomidar-bari",
    name: "মহেরা জমিদার বাড়ি",
    upazila: "টাঙ্গাইল সদর",
    category: "historical",
    categoryLabel: "ঐতিহাসিক",
    rating: 4.6,
    reviews: 124,
    lat: 24.2277,
    lng: 89.8867,
    hours: "সকাল ৯টা – সন্ধ্যা ৬টা",
    fee: "২০ টাকা (প্রতি ব্যক্তি)",
    phone: "",
    desc: "মহেরা জমিদার বাড়ি টাঙ্গাইল জেলার অন্যতম ঐতিহাসিক ও দর্শনীয় স্থান। এটি প্রায় ২০০ বছরের পুরনো একটি জমিদার বাড়ি, যা সুন্দর স্থাপত্যশৈলী ও ঐতিহাসিক গুরুত্বের জন্য বিখ্যাত। এখানে রয়েছে প্রাচীন স্থাপনা, দালান-কোঠা, পুকুর ও মনোরম পরিবেশ।",
    image: "https://picsum.photos/seed/mohera1/800/600",
    gallery: ["https://picsum.photos/seed/mohera1/800/600","https://picsum.photos/seed/mohera2/800/600","https://picsum.photos/seed/mohera3/800/600","https://picsum.photos/seed/mohera4/800/600"],
    facilities: {
      hotel: { distance: "১–২ কিমি", count: "১০+" },
      restaurant: { distance: "০.৫–১ কিমি", count: "১৫+" },
      hospital: { distance: "২–৩ কিমি", count: "৫+" },
      police: { distance: "১–২ কিমি", count: "৩+" }
    }
  },
  {
    id: "madhupur-jatiyo-uddan",
    name: "মধুপুর জাতীয় উদ্যান",
    upazila: "মধুপুর",
    category: "nature",
    categoryLabel: "প্রকৃতি",
    rating: 4.8,
    reviews: 212,
    lat: 24.6403,
    lng: 90.0997,
    hours: "সকাল ৮টা – বিকাল ৫টা",
    fee: "১৫ টাকা (প্রতি ব্যক্তি)",
    phone: "",
    desc: "মধুপুর জাতীয় উদ্যান শালবন ও প্রাকৃতিক সৌন্দর্যের জন্য বিখ্যাত একটি সংরক্ষিত বনাঞ্চল। এখানে রয়েছে বিভিন্ন প্রজাতির বন্যপ্রাণী, গাছপালা এবং হাঁটার জন্য মনোরম ট্রেইল, যা প্রকৃতিপ্রেমীদের কাছে অত্যন্ত জনপ্রিয়।",
    image: "https://picsum.photos/seed/madhupur1/800/600",
    gallery: ["https://picsum.photos/seed/madhupur1/800/600","https://picsum.photos/seed/madhupur2/800/600","https://picsum.photos/seed/madhupur3/800/600"],
    facilities: {
      hotel: { distance: "৪–৬ কিমি", count: "৩+" },
      restaurant: { distance: "২–৩ কিমি", count: "৬+" },
      hospital: { distance: "৫–৭ কিমি", count: "২+" },
      police: { distance: "৪–৫ কিমি", count: "১+" }
    }
  },
  {
    id: "jomuna-resort",
    name: "যমুনা রিসোর্ট",
    upazila: "কালিহাতী",
    category: "entertainment",
    categoryLabel: "বিনোদন",
    rating: 4.3,
    reviews: 76,
    lat: 24.3617,
    lng: 89.9694,
    hours: "সার্বক্ষণিক খোলা",
    fee: "প্রবেশ ফি প্রযোজ্য নয়",
    phone: "01711000000",
    desc: "যমুনা নদীর তীরে অবস্থিত এই রিসোর্টে রয়েছে নৌকা ভ্রমণ, থাকার ব্যবস্থা ও রেস্তোরাঁ সুবিধা। নদীর পাড়ে সূর্যাস্ত উপভোগ করতে পর্যটকরা এখানে ভিড় জমান।",
    image: "https://picsum.photos/seed/jomuna1/800/600",
    gallery: ["https://picsum.photos/seed/jomuna1/800/600","https://picsum.photos/seed/jomuna2/800/600"],
    facilities: {
      hotel: { distance: "৩–৫ কিমি", count: "৪+" },
      restaurant: { distance: "১–২ কিমি", count: "৭+" },
      hospital: { distance: "৪–৬ কিমি", count: "৩+" },
      police: { distance: "৩–৪ কিমি", count: "২+" }
    }
  },
  {
    id: "atia-mosjid",
    name: "আতিয়া মসজিদ",
    upazila: "দেলদুয়ার",
    category: "religious",
    categoryLabel: "ধর্মীয়",
    rating: 4.5,
    reviews: 98,
    lat: 24.1245,
    lng: 89.8871,
    hours: "সকাল ৬টা – রাত ৯টা",
    fee: "প্রবেশ ফি নেই",
    phone: "",
    desc: "১৬০৯ সালে নির্মিত আতিয়া মসজিদ মুঘল স্থাপত্যশৈলীর এক অনন্য নিদর্শন। বাংলাদেশের ১ টাকার নোটে এই মসজিদের ছবি মুদ্রিত থাকায় এটি দেশজুড়ে পরিচিত।",
    image: "https://picsum.photos/seed/atia1/800/600",
    gallery: ["https://picsum.photos/seed/atia1/800/600","https://picsum.photos/seed/atia2/800/600","https://picsum.photos/seed/atia3/800/600"],
    facilities: {
      hotel: { distance: "৩–৪ কিমি", count: "৫+" },
      restaurant: { distance: "১–২ কিমি", count: "৮+" },
      hospital: { distance: "৩–৫ কিমি", count: "৪+" },
      police: { distance: "২–৩ কিমি", count: "২+" }
    }
  },
  {
    id: "korotia-jomidar-bari",
    name: "করটিয়া জমিদার বাড়ি",
    upazila: "টাঙ্গাইল সদর",
    category: "historical",
    categoryLabel: "ঐতিহাসিক",
    rating: 4.4,
    reviews: 65,
    lat: 24.2792,
    lng: 89.9256,
    hours: "সকাল ৯টা – সন্ধ্যা ৫টা",
    fee: "প্রবেশ ফি নেই",
    phone: "",
    desc: "করটিয়া জমিদার বাড়ি তার ঐতিহাসিক স্থাপত্য ও সাদত কলেজের জন্য পরিচিত। প্রাচীন ভবন ও চত্বর ঘুরে দেখতে প্রতিদিন অনেক দর্শনার্থী এখানে আসেন।",
    image: "https://picsum.photos/seed/korotia1/800/600",
    gallery: ["https://picsum.photos/seed/korotia1/800/600","https://picsum.photos/seed/korotia2/800/600"],
    facilities: {
      hotel: { distance: "১–২ কিমি", count: "৯+" },
      restaurant: { distance: "০.৫–১ কিমি", count: "১৪+" },
      hospital: { distance: "২–৩ কিমি", count: "৫+" },
      police: { distance: "১–২ কিমি", count: "৩+" }
    }
  },
  {
    id: "dhanbari-nawab-bari",
    name: "ধনবাড়ী নবাব বাড়ি",
    upazila: "ধনবাড়ী",
    category: "historical",
    categoryLabel: "ঐতিহাসিক",
    rating: 4.5,
    reviews: 54,
    lat: 24.7667,
    lng: 89.9667,
    hours: "সকাল ৯টা – বিকাল ৫টা",
    fee: "১০ টাকা (প্রতি ব্যক্তি)",
    phone: "",
    desc: "ধনবাড়ী নবাব বাড়ি জমিদারি আমলের স্থাপত্যের এক চমৎকার নিদর্শন। প্রাসাদের পাশেই রয়েছে একটি সুদৃশ্য মসজিদ, যা স্থাপত্যপ্রেমীদের কাছে বিশেষভাবে আকর্ষণীয়।",
    image: "https://picsum.photos/seed/dhanbari1/800/600",
    gallery: ["https://picsum.photos/seed/dhanbari1/800/600","https://picsum.photos/seed/dhanbari2/800/600"],
    facilities: {
      hotel: { distance: "৫–৭ কিমি", count: "২+" },
      restaurant: { distance: "৩–৪ কিমি", count: "৫+" },
      hospital: { distance: "৬–৮ কিমি", count: "২+" },
      police: { distance: "৪–৬ কিমি", count: "১+" }
    }
  },
  {
    id: "madhupur-eco-park",
    name: "মধুপুর ইকো পার্ক",
    upazila: "মধুপুর",
    category: "entertainment",
    categoryLabel: "বিনোদন",
    rating: 4.2,
    reviews: 88,
    lat: 24.6511,
    lng: 90.1102,
    hours: "সকাল ৯টা – সন্ধ্যা ৬টা",
    fee: "৩০ টাকা (প্রতি ব্যক্তি)",
    phone: "",
    desc: "শালবনের মাঝে গড়ে ওঠা এই ইকো পার্কে রয়েছে ওয়াচ টাওয়ার, হাঁটার পথ ও পিকনিক স্পট। পরিবার নিয়ে অবকাশ যাপনের জন্য এটি একটি চমৎকার জায়গা।",
    image: "https://picsum.photos/seed/ecopark1/800/600",
    gallery: ["https://picsum.photos/seed/ecopark1/800/600","https://picsum.photos/seed/ecopark2/800/600"],
    facilities: {
      hotel: { distance: "৪–৬ কিমি", count: "৩+" },
      restaurant: { distance: "২–৩ কিমি", count: "৬+" },
      hospital: { distance: "৫–৭ কিমি", count: "২+" },
      police: { distance: "৪–৫ কিমি", count: "১+" }
    }
  },
  {
    id: "jomuneshori-mondir",
    name: "যমুনেশ্বরী মন্দির",
    upazila: "ভূঞাপুর",
    category: "religious",
    categoryLabel: "ধর্মীয়",
    rating: 4.1,
    reviews: 39,
    lat: 24.5333,
    lng: 89.7833,
    hours: "সকাল ৬টা – রাত ৮টা",
    fee: "প্রবেশ ফি নেই",
    phone: "",
    desc: "যমুনা নদীর তীরবর্তী এই প্রাচীন মন্দিরটি স্থানীয় ভক্তদের কাছে অত্যন্ত গুরুত্বপূর্ণ একটি তীর্থস্থান। নদীর নিরিবিলি পরিবেশে অবস্থিত হওয়ায় এটি দর্শনার্থীদেরও নজর কাড়ে।",
    image: "https://picsum.photos/seed/jomuneshori1/800/600",
    gallery: ["https://picsum.photos/seed/jomuneshori1/800/600","https://picsum.photos/seed/jomuneshori2/800/600"],
    facilities: {
      hotel: { distance: "৫–৭ কিমি", count: "২+" },
      restaurant: { distance: "৩–৪ কিমি", count: "৪+" },
      hospital: { distance: "৬–৮ কিমি", count: "২+" },
      police: { distance: "৫–৬ কিমি", count: "১+" }
    }
  },
  {
    id: "pakulla-bil",
    name: "পাকুল্লা বিল",
    upazila: "ঘাটাইল",
    category: "nature",
    categoryLabel: "প্রকৃতি",
    rating: 4.3,
    reviews: 41,
    lat: 24.4906,
    lng: 90.0378,
    hours: "সার্বক্ষণিক খোলা",
    fee: "প্রবেশ ফি নেই",
    phone: "",
    desc: "বর্ষাকালে পাকুল্লা বিলের বিস্তীর্ণ জলরাশি ও সবুজ প্রকৃতি পর্যটকদের মন কাড়ে। নৌকায় করে বিল ঘুরে দেখা এখানকার প্রধান আকর্ষণ।",
    image: "https://picsum.photos/seed/pakulla1/800/600",
    gallery: ["https://picsum.photos/seed/pakulla1/800/600","https://picsum.photos/seed/pakulla2/800/600"],
    facilities: {
      hotel: { distance: "৪–৫ কিমি", count: "৩+" },
      restaurant: { distance: "২–৩ কিমি", count: "৫+" },
      hospital: { distance: "৪–৬ কিমি", count: "৩+" },
      police: { distance: "৩–৪ কিমি", count: "২+" }
    }
  },
  {
    id: "nagarpur-jomidar-bari",
    name: "নাগরপুর জমিদার বাড়ি",
    upazila: "নাগরপুর",
    category: "historical",
    categoryLabel: "ঐতিহাসিক",
    rating: 4.4,
    reviews: 47,
    lat: 24.0833,
    lng: 89.8833,
    hours: "সকাল ৯টা – সন্ধ্যা ৫টা",
    fee: "প্রবেশ ফি নেই",
    phone: "",
    desc: "ধলেশ্বরী নদীর তীরে অবস্থিত নাগরপুর জমিদার বাড়ি তার পুরনো ভবন ও ঘাটের জন্য পরিচিত। ইতিহাসপ্রেমী দর্শনার্থীদের কাছে এটি একটি জনপ্রিয় গন্তব্য।",
    image: "https://picsum.photos/seed/nagarpur1/800/600",
    gallery: ["https://picsum.photos/seed/nagarpur1/800/600","https://picsum.photos/seed/nagarpur2/800/600"],
    facilities: {
      hotel: { distance: "৩–৪ কিমি", count: "৪+" },
      restaurant: { distance: "১–২ কিমি", count: "৬+" },
      hospital: { distance: "৪–৫ কিমি", count: "৩+" },
      police: { distance: "৩–৪ কিমি", count: "২+" }
    }
  }
];

// Maps a public.tourist_spots row to the same flat shape used above.
function tsMapRow(r){
  return {
    id: r.id,
    name: r.name,
    upazila: r.upazila,
    category: r.category,
    categoryLabel: r.category_label,
    rating: Number(r.rating) || 0,
    reviews: r.reviews || 0,
    lat: r.lat,
    lng: r.lng,
    hours: r.hours || "",
    fee: r.fee || "",
    phone: r.phone || "",
    desc: r.description || "",
    image: r.image || "",
    gallery: (r.gallery && r.gallery.length) ? r.gallery : (r.image ? [r.image] : []),
    facilities: {
      hotel: { distance: r.hotel_distance || "", count: r.hotel_count || "" },
      restaurant: { distance: r.restaurant_distance || "", count: r.restaurant_count || "" },
      hospital: { distance: r.hospital_distance || "", count: r.hospital_count || "" },
      police: { distance: r.police_distance || "", count: r.police_count || "" }
    }
  };
}

// Returns a Promise<Array> of tourist spots. Tries the live Supabase table
// first; falls back to window.TOURIST_SPOTS (sample data) on any failure
// so the page keeps working even if Supabase is briefly unreachable.
window.getTouristSpots = function () {
  if (!window.supabase || !window.TANGAIL_SUPABASE) {
    return Promise.resolve(window.TOURIST_SPOTS);
  }
  try {
    var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
    return client.from('tourist_spots').select('*').eq('enabled', true).order('position', { ascending: true })
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) return window.TOURIST_SPOTS;
        return res.data.map(tsMapRow);
      })
      .catch(function () { return window.TOURIST_SPOTS; });
  } catch (e) {
    return Promise.resolve(window.TOURIST_SPOTS);
  }
};
