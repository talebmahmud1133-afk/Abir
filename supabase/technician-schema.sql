-- technician_entries — technician.html (টেকনিশিয়ান) — সম্পূর্ণ স্কিমা (একবারেই চূড়ান্ত অবস্থা)
-- ✅ লাইভ Supabase-এ প্রয়োগ করা আছে (২০২৬-০৯-২৯, প্রজেক্ট jexscwcowptcshoalcrw; মাইগ্রেশন technician_entries_schema + technician_trigger_fn_revoke_execute) — রোলব্যাক-টেস্টে insert/RLS/ফোন-প্রাইভেসি/ডেমো-purge যাচাই করা।
-- matrimony_entries-এর চূড়ান্ত অবস্থার (schema + extra_photos + is_verified + owner-edit + phone-privacy view + lock) সব একসাথে।
-- আবার চালালেও সমস্যা নেই (create if not exists / drop if exists ব্যবহার করা)।
-- ছবি: বিদ্যমান `market-media` বাকেটের `technician/` ফোল্ডার (পাবলিক read, ৫MB, jpeg/png/webp/gif) — নতুন বাকেট নেই।
-- পুরনো `mechanic.html` (মিস্ত্রি) শুধু উপজেলা-গ্রিড ছিল (listing.html?cat=mechanic-*); সেই লিংকগুলো এখন technician.html-এ রিডাইরেক্ট হয়।
--
-- type (চিপ — js/technician-data.js TC_TYPES-এর key-এর সাথে মিলিয়ে):
--   বিদ্যুৎ: electrician | solar_ips | cctv
--   পানি ও স্যানিটারি: plumber | tubewell_pump | tank_clean
--   যন্ত্র মেরামত: ac_fridge | washing_machine | tv_electronics | mobile_repair | computer_printer
--   নির্মাণ: mason | painter | tiles | carpenter | welding_grill | roof_casting
--   বাসা: pest_control | house_cleaning | dish_internet | gas_stove
--   যানবাহন: bike_mechanic | car_mechanic
--   অন্যান্য: other
-- upazila: sadar | basail | delduar | dhanbari | ghatail | gopalpur | kalihati | madhupur | mirzapur | nagarpur | sakhipur | bhuapur
-- availability: সকাল থেকে সন্ধ্যা | ২৪ ঘণ্টা (জরুরি সেবা) | শুধু ছুটির দিন | ফোনে জেনে নিন

create table if not exists public.technician_entries (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  user_id      uuid references auth.users(id),
  type         text not null check (type in (
                 'electrician','solar_ips','cctv',
                 'plumber','tubewell_pump','tank_clean',
                 'ac_fridge','washing_machine','tv_electronics','mobile_repair','computer_printer',
                 'mason','painter','tiles','carpenter','welding_grill','roof_casting',
                 'pest_control','house_cleaning','dish_internet','gas_stove',
                 'bike_mechanic','car_mechanic','other')),
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  is_demo      boolean not null default false,
  is_verified  boolean not null default false,
  name         text not null,
  upazila      text not null,
  phone        text not null,
  phone_public boolean not null default false,          -- মোবাইল প্রকাশের সম্মতি (ফর্মে বাধ্যতামূলক চেকবক্স)
  photo_url    text default '',
  extra_photos text[] not null default '{}',            -- কাজের নমুনা ছবি (সর্বোচ্চ ৪)
  experience   integer,                                  -- অভিজ্ঞতা (বছর)
  rate         text default '',                          -- মজুরি / ভিজিট (যেমন: ভিজিট ২০০ টাকা)
  availability text default '',
  address      text default '',                          -- কাজের এলাকা / বাজার (সঠিক বাসার ঠিকানা নয়)
  about        text default ''                           -- কাজের বিবরণ (আরও যেসব কাজ পারেন)
);

alter table public.technician_entries drop constraint if exists technician_entries_len_chk;
alter table public.technician_entries
  add constraint technician_entries_len_chk check (
    char_length(name) <= 80 and char_length(coalesce(rate,'')) <= 60 and char_length(coalesce(availability,'')) <= 40
    and char_length(coalesce(address,'')) <= 150 and char_length(coalesce(about,'')) <= 300
    and char_length(phone) <= 20 and char_length(coalesce(photo_url,'')) <= 500
  );

alter table public.technician_entries drop constraint if exists technician_entries_experience_chk;
alter table public.technician_entries
  add constraint technician_entries_experience_chk check (experience is null or (experience >= 0 and experience <= 60));

alter table public.technician_entries drop constraint if exists technician_entries_extra_photos_chk;
alter table public.technician_entries
  add constraint technician_entries_extra_photos_chk check (cardinality(extra_photos) <= 4);

-- ---------- RLS ----------
alter table public.technician_entries enable row level security;

-- পাবলিক সরাসরি টেবিল পড়তে পারে না (phone গোপন রাখতে) — পাবলিক তালিকা technician_public ভিউ থেকে।
-- জমা দিতে লগইন বাধ্যতামূলক; এন্ট্রিতে user_id = auth.uid()
drop policy if exists "authenticated user can submit technician entry" on public.technician_entries;
create policy "authenticated user can submit technician entry"
  on public.technician_entries for insert to authenticated
  with check (status = 'pending' and is_demo = false and is_verified = false and user_id = auth.uid());

drop policy if exists "user can read own technician entries" on public.technician_entries;
create policy "user can read own technician entries"
  on public.technician_entries for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "user can update own technician entry" on public.technician_entries;
create policy "user can update own technician entry"
  on public.technician_entries for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "admin can manage technician entries" on public.technician_entries;
create policy "admin can manage technician entries"
  on public.technician_entries for all to public
  using (public.is_admin()) with check (public.is_admin());

-- base GRANT: anon-এর কোনো অনুমতি নেই; authenticated: select/insert/update/delete (RLS দিয়ে সীমিত)
revoke all on public.technician_entries from anon;
grant select, insert, update, delete on public.technician_entries to authenticated;
revoke truncate, references, trigger on public.technician_entries from anon, authenticated;

-- মালিক নিজের এন্ট্রি এডিট করলে status / is_verified / is_demo / user_id / created_at বদলাতে পারবে না (অ্যাডমিন বাদে)
create or replace function public.technician_protect_owner_update()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then
    new.status := old.status;
    new.is_demo := old.is_demo;
    new.is_verified := old.is_verified;
    new.user_id := old.user_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists technician_protect_owner_update_trg on public.technician_entries;
create trigger technician_protect_owner_update_trg
  before update on public.technician_entries
  for each row execute function public.technician_protect_owner_update();

-- ---------- পাবলিক ভিউ: শুধু approved; phone শুধু phone_public=true হলে, নইলে null; user_id/status নেই ----------
create or replace view public.technician_public
with (security_barrier = true) as
select
  id, created_at, type, name, experience, rate, availability, upazila, address, about,
  case when phone_public is true then phone else null end as phone,
  phone_public, photo_url, is_demo, extra_photos, is_verified
from public.technician_entries
where status = 'approved';

revoke all on public.technician_public from anon, authenticated;
grant select on public.technician_public to anon, authenticated;

-- ---------- ডেমো auto-purge: কোনো উপজেলা+ধরনে আসল এন্ট্রি approved হলে ওই উপজেলা+ধরনের ডেমো মুছে যায় ----------
create or replace function public.technician_purge_demo_on_real()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.status = 'approved' and coalesce(new.is_demo, false) = false then
    delete from public.technician_entries
      where is_demo = true and upazila = new.upazila and type = new.type;
  end if;
  return new;
end;
$$;

drop trigger if exists technician_purge_demo_trg on public.technician_entries;
create trigger technician_purge_demo_trg
  after insert or update of status on public.technician_entries
  for each row execute function public.technician_purge_demo_on_real();

-- ট্রিগার ফাংশন RPC দিয়ে কল করার দরকার নেই — EXECUTE তুলে নেওয়া (ট্রিগার আগের মতোই চলে)
revoke execute on function public.technician_protect_owner_update() from public, anon, authenticated;
revoke execute on function public.technician_purge_demo_on_real() from public, anon, authenticated;
