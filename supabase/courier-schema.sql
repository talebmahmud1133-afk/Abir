-- courier_offices — courier.html (কুরিয়ার সার্ভিস) — রেফারেন্স ডকুমেন্টেশন
-- ✅ এই টেবিল আপনার Supabase প্রজেক্টে (jexscwcowptcshoalcrw) ইতিমধ্যে লাইভ; নিচের `company` কলাম,
--    দৈর্ঘ্য-সীমা ও "শুধু pending ইনসার্ট" পলিসি Phase 6-এ প্রয়োগ করা হয়েছে (migration:
--    courier_offices_company_and_pending_only_insert). আবার চালানোর দরকার নেই।
-- কলাম: id, created_at, user_id, name, upazila, address, phone, logo_url, maps_url, is_open,
--        status (pending|approved|rejected, ডিফল্ট pending), company (sundarban|sa|jononi|redx|pathao|
--        steadfast|paperfly|ecourier|deliverytiger|dhl বা '' = অন্যান্য)

alter table public.courier_offices add column if not exists company text not null default '';

alter table public.courier_offices
  add constraint courier_offices_len_chk check (
    char_length(name) <= 120 and char_length(address) <= 300 and char_length(phone) <= 20
    and char_length(coalesce(maps_url,'')) <= 500 and char_length(coalesce(logo_url,'')) <= 500
    and char_length(company) <= 40
  );

-- পাবলিক শুধু approved পড়তে পারে (বিদ্যমান পলিসি), শুধু pending জমা দিতে পারে, অ্যাডমিন সব পারে (is_admin())
drop policy if exists "public can register courier office" on public.courier_offices;
create policy "public can register courier office"
  on public.courier_offices for insert to public
  with check (status = 'pending');

-- ============================================================================
-- Phase 8 (v69): ডেমো অফিস ডাটাবেসে (is_demo=true) + আসল অফিস অনুমোদনে ওই উপজেলার ডেমো অটো-ডিলিট
-- ✅ লাইভ প্রজেক্টে প্রয়োগ করা আছে (migration: courier_demo_rows_and_auto_purge) — আবার চালানোর দরকার নেই
-- ============================================================================
alter table public.courier_offices add column if not exists is_demo boolean not null default false;

drop policy if exists "public can register courier office" on public.courier_offices;
create policy "public can register courier office"
  on public.courier_offices for insert to public
  with check (status = 'pending' and is_demo = false);   -- পাবলিক কখনো ডেমো/approved জমা দিতে পারে না

create or replace function public.courier_purge_demo_on_real()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.status = 'approved' and coalesce(new.is_demo, false) = false then
    delete from public.courier_offices where is_demo = true and upazila = new.upazila;
  end if;
  return new;
end;
$fn$;

drop trigger if exists courier_purge_demo_trg on public.courier_offices;
create trigger courier_purge_demo_trg
  after insert or update of status on public.courier_offices
  for each row execute function public.courier_purge_demo_on_real();
