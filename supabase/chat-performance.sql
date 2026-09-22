-- চ্যাট পারফরম্যান্স-টিউনিং (মেসেজিং, ঐচ্ছিক) — লাইভে প্রয়োগ করা আছে (২০২৬-০৯-২১)
-- migration: chat_rls_initplan_and_fk_indexes
-- ১) চ্যাটের ৪টি SELECT পলিসিতে auth.uid() → (select auth.uid()): প্রতি সারিতে নয়, কোয়েরিতে একবার হিসাব। অ্যাক্সেস-নিয়ম অপরিবর্তিত।
-- ২) ৩টি ফরেন-কী ইনডেক্স: initiator_id, last_sender_id, chat_message_reactions.user_id।
-- যাচাই (rolled-back, লাইভ DB): অংশগ্রহণকারী নিজের কথোপকথন/মেসেজ/রিঅ্যাকশন/ব্লক দেখে; বহিরাগত কিছুই দেখে না;
--   যাকে ব্লক করা হয়েছে সে ব্লক-সারি দেখে না; anon মেসেজ পড়তে পারে না। পরে get_advisors: চ্যাট-সংক্রান্ত initplan/FK লিন্ট গেছে।
-- নোট: নতুন ৩টি ইনডেক্স "unused" INFO দেখাবে — এখনো ট্রাফিক না থাকায়, স্বাভাবিক।

drop policy "chat_conversations: participants read" on public.chat_conversations;
create policy "chat_conversations: participants read" on public.chat_conversations for select to authenticated
  using (((select auth.uid()) = user_a) or ((select auth.uid()) = user_b));

drop policy "chat_messages: participants read" on public.chat_messages;
create policy "chat_messages: participants read" on public.chat_messages for select to authenticated
  using (exists (select 1 from public.chat_conversations c where c.id = chat_messages.conversation_id and (((select auth.uid()) = c.user_a) or ((select auth.uid()) = c.user_b))));

drop policy "chat_message_reactions: participants read" on public.chat_message_reactions;
create policy "chat_message_reactions: participants read" on public.chat_message_reactions for select to authenticated
  using (exists (select 1 from public.chat_messages m join public.chat_conversations c on c.id = m.conversation_id where m.id = chat_message_reactions.message_id and (((select auth.uid()) = c.user_a) or ((select auth.uid()) = c.user_b))));

drop policy "chat_blocks: read own" on public.chat_blocks;
create policy "chat_blocks: read own" on public.chat_blocks for select to authenticated using (blocker_id = (select auth.uid()));

create index if not exists chat_conversations_initiator_idx on public.chat_conversations (initiator_id);
create index if not exists chat_conversations_last_sender_idx on public.chat_conversations (last_sender_id);
create index if not exists chat_message_reactions_user_idx on public.chat_message_reactions (user_id);
