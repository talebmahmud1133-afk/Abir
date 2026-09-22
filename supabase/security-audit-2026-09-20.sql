-- সাইটব্যাপী অডিট (২০২৬-০৯-২০) — লাইভ ডাটাবেসে প্রয়োগ করা পরিবর্তনের রেফারেন্স (আবার চালালেও সমস্যা নেই)

-- ১) লগইন করা সাধারণ ইউজারও ব্যানার/নোটিশ/লিস্টিং দেখবে (আগে পাবলিক read পলিসি শুধু anon-এর ছিল)
alter policy "public can read enabled banners" on public.banners to anon, authenticated;
alter policy "public can read enabled notices" on public.notices to anon, authenticated;
alter policy "public can read enabled popup ad" on public.popup_ad to anon, authenticated;
alter policy "public can read enabled notice" on public.site_notice to anon, authenticated;
alter policy "public can read approved listings" on public.listings to anon, authenticated;

-- ২) রিভিউ/রেটিং টেবিলে read পলিসি ছিল কিন্তু base GRANT ছিল না
grant select on public.tourist_spot_reviews to anon, authenticated;
grant select on public.tsp_category_ratings to anon, authenticated;

-- ৩) নিরাপত্তা: পাবলিক জমায় status='approved' / verified=true পাঠিয়ে অ্যাডমিন অনুমোদন বাইপাস আটকানো
--    (teachers/students সাইটের ডিজাইনে সরাসরি approved — তাই approved চলে, শুধু verified=true আটকানো)
alter policy "public can register shop" on public.shops with check (status = 'pending' and coalesce(verified, false) = false);
alter policy "public can create tuition posts" on public.tuition_posts with check (status = 'pending');
alter policy "public can register as provider" on public.ambulance_providers with check (status = 'pending');
alter policy "public can post job" on public.jobs with check (status = 'pending');
alter policy "public can register hospital" on public.hospitals with check (status = 'pending');
alter policy "public can submit listings" on public.listings with check (status = 'pending');
alter policy "public can register as doctor" on public.doctors with check (status = 'pending' and coalesce(verified, false) = false);
alter policy "public can register as teacher" on public.teachers with check (status in ('pending','approved') and coalesce(verified, false) = false);
alter policy "public can register as student" on public.students with check (status in ('pending','approved'));

-- ৪) matrimony_entries: বয়স/অভিজ্ঞতার সীমা DB-তেও
alter table public.matrimony_entries drop constraint if exists matrimony_entries_age_chk;
alter table public.matrimony_entries add constraint matrimony_entries_age_chk check (age is null or age between 18 and 80);
alter table public.matrimony_entries drop constraint if exists matrimony_entries_experience_chk;
alter table public.matrimony_entries add constraint matrimony_entries_experience_chk check (experience is null or experience between 0 and 60);
