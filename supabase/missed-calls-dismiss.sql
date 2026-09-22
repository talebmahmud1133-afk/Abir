-- ধাপ ৪ (ক): মিসড কল "মুছুন"/ক্লিয়ার অপশন
-- এখন পর্যন্ত মিসড কল শুধু "seen" (callee_seen_at) মার্ক হতো, তালিকা থেকে সরানোর উপায় ছিল না।
-- সফট-ডিলিট: নতুন callee_dismissed_at কলাম — সেট থাকলে list_missed_calls/count থেকে বাদ যায়,
-- কিন্তু আসল রো (কল হিস্টোরি, call.js যেটা ব্যবহার করে) মোছে না।

alter table public.calls add column if not exists callee_dismissed_at timestamptz;

-- ১) বেলের ব্যাজ ফাংশন — ডিসমিসড বাদ (আগের ফাংশন প্রতিস্থাপন)
create or replace function public.count_unseen_missed_calls()
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select count(*)::int
  from public.calls c
  where c.callee_id = auth.uid()
    and c.answered_at is null
    and c.callee_seen_at is null
    and c.callee_dismissed_at is null
    and c.started_at > now() - interval '7 days'
    and (c.status in ('missed', 'cancelled')
         or (c.status = 'ringing' and c.started_at < now() - interval '60 seconds'))
    and not exists (
      select 1 from public.chat_blocks b
      where (b.blocker_id = c.callee_id and b.blocked_id = c.caller_id)
         or (b.blocker_id = c.caller_id and b.blocked_id = c.callee_id));
$$;

-- ২) তালিকা ফাংশন — ডিসমিসড বাদ (আগের ফাংশন প্রতিস্থাপন)
create or replace function public.list_missed_calls(p_limit integer default 50)
returns table(
  caller_id uuid,
  username text,
  full_name text,
  avatar_url text,
  is_verified boolean,
  missed_count integer,
  new_count integer,
  last_call_type text,
  last_called_at timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with m as (
    select c.caller_id, c.call_type, c.started_at, (c.callee_seen_at is null) as is_new
    from public.calls c
    where c.callee_id = auth.uid()
      and c.answered_at is null
      and c.callee_dismissed_at is null
      and c.started_at > now() - interval '7 days'
      and (c.status in ('missed', 'cancelled')
           or (c.status = 'ringing' and c.started_at < now() - interval '60 seconds'))
      and not exists (
        select 1 from public.chat_blocks b
        where (b.blocker_id = c.callee_id and b.blocked_id = c.caller_id)
           or (b.blocker_id = c.caller_id and b.blocked_id = c.callee_id))
  )
  select m.caller_id,
         p.username,
         p.full_name,
         p.avatar_url,
         p.is_verified,
         count(*)::int as missed_count,
         count(*) filter (where m.is_new)::int as new_count,
         (array_agg(m.call_type order by m.started_at desc))[1] as last_call_type,
         max(m.started_at) as last_called_at
  from m
  join public.profiles p on p.id = m.caller_id
  where p.username is not null
  group by m.caller_id, p.username, p.full_name, p.avatar_url, p.is_verified
  order by max(m.started_at) desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

-- ৩) একজন কলারের সব মিসড কল ক্লিয়ার (নির্দিষ্ট আইটেম "মুছুন" বাটন)
create or replace function public.dismiss_missed_calls_from(p_caller_id uuid)
returns integer
language sql
security definer
set search_path to 'public'
as $$
  with u as (
    update public.calls c
       set callee_dismissed_at = now(),
           callee_seen_at = coalesce(c.callee_seen_at, now())
     where c.callee_id = auth.uid()
       and c.caller_id = p_caller_id
       and c.answered_at is null
       and c.callee_dismissed_at is null
    returning 1)
  select count(*)::int from u;
$$;

-- ৪) সব মিসড কল একসাথে ক্লিয়ার ("সব মুছুন" বাটন)
create or replace function public.dismiss_all_missed_calls()
returns integer
language sql
security definer
set search_path to 'public'
as $$
  with u as (
    update public.calls c
       set callee_dismissed_at = now(),
           callee_seen_at = coalesce(c.callee_seen_at, now())
     where c.callee_id = auth.uid()
       and c.answered_at is null
       and c.callee_dismissed_at is null
    returning 1)
  select count(*)::int from u;
$$;

revoke all on function public.dismiss_missed_calls_from(uuid) from public, anon;
revoke all on function public.dismiss_all_missed_calls() from public, anon;
grant execute on function public.dismiss_missed_calls_from(uuid) to authenticated;
grant execute on function public.dismiss_all_missed_calls() to authenticated;
