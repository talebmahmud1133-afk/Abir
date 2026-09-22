-- ব্রাউজার পুশ নোটিফিকেশন (ধাপ ২) — push_subscriptions টেবিল + RLS + DB ট্রিগার
-- অ্যাপ বন্ধ থাকলেও মিসড কল/ফ্রেন্ড রিকোয়েস্ট এলে ব্রাউজার/ডিভাইস নোটিফিকেশন পাঠানো হয়।
--
-- আর্কিটেকচার:
--   ব্রাউজার (Service Worker) → subscribe → push_subscriptions টেবিলে সেভ
--   calls/follows টেবিলে নতুন রো → DB ট্রিগার → net.http_post দিয়ে Edge Function 'send-push' কল
--   → Edge Function সেই ইউজারের push_subscriptions পড়ে VAPID দিয়ে আসল পুশ পাঠায়
--
-- নিরাপত্তা: ট্রিগার ফাংশন থেকে Edge Function-কে service role key না দিয়ে একটা আলাদা শেয়ার্ড
-- সিক্রেট হেডার (x-webhook-secret) পাঠানো হয় — Edge Function ভেতরে সেটা যাচাই করে।
-- এই সিক্রেট শুধু postgres রোলের নিজের ফাংশন সংজ্ঞার ভেতরে থাকে, কোনো PostgREST API দিয়ে বাইরে
-- এক্সপোজ হয় না (RLS-এর মতোই এই ফাংশনগুলো SECURITY DEFINER, কিন্তু কোনো ইউজার-ফেসিং গ্রান্ট নেই)।

-- ১. টেবিল
create table if not exists public.push_subscriptions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: read own" on public.push_subscriptions
  for select to authenticated
  using (user_id = auth.uid());
create policy "push_subscriptions: insert own" on public.push_subscriptions
  for insert to authenticated
  with check (user_id = auth.uid());
create policy "push_subscriptions: delete own" on public.push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid());
-- আপডেট লাগে না — endpoint বদলালে পুরনো রো ডিলিট করে নতুন insert (upsert on endpoint) করা হয়।

grant select, insert, delete on public.push_subscriptions to authenticated;
do $$
declare seq_name text;
begin
  seq_name := pg_get_serial_sequence('public.push_subscriptions', 'id');
  if seq_name is not null then
    execute format('grant usage, select on sequence %s to authenticated', seq_name);
  end if;
end $$;

-- ২. কনফিগ — Edge Function URL ও শেয়ার্ড সিক্রেট (শুধু নিচের ফাংশনগুলোর ভেতরে ব্যবহৃত, কোনো টেবিল
--    থেকে পড়া হয় না যাতে RLS/গ্রান্ট ভুলে এক্সপোজ না হয়ে যায়)
-- এই মান দুটো ডিপ্লয়ের আগে আপনার আসল প্রজেক্ট রেফ দিয়ে বসাতে হবে (নিচে REPLACE_ME চিহ্নিত)।

-- ৩. ট্রিগার ফাংশন — নতুন মিসড-কল-উপযোগী কল রো এলে পুশ পাঠানোর অনুরোধ
create or replace function public.trigger_push_on_call()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- শুধু callee-র জন্য প্রাসঙ্গিক অবস্থায় (নতুন রিং শুরু হলে) পাঠানো হয়; আসলেই মিস হলো কিনা তা
  -- Edge Function/ক্লায়েন্ট সাইডে সিদ্ধান্ত নেওয়ার দরকার নেই — শুধু "কল আসছে" পুশ যথেষ্ট, কারণ অ্যাপ
  -- বন্ধ থাকলে রিয়েল-টাইম বেল কাজ করে না, তাই ringing অবস্থাতেই একবার পুশ পাঠাই।
  if (tg_op = 'INSERT' and new.status = 'ringing') then
    perform net.http_post(
      url := 'https://jexscwcowptcshoalcrw.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', 'be2214d02b3baaae90dbeee0c0b3fb30b445bf0e7482daf6'),
      body := jsonb_build_object(
        'user_id', new.callee_id,
        'type', 'call',
        'title', 'ইনকামিং কল',
        'body', case when new.call_type = 'video' then 'ভিডিও কল আসছে' else 'অডিও কল আসছে' end,
        'url', '/notifications.html'
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists push_on_call_insert on public.calls;
create trigger push_on_call_insert
  after insert on public.calls
  for each row execute function public.trigger_push_on_call();

-- ৪. ট্রিগার ফাংশন — নতুন ফলো (ফ্রেন্ড রিকোয়েস্ট-সদৃশ) এলে পুশ
create or replace function public.trigger_push_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select coalesce(full_name, username) into v_name from public.profiles where id = new.follower_id;
  perform net.http_post(
    url := 'https://jexscwcowptcshoalcrw.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', 'be2214d02b3baaae90dbeee0c0b3fb30b445bf0e7482daf6'),
    body := jsonb_build_object(
      'user_id', new.following_id,
      'type', 'follow',
      'title', 'নতুন ফলোয়ার',
      'body', coalesce(v_name, 'কেউ একজন') || ' আপনাকে ফলো করেছেন',
      'url', '/notifications.html'
    )
  );
  return new;
end;
$$;

drop trigger if exists push_on_follow_insert on public.follows;
create trigger push_on_follow_insert
  after insert on public.follows
  for each row execute function public.trigger_push_on_follow();

revoke all on function public.trigger_push_on_call() from public, anon, authenticated;
revoke all on function public.trigger_push_on_follow() from public, anon, authenticated;
