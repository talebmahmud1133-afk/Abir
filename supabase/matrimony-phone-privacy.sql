-- matrimony_entries: "ফোন দেখাবেন না" (phone_public=false) এখন ডাটাবেসেই মানা হয় (আবার চালালেও সমস্যা নেই)
--
-- আগে: পাবলিক পলিসি (status='approved') সারির সব কলাম দিত, phone সহ; phone_public শুধু ব্রাউজারের JS-এ মানা হতো
--       → API দিয়ে (সাইট ছাড়াই) যে কেউ গোপন ফোন পেত।
-- এখন: পাবলিক তালিকা matrimony_public ভিউ থেকে — শুধু approved সারি; phone শুধু phone_public=true হলে,
--       নইলে null; user_id/status নেই। সরাসরি টেবিল পড়তে পারে শুধু মালিক (নিজের সারি) ও অ্যাডমিন।

-- ══ ধাপ ১ — ভিউ যোগ (লাইভে প্রয়োগ করা হয়েছে; পুরনো পেজ ভাঙে না) ══
create or replace view public.matrimony_public
with (security_barrier = true) as
select
  id, created_at, type, name, age, height, education, occupation, upazila, address, religion, whatsapp,
  prev_status, children, family, expectation, experience, relation, for_whom, summary,
  case when phone_public is true then phone else null end as phone,
  phone_public, photo_url, is_demo, extra_photos, is_verified
from public.matrimony_entries
where status = 'approved';

-- নতুন ভিউয়ে ডিফল্টে anon/authenticated-কে লেখার অনুমতিও যায় (আর এই ভিউ auto-updatable) — তাই সব তুলে শুধু SELECT
revoke all on public.matrimony_public from anon, authenticated;
grant select on public.matrimony_public to anon, authenticated;

-- ══ ধাপ ২ — তালা (নতুন সাইট ডিপ্লয় হওয়ার পরে চালাবেন; আগে চালালে পুরনো ক্যাশড পেজে তালিকা লোড হবে না) ══
-- টেবিলে "approved সারি সবাই পড়বে" পলিসি বাদ → গেস্ট/লগইন করা অন্য ইউজার আর টেবিল থেকে phone পড়তে পারবে না।
-- বাকি পলিসি থাকে: "user can read own matrimony entries" (মালিক) ও "admin can manage matrimony entries" (অ্যাডমিন)।
drop policy if exists "public can read approved matrimony entries" on public.matrimony_entries;
revoke select on public.matrimony_entries from anon;
