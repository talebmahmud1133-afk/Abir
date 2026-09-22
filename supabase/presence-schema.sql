-- ============================================================================
-- টাঙ্গাইল জেলা — অনলাইন উপস্থিতি (Presence) সিস্টেম
-- ============================================================================
-- ✅ লাইভ Supabase-এ প্রয়োগ করা হয়েছে (২০২৬-০৯-২০, migration
--    `add_presence_last_seen_and_online_status_v2`, ব্যবহারকারীর অনুমতিতে, MCP দিয়ে সরাসরি)।
-- এটা আবার চালানোর দরকার নেই (create or replace / add column if not exists — চালালেও নিরাপদ);
-- রেফারেন্স হিসেবে রাখা হলো।
--
-- কীভাবে কাজ করে:
--   ১. প্রতিটা লগইন করা ইউজার সাইটে থাকা অবস্থায় js/nav-avatar.js (সব পেজে লোড হয়)
--      প্রতি ৬০ সেকেন্ডে touch_last_seen() RPC কল করে profiles.last_seen আপডেট করে
--      (ট্যাব ব্যাকগ্রাউন্ডে গেলে হার্টবিট থামে, আবার সামনে এলে সাথে সাথে একটা পাঠায়)।
--   ২. members.html-এর তালিকা list_public_members() থেকে is_online পায় — শেষ ২ মিনিটের
--      মধ্যে last_seen থাকলেই true (২ মিনিট বাফার, যাতে নেটওয়ার্ক দেরি/ট্যাব থ্রটলিং-এ
--      মিথ্যা "অফলাইন" না দেখায়)।
--   ৩. is_online না থাকলে (null বা ২ মিনিটের পুরনো) js/members.js কোনো ডট দেখায় না।
--
-- নিরাপত্তা: touch_last_seen() শুধু auth.uid()-এর নিজের সারি আপডেট করে (SECURITY DEFINER,
-- profiles-এ ব্রড UPDATE গ্রান্ট/পলিসি ছাড়াই), execute শুধু authenticated রোলকে।
-- ============================================================================

-- ১. profiles টেবিলে last_seen কলাম
alter table public.profiles
  add column if not exists last_seen timestamptz;

-- ২. হার্টবিট RPC — লগইন করা ইউজার নিজেকে "অনলাইন" মার্ক করতে পর্যায়ক্রমে কল করে
create or replace function public.touch_last_seen()
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.profiles set last_seen = now() where id = auth.uid();
$$;

revoke all on function public.touch_last_seen() from public, anon;
grant execute on function public.touch_last_seen() to authenticated;

-- ৩. list_public_members()-এ is_online যোগ — supabase/members-schema.sql দেখুন
--    (রিটার্ন টাইপ বদলানোয় drop + create লেগেছিল, create or replace যথেষ্ট ছিল না)
