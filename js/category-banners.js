// টাঙ্গাইল জেলা — প্রতিটি বিভাগ (category) পেজের নিজস্ব ব্যানার স্লাইডার
// body ট্যাগের data-banner-category="doctors" এর মতো attribute দেখে সেই
// নির্দিষ্ট বিভাগের জন্য Supabase থেকে সর্বোচ্চ ৫টি সক্রিয় ব্যানার লোড করে।
// কোনো ব্যানার না থাকলে পুরো স্লাইডার সেকশনটি লুকিয়ে ফেলা হয় (খালি জায়গা দেখাবে না)।
(function () {
  var wrap = document.getElementById('catBannerWrap');
  var track = document.getElementById('catBannerTrack');
  var dots = document.getElementById('catBannerDots');
  var category = document.body.getAttribute('data-banner-category');
  if (!wrap || !track || !dots || !category || !window.TangailBanners) return;

  function hide() { wrap.style.display = 'none'; }

  if (!window.supabase || !window.TANGAIL_SUPABASE) { hide(); return; }

  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);

  client.from('banners').select('*').eq('enabled', true).eq('category', category)
    .order('position', { ascending: true }).limit(5)
    .then(function (res) {
      if (res.error || !res.data || !res.data.length) { hide(); return; }
      var mapped = res.data.map(function (r) {
        return {
          id: r.id, enabled: r.enabled, badge: r.badge, title: r.title,
          subtitle: r.subtitle, buttonText: r.button_text, buttonLink: r.button_link,
          image: r.image, bg: r.bg
        };
      });
      wrap.style.display = '';
      document.body.classList.add('has-cat-banners');
      window.TangailBanners.renderSlider(track, dots, mapped);
    })
    .catch(hide);
})();
