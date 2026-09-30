-- hotel_offices — গ্র্যান্ট ফিক্স + "আরও ছবি (ঐচ্ছিক)" (সর্বোচ্চ ৪টি; প্রধান ছবি logo_url সহ মোট ৫টি) — hotel.html ("+" ফর্ম)
-- লাইভ ডাটাবেসে migration `hotel_offices_grants_and_extra_photos_check` হিসেবে প্রয়োগ করা হয়েছে (একাধিকবার চালালেও সমস্যা নেই)।
--
-- • সমস্যা ছিল: টেবিলে anon/authenticated-এর কোনো SELECT/INSERT গ্র্যান্ট ছিল না ("permission denied for table hotel_offices"),
--   ফলে হোটেল জমা, তালিকা লোড ও অ্যাডমিন প্যানেল — সবই ব্যর্থ হতো। RLS পলিসি ঠিকই ছিল, শুধু গ্র্যান্ট ছিল না।
--   অন্য টেবিলের (courier_offices, lawyer_entries, shops) মতো গ্র্যান্ট দেওয়া হলো; RLS পলিসি অপরিবর্তিত:
--   anon শুধু status='pending' ইনসার্ট করতে পারে, সবাই শুধু 'approved' পড়তে পারে, অ্যাডমিন সব পারে।
-- • extra_photos: আরও ছবির পাবলিক লিংকের তালিকা (text[]), ফাঁকা হলে '{}'; সর্বোচ্চ ৪টি (চেক কনস্ট্রেইন্ট)।
-- • ছবিগুলো বিদ্যমান `market-media` বাকেটের `hotel/` ফোল্ডারে যায় — নতুন বাকেট/পলিসি লাগবে না।

grant select, insert on public.hotel_offices to anon;
grant select, insert, update, delete on public.hotel_offices to authenticated;

alter table public.hotel_offices
  add column if not exists extra_photos text[] not null default '{}';

alter table public.hotel_offices
  drop constraint if exists hotel_offices_extra_photos_chk;

alter table public.hotel_offices
  add constraint hotel_offices_extra_photos_chk
  check (cardinality(extra_photos) <= 4);
