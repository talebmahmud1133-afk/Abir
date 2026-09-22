-- ============================================================================
-- টাঙ্গাইল জেলা — মেসেজ অ্যাকশন: রিপ্লাই · এডিট · ফরওয়ার্ড · ডিলিট (আমার থেকে / সবার জন্য)
-- ============================================================================
-- ✅ লাইভ Supabase-এ প্রয়োগ করা আছে: migration `chat_message_actions` (২০২৬-০৯-২১ ১০:০৩ UTC, প্রজেক্ট jexscwcowptcshoalcrw)।
--    (এটি আগের সেশনে ইউজারের সম্মতিতে প্রয়োগ হয়েছিল, কিন্তু ZIP-এ রেকর্ড ছিল না। v109 সেশনে লাইভ ডাটাবেস থেকে
--    কলাম/টেবিল/ফাংশনের সংজ্ঞা read-only কোয়েরিতে তুলে এই ফাইলে রাখা হলো — এটি **রেফারেন্স স্ন্যাপশট**, মূল migration-এর
--    হুবহু টেক্সট নয়। আবার চালালে নিরাপদ হওয়ার চেষ্টা আছে (if not exists / create or replace), তবে লাইভে ইতিমধ্যে আছে — চালানোর দরকার নেই।)
-- ক্লায়েন্ট (js/chat.js) এগুলো ব্যবহার করে: send_message(p_reply_to) · edit_message · delete_message_for_everyone ·
--    hide_message_for_me · forward_message · get_messages (নতুন কলামসহ)।
--
-- নিয়ম (সার্ভারে প্রয়োগ):
--  • এডিট/সবার-জন্য-ডিলিট শুধু নিজের মেসেজ; মুছে ফেলা মেসেজ আর এডিট/ফরওয়ার্ড/রিপ্লাই/রিঅ্যাক্ট হয় না।
--  • সবার জন্য মুছলে সারি থাকে কিন্তু body/media/reply মুছে যায় (`deleted_at` বসে) — তাই দুজনের চ্যাটে "মেসেজটি মুছে ফেলা হয়েছে" দেখায়;
--    রিঅ্যাকশনও মোছা হয়; মিডিয়ার পাথ ফেরত আসে (আর কোনো মেসেজ ফাইলটা ব্যবহার না করলে) — ক্লায়েন্ট নিজের ফোল্ডার হলে storage.remove করে।
--  • আমার থেকে ডিলিট = `chat_message_hidden` (মেসেজ+ইউজার) সারি; get_messages/list_conversations/get_chat_counters তা বাদ দেয়।
--  • রিপ্লাই: লক্ষ্য মেসেজ একই কথোপকথনের, মোছা নয়, আমার কাছে লুকানো নয় — নইলে `bad_reply`। কথোপকথন-ই না থাকলে রিপ্লাই নয়।
--  • ফরওয়ার্ড: `chat_post_message` (send_message-এর একই নিয়ম — ব্লক/রেট-লিমিট/রিকোয়েস্টে ৫টি ও শুধু টেক্সট) দিয়ে, `is_forwarded = true`।
--  • এডিটে ২০০০ অক্ষর সীমা; মিডিয়া মেসেজে ক্যাপশন খালি করা যায়, টেক্সট মেসেজে না (`empty`)। কোনো সময়সীমা নেই।
--  • anon-এর কোনো grant নেই; সবগুলো SECURITY DEFINER, `auth.uid() is null` গার্ডসহ (হেল্পার chat_post_message শুধু postgres)।
-- ============================================================================

-- ---- ১) chat_messages-এ নতুন কলাম ----
alter table public.chat_messages add column if not exists reply_to_id  bigint;
alter table public.chat_messages add column if not exists is_forwarded boolean not null default false;
alter table public.chat_messages add column if not exists edited_at    timestamptz;
alter table public.chat_messages add column if not exists deleted_at   timestamptz;
-- (লাইভে আছে) FK: chat_messages_reply_to_id_fkey (reply_to_id) → chat_messages(id) ON DELETE SET NULL
-- (লাইভে আছে) CHECK chat_msg_deleted_clean: deleted_at থাকলে body/media_url/media_type সব null
-- (লাইভে আছে) CHECK chat_msg_not_empty: deleted_at না থাকলে body (ফাঁকা নয়) অথবা media_url লাগবে
-- (লাইভে আছে) INDEX chat_msg_reply_idx on chat_messages (reply_to_id) where reply_to_id is not null

-- ---- ২) "আমার থেকে ডিলিট" ----
create table if not exists public.chat_message_hidden (
  message_id bigint      not null references public.chat_messages(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id)      on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index if not exists chat_hidden_user_idx on public.chat_message_hidden (user_id);
alter table public.chat_message_hidden enable row level security;
drop policy if exists "chat_message_hidden: read own" on public.chat_message_hidden;
create policy "chat_message_hidden: read own" on public.chat_message_hidden
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.chat_message_hidden from anon, authenticated;
grant select on public.chat_message_hidden to authenticated;   -- লেখা শুধু hide_message_for_me RPC দিয়ে

-- ---- ৩) ফাংশন (লাইভ থেকে নেওয়া) ----
create or replace function public.chat_preview_text(p_body text, p_media_type text, p_deleted boolean)
returns text language sql immutable set search_path to 'public' as $function$
  select case
    when coalesce(p_deleted, false) then '🚫 মেসেজটি মুছে ফেলা হয়েছে'
    when nullif(btrim(coalesce(p_body, '')), '') is not null then left(p_body, 80)
    when p_media_type = 'image' then '📷 ছবি'
    when p_media_type = 'video' then '🎥 ভিডিও'
    else ''
  end;
$function$;

create or replace function public.chat_post_message(p_me uuid, p_other uuid, p_body text, p_media_url text, p_media_type text, p_reply_to bigint, p_forwarded boolean)
returns table(message_id bigint, conversation_id uuid, created_at timestamptz, state text)
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_a uuid; v_b uuid; v_conv public.chat_conversations; v_accepted boolean; v_msg public.chat_messages; v_since timestamptz;
begin
  if exists (select 1 from public.chat_blocks b where b.blocker_id = p_me and b.blocked_id = p_other) then
    raise exception 'you_blocked';
  end if;
  if exists (select 1 from public.chat_blocks b where b.blocker_id = p_other and b.blocked_id = p_me) then
    raise exception 'blocked';
  end if;

  if (select count(*) from public.chat_messages m
       where m.sender_id = p_me and m.created_at > now() - interval '1 minute') >= 30 then
    raise exception 'rate_limit';
  end if;

  if p_me < p_other then v_a := p_me; v_b := p_other; else v_a := p_other; v_b := p_me; end if;

  select * into v_conv from public.chat_conversations c where c.user_a = v_a and c.user_b = v_b for update;
  if not found then
    if p_reply_to is not null then raise exception 'bad_reply'; end if;
    if not (public.is_profile_public(p_other)
            or exists (select 1 from public.follows f where f.follower_id = p_other and f.following_id = p_me)) then
      raise exception 'user_not_found';
    end if;
    insert into public.chat_conversations (user_a, user_b, initiator_id)
    values (v_a, v_b, p_me)
    on conflict (user_a, user_b) do nothing;
    select * into v_conv from public.chat_conversations c where c.user_a = v_a and c.user_b = v_b for update;
  end if;

  if p_reply_to is not null then
    v_since := case when v_conv.user_a = p_me then v_conv.a_deleted_at else v_conv.b_deleted_at end;
    if not exists (
      select 1 from public.chat_messages rm
       where rm.id = p_reply_to and rm.conversation_id = v_conv.id and rm.deleted_at is null
         and (v_since is null or rm.created_at > v_since)
         and not exists (select 1 from public.chat_message_hidden h where h.message_id = rm.id and h.user_id = p_me)
    ) then
      raise exception 'bad_reply';
    end if;
  end if;

  v_accepted := public.chat_is_accepted(v_conv);

  if not v_accepted then
    if v_conv.initiator_id <> p_me then raise exception 'need_friend'; end if;
    if p_media_url is not null then raise exception 'request_text_only'; end if;
    if (select count(*) from public.chat_messages m
         where m.conversation_id = v_conv.id and m.sender_id = p_me) >= 5 then
      raise exception 'request_limit';
    end if;
  end if;

  insert into public.chat_messages (conversation_id, sender_id, body, media_url, media_type, reply_to_id, is_forwarded)
  values (v_conv.id, p_me, p_body, p_media_url, p_media_type, p_reply_to, coalesce(p_forwarded, false))
  returning * into v_msg;

  update public.chat_conversations c
     set last_message_at = v_msg.created_at,
         last_message_preview = public.chat_preview_text(p_body, p_media_type, false),
         last_sender_id = p_me
   where c.id = v_conv.id;

  return query select v_msg.id, v_conv.id, v_msg.created_at,
                      case when v_accepted then 'accepted' else 'request_sent' end;
end;
$function$;

drop function if exists public.send_message(text, text, text, text);   -- পুরনো ৪-আর্গের সংস্করণ (এখন ৫-আর্গ, p_reply_to ডিফল্ট null)
create or replace function public.send_message(p_username text, p_body text default null::text, p_media_url text default null::text, p_media_type text default null::text, p_reply_to bigint default null::bigint)
returns table(message_id bigint, conversation_id uuid, created_at timestamptz, state text)
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me    uuid := auth.uid();
  v_other uuid;
  v_body  text := nullif(btrim(coalesce(p_body, '')), '');
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

  return query select * from public.chat_post_message(v_me, v_other, v_body, p_media_url, p_media_type, p_reply_to, false);
end;
$function$;

create or replace function public.edit_message(p_message_id bigint, p_body text)
returns timestamptz language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me uuid := auth.uid(); v_msg public.chat_messages; v_conv public.chat_conversations; v_other uuid;
  v_since timestamptz; v_body text := nullif(btrim(coalesce(p_body, '')), ''); v_at timestamptz;
begin
  if v_me is null then raise exception 'guest'; end if;

  select m.* into v_msg from public.chat_messages m where m.id = p_message_id and m.sender_id = v_me;
  if not found or v_msg.deleted_at is not null then raise exception 'not_allowed'; end if;

  select * into v_conv from public.chat_conversations c where c.id = v_msg.conversation_id;
  v_other := case when v_conv.user_a = v_me then v_conv.user_b else v_conv.user_a end;
  v_since := case when v_conv.user_a = v_me then v_conv.a_deleted_at else v_conv.b_deleted_at end;
  if (v_since is not null and v_msg.created_at <= v_since)
     or exists (select 1 from public.chat_message_hidden h where h.message_id = v_msg.id and h.user_id = v_me) then
    raise exception 'not_allowed';
  end if;
  if public.chat_blocked_either(v_me, v_other) then raise exception 'blocked'; end if;

  if v_body is not null and char_length(v_body) > 2000 then raise exception 'too_long'; end if;
  if v_body is null and v_msg.media_url is null then raise exception 'empty'; end if;
  if v_body is not distinct from v_msg.body then return v_msg.edited_at; end if;

  update public.chat_messages m set body = v_body, edited_at = clock_timestamp()
   where m.id = v_msg.id returning m.edited_at into v_at;

  update public.chat_conversations c
     set last_message_preview = public.chat_preview_text(v_body, v_msg.media_type, false)
   where c.id = v_msg.conversation_id
     and v_msg.id = (select max(x.id) from public.chat_messages x where x.conversation_id = c.id);

  return v_at;
end;
$function$;

create or replace function public.delete_message_for_everyone(p_message_id bigint)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me uuid := auth.uid(); v_msg public.chat_messages; v_path text;
begin
  if v_me is null then raise exception 'guest'; end if;

  select m.* into v_msg from public.chat_messages m where m.id = p_message_id and m.sender_id = v_me for update;
  if not found then raise exception 'not_allowed'; end if;
  if v_msg.deleted_at is not null then return null; end if;

  v_path := v_msg.media_url;
  update public.chat_messages m
     set body = null, media_url = null, media_type = null, reply_to_id = null, is_forwarded = false,
         edited_at = null, deleted_at = clock_timestamp()
   where m.id = v_msg.id;
  delete from public.chat_message_reactions r where r.message_id = v_msg.id;

  update public.chat_conversations c
     set last_message_preview = public.chat_preview_text(null, null, true)
   where c.id = v_msg.conversation_id
     and v_msg.id = (select max(x.id) from public.chat_messages x where x.conversation_id = c.id);

  if v_path is not null and not exists (select 1 from public.chat_messages x where x.media_url = v_path) then
    return v_path;
  end if;
  return null;
end;
$function$;

create or replace function public.hide_message_for_me(p_message_id bigint)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'guest'; end if;
  if not exists (
    select 1 from public.chat_messages m join public.chat_conversations c on c.id = m.conversation_id
     where m.id = p_message_id and v_me in (c.user_a, c.user_b)
  ) then
    raise exception 'not_allowed';
  end if;
  insert into public.chat_message_hidden (message_id, user_id) values (p_message_id, v_me) on conflict do nothing;
end;
$function$;

create or replace function public.forward_message(p_message_id bigint, p_username text)
returns table(message_id bigint, conversation_id uuid, created_at timestamptz, state text)
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me uuid := auth.uid(); v_other uuid; v_src public.chat_messages; v_conv public.chat_conversations; v_since timestamptz;
begin
  if v_me is null then raise exception 'guest'; end if;

  select m.* into v_src
    from public.chat_messages m join public.chat_conversations c on c.id = m.conversation_id
   where m.id = p_message_id and v_me in (c.user_a, c.user_b);
  if not found or v_src.deleted_at is not null then raise exception 'not_allowed'; end if;

  select * into v_conv from public.chat_conversations c where c.id = v_src.conversation_id;
  v_since := case when v_conv.user_a = v_me then v_conv.a_deleted_at else v_conv.b_deleted_at end;
  if (v_since is not null and v_src.created_at <= v_since)
     or exists (select 1 from public.chat_message_hidden h where h.message_id = v_src.id and h.user_id = v_me) then
    raise exception 'not_allowed';
  end if;

  v_other := public.chat_uid_by_username(p_username);
  if v_other is null then raise exception 'user_not_found'; end if;
  if v_other = v_me   then raise exception 'self'; end if;

  return query select * from public.chat_post_message(v_me, v_other, v_src.body, v_src.media_url, v_src.media_type, null, true);
end;
$function$;

-- get_messages: রিটার্ন-টাইপ বদলেছে (edited_at, deleted_at, is_forwarded, reply_*), তাই আগে drop
drop function if exists public.get_messages(text, bigint, integer);
create or replace function public.get_messages(p_username text, p_before bigint default null::bigint, p_limit integer default 30)
returns table(id bigint, is_mine boolean, body text, media_url text, media_type text, created_at timestamptz, read_at timestamptz,
              my_reaction text, reactions jsonb, edited_at timestamptz, deleted_at timestamptz, is_forwarded boolean, reply_to_id bigint,
              reply_state text, reply_body text, reply_media_type text, reply_is_mine boolean)
language plpgsql stable security definer set search_path to 'public' as $function$
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
                              group by r.emoji) x), '[]'::jsonb),
           m.edited_at, m.deleted_at, m.is_forwarded,
           m.reply_to_id,
           case when m.reply_to_id is null then null else coalesce(rm.st, 'hidden') end,
           case when rm.st = 'ok' then left(rm.body, 140) end,
           case when rm.st = 'ok' then rm.media_type end,
           case when rm.st = 'ok' then (rm.sender_id = v_me) end
      from public.chat_messages m
      left join lateral (
        select r2.body, r2.media_type, r2.sender_id,
               case when r2.deleted_at is not null then 'deleted'
                    when (v_since is not null and r2.created_at <= v_since)
                      or exists (select 1 from public.chat_message_hidden h where h.message_id = r2.id and h.user_id = v_me) then 'hidden'
                    else 'ok' end as st
          from public.chat_messages r2
         where r2.id = m.reply_to_id and r2.conversation_id = v_conv.id
      ) rm on true
     where m.conversation_id = v_conv.id
       and (p_before is null or m.id < p_before)
       and (v_since is null or m.created_at > v_since)
       and not exists (select 1 from public.chat_message_hidden h where h.message_id = m.id and h.user_id = v_me)
     order by m.id desc
     limit greatest(1, least(coalesce(p_limit, 30), 50));
end;
$function$;

-- list_conversations / get_chat_counters / react_to_message: মোছা ও "আমার থেকে লুকানো" মেসেজ বাদ দিতে (chat_preview_text ব্যবহার করে) হালনাগাদ হয়েছে।
-- তাদের বর্তমান সংজ্ঞা লাইভ ডাটাবেসে (`select pg_get_functiondef('public.list_conversations(text,integer,integer)'::regprocedure)`); মূল কাঠামো messages-schema.sql-এ।

-- ---- ৪) গ্র্যান্ট (লাইভের অবস্থা: শুধু authenticated; anon/public নয়) ----
revoke all on function public.chat_preview_text(text, text, boolean) from public, anon;
revoke all on function public.chat_post_message(uuid, uuid, text, text, text, bigint, boolean) from public, anon, authenticated;   -- ভেতরের হেল্পার
revoke all on function public.send_message(text, text, text, text, bigint) from public, anon;
revoke all on function public.edit_message(bigint, text) from public, anon;
revoke all on function public.delete_message_for_everyone(bigint) from public, anon;
revoke all on function public.hide_message_for_me(bigint) from public, anon;
revoke all on function public.forward_message(bigint, text) from public, anon;
revoke all on function public.get_messages(text, bigint, integer) from public, anon;
grant execute on function public.send_message(text, text, text, text, bigint) to authenticated;
grant execute on function public.edit_message(bigint, text) to authenticated;
grant execute on function public.delete_message_for_everyone(bigint) to authenticated;
grant execute on function public.hide_message_for_me(bigint) to authenticated;
grant execute on function public.forward_message(bigint, text) to authenticated;
grant execute on function public.get_messages(text, bigint, integer) to authenticated;
-- Realtime: chat_messages আগে থেকেই publication-এ — এডিট/মোছা UPDATE ইভেন্ট হয়ে আসে (js/chat.js শোনে)।
