-- lawyer_entries — lawyer.html (আইনজীবী) — রেফারেন্স ডকুমেন্টেশন
-- ✅ এই টেবিলের বেসিক স্ট্রাকচার আপনার Supabase প্রজেক্টে (jexscwcowptcshoalcrw) ইতিমধ্যে লাইভ
--    (migration: lawyer_entries_table_rls_and_demo_purge, ২০২৬-০৯-২০)।
-- matrimony_entries-এর ঠিক একই প্যাটার্নে — পার্থক্য শুধু is_verified ও extra_photos শুরু থেকেই কলামে আছে
-- (matrimony-তে এগুলো পরে আলাদা patch-এ যোগ হয়েছিল)।
-- ছবি: বিদ্যমান `market-media` বাকেটের `lawyer/` ফোল্ডার (পাবলিক read, anon insert, ৫MB, jpeg/png/webp/gif) — নতুন বাকেট নেই।
--
-- type: civil (দেওয়ানী) | criminal (ফৌজদারী) | family (পারিবারিক) | land (ভূমি ও সম্পত্তি)
--       | notary (নোটারি) | deed_writer (দলিল লেখক) | legal_aid (আইনি সহায়তা)
-- upazila: sadar | basail | delduar | dhanbari | ghatail | gopalpur | kalihati | madhupur | mirzapur | nagarpur | sakhipur | bhuapur

create table if not exists public.lawyer_entries (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  user_id      uuid references auth.users(id),
  type         text not null check (type in ('civil','criminal','family','land','notary','deed_writer','legal_aid')),
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  is_demo      boolean not null default false,
  is_verified  boolean not null default false,
  name         text not null,
  office_name  text default '',
  court        text default '',
  experience   integer,
  education    text default '',
  case_types   text default '',
  reg_no       text default '',
  services     text default '',
  org_type     text default '',
  address      text default '',
  upazila      text not null,
  hours        text default '',
  summary      text default '',
  whatsapp     text default '',
  maps_url     text default '',
  phone        text not null,
  phone_public boolean not null default false,
  photo_url    text default '',
  extra_photos text[] not null default '{}'
);

alter table public.lawyer_entries
  add constraint lawyer_entries_len_chk check (
    char_length(name) <= 80 and char_length(coalesce(office_name,'')) <= 100 and char_length(coalesce(court,'')) <= 60
    and char_length(coalesce(education,'')) <= 100 and char_length(coalesce(case_types,'')) <= 300
    and char_length(coalesce(reg_no,'')) <= 50 and char_length(coalesce(services,'')) <= 300
    and char_length(coalesce(org_type,'')) <= 40 and char_length(coalesce(address,'')) <= 200
    and char_length(coalesce(hours,'')) <= 100 and char_length(coalesce(summary,'')) <= 300
    and char_length(coalesce(whatsapp,'')) <= 20 and char_length(coalesce(maps_url,'')) <= 500
    and char_length(phone) <= 20 and char_length(coalesce(photo_url,'')) <= 500
  );

alter table public.lawyer_entries
  add constraint lawyer_entries_experience_chk check (experience is null or (experience >= 0 and experience <= 60));

alter table public.lawyer_entries
  add constraint lawyer_entries_extra_photos_chk check (cardinality(extra_photos) <= 4);

-- ---------- RLS ----------
alter table public.lawyer_entries enable row level security;

create policy "public can read approved lawyer entries"
  on public.lawyer_entries for select to public
  using (status = 'approved');

create policy "public can submit lawyer entry"
  on public.lawyer_entries for insert to public
  with check (status = 'pending' and is_demo = false and is_verified = false);

create policy "admin can manage lawyer entries"
  on public.lawyer_entries for all to public
  using (public.is_admin()) with check (public.is_admin());

grant select, insert on public.lawyer_entries to anon;
grant select, insert, update, delete on public.lawyer_entries to authenticated;

-- ---------- ডেমো auto-purge: কোনো উপজেলা+ধরনে আসল এন্ট্রি approved হলে ওই উপজেলা+ধরনের ডেমো মুছে যায় ----------
create or replace function public.lawyer_purge_demo_on_real()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.status = 'approved' and coalesce(new.is_demo, false) = false then
    delete from public.lawyer_entries
      where is_demo = true and upazila = new.upazila and type = new.type;
  end if;
  return new;
end;
$$;

create trigger lawyer_purge_demo_trg
  after insert or update of status on public.lawyer_entries
  for each row execute function public.lawyer_purge_demo_on_real();
