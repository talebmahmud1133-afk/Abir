-- public_representatives — public-representative.html (জনপ্রতিনিধি) — লাইভ ডাটাবেসের বর্তমান অবস্থার ডকুমেন্ট (v234)
-- ⚠ টেবিল/পলিসি লাইভ Supabase-এ (jexscwcowptcshoalcrw) আগে থেকেই আছে। এই ফাইল আবার চালালেও সমস্যা নেই (if not exists / drop if exists)।
-- পূর্বশর্ত: public.is_admin() ফাংশন, `market-media` স্টোরেজ বাকেট (ছবি public-rep/ ফোল্ডারে; anon আপলোড পলিসি আছে)।
--
-- type: mp | zp | upzc | mayor | upc | upm | upw   (js/public-rep-data.js PR_TYPES-এর key)
-- ফর্ম ফিল্ড → কলাম: union → union_name, wardGroup → ward_group, map → maps_url

create table if not exists public.public_representatives (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid default auth.uid() references auth.users(id) on delete set null,
  type        text not null check (type in ('mp','zp','upzc','mayor','upc','upm','upw')),
  name        text not null,
  post        text not null default '',
  seat        text not null default '',
  upazila     text not null default '',
  union_name  text not null default '',
  ward        text not null default '',
  ward_group  text not null default '',
  party       text not null default '',
  phone       text not null default '',
  address     text not null default '',
  maps_url    text not null default '',
  photo_url   text not null default '',
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  is_demo     boolean not null default false
);

alter table public.public_representatives drop constraint if exists public_representatives_len_chk;
alter table public.public_representatives add constraint public_representatives_len_chk check (
  char_length(name) between 1 and 120 and char_length(post) <= 40 and char_length(seat) <= 10
  and char_length(upazila) <= 20 and char_length(union_name) <= 80 and char_length(ward) <= 2
  and char_length(ward_group) <= 3 and char_length(party) <= 80 and char_length(phone) <= 20
  and char_length(address) <= 300 and char_length(maps_url) <= 500 and char_length(photo_url) <= 500
);

alter table public.public_representatives enable row level security;

drop policy if exists "public can register representative" on public.public_representatives;
create policy "public can register representative" on public.public_representatives for insert to public
  with check (status = 'pending' and is_demo = false and (user_id is null or user_id = auth.uid()));

drop policy if exists "public can read approved representatives" on public.public_representatives;
create policy "public can read approved representatives" on public.public_representatives for select to public
  using (status = 'approved');

drop policy if exists "user can read own representatives" on public.public_representatives;
create policy "user can read own representatives" on public.public_representatives for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "admin can manage representatives" on public.public_representatives;
create policy "admin can manage representatives" on public.public_representatives for all to public
  using (public.is_admin()) with check (public.is_admin());

-- অধিকার (v234-এ ছাঁটা): TRUNCATE/REFERENCES/TRIGGER কারও নেই; anon শুধু INSERT + নির্দিষ্ট কলামের SELECT (user_id বন্ধ)
revoke all on public.public_representatives from anon;
revoke truncate, references, trigger on public.public_representatives from authenticated;
grant insert on public.public_representatives to anon;
grant select (id, created_at, type, name, post, seat, upazila, union_name, ward, ward_group, party, phone, address, maps_url, photo_url, is_demo, status)
  on public.public_representatives to anon;
grant select, insert, update, delete on public.public_representatives to authenticated;

-- ডেমো auto-purge: কোনো ধরনে আসল এন্ট্রি approved হলে সেই ধরনের ডেমো মুছে যায়
create or replace function public.public_rep_purge_demo_on_real()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.status = 'approved' and coalesce(new.is_demo, false) = false then
    delete from public.public_representatives where is_demo = true and type = new.type;
  end if;
  return new;
end;
$$;

drop trigger if exists public_rep_purge_demo_trg on public.public_representatives;
create trigger public_rep_purge_demo_trg
  after insert or update of status on public.public_representatives
  for each row execute function public.public_rep_purge_demo_on_real();

revoke execute on function public.public_rep_purge_demo_on_real() from public, anon, authenticated;
