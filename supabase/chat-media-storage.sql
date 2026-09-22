-- মেসেজিং ধাপ ৩ — `chat-media` স্টোরেজ বাকেট ও পলিসি (প্রাইভেট; ছবি/ভিডিও মেসেজের জন্য)
-- ⚠️ এটা লাইভ Supabase-এ ইতিমধ্যে প্রয়োগ করা আছে (migration: chat_media_bucket_and_policies ও
--    chat_media_delete_own_policy, ২০২৬-০৯-২১)। এই ফাইলটা শুধু রেকর্ড/নতুন প্রজেক্টে পুনরায় বসানোর জন্য।
-- নিয়ম: পাথ = <নিজের auth.uid()>/<ফাইলের-নাম>; send_message RPC একই ছাঁচ + storage.objects-এ ফাইল আছে কিনা যাচাই করে।

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media', 'chat-media', false, 8388608,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do nothing;

-- আপলোড: শুধু নিজের <auth.uid()>/... পাথে (anon — গেস্ট — কোনোভাবেই নয়)
create policy "chat_media_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- পড়া: নিজের আপলোড করা ফাইল, অথবা যে কথোপকথনে আমি অংশগ্রহণকারী তার কোনো মেসেজের মিডিয়া (signed URL তৈরির জন্য)
create policy "chat_media_select_own_or_participant"
on storage.objects for select to authenticated
using (
  bucket_id = 'chat-media'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.chat_messages m
      join public.chat_conversations c on c.id = m.conversation_id
      where m.media_url = storage.objects.name
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  )
);

-- মেসেজ পাঠানো ব্যর্থ হলে/"মুছুন" চাপলে ক্লায়েন্ট নিজের আপলোড করা ফাইল মুছতে পারবে (orphan ফাইল এড়াতে)
create policy "chat_media_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
