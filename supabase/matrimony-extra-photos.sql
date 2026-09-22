-- matrimony_entries — "আরও ছবি (ঐচ্ছিক)" (সর্বোচ্চ ৪টি) — matrimony.html ("+" ফর্ম)
-- ⚠️ Supabase SQL Editor-এ একবার চালাতে হবে (একাধিকবার চালালেও সমস্যা নেই)।
--
-- • extra_photos: আরও ছবির পাবলিক লিংকের তালিকা (text[]), ফাঁকা হলে '{}'।
-- • ছবিগুলো বিদ্যমান `market-media` বাকেটের `matrimony/` ফোল্ডারে যায় (প্রধান ছবির মতোই) — নতুন বাকেট/পলিসি লাগবে না।
-- • RLS/GRANT অপরিবর্তিত: টেবিল-লেভেল grant থাকায় নতুন কলাম আপনাআপনি কভার হয়।
-- • এই SQL চালানোর আগেও সাইট ভাঙবে না: ফর্ম শুধু আরও ছবি থাকলেই এই কলামে লেখে, আর তালিকা লোডের সময়
--   কলাম না পেলে কলাম ছাড়া আবার লোড করে — তবে আরও ছবি সহ জমা দিতে হলে এই SQL আগে চালাতেই হবে।

alter table public.matrimony_entries
  add column if not exists extra_photos text[] not null default '{}';

alter table public.matrimony_entries
  drop constraint if exists matrimony_entries_extra_photos_chk;

alter table public.matrimony_entries
  add constraint matrimony_entries_extra_photos_chk
  check (cardinality(extra_photos) <= 4);
