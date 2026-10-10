-- ============================================================
-- FOUNDATORS — Supabase migration: 0002
-- Schema fidelity + RLS gaps found during production verification.
-- Safe to run multiple times (every statement is idempotent).
-- Run AFTER 0001_init.sql in the Supabase Dashboard → SQL Editor.
-- ============================================================

-- ─── 1. COLUMNS THE APP ALREADY READS/WRITES ────────────────
-- (these existed as free-form fields on the original Firestore docs)

-- chats: 0001 defines a `chats_updated_at` BEFORE UPDATE trigger but the table
-- had no updated_at column, so EVERY chat update (send_message, unread_by,
-- last_message) raised "record new has no field updated_at".
alter table public.chats add column if not exists updated_at timestamptz not null default now();

-- profiles: suspended filter + founding-member badge
alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles add column if not exists founding_number integer;

-- posts: analytics "views" counter
alter table public.posts add column if not exists views integer not null default 0;

-- events: free-text date label + Today/Week filters + price filters
alter table public.events add column if not exists date text not null default '';
alter table public.events add column if not exists is_today boolean not null default false;
alter table public.events add column if not exists price text;
alter table public.events add column if not exists price_value integer not null default 0;
alter table public.events add column if not exists creator_name text;

-- ideas: detail modal fields (Description / Target Audience / Tech Stack)
alter table public.ideas add column if not exists description text;
alter table public.ideas add column if not exists audience text;
alter table public.ideas add column if not exists tech text;

-- reels: effect badge + author denormalisation
alter table public.reels add column if not exists effect text;
alter table public.reels add column if not exists author_name text;
alter table public.reels add column if not exists author_avatar text;

-- challenges: category filter, timer, points, creator stats
alter table public.challenges add column if not exists category text;
alter table public.challenges add column if not exists points integer not null default 100;
alter table public.challenges add column if not exists time_limit text;
alter table public.challenges add column if not exists time_limit_sec integer not null default 600;
alter table public.challenges add column if not exists creator_key text;
alter table public.challenges add column if not exists creator_name text;

-- ─── 2. RLS FIXES ───────────────────────────────────────────

-- analytics: users must be able to read their OWN events (admin still reads all)
drop policy if exists analytics_select_admin on public.analytics_events;
drop policy if exists analytics_select_own on public.analytics_events;
create policy analytics_select_own on public.analytics_events for select
  to authenticated
  using (is_admin() or user_id = auth.uid()::text);

-- achievements: app auto-creates achievement definitions when a challenge is
-- completed (matches the old Firestore rules where any signed-in user could
-- write definitions). Grants remain insert-own only.
drop policy if exists achievements_insert on public.achievements;
create policy achievements_insert on public.achievements for insert
  to authenticated with check (true);

-- challenges: any signed-in user may create their own challenge (Create
-- Challenge button) and edit/delete only what they created.
drop policy if exists challenges_insert_own on public.challenges;
create policy challenges_insert_own on public.challenges for insert
  to authenticated with check (creator_key = auth.uid()::text or is_admin());
drop policy if exists challenges_update_own on public.challenges;
create policy challenges_update_own on public.challenges for update
  to authenticated using (creator_key = auth.uid()::text or is_admin())
  with check (creator_key = auth.uid()::text or is_admin());
drop policy if exists challenges_delete_own on public.challenges;
create policy challenges_delete_own on public.challenges for delete
  to authenticated using (creator_key = auth.uid()::text or is_admin());

-- challenge_entries: a user must be able to LEAVE a challenge (delete own row)
drop policy if exists challenge_entries_delete_own on public.challenge_entries;
create policy challenge_entries_delete_own on public.challenge_entries for delete
  to authenticated using (user_id = auth.uid()::text);

-- ─── 3. PRIVILEGE GUARD ─────────────────────────────────────
-- profiles_update_own lets a user update their OWN row (name, bio, avatar,
-- onboarding flags …). Without this trigger that also includes the identity /
-- moderation columns, which would let anyone grant themselves the verified
-- badge, un-ban themselves, or tamper with follow counters. The columns are
-- frozen for non-admins; admins keep full control.
--
-- The counter triggers also UPDATE profiles, so they set a transaction-local
-- flag that the guard honours (see the re-defined bump_follow_counts below).
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
as $$
begin
  if current_setting('foundators.trusted_counts', true) = 'on' then
    return new;
  end if;
  if not public.is_admin() then
    new.role             := old.role;
    new.verified         := old.verified;
    new.banned           := old.banned;
    new.status           := old.status;
    new.founding_number  := old.founding_number;
    new.followers        := old.followers;
    new.following        := old.following;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_privileges on public.profiles;
create trigger profiles_privileges before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- Re-define the follow counter trigger so it flags its own profile updates as
-- trusted (identical behaviour otherwise, incl. SECURITY DEFINER).
create or replace function public.bump_follow_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('foundators.trusted_counts', 'on', true);
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
