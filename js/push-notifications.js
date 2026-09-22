/*
  push-notifications.js
  -----------------------------------------------------------
  ব্রাউজার পুশ নোটিফিকেশন চালু/বন্ধ করার লজিক (notifications.html-এর বাটন থেকে ডাকা হয়)।
  - সাপোর্ট আছে কিনা যাচাই (serviceWorker/PushManager/Notification API)
  - পারমিশন চাওয়া, sw.js রেজিস্টার করা
  - PushManager.subscribe() দিয়ে ব্রাউজার সাবস্ক্রিপশন তৈরি + push_subscriptions টেবিলে সেভ
  - বন্ধ করলে subscription.unsubscribe() + টেবিল থেকে রো ডিলিট

  ব্যবহার (window.TangailPush):
    TangailPush.isSupported()          → boolean
    TangailPush.getStatus()            → Promise<'unsupported'|'denied'|'unsubscribed'|'subscribed'>
    TangailPush.subscribe()            → Promise<void> (এরর ছুঁড়তে পারে)
    TangailPush.unsubscribe()          → Promise<void>
*/
(function () {
  "use strict";

  var VAPID_PUBLIC_KEY = "BB1BDkeXFmlAsh7kHrR2u07CqO2kT34YzdiDhP4qndLQRQZsxIYeTTaA1sV4dEfnVV-huq6Ggky2JiMpB_aqils";

  function urlBase64ToUint8Array(base64String) {
    var padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  function isSupported() {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  }

  function getSupabase() {
    // প্রজেক্টের অন্যান্য js ফাইলের মতোই প্রতিবার একটা ক্লায়েন্ট বানানো হয় (js/nav-avatar.js দেখুন)
    if (!window.supabase || !window.TANGAIL_SUPABASE) return null;
    return window.supabase.createClient(window.TANGAIL_SUPABASE.url, window.TANGAIL_SUPABASE.key);
  }

  function registerSw() {
    return navigator.serviceWorker.register("/sw.js");
  }

  function getStatus() {
    if (!isSupported()) return Promise.resolve("unsupported");
    if (Notification.permission === "denied") return Promise.resolve("denied");
    return registerSw().then(function (reg) {
      return reg.pushManager.getSubscription().then(function (sub) {
        return sub ? "subscribed" : "unsubscribed";
      });
    });
  }

  function subscribe() {
    if (!isSupported()) {
      return Promise.reject(new Error("এই ব্রাউজারে পুশ নোটিফিকেশন সাপোর্ট নেই"));
    }
    var client = getSupabase();
    if (!client) {
      return Promise.reject(new Error("লগইন যাচাই করা যাচ্ছে না"));
    }

    return Notification.requestPermission()
      .then(function (permission) {
        if (permission !== "granted") {
          throw new Error("পারমিশন দেওয়া হয়নি");
        }
        return registerSw();
      })
      .then(function (reg) {
        return reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      })
      .then(function (subscription) {
        return client.auth.getUser().then(function (res) {
          var user = res && res.data && res.data.user;
          if (!user) throw new Error("লগইন করুন");
          var json = subscription.toJSON();
          return client.from("push_subscriptions").upsert(
            {
              user_id: user.id,
              endpoint: json.endpoint,
              p256dh: json.keys.p256dh,
              auth: json.keys.auth,
              user_agent: navigator.userAgent,
            },
            { onConflict: "endpoint" }
          );
        });
      })
      .then(function (result) {
        if (result && result.error) throw result.error;
      });
  }

  function unsubscribe() {
    if (!isSupported()) return Promise.resolve();
    var client = getSupabase();
    return registerSw()
      .then(function (reg) {
        return reg.pushManager.getSubscription();
      })
      .then(function (sub) {
        if (!sub) return null;
        var endpoint = sub.endpoint;
        return sub.unsubscribe().then(function () {
          if (client && endpoint) {
            return client.from("push_subscriptions").delete().eq("endpoint", endpoint);
          }
        });
      });
  }

  window.TangailPush = {
    isSupported: isSupported,
    getStatus: getStatus,
    subscribe: subscribe,
    unsubscribe: unsubscribe,
  };
})();
