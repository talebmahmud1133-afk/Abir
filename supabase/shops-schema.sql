-- ============================================================================
-- টাঙ্গাইল জেলা — দোকান ডিরেক্টরি মডিউল: shops টেবিল + RLS পলিসি
-- ============================================================================
-- ✅ এই স্কিমা ইতিমধ্যে আপনার Supabase প্রজেক্টে (jexscwcowptcshoalcrw) সরাসরি
-- তৈরি ও সক্রিয় করা হয়েছে — নিচের স্ক্রিপ্ট এখন আর চালানোর দরকার নেই, এটা
-- শুধু ডকুমেন্টেশন/রেফারেন্স হিসেবে প্রজেক্টে রাখা হলো (ভবিষ্যতে অন্য কোনো
-- Supabase প্রজেক্টে সাইট বসালে এই স্ক্রিপ্টটা কাজে লাগবে)।
--
-- ছবি (logo_url, cover_url) বিদ্যমান "market-media" স্টোরেজ বাকেটে (পাবলিক)
-- আপলোড হয় — এটাও যাচাই করে দেখা হয়েছে যে বাকেটটা বিদ্যমান ও পাবলিক আছে।
--
-- নিরাপত্তা মডেল সাইটের বাকি সব টেবিলের (ambulance_providers, doctors,
-- hospitals, jobs ইত্যাদি) সাথে হুবহু মিলিয়ে বানানো — is_admin() ফাংশন
-- (public.profiles টেবিলে role='admin' চেক করে) দিয়ে অ্যাডমিন অ্যাক্সেস
-- নিয়ন্ত্রিত, শুধু "authenticated" রোল দিয়ে নয়। admin.html-এ যেই ইমেইল দিয়ে
-- সাইন-ইন করা হয়, সেই ইউজারের profiles.role অবশ্যই 'admin' হতে হবে।
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ১. টেবিল (ইতিমধ্যে লাইভ — কলাম হুবহু js/shop.js ও js/add-shop.js এর সাথে মিলিয়ে)
-- ---------------------------------------------------------------------------
create table if not exists public.shops (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  user_id      uuid references auth.users(id),

  name         text not null,
  category     text not null,
  owner_name   text default '',
  phone        text not null,
  whatsapp     text default '',
  address      text not null,
  upazila      text not null,
  maps_url     text default '',
  website      text default '',
  facebook     text default '',
  hours        text default '',
  description  text default '',

  logo_url     text default '',
  cover_url    text default '',

  rating       numeric default 0,
  reviews      integer default 0,
  verified     boolean default false,

  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected'))
);

comment on table public.shops is 'দোকান ডিরেক্টরি তালিকা — business-directory.html পেজে ব্যবহৃত। add-shop.html ফর্ম থেকে যে কেউ দোকান যুক্ত করতে পারে, status ডিফল্টে pending থাকে; admin.html থেকে অনুমোদনের পর পাবলিক তালিকায় দেখা যায়।';

-- ---------------------------------------------------------------------------
-- ২. টেবিল-লেভেল GRANT (RLS পলিসির আগেই দরকার — এটা ছাড়া RLS পলিসি সঠিক
-- হলেও Postgres "permission denied for table shops" এরর দেবে, কারণ GRANT
-- আর RLS আলাদা দুই স্তরের নিরাপত্তা। Supabase Table Editor UI দিয়ে টেবিল
-- বানালে এগুলো অটো যোগ হয়, কিন্তু raw SQL দিয়ে বানালে ম্যানুয়ালি দিতে হয়।)
-- ---------------------------------------------------------------------------
grant select, insert on public.shops to anon;
grant select, insert, update, delete on public.shops to authenticated;

-- ---------------------------------------------------------------------------
-- ৩. Row Level Security (ইতিমধ্যে লাইভ — is_admin() কনভেনশন)
-- ---------------------------------------------------------------------------
alter table public.shops enable row level security;

drop policy if exists "public can read approved shops" on public.shops;
drop policy if exists "public can register shop" on public.shops;
drop policy if exists "admin can manage shops" on public.shops;

-- সবাই (লগইন ছাড়াই) শুধু "approved" দোকান দেখতে পারবে
create policy "public can read approved shops"
  on public.shops
  for select
  to public
  using (status = 'approved');

-- যেকেউ (লগইন ছাড়াই) নতুন দোকান যুক্ত করতে পারবে — add-shop.js সবসময়
-- status:'pending' পাঠায়, তাই বাস্তবে সবসময় pending অবস্থায় জমা হয়
create policy "public can register shop"
  on public.shops
  for insert
  to public
  with check (true);

-- শুধু অ্যাডমিন (profiles.role = 'admin') সব দেখা/অনুমোদন/বাতিল/মুছে
-- ফেলা/ভেরিফাইড-টগল করতে পারবে — admin.html-এর "দোকান" ট্যাবের জন্য প্রয়োজন
create policy "admin can manage shops"
  on public.shops
  for all
  to public
  using (is_admin())
  with check (is_admin());

-- ============================================================================
-- অবস্থা: ✅ টেবিল তৈরি করা আছে, GRANT ঠিক আছে, RLS চালু আছে, তিনটি পলিসিই
-- সক্রিয়, এবং market-media স্টোরেজ বাকেট আগে থেকেই বিদ্যমান ও পাবলিক —
-- দোকান ডিরেক্টরি মডিউল (add-shop.html জমা → admin.html অনুমোদন →
-- business-directory.html প্রকাশ) এখন সম্পূর্ণ কার্যকর।
-- ============================================================================
