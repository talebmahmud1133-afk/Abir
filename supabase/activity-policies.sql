-- ধাপ ৭ ও ৮ (public-profile.html অ্যাক্টিভিটি ট্যাব + my-activity.html) — রেফারেন্স
-- এই সেশনে যা প্রয়োগ করা হয়েছে/পাওয়া গেছে, তার ডকুমেন্টেশন।

-- ============================================================
-- আবিষ্কার (এই সেশনে প্রয়োগ করা হয়নি — আগের কোনো সেশনে লাইভে করা ছিল কিন্তু zip/রোডম্যাপে লেখা ছিল না,
-- follows টেবিলের মতো একই প্যাটার্ন): SECURITY DEFINER ফাংশন get_public_activity(p_username, p_limit)।
-- marketplace_listings / shops / doctor_listings / lawyer_entries / posts থেকে শুধু approved (এবং demo নয়)
-- এন্ট্রি ফেরত দেয়, owner প্রোফাইল is_public=true (বা auth.uid() = owner) হলেই। matrimony_entries
-- ইচ্ছাকৃতভাবে বাদ (CATEGORY_ROADMAP-এর সংবেদনশীলতা নিয়ে খোলা প্রশ্নের ডিফল্ট প্রস্তাব অনুযায়ী)।
-- courier_offices-ও এতে নেই (আগের সেশনের সিদ্ধান্ত/বাদ পড়া — এই সেশনে ছোঁয়া হয়নি)।
--
-- CREATE OR REPLACE FUNCTION public.get_public_activity(p_username text, p_limit integer DEFAULT 30)
--  RETURNS TABLE(kind text, item_id uuid, title text, subtitle text, image_url text, price numeric, created_at timestamptz)
--  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
-- AS $function$ ... (বিস্তারিত লাইভ ডাটাবেজে; `pg_get_functiondef` দিয়ে পড়া হয়েছে) $function$;

-- ============================================================
-- এই সেশনে প্রয়োগ করা হয়েছে (migration: own_activity_read_policies) — ধাপ ৮-এর জন্য।
-- সমস্যা: my-activity.html-এ ইউজারের নিজের pending/rejected এন্ট্রিও দেখতে হবে, কিন্তু আগে শুধু
-- matrimony_entries-এ "user can read own" পলিসি ছিল; বাকি টেবিলে শুধু public-এর জন্য approved-select ছিল।
-- ফিক্স: নিচের ৬টা টেবিলে matrimony_entries-এর same প্যাটার্নে নতুন SELECT পলিসি (additive, non-destructive)।

drop policy if exists "user can read own marketplace listings" on public.marketplace_listings;
create policy "user can read own marketplace listings" on public.marketplace_listings
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "user can read own shops" on public.shops;
create policy "user can read own shops" on public.shops
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "user can read own courier offices" on public.courier_offices;
create policy "user can read own courier offices" on public.courier_offices
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "user can read own doctor listings" on public.doctor_listings;
create policy "user can read own doctor listings" on public.doctor_listings
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "user can read own lawyer entries" on public.lawyer_entries;
create policy "user can read own lawyer entries" on public.lawyer_entries
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "user can read own posts" on public.posts;
create policy "user can read own posts" on public.posts
  for select to authenticated
  using (user_id = auth.uid());

-- যাচাই: pg_policies কুয়েরিতে ৬টা নতুন পলিসি ঠিকভাবে তৈরি হয়েছে দেখা গেছে; security advisor-এ এই
-- পরিবর্তনের জন্য নতুন কোনো WARN/ERROR আসেনি (শুধু আগে থেকে থাকা matrimony_public ভিউ ও anon-callable
-- RPC-গুলোর পরিচিত WARN, যা সাইটের প্রতিষ্ঠিত প্যাটার্ন)।
