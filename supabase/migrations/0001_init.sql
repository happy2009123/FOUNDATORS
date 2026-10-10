-- ============================================================
-- FOUNDATORS — Supabase migration: initial schema + RLS
-- Branch: supabase-migration
-- Run this file ONCE in the Supabase Dashboard → SQL Editor.
-- All ids are TEXT so migrated Firebase UIDs keep working.
-- ============================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ─── PROFILES ───────────────────────────────────────────────
-- id = Supabase auth uid for new accounts, or the original Firebase UID
-- for migrated accounts (hence TEXT, no FK to auth.users).
create table if not exists public.profiles (
  id               text primary key,
  email            text,
  name             text not null default '',
  handle           text not null default '',
  bio              text not null default '',
  avatar           text,
  role             text not null default '',
  location         text not null default '',
  website          text not null default '',
  skills           text[] not null default '{}',
  followers        integer not null default 0,
  following        integer not null default 0,
  verified         boolean not null default false,
  profile_completed boolean not null default false,
  onboarded        boolean not null default false,
  banned           boolean not null default false,
  last_seen        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists profiles_handle_idx on public.profiles (handle);
create index if not exists profiles_name_idx on public.profiles (name);

-- ─── ADMINS ─────────────────────────────────────────────────
-- Server/DB-authorized roles. NEVER trusted from the client.
create table if not exists public.admins (
  user_id    text primary key references public.profiles(id) on delete cascade,
  role       text not null default 'admin',
  granted_by text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid()::text);
$$;

-- ─── POSTS ──────────────────────────────────────────────────
create table if not exists public.posts (
  id            text primary key,
  text          text not null default '',
  author_key    text not null references public.profiles(id) on delete cascade,
  author_name   text not null default '',
  author_avatar text,
  tag_type      text not null default 'update',
  image_url     text,
  reposted_from text,
  liked_by      text[] not null default '{}',
  bookmarked_by text[] not null default '{}',
  likes         integer not null default 0,
  shares        integer not null default 0,
  comments_count integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists posts_author_created_idx on public.posts (author_key, created_at desc);
create index if not exists posts_created_idx on public.posts (created_at desc);

-- ─── COMMENTS (flat table; subcollection shape kept via post_id) ──
create table if not exists public.comments (
  id            text primary key,
  post_id       text not null references public.posts(id) on delete cascade,
  text          text not null default '',
  author_key    text not null references public.profiles(id) on delete cascade,
  author_name   text not null default '',
  author_avatar text,
  reply_to      text,
  liked_by      text[] not null default '{}',
  likes         integer not null default 0,
  edited        boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

create index if not exists comments_post_created_idx on public.comments (post_id, created_at asc);
create index if not exists comments_reply_to_idx on public.comments (reply_to);

-- ─── FOLLOWS ────────────────────────────────────────────────
create table if not exists public.follows (
  follower_id  text not null references public.profiles(id) on delete cascade,
  following_id text not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create index if not exists follows_following_idx on public.follows (following_id);

-- ─── CHATS + MESSAGES ───────────────────────────────────────
create table if not exists public.chats (
  id                text primary key,               -- deterministic "a__b"
  participants      text[] not null default '{}',
  participant_names jsonb not null default '{}',
  participant_avatars jsonb not null default '{}',
  is_group          boolean not null default false,
  group_name        text not null default '',
  last_message      text not null default '',
  unread_by         jsonb not null default '{}',    -- { uid: number }
  created_at        timestamptz not null default now(),
  last_message_at   timestamptz not null default now()
);

create index if not exists chats_participants_idx on public.chats using gin (participants);

create table if not exists public.chat_messages (
  id            text primary key,
  chat_id       text not null references public.chats(id) on delete cascade,
  text          text not null default '',
  sender_key    text not null,
  sender_name   text not null default 'User',
  sender_avatar text,
  read          boolean not null default false,
  edited        boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists chat_messages_chat_created_idx on public.chat_messages (chat_id, created_at asc);

-- ─── NOTIFICATIONS ──────────────────────────────────────────
create table if not exists public.notifications (
  id        text primary key,
  user_id   text not null references public.profiles(id) on delete cascade,
  type      text not null,
  actor_key text,
  actor_name text,
  text      text not null default '',
  link_type text,
  link_id   text,
  read      boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);

-- ─── BLOCKS + REPORTS ───────────────────────────────────────
create table if not exists public.blocks (
  user_id    text not null references public.profiles(id) on delete cascade,
  blocked_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_id)
);

create table if not exists public.reports (
  id          text primary key,
  reporter_id text references public.profiles(id) on delete set null,
  target_type text not null,
  target_id   text not null,
  reason      text,
  details     text,
  status      text not null default 'open',
  created_at  timestamptz not null default now()
);

-- ─── STORIES ────────────────────────────────────────────────
create table if not exists public.stories (
  id           text primary key,
  user_id      text not null references public.profiles(id) on delete cascade,
  media_url    text,
  caption      text,
  media_type   text not null default 'image',
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '24 hours')
);

create index if not exists stories_user_idx on public.stories (user_id);
create index if not exists stories_expires_idx on public.stories (expires_at);

create table if not exists public.story_views (
  story_id  text not null references public.stories(id) on delete cascade,
  viewer_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

-- ─── PROJECTS ───────────────────────────────────────────────
create table if not exists public.projects (
  id            text primary key,
  owner_id      text not null references public.profiles(id) on delete cascade,
  title         text not null default '',
  description   text not null default '',
  tagline       text,
  stage         text not null default 'idea',
  roles_needed  text[] not null default '{}',
  skills_needed text[] not null default '{}',
  looking_for   text,
  equity        text,
  commitment    text,
  location      text,
  remote        boolean not null default true,
  cover_url     text,
  status        text not null default 'open',
  members       jsonb not null default '[]',
  applicants    jsonb not null default '[]',
  likes_count   integer not null default 0,
  likes         text[] not null default '{}',
  followers_count integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists projects_owner_idx on public.projects (owner_id, created_at desc);

create table if not exists public.project_members (
  project_id text not null references public.projects(id) on delete cascade,
  user_id    text not null references public.profiles(id) on delete cascade,
  role       text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.project_applications (
  id         text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  user_id    text not null references public.profiles(id) on delete cascade,
  message    text,
  role       text,
  status     text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists project_apps_project_idx on public.project_applications (project_id, status);

create table if not exists public.project_questions (
  id         text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  author_id  text references public.profiles(id) on delete set null,
  text       text not null default '',
  answer     text,
  created_at timestamptz not null default now()
);

create table if not exists public.project_tasks (
  id          text primary key,
  project_id  text not null references public.projects(id) on delete cascade,
  title       text not null default '',
  assignee_id text references public.profiles(id) on delete set null,
  status      text not null default 'todo',
  priority    text,
  due_date    timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.project_followers (
  project_id text not null references public.projects(id) on delete cascade,
  user_id    text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- ─── COLLAB REQUESTS ────────────────────────────────────────
create table if not exists public.collab_requests (
  id           text primary key,
  from_id      text not null references public.profiles(id) on delete cascade,
  to_id        text not null references public.profiles(id) on delete cascade,
  project_id   text references public.projects(id) on delete set null,
  role         text,
  message      text,
  status       text not null default 'pending',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists collab_to_idx on public.collab_requests (to_id, status);

-- ─── REFERRAL INVITES ───────────────────────────────────────
create table if not exists public.referral_invites (
  id          text primary key,
  code        text not null unique,
  inviter_id  text not null references public.profiles(id) on delete cascade,
  invited_id  text references public.profiles(id) on delete set null,
  email       text,
  status      text not null default 'pending',
  created_at  timestamptz not null default now(),
  activated_at timestamptz
);

create index if not exists referral_inviter_idx on public.referral_invites (inviter_id);

-- ─── EVENTS ─────────────────────────────────────────────────
create table if not exists public.events (
  id          text primary key,
  host_id     text not null references public.profiles(id) on delete cascade,
  title       text not null default '',
  description text not null default '',
  category    text,
  start_at    timestamptz,
  end_at      timestamptz,
  location    text,
  is_online   boolean not null default true,
  link        text,
  cover_url   text,
  attendees   text[] not null default '{}',
  attendees_count integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists events_start_idx on public.events (start_at desc);

-- ─── REELS ──────────────────────────────────────────────────
create table if not exists public.reels (
  id            text primary key,
  user_id       text not null references public.profiles(id) on delete cascade,
  video_url     text not null,
  caption       text,
  audio_name    text,
  liked_by      text[] not null default '{}',
  likes         integer not null default 0,
  comments_count integer not null default 0,
  shares        integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists reels_created_idx on public.reels (created_at desc);

create table if not exists public.reel_comments (
  id         text primary key,
  reel_id    text not null references public.reels(id) on delete cascade,
  user_id    text not null references public.profiles(id) on delete cascade,
  text       text not null default '',
  liked_by   text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists reel_comments_reel_idx on public.reel_comments (reel_id, created_at asc);

-- ─── IDEAS ──────────────────────────────────────────────────
create table if not exists public.ideas (
  id           text primary key,
  author_key   text not null references public.profiles(id) on delete cascade,
  author_name  text not null default '',
  author_avatar text,
  title        text not null default '',
  summary      text,
  problem      text,
  solution     text,
  category     text,
  stage        text,
  status       text not null default 'open',
  tags         text[] not null default '{}',
  upvotes      text[] not null default '{}',
  downvotes    text[] not null default '{}',
  comments_count integer not null default 0,
  collaborators jsonb not null default '[]',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists ideas_created_idx on public.ideas (created_at desc);

create table if not exists public.idea_comments (
  id         text primary key,
  idea_id    text not null references public.ideas(id) on delete cascade,
  author_key text not null references public.profiles(id) on delete cascade,
  author_name text,
  author_avatar text,
  text       text not null default '',
  liked_by   text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idea_comments_idea_idx on public.idea_comments (idea_id, created_at asc);

-- ─── VOICE ROOMS ────────────────────────────────────────────
create table if not exists public.voice_sessions (
  id           text primary key,
  title        text not null default '',
  host_id      text not null references public.profiles(id) on delete cascade,
  channel      text not null default '',
  description   text,
  category      text,
  type          text,
  template      text,
  template_data jsonb not null default '{}',
  tags          jsonb not null default '{}',
  cover_image_url text,
  is_locked     boolean not null default false,
  pinned_topic  text,
  allow_raise_hand boolean not null default true,
  allow_reactions boolean not null default true,
  allow_questions boolean not null default true,
  max_speakers  integer,
  scheduled_at  timestamptz,
  started_at    timestamptz,
  host_beat     timestamptz,
  questions     jsonb not null default '[]',
  reactions     jsonb not null default '[]',
  reminders     jsonb not null default '[]',
  participant_count integer not null default 0,
  speaker_count integer not null default 0,
  preview_avatars jsonb not null default '[]',
  participants  jsonb not null default '[]',
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  ended_at      timestamptz
);

create table if not exists public.voice_signals (
  id           text primary key,
  session_id   text not null references public.voice_sessions(id) on delete cascade,
  from_id      text not null,
  to_id        text,
  kind         text not null,
  payload      jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create index if not exists voice_signals_session_idx on public.voice_signals (session_id, created_at asc);

-- ─── COPILOT ────────────────────────────────────────────────
create table if not exists public.copilot_threads (
  id         text primary key,
  user_id    text not null references public.profiles(id) on delete cascade,
  title      text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists copilot_threads_user_idx on public.copilot_threads (user_id, updated_at desc);

create table if not exists public.copilot_messages (
  id         text primary key,
  thread_id  text not null references public.copilot_threads(id) on delete cascade,
  role       text not null,
  content    text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists copilot_messages_thread_idx on public.copilot_messages (thread_id, created_at asc);

-- ─── SETTINGS + ANALYTICS + ADMIN AUDIT ─────────────────────
create table if not exists public.user_settings (
  user_id    text primary key references public.profiles(id) on delete cascade,
  settings   jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id         text primary key,
  user_id    text,
  event_type text not null,
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists analytics_type_idx on public.analytics_events (event_type, created_at desc);

create table if not exists public.admin_actions (
  id         text primary key,
  admin_id   text references public.profiles(id) on delete set null,
  action     text not null,
  target_type text,
  target_id  text,
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ─── ACHIEVEMENTS / CHALLENGES ──────────────────────────────
create table if not exists public.achievements (
  id          text primary key,
  title       text not null default '',
  description text,
  icon        text,
  criteria    jsonb not null default '{}'
);

create table if not exists public.user_achievements (
  user_id  text not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.challenges (
  id          text primary key,
  title       text not null default '',
  description text,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.challenge_entries (
  id           text primary key,
  challenge_id text not null references public.challenges(id) on delete cascade,
  user_id      text not null references public.profiles(id) on delete cascade,
  entry_url    text,
  text         text,
  created_at   timestamptz not null default now()
);

-- ─── FOUNDING 100 ───────────────────────────────────────────
create table if not exists public.founding_members (
  number     integer primary key,
  user_id    text not null unique references public.profiles(id) on delete cascade,
  granted_by text,
  created_at timestamptz not null default now()
);

alter table public.founding_members enable row level security;

drop policy if exists founding_select on public.founding_members;
create policy founding_select on public.founding_members for select
  to authenticated using (true);
drop policy if exists founding_admin on public.founding_members;
create policy founding_admin on public.founding_members for all
  to authenticated using (is_admin()) with check (is_admin());

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Generic updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

drop trigger if exists chats_updated_at on public.chats;
create trigger chats_updated_at before update on public.chats
  for each row execute function public.set_updated_at();

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists ideas_updated_at on public.ideas;
create trigger ideas_updated_at before update on public.ideas
  for each row execute function public.set_updated_at();

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

drop trigger if exists collab_requests_updated_at on public.collab_requests;
create trigger collab_requests_updated_at before update on public.collab_requests
  for each row execute function public.set_updated_at();

drop trigger if exists copilot_threads_updated_at on public.copilot_threads;
create trigger copilot_threads_updated_at before update on public.copilot_threads
  for each row execute function public.set_updated_at();

-- Self-only array guards: liked_by / bookmarked_by entries may only ever
-- change for the authenticated user's own UID (replaces per-field Firestore
-- rules). Counters are maintained by the toggle RPCs, not by clients.
create or replace function public.guard_self_array()
returns trigger
language plpgsql
as $$
declare
  my_uid text := auth.uid()::text;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if my_uid is null then
    raise exception 'not authenticated';
  end if;

  if tg_table_name in ('posts', 'comments', 'reels') and tg_op = 'UPDATE' then
    if new.liked_by is distinct from old.liked_by then
      if (
        select coalesce(array_agg(u order by u), '{}')
        from unnest(new.liked_by) u where u <> my_uid
      ) is distinct from (
        select coalesce(array_agg(u order by u), '{}')
        from unnest(old.liked_by) u where u <> my_uid
      ) then
        raise exception 'liked_by: only your own entry may change';
      end if;
    end if;
  end if;

  if tg_table_name = 'posts' and tg_op = 'UPDATE' then
    if new.bookmarked_by is distinct from old.bookmarked_by then
      if (
        select coalesce(array_agg(u order by u), '{}')
        from unnest(new.bookmarked_by) u where u <> my_uid
      ) is distinct from (
        select coalesce(array_agg(u order by u), '{}')
        from unnest(old.bookmarked_by) u where u <> my_uid
      ) then
        raise exception 'bookmarked_by: only your own entry may change';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists posts_guard_self_array on public.posts;
create trigger posts_guard_self_array before update on public.posts
  for each row execute function public.guard_self_array();

drop trigger if exists comments_guard_self_array on public.comments;
create trigger comments_guard_self_array before update on public.comments
  for each row execute function public.guard_self_array();

drop trigger if exists reels_guard_self_array on public.reels;
create trigger reels_guard_self_array before update on public.reels
  for each row execute function public.guard_self_array();

-- Comments counter maintained automatically on insert/delete
create or replace function public.bump_comments_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comments_count = comments_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists comments_count_trigger on public.comments;
create trigger comments_count_trigger
  after insert or delete on public.comments
  for each row execute function public.bump_comments_count();

-- Follow counters maintained on profiles
create or replace function public.bump_follow_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set following = following + 1 where id = new.follower_id;
    update public.profiles set followers = followers + 1 where id = new.following_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.profiles set following = greatest(0, following - 1) where id = old.follower_id;
    update public.profiles set followers = greatest(0, followers - 1) where id = old.following_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists follows_count_trigger on public.follows;
create trigger follows_count_trigger
  after insert or delete on public.follows
  for each row execute function public.bump_follow_counts();

-- Reel comment counter
create or replace function public.bump_reel_comments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.reels set comments_count = comments_count + 1 where id = new.reel_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.reels set comments_count = greatest(0, comments_count - 1) where id = old.reel_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists reel_comments_count_trigger on public.reel_comments;
create trigger reel_comments_count_trigger
  after insert or delete on public.reel_comments
  for each row execute function public.bump_reel_comments();

-- Idea comment counter
create or replace function public.bump_idea_comments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.ideas set comments_count = comments_count + 1 where id = new.idea_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.ideas set comments_count = greatest(0, comments_count - 1) where id = old.idea_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists idea_comments_count_trigger on public.idea_comments;
create trigger idea_comments_count_trigger
  after insert or delete on public.idea_comments
  for each row execute function public.bump_idea_comments();

-- ============================================================
-- RPCs (atomic, race-free operations replacing Firestore
-- transactions). All validate auth.uid() internally.
-- ============================================================

-- Like / unlike a post. Returns true when the user now likes it.
create or replace function public.toggle_like(p_post_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  my_uid text := auth.uid()::text;
  now_liked boolean;
begin
  if my_uid is null then
    raise exception 'not authenticated';
  end if;
  update public.posts
  set liked_by = case when my_uid = any(liked_by)
        then array_remove(liked_by, my_uid)
        else array_append(liked_by, my_uid) end,
      likes = case when my_uid = any(liked_by)
        then greatest(0, likes - 1)
        else likes + 1 end
  where id = p_post_id
  returning (my_uid = any(liked_by)) into now_liked;
  if now_liked is null then
    raise exception 'Post not found';
  end if;
  return now_liked;
end;
$$;

-- Bookmark / unbookmark. Optional explicit target state (mirrors the
-- shouldBookmark arg of the old service).
create or replace function public.toggle_bookmark(p_post_id text, p_bookmark boolean default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  my_uid text := auth.uid()::text;
  going boolean;
begin
  if my_uid is null then
    raise exception 'not authenticated';
  end if;
  going := case when p_bookmark is not null then p_bookmark
                else not (my_uid = any(coalesce((select bookmarked_by from public.posts where id = p_post_id), '{}'))) end;
  update public.posts
  set bookmarked_by = case when going
        then array_append(bookmarked_by, my_uid)
        else array_remove(bookmarked_by, my_uid) end
  where id = p_post_id;
  return going;
end;
$$;

-- Like / unlike a comment. Returns true when the user now likes it.
create or replace function public.toggle_comment_like(p_comment_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  my_uid text := auth.uid()::text;
  now_liked boolean;
begin
  if my_uid is null then
    raise exception 'not authenticated';
  end if;
  update public.comments
  set liked_by = case when my_uid = any(liked_by)
        then array_remove(liked_by, my_uid)
        else array_append(liked_by, my_uid) end,
      likes = case when my_uid = any(liked_by)
        then greatest(0, likes - 1)
        else likes + 1 end
  where id = p_comment_id
  returning (my_uid = any(liked_by)) into now_liked;
  if now_liked is null then
    raise exception 'Comment not found';
  end if;
  return now_liked;
end;
$$;

-- Like / unlike a reel. Returns true when the user now likes it.
create or replace function public.toggle_reel_like(p_reel_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  my_uid text := auth.uid()::text;
  now_liked boolean;
begin
  if my_uid is null then
    raise exception 'not authenticated';
  end if;
  update public.reels
  set liked_by = case when my_uid = any(liked_by)
        then array_remove(liked_by, my_uid)
        else array_append(liked_by, my_uid) end,
      likes = case when my_uid = any(liked_by)
        then greatest(0, likes - 1)
        else likes + 1 end
  where id = p_reel_id
  returning (my_uid = any(liked_by)) into now_liked;
  if now_liked is null then
    raise exception 'Reel not found';
  end if;
  return now_liked;
end;
$$;

-- Follow / unfollow. Returns true when the user now follows the target.
create or replace function public.toggle_follow(p_target_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  my_uid text := auth.uid()::text;
  now_following boolean;
begin
  if my_uid is null then
    raise exception 'not authenticated';
  end if;
  if my_uid = p_target_id then
    raise exception 'Cannot follow yourself';
  end if;
  if exists (select 1 from public.follows where follower_id = my_uid and following_id = p_target_id) then
    delete from public.follows where follower_id = my_uid and following_id = p_target_id;
    return false;
  end if;
  insert into public.follows (follower_id, following_id) values (my_uid, p_target_id)
  on conflict do nothing;
  return true;
end;
$$;

-- Send a message (creates the chat on first send, updates last message
-- and per-user unread counters atomically). Returns the new message id.
create or replace function public.send_message(
  p_chat_id text,
  p_sender text,
  p_text text,
  p_sender_name text default 'User',
  p_sender_avatar text default null,
  p_participants text[] default null,
  p_participant_names jsonb default null,
  p_participant_avatars jsonb default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  my_uid text := auth.uid()::text;
  msg_id text;
  parts text[];
begin
  if my_uid is null or my_uid <> p_sender then
    raise exception 'not allowed';
  end if;

  if exists (select 1 from public.chats where id = p_chat_id) then
    select participants into parts from public.chats where id = p_chat_id;
  else
    if p_participants is null or array_length(p_participants, 1) < 2 then
      raise exception 'Conversation not found';
    end if;
    parts := p_participants;
    insert into public.chats (
      id, participants, participant_names, participant_avatars,
      is_group, group_name, last_message, last_message_at, created_at
    ) values (
      p_chat_id, p_participants,
      coalesce(p_participant_names, '{}'::jsonb),
      coalesce(p_participant_avatars, '{}'::jsonb),
      false, '', p_text, now(), now()
    );
  end if;

  update public.chats
  set last_message = p_text,
      last_message_at = now(),
      unread_by = (
        select coalesce(jsonb_object_agg(
          u.uid,
          case when u.uid = my_uid then 0
               else coalesce((chats.unread_by ->> u.uid)::int, 0) + 1 end
        ), '{}'::jsonb)
        from unnest(parts) as u(uid)
      )
  where id = p_chat_id;

  msg_id := gen_random_uuid()::text;
  insert into public.chat_messages (id, chat_id, text, sender_key, sender_name, sender_avatar, read, created_at)
  values (msg_id, p_chat_id, p_text, p_sender, p_sender_name, p_sender_avatar, false, now());

  return msg_id;
end;
$$;

-- Delete a comment plus its replies (best-effort for replies the caller
-- cannot delete, mirroring the old Firestore fallback semantics). The
-- comments_count trigger handles the counter.
create or replace function public.delete_comment(p_post_id text, p_comment_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_uid text := auth.uid()::text;
  post_author text;
begin
  if my_uid is null then
    raise exception 'not authenticated';
  end if;
  select author_key into post_author from public.posts where id = p_post_id;

  -- Remove replies the caller is allowed to remove (own replies, or any when
  -- the caller is the post author).
  delete from public.comments
  where post_id = p_post_id
    and reply_to = p_comment_id
    and (author_key = my_uid or post_author = my_uid);

  delete from public.comments
  where id = p_comment_id and post_id = p_post_id
    and (author_key = my_uid or post_author = my_uid);
end;
$$;

-- Toggle a custom array entry on any row (ideas upvotes, event attendees,
-- project likes, etc.) — only the caller's own uid may be added/removed.
create or replace function public.array_toggle_self(
  p_table text,
  p_id text,
  p_column text,
  p_id_column text default 'id'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  my_uid text := auth.uid()::text;
  now_in boolean;
begin
  if my_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_table not in ('ideas', 'events', 'projects', 'reels', 'idea_comments') then
    raise exception 'table not allowed';
  end if;
  if p_column not in ('upvotes', 'downvotes', 'attendees', 'likes') then
    raise exception 'column not allowed';
  end if;
  execute format(
    'update public.%I set %I = case when $1 = any(%I) then array_remove(%I, $1) else array_append(%I, $1) end where %I = $2 returning ($1 = any(%I))',
    p_table, p_column, p_column, p_column, p_column, p_id_column, p_column
  ) using my_uid, p_id into now_in;
  return coalesce(now_in, false);
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.chats enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_applications enable row level security;
alter table public.project_questions enable row level security;
alter table public.project_tasks enable row level security;
alter table public.project_followers enable row level security;
alter table public.collab_requests enable row level security;
alter table public.referral_invites enable row level security;
alter table public.events enable row level security;
alter table public.reels enable row level security;
alter table public.reel_comments enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_comments enable row level security;
alter table public.voice_sessions enable row level security;
alter table public.voice_signals enable row level security;
alter table public.copilot_threads enable row level security;
alter table public.copilot_messages enable row level security;
alter table public.user_settings enable row level security;
alter table public.analytics_events enable row level security;
alter table public.admin_actions enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_entries enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  to authenticated using (true);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert
  to authenticated with check (id = auth.uid()::text);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update
  to authenticated using (id = auth.uid()::text or is_admin())
  with check (id = auth.uid()::text or is_admin());
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles for delete
  to authenticated using (id = auth.uid()::text);

-- admins: read-only for admins; writes only via service role / dashboard
drop policy if exists admins_select on public.admins;
create policy admins_select on public.admins for select
  to authenticated using (is_admin());

-- posts
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select
  to authenticated using (true);
drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own on public.posts for insert
  to authenticated with check (author_key = auth.uid()::text);
drop policy if exists posts_update_own on public.posts;
create policy posts_update_own on public.posts for update
  to authenticated using (author_key = auth.uid()::text or is_admin())
  with check (author_key = auth.uid()::text or is_admin());
drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own on public.posts for delete
  to authenticated using (author_key = auth.uid()::text or is_admin());

-- comments
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select
  to authenticated using (true);
drop policy if exists comments_insert_own on public.comments;
create policy comments_insert_own on public.comments for insert
  to authenticated with check (author_key = auth.uid()::text);
drop policy if exists comments_update_own on public.comments;
create policy comments_update_own on public.comments for update
  to authenticated using (author_key = auth.uid()::text or is_admin())
  with check (author_key = auth.uid()::text or is_admin());
drop policy if exists comments_delete_own on public.comments;
create policy comments_delete_own on public.comments for delete
  to authenticated using (author_key = auth.uid()::text or is_admin());

-- follows
drop policy if exists follows_select on public.follows;
create policy follows_select on public.follows for select
  to authenticated using (true);
drop policy if exists follows_insert_own on public.follows;
create policy follows_insert_own on public.follows for insert
  to authenticated with check (follower_id = auth.uid()::text);
drop policy if exists follows_delete_own on public.follows;
create policy follows_delete_own on public.follows for delete
  to authenticated using (follower_id = auth.uid()::text);

-- chats
drop policy if exists chats_select on public.chats;
create policy chats_select on public.chats for select
  to authenticated using (participants @> array[auth.uid()::text]);
drop policy if exists chats_insert_own on public.chats;
create policy chats_insert_own on public.chats for insert
  to authenticated with check (participants @> array[auth.uid()::text]);
drop policy if exists chats_update_member on public.chats;
create policy chats_update_member on public.chats for update
  to authenticated using (participants @> array[auth.uid()::text])
  with check (participants @> array[auth.uid()::text]);
drop policy if exists chats_delete_member on public.chats;
create policy chats_delete_member on public.chats for delete
  to authenticated using (participants @> array[auth.uid()::text]);

-- chat_messages: written via the send_message RPC (definer); direct client
-- access limited to members of the chat.
drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages for select
  to authenticated using (
    exists (
      select 1 from public.chats c
      where c.id = chat_id and c.participants @> array[auth.uid()::text]
    )
  );
drop policy if exists chat_messages_insert_member on public.chat_messages;
create policy chat_messages_insert_member on public.chat_messages for insert
  to authenticated with check (
    sender_key = auth.uid()::text and exists (
      select 1 from public.chats c
      where c.id = chat_id and c.participants @> array[auth.uid()::text]
    )
  );
drop policy if exists chat_messages_update_sender on public.chat_messages;
create policy chat_messages_update_sender on public.chat_messages for update
  to authenticated using (sender_key = auth.uid()::text or is_admin())
  with check (sender_key = auth.uid()::text or is_admin());
drop policy if exists chat_messages_delete_sender on public.chat_messages;
create policy chat_messages_delete_sender on public.chat_messages for delete
  to authenticated using (sender_key = auth.uid()::text or is_admin());

-- notifications: anyone authenticated may CREATE (the app notifies other
-- users), but the actor field can never be forged as someone else.
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select
  to authenticated using (user_id = auth.uid()::text);
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert
  to authenticated with check (
    (actor_key is null or actor_key = auth.uid()::text)
    and user_id <> auth.uid()::text
  );
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update
  to authenticated using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications for delete
  to authenticated using (user_id = auth.uid()::text);

-- blocks
drop policy if exists blocks_all_own on public.blocks;
create policy blocks_all_own on public.blocks for all
  to authenticated using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

-- reports
drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports for insert
  to authenticated with check (reporter_id = auth.uid()::text or reporter_id is null);
drop policy if exists reports_select_admin on public.reports;
create policy reports_select_admin on public.reports for select
  to authenticated using (is_admin());
drop policy if exists reports_update_admin on public.reports;
create policy reports_update_admin on public.reports for update
  to authenticated using (is_admin()) with check (is_admin());
drop policy if exists reports_delete_admin on public.reports;
create policy reports_delete_admin on public.reports for delete
  to authenticated using (is_admin());

-- stories
drop policy if exists stories_select on public.stories;
create policy stories_select on public.stories for select
  to authenticated using (expires_at > now());
drop policy if exists stories_insert_own on public.stories;
create policy stories_insert_own on public.stories for insert
  to authenticated with check (user_id = auth.uid()::text);
drop policy if exists stories_delete_own on public.stories;
create policy stories_delete_own on public.stories for delete
  to authenticated using (user_id = auth.uid()::text);

drop policy if exists story_views_all_own on public.story_views;
create policy story_views_all_own on public.story_views for all
  to authenticated using (viewer_id = auth.uid()::text)
  with check (viewer_id = auth.uid()::text);

-- projects
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select
  to authenticated using (true);
drop policy if exists projects_insert_own on public.projects;
create policy projects_insert_own on public.projects for insert
  to authenticated with check (owner_id = auth.uid()::text);
drop policy if exists projects_update_own on public.projects;
create policy projects_update_own on public.projects for update
  to authenticated using (owner_id = auth.uid()::text or is_admin())
  with check (owner_id = auth.uid()::text or is_admin());
drop policy if exists projects_delete_own on public.projects;
create policy projects_delete_own on public.projects for delete
  to authenticated using (owner_id = auth.uid()::text or is_admin());

drop policy if exists project_members_select on public.project_members;
create policy project_members_select on public.project_members for select
  to authenticated using (true);
drop policy if exists project_members_insert_own on public.project_members;
create policy project_members_insert_own on public.project_members for insert
  to authenticated with check (user_id = auth.uid()::text);
drop policy if exists project_members_delete on public.project_members;
create policy project_members_delete on public.project_members for delete
  to authenticated using (
    user_id = auth.uid()::text
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()::text)
  );

drop policy if exists project_apps_select on public.project_applications;
create policy project_apps_select on public.project_applications for select
  to authenticated using (
    user_id = auth.uid()::text
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()::text)
  );
drop policy if exists project_apps_insert_own on public.project_applications;
create policy project_apps_insert_own on public.project_applications for insert
  to authenticated with check (user_id = auth.uid()::text);
drop policy if exists project_apps_update on public.project_applications;
create policy project_apps_update on public.project_applications for update
  to authenticated using (
    user_id = auth.uid()::text
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()::text)
  ) with check (true);

drop policy if exists project_questions_select on public.project_questions;
create policy project_questions_select on public.project_questions for select
  to authenticated using (true);
drop policy if exists project_questions_insert on public.project_questions;
create policy project_questions_insert on public.project_questions for insert
  to authenticated with check (author_id = auth.uid()::text);

drop policy if exists project_tasks_select on public.project_tasks;
create policy project_tasks_select on public.project_tasks for select
  to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (p.owner_id = auth.uid()::text or p.status = 'open')
    )
  );
drop policy if exists project_tasks_insert_member on public.project_tasks;
create policy project_tasks_insert_member on public.project_tasks for insert
  to authenticated with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (p.owner_id = auth.uid()::text
             or exists (select 1 from public.project_members m
                        where m.project_id = project_id and m.user_id = auth.uid()::text))
    )
  );
drop policy if exists project_tasks_update_member on public.project_tasks;
create policy project_tasks_update_member on public.project_tasks for update
  to authenticated using (true) with check (true);

drop policy if exists project_followers_all_own on public.project_followers;
create policy project_followers_all_own on public.project_followers for all
  to authenticated using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

-- collab_requests
drop policy if exists collab_select on public.collab_requests;
create policy collab_select on public.collab_requests for select
  to authenticated using (from_id = auth.uid()::text or to_id = auth.uid()::text);
drop policy if exists collab_insert_own on public.collab_requests;
create policy collab_insert_own on public.collab_requests for insert
  to authenticated with check (from_id = auth.uid()::text);
drop policy if exists collab_update on public.collab_requests;
create policy collab_update on public.collab_requests for update
  to authenticated using (to_id = auth.uid()::text or from_id = auth.uid()::text)
  with check (true);
drop policy if exists collab_delete_own on public.collab_requests;
create policy collab_delete_own on public.collab_requests for delete
  to authenticated using (from_id = auth.uid()::text);

-- referral_invites
drop policy if exists referral_select_own on public.referral_invites;
create policy referral_select_own on public.referral_invites for select
  to authenticated using (inviter_id = auth.uid()::text or invited_id = auth.uid()::text);
drop policy if exists referral_insert_own on public.referral_invites;
create policy referral_insert_own on public.referral_invites for insert
  to authenticated with check (inviter_id = auth.uid()::text or invited_id = auth.uid()::text);
drop policy if exists referral_delete_own on public.referral_invites;
create policy referral_delete_own on public.referral_invites for delete
  to authenticated using (inviter_id = auth.uid()::text);
drop policy if exists referral_update_own on public.referral_invites;
create policy referral_update_own on public.referral_invites for update
  to authenticated using (inviter_id = auth.uid()::text or invited_id = auth.uid()::text)
  with check (true);

-- events
drop policy if exists events_select on public.events;
create policy events_select on public.events for select
  to authenticated using (true);
drop policy if exists events_insert_own on public.events;
create policy events_insert_own on public.events for insert
  to authenticated with check (host_id = auth.uid()::text);
drop policy if exists events_update_own on public.events;
create policy events_update_own on public.events for update
  to authenticated using (host_id = auth.uid()::text or is_admin())
  with check (host_id = auth.uid()::text or is_admin());
drop policy if exists events_delete_own on public.events;
create policy events_delete_own on public.events for delete
  to authenticated using (host_id = auth.uid()::text or is_admin());

-- reels
drop policy if exists reels_select on public.reels;
create policy reels_select on public.reels for select
  to authenticated using (true);
drop policy if exists reels_insert_own on public.reels;
create policy reels_insert_own on public.reels for insert
  to authenticated with check (user_id = auth.uid()::text);
drop policy if exists reels_update_own on public.reels;
create policy reels_update_own on public.reels for update
  to authenticated using (user_id = auth.uid()::text or is_admin())
  with check (user_id = auth.uid()::text or is_admin());
drop policy if exists reels_delete_own on public.reels;
create policy reels_delete_own on public.reels for delete
  to authenticated using (user_id = auth.uid()::text or is_admin());

drop policy if exists reel_comments_select on public.reel_comments;
create policy reel_comments_select on public.reel_comments for select
  to authenticated using (true);
drop policy if exists reel_comments_insert_own on public.reel_comments;
create policy reel_comments_insert_own on public.reel_comments for insert
  to authenticated with check (user_id = auth.uid()::text);
drop policy if exists reel_comments_delete_own on public.reel_comments;
create policy reel_comments_delete_own on public.reel_comments for delete
  to authenticated using (user_id = auth.uid()::text or is_admin());

-- ideas
drop policy if exists ideas_select on public.ideas;
create policy ideas_select on public.ideas for select
  to authenticated using (true);
drop policy if exists ideas_insert_own on public.ideas;
create policy ideas_insert_own on public.ideas for insert
  to authenticated with check (author_key = auth.uid()::text);
drop policy if exists ideas_update_own on public.ideas;
create policy ideas_update_own on public.ideas for update
  to authenticated using (author_key = auth.uid()::text or is_admin())
  with check (author_key = auth.uid()::text or is_admin());
drop policy if exists ideas_delete_own on public.ideas;
create policy ideas_delete_own on public.ideas for delete
  to authenticated using (author_key = auth.uid()::text or is_admin());

drop policy if exists idea_comments_select on public.idea_comments;
create policy idea_comments_select on public.idea_comments for select
  to authenticated using (true);
drop policy if exists idea_comments_insert_own on public.idea_comments;
create policy idea_comments_insert_own on public.idea_comments for insert
  to authenticated with check (author_key = auth.uid()::text);
drop policy if exists idea_comments_delete_own on public.idea_comments;
create policy idea_comments_delete_own on public.idea_comments for delete
  to authenticated using (author_key = auth.uid()::text or is_admin());

-- voice
drop policy if exists voice_sessions_select on public.voice_sessions;
create policy voice_sessions_select on public.voice_sessions for select
  to authenticated using (true);
drop policy if exists voice_sessions_insert_own on public.voice_sessions;
create policy voice_sessions_insert_own on public.voice_sessions for insert
  to authenticated with check (host_id = auth.uid()::text);
drop policy if exists voice_sessions_update_member on public.voice_sessions;
create policy voice_sessions_update_member on public.voice_sessions for update
  to authenticated using (true) with check (true);
drop policy if exists voice_sessions_delete_host on public.voice_sessions;
create policy voice_sessions_delete_host on public.voice_sessions for delete
  to authenticated using (host_id = auth.uid()::text or is_admin());

drop policy if exists voice_signals_all on public.voice_signals;
create policy voice_signals_all on public.voice_signals for all
  to authenticated using (true) with check (from_id = auth.uid()::text);

-- copilot: strictly own threads/messages
drop policy if exists copilot_threads_own on public.copilot_threads;
create policy copilot_threads_own on public.copilot_threads for all
  to authenticated using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

drop policy if exists copilot_messages_own on public.copilot_messages;
create policy copilot_messages_own on public.copilot_messages for all
  to authenticated using (
    exists (select 1 from public.copilot_threads t where t.id = thread_id and t.user_id = auth.uid()::text)
  ) with check (
    exists (select 1 from public.copilot_threads t where t.id = thread_id and t.user_id = auth.uid()::text)
  );

-- user_settings
drop policy if exists user_settings_own on public.user_settings;
create policy user_settings_own on public.user_settings for all
  to authenticated using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

-- analytics: anyone may record their own events; read is admin-only
drop policy if exists analytics_insert on public.analytics_events;
create policy analytics_insert on public.analytics_events for insert
  to authenticated with check (user_id = auth.uid()::text or user_id is null);
drop policy if exists analytics_select_admin on public.analytics_events;
create policy analytics_select_admin on public.analytics_events for select
  to authenticated using (is_admin());

-- admin_actions: admin-only everything
drop policy if exists admin_actions_admin on public.admin_actions;
create policy admin_actions_admin on public.admin_actions for all
  to authenticated using (is_admin()) with check (is_admin());

-- achievements / challenges: public read, admin-managed writes
drop policy if exists achievements_select on public.achievements;
create policy achievements_select on public.achievements for select
  to authenticated using (true);
drop policy if exists user_achievements_select on public.user_achievements;
create policy user_achievements_select on public.user_achievements for select
  to authenticated using (true);
drop policy if exists user_achievements_insert_own on public.user_achievements;
create policy user_achievements_insert_own on public.user_achievements for insert
  to authenticated with check (user_id = auth.uid()::text);

drop policy if exists challenges_select on public.challenges;
create policy challenges_select on public.challenges for select
  to authenticated using (true);
drop policy if exists challenge_entries_select on public.challenge_entries;
create policy challenge_entries_select on public.challenge_entries for select
  to authenticated using (true);
drop policy if exists challenge_entries_insert_own on public.challenge_entries;
create policy challenge_entries_insert_own on public.challenge_entries for insert
  to authenticated with check (user_id = auth.uid()::text);

-- ============================================================
-- STORAGE BUCKETS + POLICIES
-- ============================================================

insert into storage.buckets (id, name, public) values
  ('uploads', 'uploads', true),
  ('avatars', 'avatars', true),
  ('covers', 'covers', true)
on conflict (id) do nothing;

drop policy if exists storage_public_read on storage.objects;
create policy storage_public_read on storage.objects for select
  to public using (bucket_id in ('uploads', 'avatars', 'covers'));

drop policy if exists storage_authenticated_insert on storage.objects;
create policy storage_authenticated_insert on storage.objects for insert
  to authenticated with check (
    bucket_id in ('uploads', 'avatars', 'covers')
    and (
      exists (
        select 1 from unnest(string_to_array(name, '/')) seg
        where seg = auth.uid()::text
      )
      or split_part(name, '/', -1) like auth.uid()::text || '.%'
      or split_part(name, '/', -1) like auth.uid()::text || '_%'
    )
  );

drop policy if exists storage_authenticated_update on storage.objects;
create policy storage_authenticated_update on storage.objects for update
  to authenticated using (
    bucket_id in ('uploads', 'avatars', 'covers')
    and (
      exists (
        select 1 from unnest(string_to_array(name, '/')) seg
        where seg = auth.uid()::text
      )
      or split_part(name, '/', -1) like auth.uid()::text || '.%'
      or split_part(name, '/', -1) like auth.uid()::text || '_%'
    )
  );

drop policy if exists storage_authenticated_delete on storage.objects;
create policy storage_authenticated_delete on storage.objects for delete
  to authenticated using (
    bucket_id in ('uploads', 'avatars', 'covers')
    and (
      exists (
        select 1 from unnest(string_to_array(name, '/')) seg
        where seg = auth.uid()::text
      )
      or split_part(name, '/', -1) like auth.uid()::text || '.%'
      or split_part(name, '/', -1) like auth.uid()::text || '_%'
    )
  );

-- ============================================================
-- REALTIME
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'posts', 'comments', 'follows', 'chats', 'chat_messages',
    'notifications', 'stories', 'projects', 'ideas', 'events', 'reels',
    'collab_requests', 'referral_invites', 'voice_sessions', 'voice_signals',
    'user_settings', 'admins', 'project_applications'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end $$;

-- ============================================================
-- SEED: nothing. Admins are granted via:
--   insert into public.admins (user_id) values ('<profile-id>');
-- (dashboard / service role only — never from the client).
-- ============================================================
