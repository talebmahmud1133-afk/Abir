// টাঙ্গাইল জেলা — শিক্ষক প্রোফাইল পেজ
// URL-এ ?id=<teacher-id> থাকলে Supabase থেকে সেই শিক্ষকের real তথ্য এনে পেজে বসিয়ে দেয়।
// ?id না থাকলে বা রেকর্ড না পেলে পেজের ডেমো কনটেন্টই দেখা যাবে (কিছু ভাঙবে না)।
// দ্রষ্টব্য: গ্যালারি ছবি ও পৃথক রিভিউ তালিকা এখনো ডেমো — এগুলোর জন্য আলাদা টেবিল এখনো তৈরি হয়নি।
(function () {
  var BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  function bn(num) { return String(num).replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; }); }
  function bnMoney(num) {
    var n = Math.round(Number(num) || 0);
    return '৳' + bn(n.toLocaleString('en-US'));
  }
  function initial(name) { return (name || '').trim().charAt(0) || '?'; }
  function set(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }

  var id = new URLSearchParams(window.location.search).get('id');
  if (!id) return;

  var sbClient = (window.supabase && window.TANGAIL_SUPABASE)
    ? window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key)
    : null;
  if (!sbClient) return;

  var MODE_LABEL = { online: 'অনলাইন', offline: 'অফলাইন', both: 'অন/অফলাইন' };

  sbClient.from('teachers').select('*').eq('id', id).eq('status', 'approved').maybeSingle()
    .then(function (res) {
      var t = res && res.data;
      if (!t) return; // রেকর্ড না পেলে ডেমো কনটেন্টই থাকবে

      document.title = t.name + ' — শিক্ষক প্রোফাইল — টাঙ্গাইল জেলা';
      set('tpPageTitle', document.title);
      set('tpPhoto', initial(t.name));
      var verifiedBadge = document.getElementById('tpVerifiedBadge');
      if (verifiedBadge) verifiedBadge.style.display = t.verified ? '' : 'none';
      set('tpName', t.name);
      set('tpTag', t.subject + (t.class_range ? ' শিক্ষক • ক্লাস ' + t.class_range : ' শিক্ষক') + (t.upazila ? ' • ' + t.upazila : ''));
      set('tpRating', bn(Number(t.rating || 0).toFixed(1)));
      set('tpReviewsCount', '(' + bn(t.reviews || 0) + ' রিভিউ)');
      set('tpExperience', bn(t.experience_years || 0) + ' বছর');
      set('tpReviewsNum', bn(t.reviews || 0) + '+');
      set('tpFee', bnMoney(t.monthly_fee));
      set('tpMode', MODE_LABEL[t.mode] || t.mode || '');
      if (t.bio) set('tpAbout', t.bio);
      if (t.education) set('tpEducation', t.education);

      var chipsEl = document.getElementById('tpSubjectChips');
      if (chipsEl && t.subject) {
        var chips = [t.subject];
        if (t.class_range) chips.push('ক্লাস ' + t.class_range);
        if (t.medium) chips.push(t.medium);
        chipsEl.innerHTML = chips.map(function (c) {
          return '<span class="tm-chip">' + c.replace(/</g, '&lt;') + '</span>';
        }).join('');
      }

      var phone = (t.phone || '').replace(/^0/, '88');
      if (phone && !/^88/.test(phone)) phone = '88' + phone;
      var telHref = 'tel:+' + phone;
      var waHref = 'https://wa.me/' + phone;
      ['tpCallBtn', 'tpCallBtn2'].forEach(function (bid) {
        var el = document.getElementById(bid); if (el) el.href = telHref;
      });
      ['tpWhatsappBtn', 'tpWhatsappBtn2'].forEach(function (bid) {
        var el = document.getElementById(bid); if (el) el.href = waHref;
      });
    })
    .catch(function () { /* ডেমো কনটেন্ট থেকে যাবে */ });
})();
