-- ============================================================================
-- টাঙ্গাইল জেলা — চ্যাটে "ফ্রেন্ড" = follows.status = 'accepted' (migration `chat_friend_requires_accepted`)
-- ============================================================================
-- ✅ লাইভ Supabase-এ প্রয়োগ করা হয়েছে (২০২৬-০৯-২১, ইউজারের স্পষ্ট সম্মতিতে: "বদলাও প্রয়োজন হলে", MCP দিয়ে সরাসরি)।
-- কেন: ফ্রেন্ড রিকোয়েস্ট সিস্টেম (follows.status: pending → accepted, migration `friend_requests_accept_flow`) আসার পর
--   চ্যাটের `chat_is_accepted()` status না দেখে যেকোনো follows সারিকে (pending সহ) "ফ্রেন্ড" ধরত — ফলে রিকোয়েস্ট
--   পাঠানো মাত্র রিসিভারের চ্যাট চালু হয়ে যেত, গ্রহণের অপেক্ষা করত না।
-- কী বদলাল (শুধু ২টা ফাংশন, create or replace — টেবিল/পলিসি/গ্রান্ট অপরিবর্তিত; গ্রান্ট আগের মতোই:
--   chat_is_accepted → কারও execute নেই (অভ্যন্তরীণ); get_chat_state → শুধু authenticated):
--   ১) chat_is_accepted(conv): দুই দিকের যেকোনো একটা follows সারি status = 'accepted' হলে true
--      (আগে: শুধু "রিসিভার → ইনিশিয়েটর" দিকের যেকোনো সারি, status-নির্বিশেষে)।
--      chat_post_message / list_conversations / get_messages-এর accepted-চেক এই ফাংশনেই চলে — তাই সেগুলোর কোড বদলায়নি।
--   ২) get_chat_state: কথোপকথন শুরুর আগে মিডিয়া-অনুমতি ও "৫ মেসেজ" সীমা এখন accepted ফ্রেন্ডের (v_friend) উপর
--      (আগে: "তিনি আমাকে follow করেছেন" — pending সহ)। i_follow_them / they_follow_me কলাম আগের মতোই (যেকোনো status; ফ্রন্টএন্ড ব্যবহার করে না)।
-- প্রভাব (লাইভ ডেটায়, প্রয়োগের সময়): ৩টা কথোপকথনের মধ্যে ১টা (jeniya0244 ↔ অন্য টেস্ট অ্যাকাউন্ট, ১৪ মেসেজ) আগে "accepted" ছিল
--   কারণ দুই দিকেই pending সারি ছিল; এখন সেটা রিকোয়েস্ট-অবস্থায় (ইনিশিয়েটরের ৫-মেসেজ সীমা শেষ) — কেউ ফ্রেন্ড রিকোয়েস্ট গ্রহণ করলে আবার চালু হবে।
--   অন্য একটা কথোপকথন (accepted সারি আছে) আগে accepted দেখাত না, এখন দেখায় — সঠিক।
-- ============================================================================

create or replace function public.chat_is_accepted(p_conv public.chat_conversations)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.follows f
     where f.status = 'accepted'
       and ((f.follower_id = p_conv.user_a and f.following_id = p_conv.user_b)
         or (f.follower_id = p_conv.user_b and f.following_id = p_conv.user_a))
  );
$function$;

-- get_chat_state: পূর্ণ সংজ্ঞা লাইভ থেকে দেখুন (`select pg_get_functiondef('public.get_chat_state(text)'::regprocedure)`)।
-- বদলটুকু: `v_friend boolean` ঘোষণা; v_tF-এর পরে
--   v_friend := exists (select 1 from public.follows f where f.status = 'accepted'
--                        and ((f.follower_id = v_me and f.following_id = v_other)
--                          or (f.follower_id = v_other and f.following_id = v_me)));
-- এবং `if not v_have then v_state := 'none'; v_media := v_friend; if not v_friend then v_left := 5; end if; ...`
