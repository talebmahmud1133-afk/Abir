-- ============================================================================
-- doctor_listings — doctors.html (ডাক্তার) — টেবিল + GRANT + RLS + ডেমো সারি + অটো-পার্জ ট্রিগার
-- ============================================================================
-- ✅ এই স্কিমা আপনার Supabase প্রজেক্টে (jexscwcowptcshoalcrw) লাইভ প্রয়োগ করা আছে —
--    migration: doctor_listings_module + doctor_purge_fn_revoke_execute (২০২৬-০৯-১৯)।
--    আবার চালানোর দরকার নেই; নতুন প্রজেক্টে সাইট বসালে রেফারেন্স হিসেবে কাজে লাগবে (idempotent)।
--    ⚠️ ৫ নম্বর ডেমো অংশ চালালে আগের সব ডেমো সারি মুছে নতুন করে ঢোকে — আসল সারি অক্ষত থাকে।
-- ⚠️ সাইটের বিদ্যমান `public.doctors` টেবিল (এখন ০ সারি) এই স্ক্রিপ্ট ছোঁয় না, ড্রপও করে না।
--    নতুন টেবিলের নাম তাই আলাদা: `doctor_listings`।
--
-- কুরিয়ারের (courier_offices) নিরাপত্তা মডেল হুবহু:
--   • পাবলিক শুধু status='approved' সারি পড়তে পারে
--   • পাবলিক শুধু status='pending' AND is_demo=false ইনসার্ট করতে পারে
--   • অ্যাডমিন (public.is_admin()) সব পারে
--   • ছবি "market-media" বাকেটের `doctors/` ফোল্ডারে (নতুন বাকেট লাগবে না)
--
-- কলাম: id, created_at, user_id, name, upazila, address, phone, logo_url, maps_url, is_open,
--        status (pending|approved|rejected, ডিফল্ট pending), is_demo,
--        category (js/doctors-data.js-এর ৪০টি কী: psych, cardio, piles, dental, skin, hormone, ent, eye, liver, urology, surgery,
--        gynae, blood, homeo, laser, medicine, kidney, neurosurgery, neuromedicine, nutrition, cancer, ortho, pain, child,
--        physical, physio, plastic, chest, cardiac, pedsurgery, arthritis, gastro, anesthesia, vascular, burn,
--        infertility, childneuro, radiotherapy, palliative, vet — বা '' = অন্যান্য)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ১. টেবিল
-- ---------------------------------------------------------------------------
create table if not exists public.doctor_listings (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid references auth.users(id) default auth.uid(),

  name        text not null,
  upazila     text not null,
  address     text not null,
  phone       text not null,
  category    text not null default '',
  maps_url    text default '',
  logo_url    text default '',
  is_open     boolean not null default true,

  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  is_demo     boolean not null default false,

  constraint doctor_listings_len_chk check (
    char_length(name) <= 120 and char_length(address) <= 300 and char_length(phone) <= 20
    and char_length(coalesce(maps_url, '')) <= 500 and char_length(coalesce(logo_url, '')) <= 500
    and char_length(category) <= 40
  )
);

create index if not exists doctor_listings_status_upazila_idx on public.doctor_listings (status, upazila);

comment on table public.doctor_listings is 'ডাক্তার পেজ (doctors.html) — "+" ফর্ম থেকে জমা হয় (status=pending), admin.html-এর "ডাক্তার" ট্যাব থেকে অনুমোদিত হলে প্রকাশ পায়। is_demo=true সারি ডেমো; কোনো উপজেলায় আসল সারি approved হলে ওই উপজেলার ডেমো অটো মুছে যায়।';

-- ---------------------------------------------------------------------------
-- ২. টেবিল-লেভেল GRANT (RLS-এর আগে দরকার; raw SQL-এ ম্যানুয়ালি দিতে হয়)
-- ---------------------------------------------------------------------------
grant select, insert on public.doctor_listings to anon;
grant select, insert, update, delete on public.doctor_listings to authenticated;

-- ---------------------------------------------------------------------------
-- ৩. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.doctor_listings enable row level security;

drop policy if exists "public can read approved doctor listings" on public.doctor_listings;
drop policy if exists "public can register doctor listing" on public.doctor_listings;
drop policy if exists "admin can manage doctor listings" on public.doctor_listings;

-- সবাই (লগইন ছাড়াই) শুধু approved সারি দেখতে পারবে (ডেমোও approved হিসেবে থাকে)
create policy "public can read approved doctor listings"
  on public.doctor_listings for select to public
  using (status = 'approved');

-- পাবলিক শুধু pending জমা দিতে পারবে; কখনো ডেমো/approved নয়
create policy "public can register doctor listing"
  on public.doctor_listings for insert to public
  with check (status = 'pending' and is_demo = false);

-- অ্যাডমিন (profiles.role = 'admin') সব দেখা/অনুমোদন/বাতিল/মোছা করতে পারবে
create policy "admin can manage doctor listings"
  on public.doctor_listings for all to public
  using (is_admin())
  with check (is_admin());

-- ---------------------------------------------------------------------------
-- ৪. ডেমো সারি অটো-পার্জ: আসল সারি approved হলে ওই উপজেলার ডেমো মুছে যায়
-- ---------------------------------------------------------------------------
create or replace function public.doctor_purge_demo_on_real()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.status = 'approved' and coalesce(new.is_demo, false) = false then
    delete from public.doctor_listings where is_demo = true and upazila = new.upazila;
  end if;
  return new;
end;
$fn$;

drop trigger if exists doctor_purge_demo_trg on public.doctor_listings;
create trigger doctor_purge_demo_trg
  after insert or update of status on public.doctor_listings
  for each row execute function public.doctor_purge_demo_on_real();

-- ট্রিগার ফাংশন RPC হিসেবে কেউ ডাকতে পারবে না (ট্রিগার নিজে ঠিকই চলে)
revoke execute on function public.doctor_purge_demo_on_real() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- ৫. ডেমো সারি (is_demo=true) — প্রতি উপজেলায় ১টি, যাতে খালি পেজ না দেখায়
--    ⚠️ নামগুলো কাল্পনিক নমুনা এবং ফোন নম্বর ভুয়া (017000000xx) — কোনো আসল মানুষের নয়।
--    আসল তথ্য অনুমোদিত হলে ওই উপজেলার নমুনা নিজে থেকেই মুছে যায়; অ্যাডমিন ট্যাব থেকেও মোছা যায়।
--    আবার চালালে ডুপ্লিকেট এড়াতে আগে সব ডেমো সারি মুছে নতুন করে ঢোকানো হয়।
-- ---------------------------------------------------------------------------
delete from public.doctor_listings where is_demo = true;

insert into public.doctor_listings (name, upazila, address, phone, category, is_open, status, is_demo) values
  ('ডা. নমুনা — মেডিসিন বিশেষজ্ঞ',        'sadar',    'হাসপাতাল রোড, টাঙ্গাইল সদর',   '01700000001', 'medicine', true, 'approved', true),
  ('ডা. নমুনা — শিশু বিশেষজ্ঞ',            'basail',   'বাসাইল বাজার, বাসাইল',          '01700000002', 'child',    true, 'approved', true),
  ('ডা. নমুনা — গাইনি বিশেষজ্ঞ', 'delduar',  'দেলদুয়ার বাজার, দেলদুয়ার',     '01700000003', 'gynae',    true, 'approved', true),
  ('ডা. নমুনা — মেডিসিন বিশেষজ্ঞ',        'dhanbari', 'ধনবাড়ী বাজার, ধনবাড়ী',         '01700000004', 'medicine', true, 'approved', true),
  ('ডা. নমুনা — হৃদরোগ বিশেষজ্ঞ',          'ghatail',  'ঘাটাইল বাজার, ঘাটাইল',           '01700000005', 'cardio',   true, 'approved', true),
  ('ডা. নমুনা — চক্ষু বিশেষজ্ঞ',            'gopalpur', 'গোপালপুর বাজার, গোপালপুর',      '01700000006', 'eye',      true, 'approved', true),
  ('ডা. নমুনা — ডেন্টাল চিকিৎসক',            'kalihati', 'কালিহাতী বাজার, কালিহাতী',       '01700000007', 'dental',   true, 'approved', true),
  ('ডা. নমুনা — অর্থোপেডিক বিশেষজ্ঞ',       'madhupur', 'মধুপুর বাজার, মধুপুর',           '01700000008', 'ortho',    true, 'approved', true),
  ('ডা. নমুনা — ইএনটি বিশেষজ্ঞ',      'mirzapur', 'মির্জাপুর বাজার, মির্জাপুর',      '01700000009', 'ent',      true, 'approved', true),
  ('ডা. নমুনা — চর্ম-যৌন বিশেষজ্ঞ',    'nagarpur', 'নাগরপুর বাজার, নাগরপুর',         '01700000010', 'skin',     true, 'approved', true),
  ('ডা. নমুনা — মনোরোগ বিশেষজ্ঞ',           'sakhipur', 'সখীপুর বাজার, সখীপুর',           '01700000011', 'psych',    true, 'approved', true),
  ('ডা. নমুনা — মেডিসিন বিশেষজ্ঞ',        'bhuapur',  'ভূঞাপুর বাজার, ভূঞাপুর',         '01700000012', 'medicine', true, 'approved', true);

-- ============================================================================
-- (৬) পুরনো `public.doctors` টেবিল: লাইভ ডাটাবেসে যাচাই করা হয়েছে — সারি সংখ্যা ০, তাই কপি করার মতো
-- আসল ডেটা নেই। টেবিলটি অক্ষত আছে (ড্রপ/পরিবর্তন করা হয়নি)।
-- ============================================================================
