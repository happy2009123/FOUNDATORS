-- 0004: persistent message reactions for chat.
-- The chat UI previously kept reactions in local component state only
-- (lost on refresh, never delivered to the other side). This table makes
-- them real: one emoji per user per message, synced over Supabase realtime.
--
-- Run in Dashboard -> SQL Editor (also run 0003 first if it has not been run yet).

create table if not exists public.message_reactions (
  id          text primary key,
  chat_id     text not null references public.chats(id) on delete cascade,
  message_id  text not null references public.chat_messages(id) on delete cascade,
  user_id     text not null references public.profiles(id) on delete cascade,
  emoji       text not null,
  created_at  timestamptz not null default now()
);

create unique index if not exists message_reactions_msg_user_uidx
  on public.message_reactions (message_id, user_id);
create index if not exists message_reactions_chat_idx
  on public.message_reactions (chat_id);

alter table public.message_reactions enable row level security;

drop policy if exists "react_select" on public.message_reactions;
create policy "react_select" on public.message_reactions
  for select to authenticated using (true);

-- You may only add reactions as yourself, and only inside chats you are in.
drop policy if exists "react_insert" on public.message_reactions;
create policy "react_insert" on public.message_reactions
  for insert to authenticated
  with check (
    user_id = auth.uid()::text
    and exists (
      select 1 from public.chats c
      where c.id = chat_id
        and auth.uid()::text = any (c.participants)
    )
  );

drop policy if exists "react_update" on public.message_reactions;
create policy "react_update" on public.message_reactions
  for update to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

drop policy if exists "react_delete" on public.message_reactions;
create policy "react_delete" on public.message_reactions
  for delete to authenticated
  using (user_id = auth.uid()::text);

-- realtime
do $$
begin
  execute format('alter publication supabase_realtime add table public.%I', 'message_reactions');
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
