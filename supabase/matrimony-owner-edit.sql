-- matrimony_entries — লগইন-বাধ্যতামূলক জমা + মালিকের নিজের প্রোফাইল এডিট (ছবিসহ)
-- ✅ এই মাইগ্রেশন লাইভ ডাটাবেসে ইতিমধ্যে প্রয়োগ করা আছে (রেফারেন্স/পুনরায় তৈরির জন্য; আবার চালালেও সমস্যা নেই)।
--
-- সিদ্ধান্ত:
-- • জমা দিতে লগইন বাধ্যতামূলক (anon আর insert করতে পারে না); এন্ট্রিতে user_id = auth.uid() বসে।
-- • মালিক নিজের এন্ট্রি এডিট করলে status যা ছিল তা-ই থাকে (approved থাকলে approved-ই, আবার অনুমোদন লাগে না)।
-- • এডিটের জায়গা: profile.html "আমার পাত্র-পাত্রী প্রোফাইল" → matrimony.html?edit=<id> (একই ফর্ম, এডিট মোড)।
-- • নিরাপত্তা: UPDATE পলিসি শুধু user_id মিলিয়ে দেয়; status / is_verified / is_demo / user_id / created_at
--   বদলানো আটকায় BEFORE UPDATE trigger (অ্যাডমিন বাদে) — তাই মালিক API দিয়ে নিজেকে approved/verified করতে পারে না।

drop policy if exists "public can submit matrimony entry" on public.matrimony_entries;
drop policy if exists "authenticated user can submit matrimony entry" on public.matrimony_entries;
create policy "authenticated user can submit matrimony entry"
  on public.matrimony_entries for insert to authenticated
  with check (status = 'pending' and is_demo = false and is_verified = false and user_id = auth.uid());

drop policy if exists "user can read own matrimony entries" on public.matrimony_entries;
create policy "user can read own matrimony entries"
  on public.matrimony_entries for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "user can update own matrimony entry" on public.matrimony_entries;
create policy "user can update own matrimony entry"
  on public.matrimony_entries for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.matrimony_protect_owner_update()
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

drop trigger if exists matrimony_protect_owner_update_trg on public.matrimony_entries;
create trigger matrimony_protect_owner_update_trg
  before update on public.matrimony_entries
  for each row execute function public.matrimony_protect_owner_update();
