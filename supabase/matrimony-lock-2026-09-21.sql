-- পাত্র-পাত্রী সিকিউরিটি ফিক্স (২০২৬-০৯-২১) — ✅ লাইভ ডাটাবেসে প্রয়োগ করা আছে (migration: matrimony_lock_raw_tables)
-- ফাইলটি রেফারেন্সের জন্য; আবার চালালেও সমস্যা নেই।
--
-- সমস্যা: matrimony-phone-privacy.sql-এর "ধাপ ২ (তালা)" লাইভে কখনো চালানো হয়নি। ফলে anon (গেস্ট) API দিয়ে
--   সরাসরি matrimony_entries টেবিল পড়ে phone (এমনকি phone_public=false হলেও), user_id ও status পেত।
--   পুরনো matrimonial_profiles টেবিলেও (পেজ এখন /matrimony-তে রিডাইরেক্ট) phone + user_id পাবলিক ছিল।
--   এছাড়া anon/authenticated-এর TRUNCATE/REFERENCES/TRIGGER প্রিভিলেজ ছিল (TRUNCATE RLS বাইপাস করে)।

-- 1) matrimony_entries: পাবলিক সরাসরি পড়া বন্ধ — পাবলিক তালিকা শুধু matrimony_public ভিউ থেকে
drop policy if exists "public can read approved matrimony entries" on public.matrimony_entries;
revoke select on public.matrimony_entries from anon;

-- 2) ভয়ংকর প্রিভিলেজ তুলে নেওয়া
revoke truncate, references, trigger on public.matrimony_entries from anon, authenticated;
revoke truncate, references, trigger on public.matrimonial_profiles from anon, authenticated;

-- 3) পুরনো matrimonial_profiles: পাবলিক read বন্ধ (অ্যাডমিন ও মালিক পড়তে পারে)
drop policy if exists "public can read approved matrimonial profiles" on public.matrimonial_profiles;
revoke select on public.matrimonial_profiles from anon;

-- রোলব্যাক (দরকার হলে):
--   create policy "public can read approved matrimony entries" on public.matrimony_entries for select to public using (status = 'approved');
--   grant select on public.matrimony_entries to anon;
