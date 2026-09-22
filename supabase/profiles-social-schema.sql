-- ============================================================================
-- টাঙ্গাইল জেলা — ইউজার প্রোফাইল সিস্টেম (ধাপ ১): profiles টেবিলে নতুন কলাম
-- + নিরাপদ পাবলিক-প্রোফাইল রিড ফাংশন
-- ============================================================================
-- ✅ এই স্কিমা ইতিমধ্যে লাইভ Supabase প্রজেক্টে (jexscwcowptcshoalcrw) প্রয়োগ ও
-- যাচাই করা হয়েছে — নিচের স্ক্রিপ্ট এখন আর চালানোর দরকার নেই, এটা শুধু
-- ডকুমেন্টেশন/রেফারেন্স হিসেবে প্রজেক্টে রাখা হলো।
--
-- বর্তমান profiles টেবিল (যাচাই করা হয়েছে সরাসরি লাইভ ডাটাবেজ থেকে):
--   id, full_name, email, phone, avatar_url, role, created_at, updated_at,
--   village, union_name, thana, district
-- বর্তমান RLS: profiles_select ও profiles_update — শুধু is_admin() অথবা
-- নিজের row (auth.uid() = id)। এখন কোনো পাবলিক SELECT পলিসি নেই।
--
-- ⚠️ গুরুত্বপূর্ণ ডিজাইন সিদ্ধান্ত: profiles টেবিলে সরাসরি পাবলিক SELECT পলিসি
-- যোগ করা হচ্ছে না — কারণ RLS row-level, column-level না; is_public=true একটা
-- পাবলিক SELECT পলিসি দিলে phone/village/thana/district ও একইসাথে পাবলিক হয়ে
-- যাবে, যা ইচ্ছাকৃত না। তার বদলে একটা SECURITY DEFINER ফাংশন বানানো হচ্ছে
-- (is_admin()-এর মতো একই প্যাটার্নে) যেটা শুধু নির্দিষ্ট নিরাপদ কলাম রিটার্ন
-- করে, এবং phone/address শুধু show_phone/show_address সত্যি হলেই দেখায়।
-- profiles টেবিলের বেস RLS (owner/admin-only) অপরিবর্তিত থাকছে।
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ১. নতুন কলাম
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists username      text,
  add column if not exists bio           text default '',
  add column if not exists cover_url     text default '',
  add column if not exists is_public     boolean not null default true,
  add column if not exists show_phone    boolean not null default false,
  add column if not exists show_address  boolean not null default false,
  add column if not exists is_verified   boolean not null default false;

-- ইউজারনেম ফরম্যাট: ছোট হাতের অক্ষর/সংখ্যা/আন্ডারস্কোর, ৩-২০ ক্যারেক্টার
alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');

-- কেস-ইনসেনসিটিভ ইউনিক ইউজারনেম (NULL একাধিক থাকতে পারবে — যারা এখনো সেট করেননি)
drop index if exists profiles_username_unique_idx;
create unique index profiles_username_unique_idx on public.profiles (lower(username));

comment on column public.profiles.bio is 'পাবলিক প্রোফাইলে দেখানো সংক্ষিপ্ত পরিচিতি, সর্বোচ্চ ~১৬০ ক্যারেক্টার (ফ্রন্টএন্ডে সীমাবদ্ধ)';
comment on column public.profiles.is_public is 'false হলে এই ইউজারের প্রোফাইল/অ্যাক্টিভিটি কোথাও পাবলিকলি দেখানো যাবে না';
comment on column public.profiles.is_verified is 'শুধু অ্যাডমিন ম্যানুয়ালি সেট করবে (SMS/OTP ভেরিফিকেশন নেই) — নিচের ট্রিগার দিয়ে সুরক্ষিত';

-- ---------------------------------------------------------------------------
-- ২. নিরাপত্তা: is_verified ও role — সাধারণ ইউজার নিজে বদলাতে পারবে না
-- ---------------------------------------------------------------------------
-- সমস্যা: profiles_update পলিসি owner-কে নিজের row আপডেট করতে দেয়, কোনো
-- কলাম-লেভেল বিধিনিষেধ ছাড়া — তাই এই ট্রিগার ছাড়া যেকোনো ইউজার নিজেকে
-- নিজেই "যাচাইকৃত সদস্য" বানিয়ে ফেলতে পারতো (`.update({is_verified:true})`)।
create or replace function public.profiles_protect_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.is_verified := old.is_verified;
    new.role        := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_admin_fields on public.profiles;
create trigger trg_profiles_protect_admin_fields
  before update on public.profiles
  for each row
  execute function public.profiles_protect_admin_fields();

-- ---------------------------------------------------------------------------
-- ৩. পাবলিক প্রোফাইল রিড — SECURITY DEFINER ফাংশন (RPC)
-- ---------------------------------------------------------------------------
-- ব্যবহার (ফ্রন্টএন্ড থেকে): client.rpc('get_public_profile', { p_username: 'abir123' })
-- is_public = false হলে কোনো row রিটার্ন করবে না (খালি রেজাল্ট)।
-- phone/village/union_name/thana/district — এই কলামগুলো ফাংশনের রিটার্ন
-- টাইপেই নেই (পুরোপুরি বাদ), শুধু ঠিকানার সারাংশ show_address সত্যি হলে
-- একটা কম্বাইনড টেক্সট হিসেবে দেখানো হচ্ছে — কাঁচা ফোন নম্বর কখনোই এই
-- ফাংশন থেকে বের হবে না, এটা ইচ্ছাকৃত (ফোন নম্বর স্প্যাম/হয়রানির ঝুঁকি বেশি)।
create or replace function public.get_public_profile(p_username text)
returns table (
  id            uuid,
  username      text,
  full_name     text,
  bio           text,
  avatar_url    text,
  cover_url     text,
  is_verified   boolean,
  created_at    timestamptz,
  address_summary text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.full_name,
    p.bio,
    p.avatar_url,
    p.cover_url,
    p.is_verified,
    p.created_at,
    case when p.show_address
      then nullif(concat_ws(', ', p.union_name, p.thana, p.district), '')
      else null
    end as address_summary
  from public.profiles p
  where lower(p.username) = lower(p_username)
    and p.is_public = true;
$$;

grant execute on function public.get_public_profile(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- ৪. ইউজারনেম উপলব্ধতা যাচাই — সাইনআপ/সেটিংস ফর্মের জন্য (পাবলিক, নিরাপদ)
-- ---------------------------------------------------------------------------
create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(p_username)
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;

-- ============================================================================
-- পরবর্তী ধাপে (ধাপ ২) যা লাগবে: পুরনো ইউজারদের জন্য username fallback তৈরি —
-- এই স্ক্রিপ্টে ইচ্ছাকৃতভাবে করা হয়নি, কারণ ভালো fallback ইমেইল/নামের সাথে
-- সংঘর্ষ এড়িয়ে বানাতে হবে, যা আলাদাভাবে পরীক্ষা করে করা দরকার।
-- ============================================================================
