// টাঙ্গাইল জেলা — হেডারের প্রকৃত উচ্চতা মেপে --header-h ভ্যারিয়েবলে বসানো,
// যাতে ব্যানার + নোটিশ বার ঠিক হেডারের নিচেই স্থির (sticky) থাকে।
(function () {
  var header = document.querySelector('.site-header');
  if (!header) return;

  function setVar() {
    document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  }

  setVar();
  window.addEventListener('resize', setVar);
  window.addEventListener('load', setVar);

  if (window.ResizeObserver) {
    new ResizeObserver(setVar).observe(header);
  }
})();
