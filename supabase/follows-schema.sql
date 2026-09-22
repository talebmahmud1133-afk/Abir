-- ============================================================================
-- টাঙ্গাইল জেলা — ইউজার প্রোফাইল সিস্টেম (ধাপ ৬): ফলো সিস্টেম
-- ============================================================================
-- ✅ এই স্কিমা লাইভ Supabase প্রজেক্টে (jexscwcowptcshoalcrw) আগে থেকেই প্রয়োগ করা ছিল
-- (v45 ZIP-এ এই ফাইল ছিল না — ধাপ ৬ শুরুর সময় লাইভ ডাটাবেজ থেকে আবিষ্কৃত ও যাচাই করা হয়েছে)।
-- নিচের ১-৪ নং অংশ লাইভ অবস্থার হুবহু ডকুমেন্টেশন — আবার চালানোর দরকার নেই (idempotent নয়)।
-- ৫ ও ৬ নং অংশ ঐচ্ছিক, এখনো প্রয়োগ করা হয়নি — ব্যবহারকারীর নিশ্চিতকরণের অপেক্ষায়।
--
-- ডিজাইন:
--  • follows(follower_id, following_id, created_at), PK = (follower_id, following_id) → ডুপ্লিকেট ফলো অসম্ভব
--  • নিজেকে ফলো করা যায় না (CHECK), প্রোফাইল মুছলে ফলোও মুছে যায় (ON DELETE CASCADE)
--  • insert: শুধু নিজের হয়ে (follower_id = auth.uid()) এবং টার্গেট প্রোফাইল is_public হলে
--  • delete: নিজের ফলো (বা অ্যাডমিন); select: নিজের সংক্রান্ত রো (বা অ্যাডমিন)
--  • পাবলিক সংখ্যা (ফলোয়ার/ফলোয়িং) আসে SECURITY DEFINER ফাংশন get_follow_stats() থেকে —
--    টেবিলে সরাসরি পাবলিক SELECT নেই, তাই কে কাকে ফলো করে তার তালিকা বাইরে থেকে পড়া যায় না
-- ============================================================================

-- ১. টেবিল
create table public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  constraint follows_pkey primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);
alter table public.follows enable row level security;

-- ২. হেল্পার — profiles-এর RLS পেরিয়ে শুধু "পাবলিক কিনা" বলে (anon-এর জন্য execute নেই)
create or replace function public.is_profile_public(p_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select is_public from public.profiles where id = p_id), false); $$;

-- ৩. RLS পলিসি
create policy "follows: read own" on public.follows for select to authenticated
  using (follower_id = auth.uid() or following_id = auth.uid() or is_admin());
create policy "follows: follow as self" on public.follows for insert to authenticated
  with check (follower_id = auth.uid() and is_profile_public(following_id));
create policy "follows: unfollow as self" on public.follows for delete to authenticated
  using (follower_id = auth.uid() or is_admin());
-- টেবিল গ্রান্ট (লাইভে): authenticated → INSERT, SELECT, DELETE (+ ডিফল্ট TRUNCATE/REFERENCES/TRIGGER)

-- ৪. পাবলিক সংখ্যা — anon ও authenticated উভয়ের জন্য execute
create or replace function public.get_follow_stats(p_username text)
returns table (followers bigint, following bigint, is_following boolean)
language sql stable security definer set search_path = public
as $$
  select (select count(*) from public.follows f where f.following_id = p.id),
         (select count(*) from public.follows f where f.follower_id = p.id),
         exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.id)
  from public.profiles p
  where lower(p.username) = lower(p_username) and (p.is_public = true or p.id = auth.uid());
$$;

-- ----------------------------------------------------------------------------
-- ঐচ্ছিক (৫) — অপ্রয়োজনীয় টেবিল-প্রিভিলেজ ছাঁটাই (⏳ প্রয়োগ হয়নি)
-- anon/authenticated-এর TRUNCATE/REFERENCES/TRIGGER দরকার নেই। PostgREST API এগুলো এক্সপোজ করে না,
-- তাই ঝুঁকি কম — তবে ন্যূনতম-প্রিভিলেজ নীতির জন্য ছেঁটে ফেলা ভালো।
-- revoke truncate, references, trigger on public.follows from anon, authenticated;

-- ঐচ্ছিক (৬) — পুরনো ইউজারদের অ্যাভাটার profiles.avatar_url-এ ব্যাকফিল (⏳ প্রয়োগ হয়নি)
-- কারণ: পাবলিক প্রোফাইল profiles.avatar_url পড়ে, কিন্তু আগে ছবি শুধু auth metadata-তে সেভ হতো
-- (লাইভে ৪ জনের সবারই profiles.avatar_url খালি, metadata-তে ছবি আছে)। profile.html এখন প্রতিবার
-- খোলার সময় নিজের ছবি নিজে সিঙ্ক করে নেয়, তাই এই SQL না চালালেও প্রত্যেক ইউজার একবার নিজের প্রোফাইল
-- পেজ খুললেই ঠিক হয়ে যাবে — SQL চালালে সবার একসাথে তাৎক্ষণিক ঠিক হবে।
-- update public.profiles p
--    set avatar_url = u.raw_user_meta_data->>'avatar_url'
--   from auth.users u
--  where u.id = p.id
--    and coalesce(p.avatar_url, '') = ''
--    and coalesce(u.raw_user_meta_data->>'avatar_url', '') <> '';
