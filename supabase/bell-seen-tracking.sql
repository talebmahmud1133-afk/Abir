-- bell-seen-tracking.sql — লাইভ প্রজেক্টে (jexscwcowptcshoalcrw) migration `bell_seen_tracking`
-- হিসেবে ইতিমধ্যে প্রয়োগ করা হয়েছে। এই ফাইলটা শুধু রেকর্ড/স্ন্যাপশট — আবার চালানোর দরকার নেই।
--
-- উদ্দেশ্য: বেল আইকনের সংখ্যা "শেষবার বেল দেখার পর থেকে নতুন" মডেলে কাজ করে (মিসড কল আগে থেকেই
-- calls.callee_seen_at দিয়ে এই মডেলে ছিল — এখন মেসেজ ও ফ্রেন্ড রিকোয়েস্টেও একই ধাঁচ যোগ হলো)।
-- একবার notifications.html (বেল পেজ) খুললে mark_notifications_seen() কল হয়ে বর্তমান সময়
-- বসিয়ে দেয়; তার আগের সব পেন্ডিং/অপঠিত জিনিস "seen" হয়ে যায় (বেলের সংখ্যা থেকে বাদ পড়ে) —
-- তারপর নতুন যা আসবে শুধু সেটাই গোনা হবে, যতক্ষণ না আবার বেল পেজ দেখা হয়।
-- বি.দ্র.: এটা প্রোফাইল-আইকনের আসল "অপঠিত মেসেজ" ব্যাজ (get_chat_counters) থেকে সম্পূর্ণ আলাদা —
-- সেটা অপরিবর্তিত আছে (চ্যাট খুলে সত্যিই পড়লেই কমে, বেল দেখলে কমে না)।

alter table public.chat_conversations add column if not exists a_bell_seen_at timestamptz;
alter table public.chat_conversations add column if not exists b_bell_seen_at timestamptz;
alter table public.follows add column if not exists seen_at timestamptz;

-- ডিপ্লয়ের মুহূর্তে বিদ্যমান পুরনো পেন্ডিং/অপঠিত জিনিস হঠাৎ "নতুন" হিসেবে না দেখাতে, সবকিছু তখনই seen করে দেওয়া হয়েছিল
update public.chat_conversations set a_bell_seen_at = now() where a_bell_seen_at is null;
update public.chat_conversations set b_bell_seen_at = now() where b_bell_seen_at is null;
update public.follows set seen_at = now() where status = 'pending' and seen_at is null;

-- get_bell_counts — বেলের জন্য "শেষবার বেল দেখার পর থেকে নতুন" সংখ্যা (মেসেজ + রিকোয়েস্ট); মিসড কল আলাদা RPC-তেই থাকছে
create or replace function public.get_bell_counts()
returns table (unseen_messages integer, unseen_requests integer)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'guest'; end if;
  return query
  select
    coalesce((
      select count(*)::int
      from public.chat_messages m
      join public.chat_conversations c on c.id = m.conversation_id
      where v_me in (c.user_a, c.user_b)
        and m.sender_id <> v_me
        and m.read_at is null
        and m.created_at > coalesce(case when c.user_a = v_me then c.a_bell_seen_at else c.b_bell_seen_at end, '-infinity')
        and m.created_at > coalesce(case when c.user_a = v_me then c.a_deleted_at else c.b_deleted_at end, '-infinity')
    ), 0),
    coalesce((
      select count(*)::int
      from public.follows f
      where f.following_id = v_me
        and f.status = 'pending'
        and f.seen_at is null
    ), 0);
end;
$$;

-- mark_notifications_seen — notifications.html (বেল পেজ) খুললেই একবার কল হবে (js/notif-seen.js); মেসেজ ও রিকোয়েস্ট দুটোই "দেখা হয়েছে" চিহ্নিত হয়
create or replace function public.mark_notifications_seen()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'guest'; end if;
  update public.chat_conversations set a_bell_seen_at = now() where user_a = v_me;
  update public.chat_conversations set b_bell_seen_at = now() where user_b = v_me;
  update public.follows set seen_at = now() where following_id = v_me and status = 'pending' and seen_at is null;
end;
$$;

revoke all on function public.get_bell_counts() from public, anon;
revoke all on function public.mark_notifications_seen() from public, anon;
grant execute on function public.get_bell_counts() to authenticated;
grant execute on function public.mark_notifications_seen() to authenticated;
