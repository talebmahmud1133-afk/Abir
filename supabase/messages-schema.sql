-- ============================================================================
-- টাঙ্গাইল জেলা — ১-টু-১ মেসেজিং সিস্টেম (MESSAGING_MASTER_PROMPT.md — ধাপ ১: ডাটাবেস, নিয়মের ইঞ্জিন ও নিরাপত্তা)
-- ============================================================================
-- ✅ এই পুরো স্কিমা লাইভ Supabase প্রজেক্টে (jexscwcowptcshoalcrw) আগে থেকেই প্রয়োগ করা ছিল।
-- এই সেশনে আবিষ্কৃত হয়েছে যে আগের একটা সেশনে ধাপ ১ পুরোপুরি লাইভে বসানো হয়েছিল, কিন্তু তখন এই
-- রেফারেন্স ফাইল ও MESSAGING_PROGRESS.md ZIP-এ যোগ করা হয়নি — ফলে পরের ZIP-এ এই দুটো ফাইল ছিল না।
-- এই সেশনে লাইভ ডাটাবেস থেকে (pg_get_functiondef/pg_constraint/pg_indexes দিয়ে) হুবহু বর্তমান
-- সংজ্ঞাগুলো পড়ে এই ফাইলে ডকুমেন্ট করা হলো। **নিচের অংশ আবার চালানোর দরকার নেই** (idempotent নয় —
-- টেবিল তৈরির অংশ দ্বিতীয়বার চালালে "already exists" এরর দেবে); রেফারেন্স হিসেবে রাখা হলো।
--
-- যাচাই করা হয়েছে (এই সেশনে, read-only কোয়েরি দিয়ে):
--  • ৪টা টেবিলই RLS চালু আছে, কাঙ্ক্ষিত কলাম/চেক-কনস্ট্রেইন্ট/ইনডেক্স/FK ঠিক আছে
--  • টেবিলে গ্রান্ট: শুধু authenticated → SELECT (কোনো INSERT/UPDATE/DELETE গ্রান্ট নেই — সব লেখা
--    শুধু নিচের SECURITY DEFINER RPC দিয়ে); anon-এর কোনো গ্রান্ট নেই
--  • ৮টা RPC-ই আছে ও শুধু authenticated রোলকে execute দেওয়া, anon-কে দেওয়া নেই
--  • RLS পলিসি: প্রতি টেবিলে শুধু "participants read" (SELECT) পলিসি — কোনো INSERT/UPDATE/DELETE
--    পলিসি নেই (ইচ্ছাকৃত — ক্লায়েন্ট সরাসরি লিখতে পারবে না)
--  • Realtime publication (`supabase_realtime`)-এ chat_conversations/chat_messages/chat_message_reactions যোগ করা আছে
--  • get_advisors(security) চালিয়ে দেখা গেছে chat_* সংক্রান্ত কোনো নতুন ERROR নেই (শুধু প্রজেক্টের
--    বিদ্যমান প্যাটার্নের মতো "authenticated/anon can execute SECURITY DEFINER function" WARN, যা
--    ইচ্ছাকৃত ডিজাইন — নিচের প্রতিটা ফাংশনের ভেতরেই auth.uid() is null চেক আছে)
--  • `chat-media` স্টোরেজ বাকেট ধাপ ৩-এ তৈরি হয়েছে (প্রাইভেট, ৮ MB) — সংজ্ঞা: supabase/chat-media-storage.sql
--
-- ডিজাইন সিদ্ধান্ত (স্পেকের প্রশ্নবিদ্ধ অংশগুলোর সিদ্ধান্ত, ভবিষ্যতের রেফারেন্সের জন্য):
--  • "Add করলে accepted" — গণনা-করা অবস্থা (follows ট্রিগার নয়): chat_is_accepted(conv) ফাংশন প্রতিবার
--    চেক করে "যে রিকোয়েস্ট পেয়েছে (non-initiator) সে কি initiator-কে follow করে" — সহজ ও সবসময়-সঠিক,
--    আলাদা সিঙ্ক-ট্রিগার লাগে না, follows টেবিলে কোনো পরিবর্তনও লাগে না।
--  • conversations-এ user_a/user_b সবসময় UUID-ক্রমে (user_a < user_b, CHECK দিয়ে জোর করা) — একই জোড়ার
--    জন্য ডুপ্লিকেট conversation অসম্ভব (UNIQUE (user_a, user_b))।
--  • মিডিয়া মালিকানা: send_message-এ media_url অবশ্যই regex ^{auth.uid()}/... প্যাটার্নে হতে হবে এবং
--    storage.objects-এ সত্যিই থাকতে হবে (আপলোডের পরে RPC কল, আগে না) — অন্যের ফাইল পাঠানো অসম্ভব।
--  • ডিলিট/ব্লক soft: a_deleted_at/b_deleted_at দিয়ে "নিজের দিক থেকে মোছা" (get_messages/list_conversations
--    এই timestamp-এর পরের মেসেজ/শেষ-মেসেজ-সময় দেখায়); ব্লক করলে দুই দিকেই soft-delete হয়ে যায়।
-- ============================================================================


-- ১. টেবিল: chat_conversations
-- ----------------------------------------------------------------------------
create table public.chat_conversations (
  id                    uuid primary key default gen_random_uuid(),
  user_a                uuid not null references public.profiles(id) on delete cascade,
  user_b                uuid not null references public.profiles(id) on delete cascade,
  initiator_id          uuid not null references public.profiles(id) on delete cascade,
  created_at            timestamptz not null default now(),
  last_message_at       timestamptz not null default now(),
  last_message_preview  text,
  last_sender_id        uuid references public.profiles(id) on delete set null,
  a_deleted_at          timestamptz,
  b_deleted_at          timestamptz,
  constraint chat_conv_order     check (user_a < user_b),
  constraint chat_conv_initiator check (initiator_id = user_a or initiator_id = user_b),
  constraint chat_conv_pair      unique (user_a, user_b)
);
alter table public.chat_conversations enable row level security;

create index chat_conv_a_idx on public.chat_conversations (user_a, last_message_at desc);
create index chat_conv_b_idx on public.chat_conversations (user_b, last_message_at desc);

create policy "chat_conversations: participants read" on public.chat_conversations
  for select to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);
-- টেবিল গ্রান্ট: authenticated → SELECT (লেখা শুধু নিচের RPC দিয়ে)


-- ২. টেবিল: chat_messages
-- ----------------------------------------------------------------------------
create table public.chat_messages (
  id               bigint generated always as identity primary key,
  conversation_id  uuid not null references public.chat_conversations(id) on delete cascade,
  sender_id        uuid not null references public.profiles(id) on delete cascade,
  body             text,
  media_url        text,
  media_type       text,
  created_at       timestamptz not null default clock_timestamp(),
  read_at          timestamptz,
  constraint chat_msg_body_len    check (body is null or char_length(body) <= 2000),
  constraint chat_msg_media_type  check (media_type is null or media_type in ('image', 'video')),
  constraint chat_msg_media_pair  check ((media_url is null) = (media_type is null)),
  constraint chat_msg_not_empty   check (nullif(btrim(coalesce(body, '')), '') is not null or media_url is not null)
);
alter table public.chat_messages enable row level security;

create index chat_msg_conv_idx    on public.chat_messages (conversation_id, id desc);
create index chat_msg_rate_idx    on public.chat_messages (sender_id, created_at desc);
create index chat_msg_unread_idx  on public.chat_messages (conversation_id, sender_id) where read_at is null;

create policy "chat_messages: participants read" on public.chat_messages
  for select to authenticated
  using (exists (
    select 1 from public.chat_conversations c
     where c.id = chat_messages.conversation_id
       and (auth.uid() = c.user_a or auth.uid() = c.user_b)
  ));


-- ৩. টেবিল: chat_message_reactions
-- ----------------------------------------------------------------------------
create table public.chat_message_reactions (
  message_id  bigint not null references public.chat_messages(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  emoji       text not null,
  created_at  timestamptz not null default now(),
  constraint chat_message_reactions_pkey primary key (message_id, user_id),
  constraint chat_react_emoji check (emoji in ('👍', '❤️', '😂', '😮', '😢', '🙏'))
);
alter table public.chat_message_reactions enable row level security;

create policy "chat_message_reactions: participants read" on public.chat_message_reactions
  for select to authenticated
  using (exists (
    select 1 from public.chat_messages m join public.chat_conversations c on c.id = m.conversation_id
     where m.id = chat_message_reactions.message_id
       and (auth.uid() = c.user_a or auth.uid() = c.user_b)
  ));


-- ৪. টেবিল: chat_blocks
-- ----------------------------------------------------------------------------
create table public.chat_blocks (
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint chat_blocks_pkey primary key (blocker_id, blocked_id),
  constraint chat_block_no_self check (blocker_id <> blocked_id)
);
alter table public.chat_blocks enable row level security;
create index chat_blocks_blocked_idx on public.chat_blocks (blocked_id);

create policy "chat_blocks: read own" on public.chat_blocks
  for select to authenticated
  using (blocker_id = auth.uid());


-- ৫. Realtime publication
-- ----------------------------------------------------------------------------
-- alter publication supabase_realtime add table public.chat_conversations;
-- alter publication supabase_realtime add table public.chat_messages;
-- alter publication supabase_realtime add table public.chat_message_reactions;


-- ৬. হেল্পার ফাংশন (ছোট, ভেতরে ব্যবহৃত)
-- ----------------------------------------------------------------------------
create or replace function public.chat_uid_by_username(p_username text)
returns uuid language sql stable security definer set search_path = public
as $$
  select id from public.profiles where lower(username) = lower(btrim(coalesce(p_username, ''))) limit 1;
$$;

create or replace function public.chat_is_accepted(p_conv public.chat_conversations)
returns boolean language sql stable security definer set search_path = public
as $$
  -- accepted = যে রিকোয়েস্ট পেয়েছে (non-initiator) সে initiator-কে Add Friend করেছে (follows)
  select exists (
    select 1 from public.follows f
     where f.follower_id  = case when p_conv.initiator_id = p_conv.user_a then p_conv.user_b else p_conv.user_a end
       and f.following_id = p_conv.initiator_id
  );
$$;

create or replace function public.chat_blocked_either(p_x uuid, p_y uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.chat_blocks b
     where (b.blocker_id = p_x and b.blocked_id = p_y) or (b.blocker_id = p_y and b.blocked_id = p_x)
  );
$$;

revoke all on function public.chat_uid_by_username(text) from public, anon;
revoke all on function public.chat_is_accepted(public.chat_conversations) from public, anon;
revoke all on function public.chat_blocked_either(uuid, uuid) from public, anon;
grant execute on function public.chat_uid_by_username(text) to authenticated;
grant execute on function public.chat_is_accepted(public.chat_conversations) to authenticated;
grant execute on function public.chat_blocked_either(uuid, uuid) to authenticated;


-- ৭. send_message — মেসেজ পাঠানো (নিয়ম ইঞ্জিনের মূল অংশ)
-- ----------------------------------------------------------------------------
-- বাধ্যতামূলক নিয়ম প্রয়োগ করে: গেস্ট ব্লক, ব্লক-চেক (দুই দিকেই), রেট-লিমিট (মিনিটে ৩০টি),
-- pending অবস্থায় সর্বোচ্চ ৫টি মেসেজ ও শুধু টেক্সট, মিডিয়া-মালিকানা যাচাই (chat-media/<own-uid>/...
-- পাথ + storage.objects-এ সত্যিই থাকা), অপরিচিতকে প্রথম মেসেজ পাঠাতে হলে টার্গেট is_public বা সে
-- আমাকে follow করে থাকতে হবে (নাহলে user_not_found — প্রাইভেট প্রোফাইলে কোল্ড-মেসেজ ঠেকাতে)।
create or replace function public.send_message(
  p_username    text,
  p_body        text default null,
  p_media_url   text default null,
  p_media_type  text default null
)
returns table (message_id bigint, conversation_id uuid, created_at timestamptz, state text)
language plpgsql security definer set search_path = public
as $$
declare
  v_me        uuid := auth.uid();
  v_other     uuid;
  v_a         uuid;
  v_b         uuid;
  v_conv      public.chat_conversations;
  v_body      text := nullif(btrim(coalesce(p_body, '')), '');
  v_accepted  boolean;
  v_preview   text;
  v_msg       public.chat_messages;
begin
  if v_me is null then raise exception 'guest'; end if;

  v_other := public.chat_uid_by_username(p_username);
  if v_other is null then raise exception 'user_not_found'; end if;
  if v_other = v_me   then raise exception 'self'; end if;

  if v_body is not null and char_length(v_body) > 2000 then raise exception 'too_long'; end if;
  if p_media_url is not null or p_media_type is not null then
    if p_media_url is null or p_media_type not in ('image', 'video') then raise exception 'bad_media'; end if;
    if char_length(p_media_url) > 300
       or p_media_url !~ ('^' || v_me::text || '/[A-Za-z0-9._-]{1,200}$')
       or p_media_url like '%..%' then
      raise exception 'bad_media';
    end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'chat-media' and o.name = p_media_url) then
      raise exception 'bad_media';
    end if;
  end if;
  if v_body is null and p_media_url is null then raise exception 'empty'; end if;

  if exists (select 1 from public.chat_blocks where blocker_id = v_me and blocked_id = v_other) then
    raise exception 'you_blocked';
  end if;
  if exists (select 1 from public.chat_blocks where blocker_id = v_other and blocked_id = v_me) then
    raise exception 'blocked';
  end if;

  if (select count(*) from public.chat_messages m
       where m.sender_id = v_me and m.created_at > now() - interval '1 minute') >= 30 then
    raise exception 'rate_limit';
  end if;

  if v_me < v_other then v_a := v_me; v_b := v_other; else v_a := v_other; v_b := v_me; end if;

  select * into v_conv from public.chat_conversations c where c.user_a = v_a and c.user_b = v_b for update;
  if not found then
    if not (public.is_profile_public(v_other)
            or exists (select 1 from public.follows f where f.follower_id = v_other and f.following_id = v_me)) then
      raise exception 'user_not_found';
    end if;
    insert into public.chat_conversations (user_a, user_b, initiator_id)
    values (v_a, v_b, v_me)
    on conflict (user_a, user_b) do nothing;
    select * into v_conv from public.chat_conversations c where c.user_a = v_a and c.user_b = v_b for update;
  end if;

  v_accepted := public.chat_is_accepted(v_conv);

  if not v_accepted then
    if v_conv.initiator_id <> v_me then raise exception 'need_friend'; end if;
    if p_media_url is not null then raise exception 'request_text_only'; end if;
    if (select count(*) from public.chat_messages m
         where m.conversation_id = v_conv.id and m.sender_id = v_me) >= 5 then
      raise exception 'request_limit';
    end if;
  end if;

  insert into public.chat_messages (conversation_id, sender_id, body, media_url, media_type)
  values (v_conv.id, v_me, v_body, p_media_url, p_media_type)
  returning * into v_msg;

  v_preview := case
    when v_body is not null then left(v_body, 80)
    when p_media_type = 'image' then '📷 ছবি'
    else '🎥 ভিডিও'
  end;

  update public.chat_conversations c
     set last_message_at = v_msg.created_at, last_message_preview = v_preview, last_sender_id = v_me
   where c.id = v_conv.id;

  return query select v_msg.id, v_conv.id, v_msg.created_at,
                      case when v_accepted then 'accepted' else 'request_sent' end;
end;
$$;


-- ৮. get_messages — একটা কথোপকথনের মেসেজ (পুরনো থেকে পেজিনেশন, নিজের রিঅ্যাকশন + সবার রিঅ্যাকশন-কাউন্ট সহ)
-- ----------------------------------------------------------------------------
create or replace function public.get_messages(
  p_username  text,
  p_before    bigint default null,
  p_limit     integer default 30
)
returns table (
  id bigint, is_mine boolean, body text, media_url text, media_type text,
  created_at timestamptz, read_at timestamptz, my_reaction text, reactions jsonb
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_me    uuid := auth.uid();
  v_other uuid;
  v_conv  public.chat_conversations;
  v_since timestamptz;
begin
  if v_me is null then raise exception 'guest'; end if;
  v_other := public.chat_uid_by_username(p_username);
  if v_other is null then return; end if;

  select * into v_conv from public.chat_conversations c
   where c.user_a = least(v_me, v_other) and c.user_b = greatest(v_me, v_other);
  if not found then return; end if;

  v_since := case when v_conv.user_a = v_me then v_conv.a_deleted_at else v_conv.b_deleted_at end;

  return query
    select m.id,
           (m.sender_id = v_me),
           m.body, m.media_url, m.media_type, m.created_at, m.read_at,
           (select r.emoji from public.chat_message_reactions r where r.message_id = m.id and r.user_id = v_me),
           coalesce((select jsonb_agg(jsonb_build_object('emoji', x.emoji, 'count', x.cnt) order by x.cnt desc, x.emoji)
                       from (select r.emoji, count(*) as cnt
                               from public.chat_message_reactions r where r.message_id = m.id
                              group by r.emoji) x), '[]'::jsonb)
      from public.chat_messages m
     where m.conversation_id = v_conv.id
       and (p_before is null or m.id < p_before)
       and (v_since is null or m.created_at > v_since)
     order by m.id desc
     limit greatest(1, least(coalesce(p_limit, 30), 50));
end;
$$;


-- ৯. list_conversations — ইনবক্স তালিকা (folder = 'chat' | 'requests')
-- ----------------------------------------------------------------------------
create or replace function public.list_conversations(
  p_folder  text default 'chat',
  p_limit   integer default 30,
  p_offset  integer default 0
)
returns table (
  conversation_id uuid, username text, full_name text, avatar_url text, is_verified boolean,
  is_online boolean, state text, last_message_at timestamptz, last_message_preview text,
  last_is_mine boolean, unread_count integer
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'guest'; end if;
  if p_folder not in ('chat', 'requests') then raise exception 'not_allowed'; end if;

  return query
  select * from (
    select c.id,
           p.username, p.full_name, p.avatar_url, coalesce(p.is_verified, false),
           (p.last_seen is not null and p.last_seen > now() - interval '2 minutes'),
           case when public.chat_is_accepted(c) then 'accepted'
                when c.initiator_id = v_me      then 'request_sent'
                else 'request_received' end as st,
           c.last_message_at, c.last_message_preview,
           (c.last_sender_id = v_me),
           (select count(*)::int from public.chat_messages m
             where m.conversation_id = c.id and m.sender_id <> v_me and m.read_at is null
               and m.created_at > coalesce(case when c.user_a = v_me then c.a_deleted_at else c.b_deleted_at end, '-infinity'))
      from public.chat_conversations c
      join public.profiles p on p.id = case when c.user_a = v_me then c.user_b else c.user_a end
     where v_me in (c.user_a, c.user_b)
       and c.last_message_at > coalesce(case when c.user_a = v_me then c.a_deleted_at else c.b_deleted_at end, '-infinity')
  ) t
  where (p_folder = 'chat'     and t.st in ('accepted', 'request_sent'))
     or (p_folder = 'requests' and t.st = 'request_received')
  order by t.last_message_at desc
  limit  greatest(1, least(coalesce(p_limit, 30), 50))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;


-- ১০. mark_read — চ্যাট খুললে অন্যপক্ষের অপঠিত মেসেজ "পঠিত" করা
-- ----------------------------------------------------------------------------
create or replace function public.mark_read(p_username text)
returns integer language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid(); v_other uuid; v_n integer;
begin
  if v_me is null then raise exception 'guest'; end if;
  v_other := public.chat_uid_by_username(p_username);
  if v_other is null then return 0; end if;
  update public.chat_messages m set read_at = now()
   from public.chat_conversations c
   where c.user_a = least(v_me, v_other) and c.user_b = greatest(v_me, v_other)
     and m.conversation_id = c.id and m.sender_id <> v_me and m.read_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;


-- ১১. react_to_message — রিঅ্যাকশন দেওয়া/বদলানো/তোলা (একজন = একটা রিঅ্যাকশন)
-- ----------------------------------------------------------------------------
create or replace function public.react_to_message(p_message_id bigint, p_emoji text)
returns text language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid(); v_conv public.chat_conversations; v_other uuid; v_old text;
begin
  if v_me is null then raise exception 'guest'; end if;
  select c.* into v_conv
    from public.chat_messages m join public.chat_conversations c on c.id = m.conversation_id
   where m.id = p_message_id and v_me in (c.user_a, c.user_b);
  if not found then raise exception 'not_allowed'; end if;
  v_other := case when v_conv.user_a = v_me then v_conv.user_b else v_conv.user_a end;
  if public.chat_blocked_either(v_me, v_other) then raise exception 'blocked'; end if;
  if not public.chat_is_accepted(v_conv) then raise exception 'not_allowed'; end if;

  select emoji into v_old from public.chat_message_reactions where message_id = p_message_id and user_id = v_me;
  if p_emoji is null or p_emoji = v_old then
    delete from public.chat_message_reactions where message_id = p_message_id and user_id = v_me;
    return null;
  end if;
  if p_emoji not in ('👍', '❤️', '😂', '😮', '😢', '🙏') then raise exception 'bad_emoji'; end if;
  insert into public.chat_message_reactions (message_id, user_id, emoji) values (p_message_id, v_me, p_emoji)
  on conflict (message_id, user_id) do update set emoji = excluded.emoji, created_at = now();
  return p_emoji;
end;
$$;


-- ১২. delete_conversation_for_me / block_user / unblock_user
-- ----------------------------------------------------------------------------
create or replace function public.delete_conversation_for_me(p_username text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid(); v_other uuid;
begin
  if v_me is null then raise exception 'guest'; end if;
  v_other := public.chat_uid_by_username(p_username);
  if v_other is null then return; end if;
  update public.chat_conversations c
     set a_deleted_at = case when c.user_a = v_me then clock_timestamp() else c.a_deleted_at end,
         b_deleted_at = case when c.user_b = v_me then clock_timestamp() else c.b_deleted_at end
   where c.user_a = least(v_me, v_other) and c.user_b = greatest(v_me, v_other);
end;
$$;

create or replace function public.block_user(p_username text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid(); v_other uuid;
begin
  if v_me is null then raise exception 'guest'; end if;
  v_other := public.chat_uid_by_username(p_username);
  if v_other is null then raise exception 'user_not_found'; end if;
  if v_other = v_me then raise exception 'self'; end if;
  insert into public.chat_blocks (blocker_id, blocked_id) values (v_me, v_other) on conflict do nothing;
  update public.chat_conversations c
     set a_deleted_at = case when c.user_a = v_me then clock_timestamp() else c.a_deleted_at end,
         b_deleted_at = case when c.user_b = v_me then clock_timestamp() else c.b_deleted_at end
   where c.user_a = least(v_me, v_other) and c.user_b = greatest(v_me, v_other);
end;
$$;

create or replace function public.unblock_user(p_username text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid(); v_other uuid;
begin
  if v_me is null then raise exception 'guest'; end if;
  v_other := public.chat_uid_by_username(p_username);
  if v_other is null then return; end if;
  delete from public.chat_blocks where blocker_id = v_me and blocked_id = v_other;
end;
$$;


-- ১৩. get_chat_state — একটা ইউজারনেমের বিপরীতে চ্যাট UI-র জন্য সব অবস্থা একসাথে (ধাপ ২-এর জন্য প্রস্তুত)
-- ----------------------------------------------------------------------------
-- public-profile.html/chat.html-এ "মেসেজ" বাটন খুললে এক কলে সব জানা যায়: কে অন্যপক্ষ, চ্যাট আগে
-- থেকে আছে কিনা, অবস্থা (none/request_sent/request_received/accepted), মেসেজ/মিডিয়া পাঠানো যাবে
-- কিনা এবং না-গেলে কারণ, pending অবস্থায় আর কতটা মেসেজ বাকি, আমি ব্লক করেছি কিনা।
create or replace function public.get_chat_state(p_username text)
returns table (
  other_username text, other_name text, other_avatar text, other_verified boolean, other_online boolean,
  conversation_id uuid, state text, i_follow_them boolean, they_follow_me boolean,
  can_send boolean, can_send_media boolean, send_block text, requests_left integer, i_blocked boolean
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_me     uuid := auth.uid();
  v_other  uuid;
  v_p      public.profiles;
  v_conv   public.chat_conversations;
  v_have   boolean;
  v_state  text;
  v_iF     boolean;
  v_tF     boolean;
  v_iblk   boolean;
  v_theyblk boolean;
  v_can    boolean := true;
  v_media  boolean := false;
  v_reason text;
  v_left   integer;
begin
  if v_me is null then raise exception 'guest'; end if;
  v_other := public.chat_uid_by_username(p_username);
  if v_other is null or v_other = v_me then return; end if;

  select * into v_p from public.profiles where id = v_other;

  select * into v_conv from public.chat_conversations c
   where c.user_a = least(v_me, v_other) and c.user_b = greatest(v_me, v_other);
  v_have := found;

  if not v_have and not (v_p.is_public
       or exists (select 1 from public.follows f where f.follower_id = v_other and f.following_id = v_me)) then
    return;
  end if;

  v_iF  := exists (select 1 from public.follows f where f.follower_id = v_me    and f.following_id = v_other);
  v_tF  := exists (select 1 from public.follows f where f.follower_id = v_other and f.following_id = v_me);
  v_iblk    := exists (select 1 from public.chat_blocks b where b.blocker_id = v_me    and b.blocked_id = v_other);
  v_theyblk := exists (select 1 from public.chat_blocks b where b.blocker_id = v_other and b.blocked_id = v_me);

  if not v_have then
    v_state := 'none';
    v_media := v_tF;
    if not v_tF then v_left := 5; end if;
  elsif public.chat_is_accepted(v_conv) then
    v_state := 'accepted'; v_media := true;
  elsif v_conv.initiator_id = v_me then
    v_state := 'request_sent';
    v_left := greatest(0, 5 - (select count(*)::int from public.chat_messages m
                                where m.conversation_id = v_conv.id and m.sender_id = v_me));
  else
    v_state := 'request_received';
  end if;

  if v_iblk then v_can := false; v_reason := 'you_blocked';
  elsif v_theyblk then v_can := false; v_reason := 'blocked';
  elsif v_state = 'request_received' then v_can := false; v_reason := 'need_friend';
  elsif v_state = 'request_sent' and v_left = 0 then v_can := false; v_reason := 'request_limit';
  end if;
  if not v_can then v_media := false; end if;

  return query select
    v_p.username, v_p.full_name, v_p.avatar_url, coalesce(v_p.is_verified, false),
    (v_p.last_seen is not null and v_p.last_seen > now() - interval '2 minutes'),
    case when v_have then v_conv.id else null end,
    v_state, v_iF, v_tF, v_can, v_media, v_reason, v_left, v_iblk;
end;
$$;


-- ১৪. get_chat_counters — বটম-নেভ/মেসেজ-ট্যাব ব্যাজের জন্য মোট অপঠিত সংখ্যা (চ্যাট ও রিকোয়েস্ট আলাদা)
-- ----------------------------------------------------------------------------
create or replace function public.get_chat_counters()
returns table (unread_chat integer, unread_requests integer)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'guest'; end if;
  return query
  select coalesce(sum(t.unread) filter (where t.st <> 'request_received'), 0)::int,
         (count(*) filter (where t.st = 'request_received' and t.unread > 0))::int
    from (
      select case when public.chat_is_accepted(c) then 'accepted'
                  when c.initiator_id = v_me      then 'request_sent'
                  else 'request_received' end as st,
             (select count(*) from public.chat_messages m
               where m.conversation_id = c.id and m.sender_id <> v_me and m.read_at is null
                 and m.created_at > coalesce(case when c.user_a = v_me then c.a_deleted_at else c.b_deleted_at end, '-infinity')) as unread
        from public.chat_conversations c
       where v_me in (c.user_a, c.user_b)
    ) t;
end;
$$;


-- ১৫. গেস্ট (anon) সম্পূর্ণ বন্ধ — প্রতিটা RPC-তে
-- ----------------------------------------------------------------------------
revoke all on function public.send_message(text, text, text, text) from public, anon;
revoke all on function public.get_messages(text, bigint, integer) from public, anon;
revoke all on function public.list_conversations(text, integer, integer) from public, anon;
revoke all on function public.mark_read(text) from public, anon;
revoke all on function public.react_to_message(bigint, text) from public, anon;
revoke all on function public.delete_conversation_for_me(text) from public, anon;
revoke all on function public.block_user(text) from public, anon;
revoke all on function public.unblock_user(text) from public, anon;
revoke all on function public.get_chat_state(text) from public, anon;
revoke all on function public.get_chat_counters() from public, anon;

grant execute on function public.send_message(text, text, text, text) to authenticated;
grant execute on function public.get_messages(text, bigint, integer) to authenticated;
grant execute on function public.list_conversations(text, integer, integer) to authenticated;
grant execute on function public.mark_read(text) to authenticated;
grant execute on function public.react_to_message(bigint, text) to authenticated;
grant execute on function public.delete_conversation_for_me(text) to authenticated;
grant execute on function public.block_user(text) to authenticated;
grant execute on function public.unblock_user(text) to authenticated;
grant execute on function public.get_chat_state(text) to authenticated;
grant execute on function public.get_chat_counters() to authenticated;

-- ----------------------------------------------------------------------------
-- ✅ ধাপ ৩: storage বাকেট `chat-media` (private) + পলিসি লাইভে বসেছে — supabase/chat-media-storage.sql।
-- ============================================================================
