-- ============================================================================
-- টাঙ্গাইল জেলা — ইউজার প্রোফাইল সিস্টেম (ধাপ ২): পুরনো ইউজারদের জন্য
-- username ব্যাকফিল (fallback তৈরি)
-- ============================================================================
-- ধাপ ১-এ যাচাই করা হয়েছে: এখন মোট ৪ জন ইউজার, সবার username = NULL।
-- এই ফাংশন ইমেইলের লোকাল-পার্ট থেকে username বানায় (Bengali নাম থেকে না,
-- কারণ ^[a-z0-9_]{3,20}$ ফরম্যাটে বাংলা টেক্সট মানানসই না)।
--
-- বার বার নিরাপদে চালানো যায় (idempotent) — শুধু username IS NULL রো-গুলো
-- টাচ করে, তাই নতুন সাইনআপ হওয়া ইউজারদের জন্যও ভবিষ্যতে দরকার হলে আবার
-- চালানো যাবে।
-- ============================================================================

create or replace function public.backfill_missing_usernames()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  base text;
  candidate text;
  n int;
  updated_count int := 0;
begin
  for r in
    select id, email, full_name
    from public.profiles
    where username is null
    order by created_at asc
  loop
    -- ইমেইলের লোকাল-পার্ট থেকে বেস বানানো, শুধু a-z0-9_ রাখা
    base := regexp_replace(lower(split_part(coalesce(r.email, ''), '@', 1)), '[^a-z0-9_]', '', 'g');

    -- খুব ছোট/খালি হলে (বাংলা ইমেইল লোকাল-পার্ট, বা ইমেইল নেই) fallback
    if length(base) < 3 then
      base := 'user' || substr(replace(r.id::text, '-', ''), 1, 6);
    end if;

    -- সর্বোচ্চ ১৫ ক্যারেক্টার রাখা হচ্ছে যাতে সাফিক্স যোগ করার জায়গা থাকে (কলাম সীমা ২০)
    base := substr(base, 1, 15);

    candidate := base;
    n := 1;
    -- কলিশন হলে সংখ্যা যোগ করে ইউনিক করা (abir, abir2, abir3, ...)
    while exists (select 1 from public.profiles where lower(username) = candidate and id <> r.id) loop
      n := n + 1;
      candidate := substr(base, 1, 15) || n::text;
    end loop;

    update public.profiles set username = candidate where id = r.id;
    updated_count := updated_count + 1;
  end loop;

  return updated_count;
end;
$$;

-- এই ফাংশনটা শুধু অ্যাডমিন/সার্ভিস থেকে চালানোর জন্য — anon/authenticated-কে
-- grant করা হচ্ছে না (ইচ্ছাকৃত), যাতে সাধারণ ইউজার bulk-ভাবে ডেটা না বদলাতে পারে।

-- চালাতে: select public.backfill_missing_usernames();
