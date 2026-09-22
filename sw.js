/*
  sw.js — শুধু ব্রাউজার পুশ নোটিফিকেশনের জন্য।
  ইচ্ছাকৃতভাবে কোনো fetch/cache ইন্টারসেপ্ট করা হয় না, যাতে auto-update.js-এর
  ভার্সন-বেজড আপডেট মেকানিজমের সাথে কোনো সংঘর্ষ না হয়।
*/
"use strict";

self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  var data = { title: "টাঙ্গাইল জেলা", body: "", url: "/notifications.html" };
  if (event.data) {
    try {
      var parsed = event.data.json();
      data.title = parsed.title || data.title;
      data.body = parsed.body || data.body;
      data.url = parsed.url || data.url;
    } catch (e) {
      data.body = event.data.text();
    }
  }

  var options = {
    body: data.body,
    icon: "/assets/icons/icon-192.png",
    badge: "/assets/icons/icon-192.png",
    data: { url: data.url },
    dir: "rtl",
    lang: "bn",
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) || "/notifications.html";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
