-- matrimony_entries — অ্যাডমিন-ভেরিফাইড ব্যাজ ("ভেরিফাইড") — matrimony.html
-- ✅ এই মাইগ্রেশন লাইভ ডাটাবেসে ইতিমধ্যে প্রয়োগ করা হয়েছে (migration: matrimony_entries_is_verified).
--    ফাইলটি শুধু রেফারেন্স/পুনরায় তৈরির জন্য; আবার চালালেও সমস্যা নেই।
--
-- • is_verified: ডিফল্ট false। শুধু অ্যাডমিন (admin.html → পাত্র-পাত্রী (নতুন) → "ভেরিফাইড করুন") true করতে পারে
--   — বিদ্যমান "admin can manage matrimony entries" (is_admin()) পলিসির মাধ্যমে।
-- • পাবলিক ফর্ম থেকে জমার পলিসিতে `is_verified = false` শর্ত যোগ হয়েছে, যাতে কেউ API দিয়ে নিজে
--   is_verified = true পাঠিয়ে ব্যাজ নিতে না পারে।

alter table public.matrimony_entries
  add column if not exists is_verified boolean not null default false;

drop policy if exists "public can submit matrimony entry" on public.matrimony_entries;
create policy "public can submit matrimony entry"
  on public.matrimony_entries for insert to public
  with check (status = 'pending' and is_demo = false and is_verified = false);
