-- চ্যাট-মিডিয়া অ্যাডমিন ক্লিনআপ (মেসেজিং ধাপ ৫) — লাইভে প্রয়োগ করা আছে (২০২৬-০৯-২১)
-- এই ফাইল লাইভে প্রয়োগ-হওয়া দুটি migration-এর রেকর্ড (পুনরায় চালালে policy দুটো আগে drop করতে হবে):
--   ১) chat_media_admin_cleanup            (version 20260921070404)
--   ২) chat_media_admin_orphan_only_policies (version 20260921071157) — ১-এর একটা ফাঁক ঠিক করে
--
-- কী করে: অ্যাডমিন প্যানেলে "N দিনের পুরনো চ্যাট-মিডিয়া মুছুন"-এর জন্য —
--   • admin_list_old_chat_media(p_days): শুধু "অনাথ" (কোনো chat_messages.media_url-এর সাথে যুক্ত নয়) ও
--     p_days-এর চেয়ে পুরনো chat-media ফাইলের নাম/সাইজ/তারিখ দেয় — মেসেজের লেখা নয়। শুধু admin, নাহলে 'unauthorized'।
--   • অ্যাডমিন storage.remove() দিয়ে শুধু সেই অনাথ ও ১ দিনের বেশি পুরনো ফাইল দেখতে ও মুছতে পারে;
--     সক্রিয় চ্যাটের ছবি/ভিডিও কখনো নয় (chat-media প্রাইভেট বাকেট, তাই SELECT পলিসি ছাড়া storage.remove() নীরবে কিছু মোছে না —
--     ১-এর প্রথম সংস্করণে এই ফাঁক ছিল; লাইভ DB-তে rolled-back টেস্টে ধরা পড়ে, ২ দিয়ে ঠিক হয়েছে)।

-- হেল্পার — মেসেজে ব্যবহৃত নয় এমন ফাইল কিনা (পলিসিতে ব্যবহৃত)
create or replace function public.chat_media_is_orphan(p_name text)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select not exists (select 1 from public.chat_messages m where m.media_url = p_name);
$$;

-- তালিকা RPC
create or replace function public.admin_list_old_chat_media(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'storage'
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'name', o.name,
           'size_bytes', (o.metadata->>'size')::bigint,
           'created_at', o.created_at
         ) order by o.created_at asc), '[]'::jsonb)
    into v_result
    from storage.objects o
   where o.bucket_id = 'chat-media'
     and o.created_at < now() - (greatest(1, coalesce(p_days, 30)) || ' days')::interval
     and not exists (select 1 from public.chat_messages m where m.media_url = o.name);

  return v_result;
end;
$$;

revoke all on function public.admin_list_old_chat_media(integer) from public, anon;
grant execute on function public.admin_list_old_chat_media(integer) to authenticated;

-- স্টোরেজ পলিসি (অ্যাডমিন: শুধু অনাথ + ১ দিনের বেশি পুরনো)
create policy "chat_media_admin_select" on storage.objects
for select to authenticated
using (bucket_id = 'chat-media' and is_admin()
       and created_at < now() - interval '1 day' and public.chat_media_is_orphan(name));

create policy "chat_media_admin_delete" on storage.objects
for delete to authenticated
using (bucket_id = 'chat-media' and is_admin()
       and created_at < now() - interval '1 day' and public.chat_media_is_orphan(name));

-- যাচাই (লাইভ DB-তে rolled-back টেস্টে): অ্যাডমিন-নন → 'unauthorized'; অ্যাডমিন অনাথ ফাইল দেখে/মোছে,
-- সক্রিয় চ্যাটের ফাইল দেখে না/মোছে না।
-- get_advisors(security): নতুন ERROR নেই। নতুন WARN: chat_media_is_orphan ও admin_list_old_chat_media authenticated
-- execute করতে পারে (পলিসি-ইভ্যালুয়েশনের জন্য দরকার; ফাংশন শুধু বুলিয়ান/অ্যাডমিন-গার্ডেড; ফাইলের নাম অনুমান-অযোগ্য)।
