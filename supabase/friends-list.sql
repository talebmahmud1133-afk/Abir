-- ============================================================================
-- টাঙ্গাইল জেলা — প্রোফাইলের "ফ্রেন্ডস" তালিকা (তথ্য ট্যাবের নিচে)
-- ============================================================================
-- ✅ লাইভ Supabase-এ প্রয়োগ করা হয়েছে (২০২৬-০৯-২১, migration `add_list_my_friends_function`, ব্যবহারকারীর অনুমতিতে, MCP দিয়ে সরাসরি)।
--    যাচাই: anon-এর execute নেই (কল করলে 42501 permission denied); authenticated-এর আছে; SECURITY DEFINER;
--    আসল অ্যাকাউন্টের ভূমিকায় কল করে ফ্রেন্ড ফেরত এসেছে (rolled-back transaction); security advisor-এ শুধু
--    "authenticated can execute SECURITY DEFINER" WARN যোগ হয়েছে — list_public_members-এর মতোই সাইটের প্রতিষ্ঠিত প্যাটার্ন।
-- শুধু ১টা নতুন ফাংশন; কোনো টেবিল/কলাম/পলিসি বদলায় না, কিছু মোছেও না। create or replace — আবার চালালেও নিরাপদ।
--
-- "ফ্রেন্ড" = Add Friend ট্যাবে যাকে Add করা হয়েছে (বিদ্যমান follows টেবিল: follower_id = আমি, following_id = ফ্রেন্ড)।
-- কেন RPC লাগল: follows থেকে শুধু ফ্রেন্ডের id পাওয়া যায়; অন্যের profiles সারি সরাসরি পড়ার অনুমতি নেই
--   (get_public_profile / list_public_members-এর মতোই SECURITY DEFINER ফাংশন দিয়ে শুধু পাবলিক তথ্য দেওয়া হয়)।
--
-- গোপনীয়তা:
--  • শুধু is_public = true এবং ইউজারনেম আছে এমন ফ্রেন্ড ফেরত আসে (পরে প্রোফাইল প্রাইভেট করলে তালিকা থেকে সরে যায়)
--  • ফোন/ইমেইল/গ্রাম/ঠিকানা কখনোই ফেরত আসে না — শুধু ইউজারনেম, নাম, ছবি, ভেরিফাইড ও অনলাইন অবস্থা
--  • শুধু নিজের তালিকা (auth.uid()) — অন্যের ফ্রেন্ড-তালিকা দেখার কোনো উপায় নেই
--  • execute: শুধু authenticated (গেস্ট/anon পারবে না)
-- ============================================================================

create or replace function public.list_my_friends(p_limit integer default 100)
returns table (
  username    text,
  full_name   text,
  avatar_url  text,
  is_verified boolean,
  is_online   boolean,
  added_at    timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.username,
    p.full_name,
    p.avatar_url,
    p.is_verified,
    (p.last_seen is not null and p.last_seen > now() - interval '2 minutes') as is_online,
    f.created_at as added_at
  from public.follows f
  join public.profiles p on p.id = f.following_id
  where f.follower_id = auth.uid()
    and p.is_public = true
    and p.username is not null
  order by f.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 200));
$$;

revoke all on function public.list_my_friends(integer) from public, anon;
grant execute on function public.list_my_friends(integer) to authenticated;
