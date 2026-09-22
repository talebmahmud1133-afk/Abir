// টাঙ্গাইল জেলা — হোমপেজে সাম্প্রতিক পোস্ট ও চলমান রক্তের রিকোয়েস্টের ছোট প্রিভিউ (সর্বোচ্চ ৪টি, সময় অনুযায়ী মিশিয়ে)
(function () {
  var wrap = document.getElementById('homePostsPreview');
  if (!wrap || !window.TANGAIL_SUPABASE) return;

  var client = window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
  var MAX_SHOW = 4;

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function timeAgo(iso) {
    var then = new Date(iso).getTime();
    var diff = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (diff < 60) return 'এইমাত্র';
    if (diff < 3600) return Math.floor(diff / 60) + ' মিনিট আগে';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ঘণ্টা আগে';
    return Math.floor(diff / 86400) + ' দিন আগে';
  }

  function avatarHtml(post) {
    if (post.avatar_url) {
      return '<img class="post-avatar post-avatar-img" src="' + escapeHtml(post.avatar_url) + '" alt="" loading="lazy">';
    }
    var initial = (post.author_name || 'অ').trim().charAt(0).toUpperCase();
    return '<div class="post-avatar">' + escapeHtml(initial) + '</div>';
  }

  function cardHtml(post) {
    var thumb = '';
    if (post.media_url && post.media_type === 'image') {
      thumb = '<div class="post-mini-thumb"><img src="' + escapeHtml(post.media_url) + '" loading="lazy" alt=""></div>';
    } else if (post.media_url && post.media_type === 'video') {
      thumb = '<div class="post-mini-thumb post-mini-thumb-video"><i class="fa-solid fa-circle-play" aria-hidden="true"></i></div>';
    }
    return '' +
      '<a class="post-card-mini" href="post-view.html?id=' + encodeURIComponent(post.id) + '">' +
        avatarHtml(post) +
        '<div class="post-mini-body">' +
          '<div class="post-mini-top"><span class="post-author">' + escapeHtml(post.author_name || 'অতিথি') + '</span><span class="post-time">' + timeAgo(post.created_at) + '</span></div>' +
          '<p class="post-mini-text">' + escapeHtml(post.content) + '</p>' +
          '<div class="post-mini-stats"><i class="fa-solid fa-thumbs-up" aria-hidden="true"></i> ' + (post.like_count || 0) +
            ' &nbsp; <i class="fa-regular fa-comment" aria-hidden="true"></i> ' + (post.comment_count || 0) + '</div>' +
        '</div>' +
        thumb +
      '</a>';
  }

  // যিনি রক্তের রিকোয়েস্ট দিয়েছেন — তার প্রোফাইল তথ্যসহ (রোগীর নাম, গ্রুপ, হাসপাতাল, ফোন) পোস্টের মতোই কার্ড
  function reqCardHtml(r) {
    var group = escapeHtml(r.blood_group || '');
    var bags = r.bags_needed || 1;
    var locBits = [r.hospital, r.thana].filter(Boolean).join(', ');
    var urgent = r.urgency === 'urgent';
    var tagHtml = urgent ? '<span class="post-mini-urgent-tag">জরুরি</span>' : '';
    var text = escapeHtml(r.patient_name || 'রোগী') + '-এর জন্য ' + bags + ' ব্যাগ ' + group + ' রক্ত প্রয়োজন' +
      (locBits ? ' — ' + escapeHtml(locBits) : '') + (r.notes ? ' · ' + escapeHtml(r.notes) : '');

    return '' +
      '<a class="post-card-mini req-mini" href="blood-donors.html">' +
        '<div class="post-avatar req-mini-avatar"><i class="fa-solid fa-droplet" aria-hidden="true"></i></div>' +
        '<div class="post-mini-body">' +
          '<div class="post-mini-top"><span class="post-author">রক্তের রিকোয়েস্ট' + tagHtml + '</span><span class="post-time">' + timeAgo(r.created_at) + '</span></div>' +
          '<p class="post-mini-text">' + text + '</p>' +
          '<div class="post-mini-stats"><i class="fa-solid fa-phone" aria-hidden="true"></i> ' + escapeHtml(r.phone || '') + '</div>' +
        '</div>' +
      '</a>';
  }

  Promise.all([
    client.from('posts').select('*').eq('status', 'approved').order('created_at', { ascending: false }).limit(MAX_SHOW),
    client.from('blood_requests').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(MAX_SHOW)
  ]).then(function (results) {
    var postsRes = results[0];
    var reqRes = results[1];
    var items = [];

    if (!postsRes.error && postsRes.data) {
      postsRes.data.forEach(function (p) {
        items.push({ ts: new Date(p.created_at).getTime(), html: cardHtml(p) });
      });
    }
    if (!reqRes.error && reqRes.data) {
      reqRes.data.forEach(function (r) {
        items.push({ ts: new Date(r.created_at).getTime(), html: reqCardHtml(r) });
      });
    }

    if (!items.length) {
      wrap.innerHTML = '<a href="posts.html" class="post-empty" style="display:block; text-decoration:none;">এখনো কোনো পোস্ট নেই — প্রথম পোস্টটি আপনিই করুন <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>';
      return;
    }

    items.sort(function (a, b) { return b.ts - a.ts; });
    items = items.slice(0, MAX_SHOW);

    wrap.innerHTML = items.map(function (it) { return it.html; }).join('');
  });
})();
