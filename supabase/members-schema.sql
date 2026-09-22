-- ============================================================================
-- টাঙ্গাইল জেলা — ইউজার প্রোফাইল সিস্টেম (ধাপ ৯): সদস্য ডিরেক্টরি ফাংশন
-- ============================================================================
-- ✅ লাইভ Supabase-এ প্রয়োগ করা হয়েছে (২০২৬-০৯-২০, migration `members_directory_and_community_feed_functions`, ব্যবহারকারীর অনুমতিতে)।
-- এটা আবার চালানোর দরকার নেই (create or replace — চালালেও নিরাপদ); রেফারেন্স হিসেবে রাখা হলো।
-- শুধু ১টা নতুন ফাংশন; কোনো টেবিল/কলাম/পলিসি বদলায় না, কিছু মোছেও না।
-- get_public_profile / get_public_activity-এর মতোই SECURITY DEFINER (search_path = public)।
-- ফোন/ইমেইল/গ্রাম কখনো রিটার্ন হয় না।
--
-- ✅ আপডেট (২০২৬-০৯-২০, migration `add_presence_last_seen_and_online_status_v2`, লাইভে প্রয়োগ করা হয়েছে):
--    রিটার্ন টাইপে নতুন কলাম `is_online` যোগ হয়েছে (profiles.last_seen শেষ ২ মিনিটের মধ্যে কিনা)।
--    দেখুন supabase/presence-schema.sql — এই কলামটার সোর্স ডেটা (last_seen + touch_last_seen RPC) ওখানে সংজ্ঞায়িত।
--    রিটার্ন টাইপ বদলানোয় Postgres-এ ফাংশনটা drop করে আবার create করতে হয়েছে (create or replace যথেষ্ট ছিল না)।
-- ============================================================================

-- ১. সদস্য ডিরেক্টরি (ধাপ ৯)
-- • শুধু is_public = true এবং ইউজারনেম আছে এমন সদস্য
-- • ঠিকানা-সারাংশ শুধু show_address সত্যি হলে (get_public_profile-এর মতোই)
-- • সার্চ: নাম বা ইউজারনেমে (% _ \ ক্যারেক্টার সাধারণ অক্ষর হিসেবে ধরা হয়)
-- • একবারে সর্বোচ্চ ৫০ জন; যাচাইকৃত আগে, তারপর নতুন সদস্য আগে
-- • execute: শুধু authenticated (লগইন ছাড়া ডিরেক্টরি ব্রাউজ করা যাবে না)
create or replace function public.list_public_members(
  p_search text default null,
  p_limit  integer default 24,
  p_offset integer default 0
)
returns table (
  username        text,
  full_name       text,
  bio             text,
  avatar_url      text,
  is_verified     boolean,
  created_at      timestamptz,
  address_summary text,
  followers       bigint,
  is_online       boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.username,
    p.full_name,
    p.bio,
    p.avatar_url,
    p.is_verified,
    p.created_at,
    case when p.show_address
      then nullif(concat_ws(', ', p.union_name, p.thana, p.district), '')
      else null
    end as address_summary,
    (select count(*) from public.follows f where f.following_id = p.id) as followers,
    (p.last_seen is not null and p.last_seen > now() - interval '2 minutes') as is_online
  from public.profiles p
  where p.is_public = true
    and p.username is not null
    and (
      nullif(btrim(p_search), '') is null
      or p.full_name ilike '%' || replace(replace(replace(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      or p.username  ilike '%' || replace(replace(replace(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
  order by p.is_verified desc, p.created_at desc
  limit  greatest(1, least(coalesce(p_limit, 24), 50))
  offset greatest(0, coalesce(p_offset, 0));
$$;

revoke all on function public.list_public_members(text, integer, integer) from public, anon;
grant execute on function public.list_public_members(text, integer, integer) to authenticated;
