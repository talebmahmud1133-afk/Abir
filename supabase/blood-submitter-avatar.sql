-- রক্তদাতা / রক্তের দরকার ফর্ম যে অ্যাকাউন্ট থেকে পূরণ হয়, তার আইডি ও প্রোফাইল ছবি এন্ট্রির সাথে সংরক্ষণ
-- (Supabase-এ migration "blood_submitter_avatar" নামে প্রয়োগ করা হয়েছে — নতুন প্রজেক্টে সেটআপ করতে আবার চালানো যাবে)
alter table public.blood_requests add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.blood_requests add column if not exists avatar_url text;
alter table public.blood_donors add column if not exists user_id uuid references auth.users(id) on delete set null;

create or replace function public.blood_stamp_submitter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- অ্যাডমিন নিজে যা দেবেন তা-ই থাকবে (যেমন দাতার ছবি হাতে বসানো)
  if public.is_admin() then
    return new;
  end if;
  -- ব্যবহারকারী ব্রাউজার থেকে user_id/avatar_url যা-ই পাঠাক, সার্ভার নিজেই লগইন-করা অ্যাকাউন্ট থেকে বসায়
  new.user_id := auth.uid();
  if auth.uid() is null then
    new.avatar_url := null;
  else
    new.avatar_url := nullif((select p.avatar_url from public.profiles p where p.id = auth.uid()), '');
  end if;
  return new;
end;
$$;

revoke execute on function public.blood_stamp_submitter() from public, anon, authenticated;

drop trigger if exists blood_requests_stamp_submitter on public.blood_requests;
create trigger blood_requests_stamp_submitter before insert on public.blood_requests
  for each row execute function public.blood_stamp_submitter();

drop trigger if exists blood_donors_stamp_submitter on public.blood_donors;
create trigger blood_donors_stamp_submitter before insert on public.blood_donors
  for each row execute function public.blood_stamp_submitter();
