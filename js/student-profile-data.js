// টাঙ্গাইল জেলা — শিক্ষার্থী প্রোফাইল পেজ
// URL-এ ?id=<student-id> থাকলে Supabase থেকে সেই শিক্ষার্থীর real তথ্য এনে পেজে বসিয়ে দেয়।
// যুক্ত হওয়ার ফর্মে যে তথ্য দেওয়া হয়েছিল শুধু সেটাই দেখানো হয় — কোনো বাড়তি/কাল্পনিক তথ্য দেখানো হয় না।
// ?id না থাকলে বা রেকর্ড না পেলে পেজের ডেমো কনটেন্টই দেখা যাবে (কিছু ভাঙবে না)।
(function () {
  var BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  function bn(num) { return String(num).replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; }); }
  function bnMoney(num) {
    var n = Math.round(Number(num) || 0);
    return '৳' + bn(n.toLocaleString('en-US'));
  }
  function initial(name) { return (name || '').trim().charAt(0) || '?'; }
  function set(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }
  function hide(id) { var el = document.getElementById(id); if (el) el.hidden = true; }
  function show(id) { var el = document.getElementById(id); if (el) el.hidden = false; }

  var id = new URLSearchParams(window.location.search).get('id');
  if (!id) return;

  var sbClient = (window.supabase && window.TANGAIL_SUPABASE)
    ? window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key)
    : null;
  if (!sbClient) return;

  sbClient.from('students').select('*').eq('id', id).eq('status', 'approved').maybeSingle()
    .then(function (res) {
      var s = res && res.data;
      if (!s) return; // রেকর্ড না পেলে ডেমো কনটেন্টই থাকবে

      var hasClass = !!(s.class_range && String(s.class_range).trim());
      var hasInstitution = !!(s.institution && String(s.institution).trim());
      var hasUpazila = !!(s.upazila && String(s.upazila).trim());
      var hasBudget = Number(s.budget) > 0;
      var hasAbout = !!(s.about && String(s.about).trim());
      var hasSubjects = !!(s.required_subject && String(s.required_subject).trim());

      document.title = s.name + ' — শিক্ষার্থী প্রোফাইল — টাঙ্গাইল জেলা';
      set('spPageTitle', document.title);
      set('spPhoto', initial(s.name));
      set('spName', s.name || '');

      // ---- হেডারের ট্যাগ লাইন: শুধু যেসব তথ্য আছে তাই এবং তাদের মাঝেই বুলেট (•) বসে ----
      var tagParts = [];
      if (hasClass) tagParts.push({ elId: 'spTagClass', textId: 'spClass', text: 'ক্লাস ' + s.class_range });
      if (hasInstitution) tagParts.push({ elId: 'spTagInstitution', textId: null, text: s.institution });
      if (hasUpazila) tagParts.push({ elId: 'spTagUpazila', textId: null, text: s.upazila });

      ['spTagClass', 'spTagInstitution', 'spTagUpazila'].forEach(hide);
      hide('spTagSep1'); hide('spTagSep2');
      var seps = ['spTagSep1', 'spTagSep2'];
      tagParts.forEach(function (part, i) {
        var el = document.getElementById(part.elId);
        if (!el) return;
        var icon = el.querySelector('i');
        el.textContent = part.text;
        if (icon) el.prepend(icon);
        show(part.elId);
        if (i > 0 && seps[i - 1]) show(seps[i - 1]);
      });

      // ---- ক্লাস ও মাসিক বাজেট (স্ট্যাট কার্ড) — যেটা নেই সেটা দেখাবে না ----
      if (hasClass) { set('spClass', 'ক্লাস ' + s.class_range); show('spClassCard'); } else { hide('spClassCard'); }
      if (hasBudget) { set('spBudget', bnMoney(s.budget)); show('spBudgetCard'); } else { hide('spBudgetCard'); }
      if (!hasClass && !hasBudget) {
        hide('spStatRow');
      } else if (hasClass !== hasBudget) {
        var soloCard = document.getElementById(hasClass ? 'spClassCard' : 'spBudgetCard');
        if (soloCard) soloCard.style.gridColumn = '1 / -1';
      }

      // ---- শিক্ষার্থীর সম্পর্কে (about) ----
      if (hasAbout) { set('spAbout', s.about); show('spAboutCard'); } else { hide('spAboutCard'); }

      // ---- প্রাতিষ্ঠানিক তথ্য ----
      if (hasInstitution) { set('spInstitution', s.institution); show('spInstitutionRow'); } else { hide('spInstitutionRow'); }
      if (hasUpazila) { set('spUpazila', s.upazila); show('spUpazilaRow'); } else { hide('spUpazilaRow'); }
      if (hasInstitution || hasUpazila) { show('spEduCard'); } else { hide('spEduCard'); }

      // ---- প্রয়োজনীয় বিষয় ----
      var chipsEl = document.getElementById('spSubjectChips');
      if (hasSubjects && chipsEl) {
        var parts = s.required_subject.split(/[,ও]+/).map(function (p) { return p.trim(); }).filter(Boolean);
        chipsEl.innerHTML = parts.map(function (c) {
          return '<span class="tm-chip">' + c.replace(/</g, '&lt;') + '</span>';
        }).join('');
        show('spSubjectsCard');
      } else {
        hide('spSubjectsCard');
      }

      // ---- যোগাযোগ (কল/হোয়াটসঅ্যাপ) ----
      var phone = (s.phone || '').replace(/^0/, '88');
      if (phone && !/^88/.test(phone)) phone = '88' + phone;
      var telHref = 'tel:+' + phone;
      var waHref = 'https://wa.me/' + phone;
      ['spCallBtn', 'spCallBtn2', 'spCallBtn3'].forEach(function (bid) {
        var el = document.getElementById(bid); if (el) el.href = telHref;
      });
      ['spWhatsappBtn', 'spWhatsappBtn2'].forEach(function (bid) {
        var el = document.getElementById(bid); if (el) el.href = waHref;
      });
    })
    .catch(function () { /* ডেমো কনটেন্ট থেকে যাবে */ });
})();
