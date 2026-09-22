// send-push — DB ট্রিগার (calls/follows insert) থেকে net.http_post দিয়ে কল হয়।
// শেয়ার্ড সিক্রেট হেডার দিয়ে যাচাই করা হয় (service role key exposed করা হয় না)।
// এরপর push_subscriptions টেবিল থেকে ইউজারের সাবস্ক্রিপশন পড়ে VAPID দিয়ে আসল Web Push পাঠায়।

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import webpush from "npm:web-push@3.6.7";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ⚠️ এই মানগুলো ডিপ্লয়ের সময় বসানো হয়েছে (push-notifications.sql-এর সাথে মিলিয়ে)।
// এই প্রজেক্টে সিক্রেটস ম্যানেজমেন্ট টুল না থাকায় সরাসরি এখানে রাখা হলো — ভবিষ্যতে Supabase
// Dashboard → Edge Functions → Secrets-এ সরিয়ে Deno.env.get() দিয়ে পড়া ভালো অভ্যাস হবে।
const WEBHOOK_SECRET = "be2214d02b3baaae90dbeee0c0b3fb30b445bf0e7482daf6";
const VAPID_PUBLIC_KEY = "BB1BDkeXFmlAsh7kHrR2u07CqO2kT34YzdiDhP4qndLQRQZsxIYeTTaA1sV4dEfnVV-huq6Ggky2JiMpB_aqils";
const VAPID_PRIVATE_KEY = "doG9awIZYsAjgM8s3fOArdwjQkESyxPD2-jgmXj6-VM";
const VAPID_SUBJECT = "mailto:support@tangailjela.example";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (req: Request) => {
  if (req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  let payload: { user_id?: string; type?: string; title?: string; body?: string; url?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad json" }), { status: 400 });
  }

  const { user_id, title, body, url } = payload;
  if (!user_id || !title) {
    return new Response(JSON.stringify({ error: "missing user_id/title" }), { status: 400 });
  }

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: "no subscriptions" }), { status: 200 });
  }

  const notificationPayload = JSON.stringify({
    title,
    body: body ?? "",
    url: url ?? "/notifications.html",
  });

  let sent = 0;
  const staleIds: number[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notificationPayload,
        );
        sent++;
      } catch (err) {
        // 404/410 মানে সাবস্ক্রিপশন আর বৈধ না (ব্রাউজার/ইউজার unsubscribe করেছে) — মুছে ফেলা হবে
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          staleIds.push(sub.id);
        }
      }
    }),
  );

  if (staleIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }

  return new Response(JSON.stringify({ sent, removed: staleIds.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
