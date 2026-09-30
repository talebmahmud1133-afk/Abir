-- viral_entries — viral.html (ভাইরাল প্লেস) — সম্পূর্ণ স্কিমা (একবারেই চূড়ান্ত অবস্থা)
-- technician-schema.sql-এর হুবহু প্যাটার্ন। আবার চালালেও সমস্যা নেই (if not exists / drop if exists)।
-- ⚠ শুধু সাইটের প্রজেক্টে চালান: jexscwcowptcshoalcrw (js/supabase-config.js-এর url)।
-- পূর্বশর্ত (আগে থেকেই আছে): public.is_admin() ফাংশন, `market-media` স্টোরেজ বাকেট (ছবি viral/ ফোল্ডারে)।
--
-- type (js/viral-data.js VR_CHIPS-এর key-এর সাথে মিল):
--   phuchka | sweets | desi_food | food_court | cafe | adda | family | park | lake | picnic | photospot | cinema
-- upazila: sadar | basail | delduar | dhanbari | ghatail | gopalpur | kalihati | madhupur | mirzapur | nagarpur | sakhipur | bhuapur

create table if not exists public.viral_entries (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  user_id      uuid references auth.users(id),
  type         text not null check (type in (
                 'phuchka','sweets','desi_food','food_court','cafe','adda',
                 'family','park','lake','picnic','photospot','cinema')),
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  is_demo      boolean not null default false,
  is_verified  boolean not null default false,
  name         text not null,
  speciality   text default '',   -- বিখ্যাত আইটেম
  price        text default '',   -- আনুমানিক দাম / টিকিট
  hours        text default '',   -- খোলার সময়
  best_time    text default '',   -- ঘোরার সেরা সময়
  entry_fee    text default '',   -- প্রবেশ ফি / খরচ
  facilities   text default '',   -- সুবিধা
  upazila      text not null,
  address      text not null,     -- ঠিকানা / কীভাবে যাবেন
  about        text default '',   -- বিবরণ
  phone        text default '',   -- ঐচ্ছিক
  phone_public boolean not null default false,
  photo_url    text default '',
  extra_photos text[] not null default '{}'
);

alter table public.viral_entries drop constraint if exists viral_entries_len_chk;
alter table public.viral_entries
  add constraint viral_entries_len_chk check (
    char_length(name) <= 80
    and char_length(coalesce(speciality,'')) <= 100
    and char_length(coalesce(price,'')) <= 60
    and char_length(coalesce(hours,'')) <= 60
    and char_length(coalesce(best_time,'')) <= 20
    and char_length(coalesce(entry_fee,'')) <= 60
    and char_length(coalesce(facilities,'')) <= 150
    and char_length(address) <= 150
    and char_length(coalesce(about,'')) <= 300
    and char_length(coalesce(phone,'')) <= 20
    and char_length(coalesce(photo_url,'')) <= 500
  );

alter table public.viral_entries drop constraint if exists viral_entries_extra_photos_chk;
alter table public.viral_entries
  add constraint viral_entries_extra_photos_chk check (cardinality(extra_photos) <= 4);

-- ---------- RLS ----------
alter table public.viral_entries enable row level security;

drop policy if exists "authenticated user can submit viral entry" on public.viral_entries;
create policy "authenticated user can submit viral entry"
  on public.viral_entries for insert to authenticated
  with check (status = 'pending' and is_demo = false and is_verified = false and user_id = auth.uid());

drop policy if exists "user can read own viral entries" on public.viral_entries;
create policy "user can read own viral entries"
  on public.viral_entries for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "user can update own viral entry" on public.viral_entries;
create policy "user can update own viral entry"
  on public.viral_entries for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "admin can manage viral entries" on public.viral_entries;
create policy "admin can manage viral entries"
  on public.viral_entries for all to public
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.viral_entries from anon;
grant select, insert, update, delete on public.viral_entries to authenticated;
revoke truncate, references, trigger on public.viral_entries from anon, authenticated;

-- মালিক এডিট করলে status / is_verified / is_demo / user_id / created_at বদলাতে পারবে না (অ্যাডমিন বাদে)
create or replace function public.viral_protect_owner_update()
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

drop trigger if exists viral_protect_owner_update_trg on public.viral_entries;
create trigger viral_protect_owner_update_trg
  before update on public.viral_entries
  for each row execute function public.viral_protect_owner_update();

-- ---------- পাবলিক ভিউ: শুধু approved; phone শুধু phone_public=true হলে ----------
create or replace view public.viral_public
with (security_barrier = true) as
select
  id, created_at, type, name, speciality, price, hours, best_time, entry_fee, facilities,
  upazila, address, about,
  case when phone_public is true then phone else null end as phone,
  phone_public, photo_url, is_demo, extra_photos, is_verified
from public.viral_entries
where status = 'approved';

revoke all on public.viral_public from anon, authenticated;
grant select on public.viral_public to anon, authenticated;

-- ---------- ডেমো auto-purge: উপজেলা+ধরনে আসল এন্ট্রি approved হলে ওই ডেমো মুছে যায় ----------
create or replace function public.viral_purge_demo_on_real()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.status = 'approved' and coalesce(new.is_demo, false) = false then
    delete from public.viral_entries
      where is_demo = true and upazila = new.upazila and type = new.type;
  end if;
  return new;
end;
$$;

drop trigger if exists viral_purge_demo_trg on public.viral_entries;
create trigger viral_purge_demo_trg
  after insert or update of status on public.viral_entries
  for each row execute function public.viral_purge_demo_on_real();

revoke execute on function public.viral_protect_owner_update() from public, anon, authenticated;
revoke execute on function public.viral_purge_demo_on_real() from public, anon, authenticated;
