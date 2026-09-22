-- ============================================================================
-- টাঙ্গাইল জেলা — হোম পেজের ক্যাটাগরির ♡ (ফেভারিট) → প্রোফাইলের "ফেভারিট ক্যাটাগরি"
-- ============================================================================
-- ⏳ এখনো Supabase-এ প্রয়োগ করা হয়নি — Supabase SQL Editor-এ একবার চালাতে হবে।
--    (চালানোর আগেও ফিচারটা কাজ করে, তবে তখন ফেভারিট শুধু ঐ ফোনের ব্রাউজারে জমা থাকে;
--     চালানোর পর লগইন করা ইউজারের ফেভারিট অ্যাকাউন্টে জমা হয় — ফোন/ব্রাউজার বদলালেও থাকে।)
--
-- শুধু ১টা নতুন টেবিল; বিদ্যমান কোনো টেবিল/কলাম/পলিসি বদলায় না, কিছু মোছেও না।
-- আবার চালালেও নিরাপদ (if not exists / drop policy if exists)।
--
-- cat_key = হোম পেজের ক্যাটাগরি কার্ডের ভাষা-কী (যেমন 'cat.emergency.title') — js/favorite-categories.js-এর তালিকার সাথে মেলে।
--
-- নিরাপত্তা (RLS):
--  • প্রতিটি ইউজার শুধু নিজের সারি দেখতে / যোগ করতে / মুছতে পারে (user_id = auth.uid())
--  • গেস্ট (anon) কিছুই পারে না; অন্যের ফেভারিট দেখার কোনো উপায় নেই
--  • update-এর দরকার নেই (যোগ বা মোছাই যথেষ্ট), তাই update পলিসি দেওয়া হয়নি
-- ============================================================================

create table if not exists public.favorite_categories (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  cat_key    text        not null check (char_length(cat_key) between 1 and 60),
  created_at timestamptz not null default now(),
  primary key (user_id, cat_key)
);

alter table public.favorite_categories enable row level security;

drop policy if exists "favcat_select_own" on public.favorite_categories;
create policy "favcat_select_own" on public.favorite_categories
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "favcat_insert_own" on public.favorite_categories;
create policy "favcat_insert_own" on public.favorite_categories
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "favcat_delete_own" on public.favorite_categories;
create policy "favcat_delete_own" on public.favorite_categories
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.favorite_categories from anon;
grant select, insert, delete on public.favorite_categories to authenticated;
