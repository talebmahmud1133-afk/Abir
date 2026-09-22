// টাঙ্গাইল জেলা — বেল "seen" চিহ্নিতকরণ (v132)
// ইউজারের চাওয়া: বেল/নোটিফিকেশন পেজ একবার দেখে ফেললে গণনা শেষ; নতুন মেসেজ/রিকোয়েস্ট এলে তখন
// থেকে আবার গণনা শুরু হবে, যতক্ষণ না আবার এই পেজ দেখা হয়।
// এই পেজ (notifications.html) লোড হলেই একবার RPC mark_notifications_seen() কল করে
// chat_conversations.a_bell_seen_at/b_bell_seen_at ও follows.seen_at এখনকার সময়ে বসিয়ে দেয়
// (supabase/bell-seen-tracking.sql; লাইভে migration bell_seen_tracking হিসেবে প্রয়োগ করা)।
// এর পরে js/nav-avatar.js-এর get_bell_counts() শুধু এই মুহূর্তের পরের নতুন মেসেজ/রিকোয়েস্টই গোনে।
// মিসড কলের নিজস্ব seen ব্যবস্থা (mark_missed_calls_seen, js/missed-calls.js-এ) আগে থেকেই আলাদাভাবে চলে — অপরিবর্তিত।
(function () {
  if (!window.supabase || !window.TANGAIL_SUPABASE) { return; }
  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);

  client.auth.getSession().then(function (res) {
    if (!(res.data && res.data.session)) { return; } // গেস্টের জন্য কিছু করার নেই
    return client.rpc('mark_notifications_seen').then(function (r) {
      if (r && r.error) { return; } // ব্যর্থ হলে চুপচাপ — পরের বার বেল/পেজ খুললে আবার চেষ্টা হবে
      // এই ট্যাব/অন্য খোলা ট্যাবে বেলের সংখ্যা তাৎক্ষণিক কমাতে বিদ্যমান রিফ্রেশ-ইভেন্ট পাঠানো
      // (js/nav-avatar.js এই দুটোই শোনে ও fetchBellCounts() নতুন করে ডাকে)
      try { window.dispatchEvent(new CustomEvent('tangail:chat-counters-refresh')); } catch (e) { /* কিছু না */ }
      try { window.dispatchEvent(new CustomEvent('tangail:friend-req-refresh')); } catch (e) { /* কিছু না */ }
    });
  }).catch(function () { /* নেটওয়ার্ক সমস্যা — পরের বার আবার চেষ্টা হবে */ });
})();
