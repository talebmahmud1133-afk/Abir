-- ============================================================================
-- টাঙ্গাইল জেলা — ইউজার প্রোফাইল সিস্টেম (ধাপ ১০): কমিউনিটি ফিড ফাংশন
-- ============================================================================
-- ✅ লাইভ Supabase-এ প্রয়োগ করা হয়েছে (২০২৬-০৯-২০, migration `members_directory_and_community_feed_functions`, ব্যবহারকারীর অনুমতিতে)।
-- এটা আবার চালানোর দরকার নেই (create or replace — চালালেও নিরাপদ); রেফারেন্স হিসেবে রাখা হলো।
-- শুধু ১টা নতুন ফাংশন; কোনো টেবিল/কলাম/পলিসি বদলায় না, কিছু মোছেও না।
-- get_public_activity-এর মতোই SECURITY DEFINER (search_path = public)।
--
-- • get_public_activity-এর মতো একই ৫টা টেবিল, শুধু approved (ডেমো বাদ), সব সদস্যের মিলিয়ে নতুনগুলো আগে
--   (matrimony_entries ইচ্ছাকৃতভাবে নেই — সংবেদনশীল ডেটা)
-- • মালিকের ইউজারনেম/নাম শুধু তার প্রোফাইল is_public হলে; না হলে দুটোই null
--   (আইটেমটা এমনিতেই ক্যাটাগরি পেজে পাবলিক, কিন্তু প্রাইভেট সদস্যের সাথে যুক্ত করে দেখানো হয় না)
-- • একবারে সর্বোচ্চ ৫০টা
-- • execute: anon ও authenticated (আইটেমগুলো এমনিতেই পাবলিক)
-- ============================================================================

create or replace function public.get_community_feed(p_limit integer default 30)
returns table (
  kind           text,
  item_id        uuid,
  title          text,
  subtitle       text,
  image_url      text,
  price          numeric,
  created_at     timestamptz,
  owner_username text,
  owner_name     text
)
language sql
stable
security definer
set search_path = public
as $$
  with items as (
    select 'market'::text as kind, m.id as item_id, m.title as title,
           nullif(concat_ws(' · ', m.category, m.upazila), '') as subtitle,
           m.images[1] as image_url, m.price as price, m.created_at, m.user_id
    from public.marketplace_listings m where m.status = 'approved'
    union all
    select 'shop', s.id, s.name, nullif(concat_ws(' · ', s.category, s.upazila), ''),
           s.logo_url, null::numeric, s.created_at, s.user_id
    from public.shops s where s.status = 'approved'
    union all
    select 'doctor', d.id, d.name, nullif(concat_ws(' · ', d.category, d.upazila), ''),
           d.logo_url, null::numeric, d.created_at, d.user_id
    from public.doctor_listings d where d.status = 'approved' and d.is_demo = false
    union all
    select 'lawyer', l.id, l.name, nullif(concat_ws(' · ', l.office_name, l.upazila), ''),
           l.photo_url, null::numeric, l.created_at, l.user_id
    from public.lawyer_entries l where l.status = 'approved' and l.is_demo = false
    union all
    select 'post', po.id, left(po.content, 140), null,
           case when po.media_type = 'image' then po.media_url else null end,
           null::numeric, po.created_at, po.user_id
    from public.posts po where po.status = 'approved'
  )
  select i.kind, i.item_id, i.title, i.subtitle, i.image_url, i.price, i.created_at,
         case when o.is_public then o.username  else null end as owner_username,
         case when o.is_public then o.full_name else null end as owner_name
  from items i
  left join public.profiles o on o.id = i.user_id
  order by i.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 50));
$$;

revoke all on function public.get_community_feed(integer) from public;
grant execute on function public.get_community_feed(integer) to anon, authenticated;
