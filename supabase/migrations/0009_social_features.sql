-- 0009: social features — feedback, chat edit/delete windows, group chats, paid/free challenges

-- ============================================================
-- FEEDBACK
-- ============================================================
create table if not exists public.feedback (
  id text primary key,
  user_id text references public.profiles(id) on delete set null,
  category text not null default 'general',
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists feedback_insert_own on public.feedback;
create policy feedback_insert_own
  on public.feedback for insert to authenticated
  with check (user_id = auth.uid()::text);

drop policy if exists feedback_select_own on public.feedback;
create policy feedback_select_own
  on public.feedback for select to authenticated
  using (user_id = auth.uid()::text);

drop policy if exists feedback_admin on public.feedback;
create policy feedback_admin
  on public.feedback for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- CHAT MESSAGE EDIT / DELETE WINDOWS
-- ============================================================
alter table public.chat_messages
  add column if not exists edited_at timestamptz;

-- 15-minute edit window (server-enforced; client gating is UX only)
create or replace function public.enforce_chat_message_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    new.edited := true;
    new.edited_at := now();
    return new;
  end if;
  if old.sender_key <> auth.uid()::text then
    raise exception 'not your message';
  end if;
  if now() - old.created_at > interval '15 minutes' then
    raise exception 'edit window closed (15 minutes)';
  end if;
  new.edited := true;
  new.edited_at := now();
  return new;
end;
$$;

drop trigger if exists chat_messages_edit_guard on public.chat_messages;
create trigger chat_messages_edit_guard
  before update on public.chat_messages
  for each row
  when (old.text is distinct from new.text)
  execute function public.enforce_chat_message_update();

-- 5-hour delete window (server-enforced; client gating is UX only)
create or replace function public.enforce_chat_message_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return old;
  end if;
  if old.sender_key <> auth.uid()::text then
    raise exception 'not your message';
  end if;
  if now() - old.created_at > interval '5 hours' then
    raise exception 'delete window closed (5 hours)';
  end if;
  return old;
end;
$$;

drop trigger if exists chat_messages_delete_guard on public.chat_messages;
create trigger chat_messages_delete_guard
  before delete on public.chat_messages
  for each row
  execute function public.enforce_chat_message_delete();

-- ============================================================
-- CHALLENGES — admin-posted, free & paid
-- ============================================================
alter table public.challenges
  add column if not exists created_by text references public.profiles(id) on delete set null;
alter table public.challenges
  add column if not exists is_official boolean not null default false;
alter table public.challenges
  add column if not exists is_paid boolean not null default false;
alter table public.challenges
  add column if not exists price numeric not null default 0;
alter table public.challenges
  add column if not exists currency text not null default 'USD';
alter table public.challenges
  add column if not exists status text not null default 'active';

alter table public.challenge_entries
  add column if not exists payment_status text;
alter table public.challenge_entries
  add column if not exists paid_amount numeric;

-- one entry per user per challenge
create unique index if not exists challenge_entries_unique
  on public.challenge_entries (challenge_id, user_id);

-- admin can manage challenges + entries
drop policy if exists challenges_admin on public.challenges;
create policy challenges_admin
  on public.challenges for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists challenge_entries_admin on public.challenge_entries;
create policy challenge_entries_admin
  on public.challenge_entries for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- users cannot set their own payment_status to anything but 'pending'
create or replace function public.guard_challenge_entry_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_status is not null and new.payment_status <> 'pending' then
    if not public.is_admin() then
      raise exception 'payment status can only be set by an admin';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists challenge_entry_insert_guard on public.challenge_entries;
create trigger challenge_entry_insert_guard
  before insert on public.challenge_entries
  for each row
  execute function public.guard_challenge_entry_insert();
