-- 0017_gestures.sql — real Gestures ecosystem (Phase 12)
-- The Gestures hub, community gallery, trending page, collab signing and
-- shared links all ran on in-memory store seeds: everything vanished on
-- reload and links 404'd. This creates the five tables behind that surface
-- plus definer RPCs for the counters other users legitimately increment
-- (stars, forks, reaction totals, views, comment likes).

-- ── Personal gesture instances (created greetings, "trending" source) ──
create table if not exists public.gesture_instances (
  id             text primary key,
  author_key     text not null references public.profiles(id) on delete cascade,
  template_key   text not null default '',
  customizations jsonb not null default '{}'::jsonb,
  reactions      jsonb not null default '{"love":0,"celebrate":0,"laugh":0,"cry":0}'::jsonb,
  shares         integer not null default 0,
  views          integer not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists gesture_instances_author_idx on public.gesture_instances (author_key, created_at desc);
create index if not exists gesture_instances_created_idx on public.gesture_instances (created_at desc);
alter table public.gesture_instances enable row level security;
drop policy if exists gesture_instances_select on public.gesture_instances;
create policy gesture_instances_select on public.gesture_instances for select
  to authenticated using (true);
drop policy if exists gesture_instances_insert_own on public.gesture_instances;
create policy gesture_instances_insert_own on public.gesture_instances for insert
  to authenticated with check (author_key = auth.uid()::text);
drop policy if exists gesture_instances_update_own on public.gesture_instances;
create policy gesture_instances_update_own on public.gesture_instances for update
  to authenticated using (author_key = auth.uid()::text)
  with check (author_key = auth.uid()::text);
drop policy if exists gesture_instances_delete_own on public.gesture_instances;
create policy gesture_instances_delete_own on public.gesture_instances for delete
  to authenticated using (author_key = auth.uid()::text);

-- ── Community templates (published, star-able, fork-able) ──
create table if not exists public.gesture_templates (
  id           text primary key,
  name         text not null,
  description  text not null default '',
  category     text not null default 'hi',
  author_key   text not null references public.profiles(id) on delete cascade,
  code         text not null default '',
  css          text not null default '',
  js           text not null default '',
  stars        integer not null default 0,
  forks        integer not null default 0,
  views        integer not null default 0,
  starred_by   jsonb not null default '{}'::jsonb,
  is_featured  boolean not null default false,
  is_premium   boolean not null default false,
  price        integer not null default 0,
  created_at   date not null default current_date
);
create index if not exists gesture_templates_author_idx on public.gesture_templates (author_key, created_at desc);
create index if not exists gesture_templates_created_idx on public.gesture_templates (created_at desc);
alter table public.gesture_templates enable row level security;
drop policy if exists gesture_templates_select on public.gesture_templates;
create policy gesture_templates_select on public.gesture_templates for select
  to authenticated using (true);
drop policy if exists gesture_templates_insert_own on public.gesture_templates;
create policy gesture_templates_insert_own on public.gesture_templates for insert
  to authenticated with check (author_key = auth.uid()::text);
drop policy if exists gesture_templates_update_own on public.gesture_templates;
create policy gesture_templates_update_own on public.gesture_templates for update
  to authenticated using (author_key = auth.uid()::text)
  with check (author_key = auth.uid()::text);
drop policy if exists gesture_templates_delete_own on public.gesture_templates;
create policy gesture_templates_delete_own on public.gesture_templates for delete
  to authenticated using (author_key = auth.uid()::text);

-- ── Template comments ──
create table if not exists public.gesture_template_comments (
  id          text primary key,
  template_id text not null references public.gesture_templates(id) on delete cascade,
  author_key  text not null references public.profiles(id) on delete cascade,
  text        text not null,
  likes       integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists gesture_comments_template_idx on public.gesture_template_comments (template_id, created_at);
alter table public.gesture_template_comments enable row level security;
drop policy if exists gesture_comments_select on public.gesture_template_comments;
create policy gesture_comments_select on public.gesture_template_comments for select
  to authenticated using (true);
drop policy if exists gesture_comments_insert_own on public.gesture_template_comments;
create policy gesture_comments_insert_own on public.gesture_template_comments for insert
  to authenticated with check (author_key = auth.uid()::text);
drop policy if exists gesture_comments_delete_own on public.gesture_template_comments;
create policy gesture_comments_delete_own on public.gesture_template_comments for delete
  to authenticated using (author_key = auth.uid()::text);

-- ── Collaborative gestures (group cards) + signatures ──
create table if not exists public.gesture_collabs (
  id           text primary key,
  title        text not null,
  template_key text not null default '',
  category     text not null default '',
  owner_key    text not null references public.profiles(id) on delete cascade,
  recipients   text[] not null default '{}',
  max_signers  integer not null default 20,
  deadline     date,
  theme_key    text not null default 'gold',
  is_open      boolean not null default true,
  created_at   date not null default current_date
);
create index if not exists gesture_collabs_owner_idx on public.gesture_collabs (owner_key, created_at desc);
create index if not exists gesture_collabs_created_idx on public.gesture_collabs (created_at desc);
alter table public.gesture_collabs enable row level security;
drop policy if exists gesture_collabs_select on public.gesture_collabs;
create policy gesture_collabs_select on public.gesture_collabs for select
  to authenticated using (true);
drop policy if exists gesture_collabs_insert_own on public.gesture_collabs;
create policy gesture_collabs_insert_own on public.gesture_collabs for insert
  to authenticated with check (owner_key = auth.uid()::text);
drop policy if exists gesture_collabs_update_own on public.gesture_collabs;
create policy gesture_collabs_update_own on public.gesture_collabs for update
  to authenticated using (owner_key = auth.uid()::text)
  with check (owner_key = auth.uid()::text);
drop policy if exists gesture_collabs_delete_own on public.gesture_collabs;
create policy gesture_collabs_delete_own on public.gesture_collabs for delete
  to authenticated using (owner_key = auth.uid()::text);

create table if not exists public.gesture_signatures (
  id         text primary key,
  collab_id  text not null references public.gesture_collabs(id) on delete cascade,
  author_key text not null references public.profiles(id) on delete cascade,
  name       text not null default '',
  message    text not null,
  created_at date not null default current_date
);
create index if not exists gesture_signatures_collab_idx on public.gesture_signatures (collab_id, created_at);
alter table public.gesture_signatures enable row level security;
drop policy if exists gesture_signatures_select on public.gesture_signatures;
create policy gesture_signatures_select on public.gesture_signatures for select
  to authenticated using (true);
drop policy if exists gesture_signatures_insert_own on public.gesture_signatures;
create policy gesture_signatures_insert_own on public.gesture_signatures for insert
  to authenticated with check (author_key = auth.uid()::text);

-- ════════════════════════════════════════════════════════════════════
-- RPCs — counters that strangers legitimately bump (RLS is update-own)
-- ════════════════════════════════════════════════════════════════════
create or replace function public.toggle_gesture_star(p_template_id text, p_user_key text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  starred boolean;
  new_count integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_user_key <> auth.uid()::text then
    raise exception 'cannot star for another user';
  end if;
  starred := coalesce((select (starred_by ->> p_user_key)::boolean from public.gesture_templates where id = p_template_id), false);
  if starred then
    update public.gesture_templates
      set starred_by = starred_by - p_user_key,
          stars = greatest(0, stars - 1)
      where id = p_template_id
      returning stars into new_count;
  else
    update public.gesture_templates
      set starred_by = starred_by || jsonb_build_object(p_user_key, true),
          stars = stars + 1
      where id = p_template_id
      returning stars into new_count;
  end if;
  if new_count is null then
    raise exception 'Template not found';
  end if;
  return new_count;
end;
$$;

create or replace function public.fork_gesture_template(p_template_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.gesture_templates set forks = forks + 1 where id = p_template_id
    returning forks into new_count;
  if new_count is null then
    raise exception 'Template not found';
  end if;
  return new_count;
end;
$$;

create or replace function public.increment_gesture_template_view(p_template_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.gesture_templates set views = views + 1 where id = p_template_id;
end;
$$;

create or replace function public.increment_gesture_view(p_instance_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.gesture_instances set views = views + 1 where id = p_instance_id;
end;
$$;

create or replace function public.react_to_gesture(p_instance_id text, p_reaction text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_reactions jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_reaction not in ('love','celebrate','laugh','cry') then
    raise exception 'unknown reaction';
  end if;
  update public.gesture_instances
    set reactions = reactions || jsonb_build_object(
      p_reaction, greatest(0, coalesce((reactions ->> p_reaction)::integer, 0) + 1)
    )
    where id = p_instance_id
    returning reactions into new_reactions;
  if new_reactions is null then
    raise exception 'Gesture not found';
  end if;
  return new_reactions;
end;
$$;

create or replace function public.like_gesture_comment(p_comment_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.gesture_template_comments set likes = likes + 1 where id = p_comment_id;
end;
$$;
