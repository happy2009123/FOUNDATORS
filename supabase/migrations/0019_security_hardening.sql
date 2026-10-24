-- ════════════════════════════════════════════════════════════════════
-- 0019 — SECURITY HARDENING
-- Fixes the pre-launch security audit:
--   F1  8 tables had policies but RLS never ENABLED (open to anon)
--   F2  profiles.email readable by every signed-in user
--   F3  any user could UPDATE any voice room
--   F4  voice signalling rows readable/deletable by anyone
--   F5  chat reactions readable across all private chats
--   F6  referral self-activation (Builder Score fraud)
--   F7  collab request sender could self-accept
--   F10 private Idea Vault comments leaked via idea_comments
--   F13 connection_requests status spoofable by the sender
--   F15 unauthenticated view-counter RPC inflation
--   F8  any user could UPDATE any project's tasks
--   F9  any chat member could rewrite chat metadata / kick everyone
--   F12 users could self-grant achievements / spam the catalog
-- Run in the Supabase SQL Editor (idempotent).
-- ════════════════════════════════════════════════════════════════════

-- ─── F1: enable RLS on the 0013 tables (policies existed, inert) ───
alter table public.post_reactions       enable row level security;
alter table public.poll_votes           enable row level security;
alter table public.recommendations      enable row level security;
alter table public.endorsements         enable row level security;
alter table public.connection_requests  enable row level security;
alter table public.connections          enable row level security;
alter table public.followed_topics      enable row level security;
alter table public.story_highlights     enable row level security;

-- ─── F2: move emails out of the client-readable profiles table ───
create table if not exists public.profiles_private (
  user_id text primary key references public.profiles(id) on delete cascade,
  email   text
);
-- RLS on, zero policies => only the service role can read/write.
alter table public.profiles_private enable row level security;

-- Signup trigger now writes the email to the private table only.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta      jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name    text;
  v_handle  text;
  v_avatar  text;
begin
  v_name := coalesce(
    nullif(meta->>'name', ''),
    nullif(meta->>'full_name', ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'User'
  );
  v_handle := '@' || lower(regexp_replace(v_name, '\s+', '', 'g'));
  v_avatar := coalesce(nullif(meta->>'avatar_url', ''), nullif(meta->>'picture', ''));

  insert into public.profiles (id, name, handle, avatar, profile_completed, created_at, updated_at)
  values (new.id::text, v_name, v_handle, v_avatar, false, now(), now())
  on conflict (id) do nothing;

  if new.email is not null then
    insert into public.profiles_private (user_id, email)
    values (new.id::text, new.email)
    on conflict (user_id) do update set email = excluded.email;
  end if;

  return new;
exception
  when others then
    raise notice 'handle_new_user skipped: %', sqlerrm;
    return new;
end;
$$;

-- Backfill the private table (auth users first — authoritative), then
-- any legacy/Firebase-migrated profile rows the auth table doesn't know.
insert into public.profiles_private (user_id, email)
select u.id::text, u.email from auth.users u
where u.email is not null
on conflict (user_id) do update set email = excluded.email;

insert into public.profiles_private (user_id, email)
select p.id, p.email from public.profiles p
where p.email is not null
  and not exists (select 1 from public.profiles_private pp where pp.user_id = p.id);

-- Strip the now-private column from the client-visible table.
update public.profiles set email = null where email is not null;

-- ─── F3: voice rooms — host or participant (or joiner of an unlocked
--         room) may update, and non-hosts can only touch roster/lists ───
drop policy if exists voice_sessions_update_member on public.voice_sessions;
create policy voice_sessions_update_member on public.voice_sessions for update
  to authenticated
  using (
    host_id = auth.uid()::text
    or participants @> array[auth.uid()::text]
    or (active = true and coalesce(is_locked, false) = false)
  )
  with check (
    host_id = auth.uid()::text
    or participants @> array[auth.uid()::text]
    or (active = true and coalesce(is_locked, false) = false)
  );

create or replace function public.voice_sessions_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare uid text := auth.uid()::text;
begin
  if uid is null then return new; end if;      -- service role
  if uid = old.host_id then return new; end if; -- the host owns the room
  if new.id is distinct from old.id
     or new.host_id is distinct from old.host_id
     or new.active is distinct from old.active
     or new.ended_at is distinct from old.ended_at
     or new.title is distinct from old.title
     or new.is_locked is distinct from old.is_locked then
    raise exception 'only the host can change this field';
  end if;
  return new;
end;
$$;
drop trigger if exists voice_sessions_guard on public.voice_sessions;
create trigger voice_sessions_guard
  before update on public.voice_sessions
  for each row execute function public.voice_sessions_guard();

-- ─── F4: voice signals — only the two endpoints of a call, or the
--         session host (room teardown deletes by session_id) ───
drop policy if exists voice_signals_all on public.voice_signals;
drop policy if exists voice_signals_select on public.voice_signals;
drop policy if exists voice_signals_insert_member on public.voice_signals;
drop policy if exists voice_signals_delete_member on public.voice_signals;
create policy voice_signals_select on public.voice_signals for select
  to authenticated using (
    from_id = auth.uid()::text
    or to_id = auth.uid()::text
    or exists (
      select 1 from public.voice_sessions vs
      where vs.id = session_id and vs.host_id = auth.uid()::text
    )
  );
create policy voice_signals_insert_member on public.voice_signals for insert
  to authenticated with check (from_id = auth.uid()::text);
create policy voice_signals_delete_member on public.voice_signals for delete
  to authenticated using (
    from_id = auth.uid()::text
    or to_id = auth.uid()::text
    or exists (
      select 1 from public.voice_sessions vs
      where vs.id = session_id and vs.host_id = auth.uid()::text
    )
  );

-- ─── F5: message reactions — chat members only ───
drop policy if exists "react_select" on public.message_reactions;
create policy "react_select" on public.message_reactions for select
  to authenticated using (
    exists (
      select 1 from public.chats c
      where c.id = chat_id
        and c.participants @> array[auth.uid()::text]
    )
  );

-- ─── F6: referral invites — invitee-only insert as pending; all
--         client UPDATE dropped (activation is the activate_referral()
--         SECURITY DEFINER RPC only) ───
drop policy if exists referral_insert_own on public.referral_invites;
create policy referral_insert_own on public.referral_invites for insert
  to authenticated with check (
    invited_id = auth.uid()::text
    and inviter_id <> auth.uid()::text
    and coalesce(status, 'pending') = 'pending'
    and activated_at is null
  );
drop policy if exists referral_update_own on public.referral_invites;

-- ─── F7: collab requests — only the recipient may accept/decline;
--         the sender may re-send (status back to pending) but never
--         self-accept; parties are immutable ───
drop policy if exists collab_update on public.collab_requests;
create policy collab_update on public.collab_requests for update
  to authenticated
  using (from_id = auth.uid()::text or to_id = auth.uid()::text)
  with check (from_id = auth.uid()::text or to_id = auth.uid()::text);

create or replace function public.collab_requests_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare uid text := auth.uid()::text;
begin
  if uid is null then return new; end if;
  if tg_op = 'INSERT' then
    if new.from_id <> uid then raise exception 'from_id must be you'; end if;
    new.status := 'pending';
    return new;
  end if;
  if new.from_id is distinct from old.from_id
     or new.to_id is distinct from old.to_id
     or new.id is distinct from old.id then
    raise exception 'collab request parties are immutable';
  end if;
  if uid = old.from_id and new.status is distinct from 'pending' then
    raise exception 'only the recipient can accept or decline';
  end if;
  return new;
end;
$$;
drop trigger if exists collab_requests_guard on public.collab_requests;
create trigger collab_requests_guard
  before insert or update on public.collab_requests
  for each row execute function public.collab_requests_guard();

-- ─── F13: connection requests — client UPDATE dropped entirely
--          (accept/decline goes through respond_connection_request());
--          inserts are always pending and from yourself ───
drop policy if exists connection_requests_update on public.connection_requests;
drop policy if exists connection_requests_insert_own on public.connection_requests;
create policy connection_requests_insert_own on public.connection_requests for insert
  to authenticated with check (
    from_id = auth.uid()::text
    and to_id <> auth.uid()::text
    and coalesce(status, 'pending') = 'pending'
  );

-- ─── F8: project tasks — only project owner or members may update ───
drop policy if exists project_tasks_update_member on public.project_tasks;
create policy project_tasks_update_member on public.project_tasks for update
  to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (p.owner_id = auth.uid()::text
             or exists (select 1 from public.project_members m
                        where m.project_id = project_id and m.user_id = auth.uid()::text))
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (p.owner_id = auth.uid()::text
             or exists (select 1 from public.project_members m
                        where m.project_id = project_id and m.user_id = auth.uid()::text))
    )
  );

-- ─── F9: chats — column-level guard: members may update previews/
--         read-receipts; only the owner (participants[1]) may remove
--         members, transfer ownership or edit group details ───
create or replace function public.chats_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare uid     text := auth.uid()::text;
declare removed text[];
begin
  if uid is null then return new; end if; -- service role
  if tg_op = 'INSERT' then return new; end if;

  if new.participants is distinct from old.participants then
    if new.participants is null or not (new.participants @> array[uid]) then
      raise exception 'you must remain a participant of this chat';
    end if;
    select array_agg(p) into removed
      from unnest(old.participants) p
      where not (new.participants @> array[p]);
    if removed is not null and array_length(removed, 1) > 0 then
      if uid <> old.participants[1] then
        raise exception 'only the chat owner can remove members';
      end if;
      if removed @> array[old.participants[1]] then
        raise exception 'the owner cannot be removed';
      end if;
    end if;
    if new.participants[1] is distinct from old.participants[1]
       and uid <> old.participants[1] then
      raise exception 'only the chat owner can transfer ownership';
    end if;
  end if;

  if (new.group_name is distinct from old.group_name)
     or (new.group_avatar is distinct from old.group_avatar) then
    if uid <> old.participants[1] then
      raise exception 'only the chat owner can edit group details';
    end if;
  end if;

  return new;
end;
$$;
drop trigger if exists chats_guard on public.chats;
create trigger chats_guard
  before insert or update on public.chats
  for each row execute function public.chats_guard();

-- Deleting a whole conversation is an owner action too.
drop policy if exists chats_delete_member on public.chats;
create policy chats_delete_member on public.chats for delete
  to authenticated using (participants[1] = auth.uid()::text);

-- ─── F10: idea comments follow the parent idea's visibility ───
drop policy if exists idea_comments_select on public.idea_comments;
create policy idea_comments_select on public.idea_comments for select
  to authenticated using (
    is_admin()
    or exists (
      select 1 from public.ideas i
      where i.id = idea_id
        and (
          i.is_private = false
          or i.author_key = auth.uid()::text
          or exists (
            select 1 from public.idea_vault_members m
            where m.idea_id = i.id and m.user_id = auth.uid()::text
          )
        )
    )
  );

-- ─── F12 + F14: achievements — catalog is admin-written; users may
--         only award THEMSELVES a badge that actually exists ───
drop policy if exists achievements_insert on public.achievements;
create policy achievements_insert on public.achievements for insert
  to authenticated with check (is_admin());

drop policy if exists user_achievements_insert_own on public.user_achievements;
create policy user_achievements_insert_own on public.user_achievements for insert
  to authenticated with check (
    user_id = auth.uid()::text
    and exists (select 1 from public.achievements a where a.id = achievement_id)
  );

-- ─── F15: view-counter RPCs require a session; anon loses EXECUTE ───
create or replace function public.increment_post_view(p_post_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.posts set view_count = view_count + 1 where id = p_post_id;
end;
$$;
revoke execute on function public.increment_post_view(text) from anon, public;
grant  execute on function public.increment_post_view(text) to authenticated;

create or replace function public.increment_gesture_template_view(p_template_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.gesture_templates set views = views + 1 where id = p_template_id;
end;
$$;
revoke execute on function public.increment_gesture_template_view(text) from anon, public;
grant  execute on function public.increment_gesture_template_view(text) to authenticated;

create or replace function public.increment_gesture_view(p_instance_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.gesture_instances set views = views + 1 where id = p_instance_id;
end;
$$;
revoke execute on function public.increment_gesture_view(text) from anon, public;
grant  execute on function public.increment_gesture_view(text) to authenticated;
