// টাঙ্গাইল জেলা — স্মার্ট সার্চ ইঞ্জিন
// ১) বানান ভুল/কাছাকাছি বানান সহনশীল (Levenshtein distance ভিত্তিক ফাজি ম্যাচিং)
// ২) সহজ স্বাভাবিক-ভাষা বোঝা (প্রশ্নবাচক শব্দ বাদ দিয়ে মূল উদ্দেশ্য বুঝে সঠিক পেজে পৌঁছানো)
// কোনো বাহিরের API/ইন্টারনেট লাগে না — পুরোটাই ব্রাউজারে চলে, তাই কোনো খরচ নেই।
(function () {
  var STOPWORDS = [
    "কি", "কী", "কই", "কোথায়", "কোথা", "পাব", "পাবো", "চাই", "চায়", "লাগবে",
    "দরকার", "করব", "করবো", "করতে", "দেখাব", "দেখব", "দেখবো", "হলে", "গেলে",
    "এর", "আছে", "কোন", "কোনো", "একটা", "একটি", "কাছে", "কাছের", "নিকটে",
    "আমার", "আমি", "এ", "এই", "এখন", "জন্য", "সম্পর্কে", "কীভাবে", "কিভাবে",
    "টা", "টি", "যাব", "যাবো", "নিতে", "দিতে", "খুঁজছি", "খুঁজব", "কোনটা",
    "ভালো", "নম্বর", "নাম্বার"
  ];

  function normalize(str) {
    return (str || "").toLowerCase().trim();
  }

  function tokenize(str) {
    return normalize(str)
      .split(/[\s,।.!?/\-]+/)
      .filter(function (t) { return t && STOPWORDS.indexOf(t) === -1; });
  }

  // দুইটা শব্দের মধ্যে এডিট-ডিসট্যান্স (কতগুলো অক্ষর পাল্টালে একটা থেকে আরেকটা পাওয়া যাবে)
  function levenshtein(a, b) {
    if (a === b) return 0;
    var al = a.length, bl = b.length;
    if (!al) return bl;
    if (!bl) return al;
    var prev = [];
    var i, j;
    for (j = 0; j <= bl; j++) prev[j] = j;
    for (i = 1; i <= al; i++) {
      var cur = [i];
      for (j = 1; j <= bl; j++) {
        cur[j] = Math.min(
          prev[j] + 1,
          cur[j - 1] + 1,
          prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
      prev = cur;
    }
    return prev[bl];
  }

  function fuzzyMatchScore(token, keyword) {
    if (!token || !keyword) return 0;
    if (keyword.indexOf(token) !== -1 || token.indexOf(keyword) !== -1) return 3;
    var maxLen = Math.max(token.length, keyword.length);
    var dist = levenshtein(token, keyword);
    if (maxLen <= 3) return dist === 0 ? 3 : 0;
    var allowed = maxLen <= 6 ? 1 : 2;
    if (dist <= allowed) return 2 - dist / (allowed + 1);
    return 0;
  }

  function buildHaystack(entry) {
    if (entry._haystack) return entry._haystack;
    var words = [].concat(
      tokenize(entry.title || ""),
      (entry.keywords || []).map(normalize)
    );
    entry._haystack = words;
    return words;
  }

  function scoreEntry(entry, tokens, rawQuery) {
    var score = 0;
    var i;
    var phrases = entry.phrases || [];
    // পুরো বাক্য/স্বাভাবিক-ভাষার প্রশ্নের সাথে মিল থাকলে বড় বোনাস
    for (i = 0; i < phrases.length; i++) {
      var p = normalize(phrases[i]);
      if (rawQuery.length > 2 && (p.indexOf(rawQuery) !== -1 || rawQuery.indexOf(p) !== -1)) {
        score += 8;
      }
    }
    var haystack = buildHaystack(entry);
    tokens.forEach(function (tok) {
      var best = 0;
      haystack.forEach(function (kw) {
        var s = fuzzyMatchScore(tok, kw);
        if (s > best) best = s;
      });
      score += best;
    });
    return score;
  }

  function search(query, limit) {
    var idx = window.TZ_SEARCH_INDEX || [];
    var tokens = tokenize(query);
    var rawQuery = normalize(query);
    if (!tokens.length && rawQuery.length < 2) return [];
    var results = idx.map(function (entry) {
      return { entry: entry, score: scoreEntry(entry, tokens, rawQuery) };
    }).filter(function (r) { return r.score > 0; });
    results.sort(function (a, b) { return b.score - a.score; });
    return results.slice(0, limit || 5);
  }

  window.TZSmartSearch = { search: search, tokenize: tokenize };
})();
