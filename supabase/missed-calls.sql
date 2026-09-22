-- মিসড কল বিজ্ঞপ্তি (বেল আইকন + বিজ্ঞপ্তি পেজ)
-- ✅ লাইভ Supabase-এ প্রয়োগ হয়েছে (২০২৬-০৯-২২, ইউজারের সম্মতিতে) — migration `missed_calls_notifications`।
--
-- "মিসড কল" বলতে: আমি (callee) যে কলের উত্তর দিইনি —
--   status = 'missed' বা 'cancelled' (কলার রিং চলাকালীন কেটে দিয়েছে), অথবা 'ringing' অবস্থায় ৬০ সেকেন্ডের বেশি পুরনো
--   (আমি ব্যস্ত ছিলাম / কলার ট্যাব বন্ধ করেছে), এবং answered_at খালি; 'rejected' (আমি নিজে কেটেছি) মিসড নয়।
-- সময়সীমা: শেষ ৭ দিন। ব্লক থাকলে (যেকোনো দিকে) গণনায় আসে না।
-- "নতুন/না-দেখা" = callee_seen_at খালি; বিজ্ঞপ্তি পেজ খুললে mark_missed_calls_seen() ডাকা হয় → বেলের সংখ্যা কমে যায়।
-- কলারের নাম/ছবি profiles থেকে পড়তে হয়, যা RLS-এ অন্যের জন্য বন্ধ — তাই SECURITY DEFINER ফাংশন
-- (list_incoming_friend_requests-এর মতো; শুধু auth.uid()-এর নিজের মিসড কল ফেরত দেয়)।

alter table public.calls add column if not exists callee_seen_at timestamptz;

create index if not exists calls_callee_started_idx on public.calls (callee_id, started_at desc);

-- ১) বেলের ব্যাজ: না-দেখা মিসড কলের মোট সংখ্যা
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
    and c.started_at > now() - interval '7 days'
    and (c.status in ('missed', 'cancelled')
         or (c.status = 'ringing' and c.started_at < now() - interval '60 seconds'))
    and not exists (
      select 1 from public.chat_blocks b
      where (b.blocker_id = c.callee_id and b.blocked_id = c.caller_id)
         or (b.blocker_id = c.caller_id and b.blocked_id = c.callee_id));
$$;

-- ২) বিজ্ঞপ্তি পেজের তালিকা: কলার অনুযায়ী গ্রুপ (কতগুলা কল, কোন প্রোফাইল থেকে, শেষ কখন)
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

-- ৩) পেজ দেখা হলে সব না-দেখা মিসড কল "দেখা" চিহ্নিত (তালিকা থেকে মোছে না, শুধু ব্যাজ কমায়)
create or replace function public.mark_missed_calls_seen()
returns integer
language sql
security definer
set search_path to 'public'
as $$
  with u as (
    update public.calls c
       set callee_seen_at = now()
     where c.callee_id = auth.uid()
       and c.answered_at is null
       and c.callee_seen_at is null
       and (c.status in ('missed', 'cancelled')
            or (c.status = 'ringing' and c.started_at < now() - interval '60 seconds'))
    returning 1)
  select count(*)::int from u;
$$;

revoke all on function public.count_unseen_missed_calls() from public, anon;
revoke all on function public.list_missed_calls(integer) from public, anon;
revoke all on function public.mark_missed_calls_seen() from public, anon;
grant execute on function public.count_unseen_missed_calls() to authenticated;
grant execute on function public.list_missed_calls(integer) to authenticated;
grant execute on function public.mark_missed_calls_seen() to authenticated;
