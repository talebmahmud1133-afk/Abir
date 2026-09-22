-- matrimony_entries — matrimony.html (পাত্র-পাত্রী) — রেফারেন্স ডকুমেন্টেশন
-- ✅ এই টেবিলের বেসিক স্ট্রাকচার আপনার Supabase প্রজেক্টে (jexscwcowptcshoalcrw) ইতিমধ্যে লাইভ
--    (migration: matrimony_entries_table_rls_and_demo_purge, version 20260920010923)।
--    ⚠️ আপডেট (v12): `marital` কলাম বাদ দিয়ে `whatsapp` কলাম আনা হয়েছে — লাইভ ডাটাবেসে এখনো প্রয়োগ হয়নি।
--    প্রয়োগ করতে: alter table public.matrimony_entries rename column marital to whatsapp;
--    ⚠️ আপডেট (আরও ছবি): `extra_photos text[]` কলাম যোগ হয়েছে — আলাদা ফাইল supabase/matrimony-extra-photos.sql (লাইভে প্রয়োগ করা আছে)।
--    ⚠️ আপডেট (ভেরিফাইড): `is_verified boolean` কলাম + জমার পলিসিতে `is_verified = false` শর্ত — supabase/matrimony-verified.sql (লাইভে প্রয়োগ করা আছে)।
--    ⚠️ আপডেট (মালিক-এডিট): জমায় লগইন বাধ্যতামূলক + মালিক নিজের এন্ট্রি এডিট করতে পারে — supabase/matrimony-owner-edit.sql (লাইভে প্রয়োগ করা আছে; নিচের "public can submit" পলিসি এখন সেটি বদলে দিয়েছে)।
--    নিচের SQL লাইভ ডাটাবেস থেকে দেখে লেখা (v11, ধাপ ৪) — ভবিষ্যতে পুনরায় তৈরি/তুলনার জন্য।
-- পুরনো `matrimonial_profiles` টেবিল (matrimonial.html) থেকে আলাদা; সেটি অপরিবর্তিত।
-- ছবি: বিদ্যমান `market-media` বাকেটের `matrimony/` ফোল্ডার (পাবলিক read, anon insert, ৫MB, jpeg/png/webp/gif) — নতুন বাকেট নেই।
--
-- type: groom (পাত্র) | bride (পাত্রী) | ghotok (ঘটক) | guardian (অভিভাবক) | married_m (বিবাহিত) | married_f (বিবাহিতা)
-- upazila: sadar | basail | delduar | dhanbari | ghatail | gopalpur | kalihati | madhupur | mirzapur | nagarpur | sakhipur | bhuapur

create table if not exists public.matrimony_entries (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  user_id      uuid references auth.users(id),
  type         text not null check (type in ('groom','bride','ghotok','guardian','married_m','married_f')),
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  is_demo      boolean not null default false,
  name         text not null,
  upazila      text not null,
  phone        text not null,
  phone_public boolean not null default false,          -- মোবাইল প্রকাশের সম্মতি (ফর্মে বাধ্যতামূলক চেকবক্স)
  photo_url    text default '',
  age          integer,
  experience   integer,                                  -- ঘটকের অভিজ্ঞতা (বছর)
  height       text default '',
  education    text default '',
  occupation   text default '',
  address      text default '',                          -- এলাকা/গ্রাম (সঠিক বাসার ঠিকানা নয়)
  religion     text default '',
  whatsapp     text default '',                          -- পাত্র/পাত্রী: হোয়াটসঅ্যাপ নম্বর (ঐচ্ছিক)
  prev_status  text default '',                          -- বিবাহিত/বিবাহিতা: তালাকপ্রাপ্ত | বিধবা / বিপত্নীক | অন্যান্য
  children     text default '',
  family       text default '',
  expectation  text default '',
  relation     text default '',                          -- অভিভাবকের সম্পর্ক
  for_whom     text default '',                          -- অভিভাবক: পাত্রের/পাত্রীর জন্য
  summary      text default ''                           -- অভিভাবক: পাত্র/পাত্রীর সংক্ষিপ্ত তথ্য
);

alter table public.matrimony_entries
  add constraint matrimony_entries_len_chk check (
    char_length(name) <= 80 and char_length(height) <= 30 and char_length(education) <= 100
    and char_length(occupation) <= 100 and char_length(address) <= 150 and char_length(religion) <= 30
    and char_length(whatsapp) <= 20 and char_length(prev_status) <= 30 and char_length(children) <= 20
    and char_length(coalesce(family,'')) <= 300 and char_length(coalesce(expectation,'')) <= 300
    and char_length(relation) <= 30 and char_length(for_whom) <= 30 and char_length(coalesce(summary,'')) <= 300
    and char_length(phone) <= 20 and char_length(coalesce(photo_url,'')) <= 500
  );

-- ---------- RLS ----------
alter table public.matrimony_entries enable row level security;

-- পাবলিক শুধু approved পড়তে পারে
create policy "public can read approved matrimony entries"
  on public.matrimony_entries for select to public
  using (status = 'approved');

-- পাবলিক শুধু pending (এবং ডেমো নয়) জমা দিতে পারে
create policy "public can submit matrimony entry"
  on public.matrimony_entries for insert to public
  with check (status = 'pending' and is_demo = false);

-- অ্যাডমিন সব পারে (public.is_admin())
create policy "admin can manage matrimony entries"
  on public.matrimony_entries for all to public
  using (public.is_admin()) with check (public.is_admin());

-- base GRANT (এটি ছাড়া RLS পলিসি থাকলেও "permission denied" আসে) — anon: শুধু SELECT/INSERT; UPDATE/DELETE নেই
grant select, insert on public.matrimony_entries to anon;
grant select, insert, update, delete on public.matrimony_entries to authenticated;

-- ---------- ডেমো auto-purge: কোনো উপজেলা+ধরনে আসল এন্ট্রি approved হলে ওই উপজেলা+ধরনের ডেমো মুছে যায় ----------
create or replace function public.matrimony_purge_demo_on_real()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.status = 'approved' and coalesce(new.is_demo, false) = false then
    delete from public.matrimony_entries
      where is_demo = true and upazila = new.upazila and type = new.type;
  end if;
  return new;
end;
$$;

create trigger matrimony_purge_demo_trg
  after insert or update of status on public.matrimony_entries
  for each row execute function public.matrimony_purge_demo_on_real();
