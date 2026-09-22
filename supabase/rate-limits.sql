-- ধাপ ৫: স্প্যাম প্রতিরোধ — বারবার ফ্রেন্ড রিকোয়েস্ট/কলে রেট-লিমিট
--
-- ফ্রেন্ড রিকোয়েস্ট: follows রো রিজেক্ট হলে ডিলিট হয়ে যায় (respond_friend_request), তাই ইতিহাস
-- রাখতে আলাদা লগ টেবিল লাগে (follow_request_log) — শুধু ট্রিগার ফাংশন লেখে/পড়ে, ক্লায়েন্ট থেকে
-- সরাসরি এক্সেস নেই।
-- কল: public.calls-এর রো কখনো মোছা হয় না (call.js-এর হিস্টোরি), তাই সরাসরি সেই টেবিল থেকেই গোনা যায়।

-- ১. ফ্রেন্ড রিকোয়েস্ট লগ (শুধু নতুন pending রিকোয়েস্ট লগ হয়)
create table if not exists public.follow_request_log (
  id          bigint generated always as identity primary key,
  follower_id uuid not null,
  following_id uuid not null,
  created_at  timestamptz not null default now()
);
create index if not exists follow_request_log_follower_idx on public.follow_request_log (follower_id, created_at desc);
alter table public.follow_request_log enable row level security;
-- কোনো পলিসি ইচ্ছাকৃতভাবে তৈরি করা হয়নি — RLS চালু থাকলেও পলিসি না থাকলে authenticated/anon-এর
-- জন্য এই টেবিল সম্পূর্ণ বন্ধ; শুধু নিচের SECURITY DEFINER ট্রিগার ফাংশনগুলো এটা লিখতে/পড়তে পারবে।
revoke all on public.follow_request_log from public, anon, authenticated;

-- ২. ফ্রেন্ড রিকোয়েস্ট রেট-লিমিট + লগিং (একই ফাংশনে দুটোই — BEFORE INSERT)
--    সীমা: একই ব্যক্তিকে ২৪ ঘণ্টায় সর্বোচ্চ ৩ বার রিকোয়েস্ট; নিজে মোট ১ ঘণ্টায় সর্বোচ্চ ২০ জনকে রিকোয়েস্ট
create or replace function public.enforce_follow_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_per_target int;
  v_total int;
begin
  select count(*) into v_per_target
  from public.follow_request_log l
  where l.follower_id = new.follower_id
    and l.following_id = new.following_id
    and l.created_at > now() - interval '24 hours';
  if v_per_target >= 3 then
    raise exception 'rate_limited: এই ইউজারকে আজকে অনেকবার রিকোয়েস্ট পাঠানো হয়েছে, কিছুক্ষণ পর আবার চেষ্টা করুন'
      using errcode = 'P0001';
  end if;

  select count(*) into v_total
  from public.follow_request_log l
  where l.follower_id = new.follower_id
    and l.created_at > now() - interval '1 hour';
  if v_total >= 20 then
    raise exception 'rate_limited: আপনি অনেক বেশি ফ্রেন্ড রিকোয়েস্ট পাঠিয়েছেন, একটু পরে আবার চেষ্টা করুন'
      using errcode = 'P0001';
  end if;

  insert into public.follow_request_log (follower_id, following_id) values (new.follower_id, new.following_id);
  return new;
end;
$$;

drop trigger if exists follow_rate_limit_check on public.follows;
create trigger follow_rate_limit_check
  before insert on public.follows
  for each row execute function public.enforce_follow_rate_limit();

-- ৩. কল রেট-লিমিট (BEFORE INSERT) — একই ব্যক্তিকে ১০ মিনিটে সর্বোচ্চ ৫ কল;
--    নিজে মোট ৫ মিনিটে সর্বোচ্চ ১৫ কল
create or replace function public.enforce_call_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_per_target int;
  v_total int;
begin
  select count(*) into v_per_target
  from public.calls c
  where c.caller_id = new.caller_id
    and c.callee_id = new.callee_id
    and c.started_at > now() - interval '10 minutes';
  if v_per_target >= 5 then
    raise exception 'rate_limited: এই ব্যক্তিকে অনেকবার কল করা হয়েছে, একটু অপেক্ষা করে আবার চেষ্টা করুন'
      using errcode = 'P0001';
  end if;

  select count(*) into v_total
  from public.calls c
  where c.caller_id = new.caller_id
    and c.started_at > now() - interval '5 minutes';
  if v_total >= 15 then
    raise exception 'rate_limited: অনেক বেশি কল করা হয়েছে, একটু অপেক্ষা করে আবার চেষ্টা করুন'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists call_rate_limit_check on public.calls;
create trigger call_rate_limit_check
  before insert on public.calls
  for each row execute function public.enforce_call_rate_limit();

revoke all on function public.enforce_follow_rate_limit() from public, anon, authenticated;
revoke all on function public.enforce_call_rate_limit() from public, anon, authenticated;
