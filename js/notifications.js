// টাঙ্গাইল জেলা — বিজ্ঞপ্তি পেজ: Supabase-এর notices টেবিল থেকে
// অ্যাডমিন প্রকাশিত (enabled=true) বিজ্ঞপ্তি লোড করে সময়ের ক্রমানুসারে দেখায়।
(function () {
  var loadingEl = document.getElementById('notifLoading');
  var emptyEl = document.getElementById('notifEmpty');
  var listEl = document.getElementById('notifList');
  if (!listEl) return;

  function esc(s) {
    return (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function timeAgo(iso) {
    if (!iso) return '';
    var diffMs = Date.now() - new Date(iso).getTime();
    var mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'এইমাত্র';
    if (mins < 60) return mins + ' মিনিট আগে';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + ' ঘণ্টা আগে';
    var days = Math.floor(hrs / 24);
    if (days < 30) return days + ' দিন আগে';
    var d = new Date(iso);
    var months = ['জানু','ফেব্রু','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্ট','অক্টো','নভে','ডিসে'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function renderItem(n) {
    var inner =
      (n.image
        ? '<img class="notif-thumb" src="' + esc(n.image) + '" alt="">'
        : '<div class="notif-thumb notif-thumb-fallback"><i class="fa-solid fa-bullhorn" aria-hidden="true"></i></div>') +
      '<div class="notif-body">' +
        '<h3>' + esc(n.title) + '</h3>' +
        (n.excerpt ? '<p>' + esc(n.excerpt) + '</p>' : '') +
        '<span class="notif-time">' + timeAgo(n.published_at) + '</span>' +
      '</div>';

    if (n.link) {
      var a = document.createElement('a');
      a.className = 'notif-item';
      a.href = n.link;
      if (/^https?:\/\//.test(n.link)) { a.target = '_blank'; a.rel = 'noopener'; }
      a.innerHTML = inner;
      return a;
    }
    var div = document.createElement('div');
    div.className = 'notif-item';
    div.innerHTML = inner;
    return div;
  }

  function showEmpty() {
    loadingEl.hidden = true;
    emptyEl.hidden = false;
  }

  if (!window.supabase || !window.TANGAIL_SUPABASE) { showEmpty(); return; }

  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);

  client.from('notices').select('*').eq('enabled', true).order('published_at', { ascending: false })
    .then(function (res) {
      loadingEl.hidden = true;
      if (res.error || !res.data || !res.data.length) { showEmpty(); return; }
      res.data.forEach(function (n) { listEl.appendChild(renderItem(n)); });
    })
    .catch(showEmpty);
})();
