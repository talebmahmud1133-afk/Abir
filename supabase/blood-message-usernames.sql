-- রক্তদাতা/রক্তের দরকার তালিকায় "মেসেজ" বাটন — যে প্রোফাইল থেকে এন্ট্রি বা রিকোয়েস্ট করা হয়েছে
-- তার username বের করার জন্য নিরাপদ ফাংশন (profiles টেবিলে সরাসরি পাবলিক SELECT পলিসি নেই বলে
-- ক্লায়েন্ট থেকে সরাসরি profiles.select() কাজ করবে না — get_public_profile-এর মতো একই প্যাটার্নে
-- শুধু id + username রিটার্ন করে, শুধু is_public=true প্রোফাইলের জন্য, ব্যাচ আকারে (একসাথে অনেক id)।
create or replace function public.get_usernames_by_ids(p_ids uuid[])
returns table (
  id       uuid,
  username text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username
  from public.profiles p
  where p.id = any(p_ids)
    and p.is_public = true
    and p.username is not null;
$$;

grant execute on function public.get_usernames_by_ids(uuid[]) to anon, authenticated;
