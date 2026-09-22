-- post_likes: "আনলাইক" শুধু সেই ডিভাইসই করতে পারবে যে লাইক করেছে (আবার চালালেও সমস্যা নেই)
--
-- আগে: DELETE পলিসি using (true) ছিল, আর SELECT পাবলিক ছিল (device_id সবাই দেখতে পেত)
--       → যে কেউ যেকোনো লাইক মুছতে পারত।
-- এখন: ব্রাউজার সরাসরি টেবিল থেকে মুছতে পারে না; শুধু unlike_post(post_id, device_id) ফাংশন দিয়ে,
--       আর device_id কেউ পড়তে পারে না (শুধু অ্যাডমিন) — তাই অন্যের লাইক মোছার উপায় নেই।
--       লাইক দেওয়া (INSERT) আগের মতোই।

-- ══ ধাপ ১ — যোগ করা (সাইট ডিপ্লয়ের আগে/পরে যেকোনো সময় নিরাপদে চালানো যায়; পুরনো পেজ ভাঙে না) ══
create or replace function public.unlike_post(p_post_id uuid, p_device_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  -- খালি/ছোট আইডি দিয়ে অনুমান করে মোছা আটকানো (সাইটের আইডি ~২৮ অক্ষরের)
  if p_device_id is null or length(p_device_id) < 16 then
    return false;
  end if;
  delete from public.post_likes where post_id = p_post_id and device_id = p_device_id;
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

revoke all on function public.unlike_post(uuid, text) from public;
grant execute on function public.unlike_post(uuid, text) to anon, authenticated;

-- ══ ধাপ ২ — তালা লাগানো (নতুন সাইট ডিপ্লয় হওয়ার পরে চালাবেন; আগে চালালে পুরনো পেজে আনলাইক কাজ করবে না) ══
drop policy if exists "public can unlike posts" on public.post_likes;
drop policy if exists "public can read post likes" on public.post_likes;

-- অ্যাডমিন (মডারেশনের জন্য) দেখতে/মুছতে পারবে
drop policy if exists "admin can read post likes" on public.post_likes;
create policy "admin can read post likes" on public.post_likes
  for select to authenticated using (public.is_admin());
drop policy if exists "admin can delete post likes" on public.post_likes;
create policy "admin can delete post likes" on public.post_likes
  for delete to authenticated using (public.is_admin());

-- গেস্ট (anon) আর টেবিল পড়তে/মুছতে পারবে না; INSERT (লাইক দেওয়া) আগের মতোই
revoke select, delete on public.post_likes from anon;
