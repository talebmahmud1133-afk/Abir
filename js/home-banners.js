// টাঙ্গাইল জেলা — হোমপেজে Supabase থেকে ব্যানার স্লাইডার লোড করা
(function () {
  var track = document.getElementById('bannerTrack');
  var dots = document.getElementById('bannerDots');
  if (!track || !dots || !window.TangailBanners) return;

  var FALLBACK = [
    {
      "id": "fallback1", "enabled": true, "badge": "বিশেষ বিজ্ঞপ্তি",
      "title": "টাঙ্গাইল জেলা অ্যাপ",
      "subtitle": "আপনার সকল স্থানীয় সেবা, এক জায়গায়।",
      "buttonText": "জরুরি ৯৯৯", "buttonLink": "tel:999", "image": "", "bg": "maroon"
    }
  ];

  function mapRow(r) {
    return {
      id: r.id, enabled: r.enabled, badge: r.badge, title: r.title,
      subtitle: r.subtitle, buttonText: r.button_text, buttonLink: r.button_link,
      image: r.image, bg: r.bg
    };
  }

  function showFallback() {
    window.TangailBanners.renderSlider(track, dots, FALLBACK);
  }

  if (!window.supabase || !window.TANGAIL_SUPABASE) { showFallback(); return; }

  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);

  client.from('banners').select('*').eq('enabled', true).eq('category', 'home').order('position', { ascending: true }).limit(10)
    .then(function (res) {
      if (res.error || !res.data || !res.data.length) { showFallback(); return; }
      window.TangailBanners.renderSlider(track, dots, res.data.map(mapRow));
    })
    .catch(showFallback);
})();
