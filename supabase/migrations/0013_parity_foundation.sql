-- 0013_parity_foundation.sql
-- One-shot parity schema for Phases 1–7 (fix-fakes + LinkedIn/Instagram gap closure).
-- Additive only: every statement is idempotent and safe to re-run.
-- Covers: share/bookmark RPCs, story-view author access, profile personalization
-- + resume sections, post formats (poll/carousel/article/views), FTS, reactions,
-- recommendations, endorsements, connection graph, story highlights, followed
-- topics, events datetime, poll voting.

-- ════════════════════════════════════════════════════════════════════
-- PROFILES — personalization + LinkedIn-grade sections
-- ════════════════════════════════════════════════════════════════════
alter table public.profiles add column if not exists interests text[] not null default '{}';
alter table public.profiles add column if not exists experience jsonb not null default '[]';
alter table public.profiles add column if not exists education jsonb not null default '[]';
alter table public.profiles add column if not exists open_to_work boolean not null default false;
alter table public.profiles add column if not exists hiring boolean not null default false;

-- Full-text search column (simple config: case/diacritic-insensitive, no stemming)
alter table public.profiles add column if not exists search_tsv tsvector
  generated always as (
    to_tsvector('simple',
      coalesce(name, '') || ' ' || coalesce(handle, '') || ' ' ||
      coalesce(bio, '') || ' ' || coalesce(role, ''))
  ) stored;
create index if not exists profiles_search_tsv_idx on public.profiles using gin (search_tsv);

-- ════════════════════════════════════════════════════════════════════
-- POSTS — content formats + counters
-- ════════════════════════════════════════════════════════════════════
alter table public.posts add column if not exists poll jsonb;
alter table public.posts add column if not exists image_urls text[] not null default '{}';
alter table public.posts add column if not exists view_count integer not null default 0;
alter table public.posts add column if not exists kind text not null default 'post';

alter table public.posts add column if not exists text_tsv tsvector
  generated always as (to_tsvector('simple', coalesce(text, ''))) stored;
create index if not exists posts_text_tsv_idx on public.posts using gin (text_tsv);

-- ════════════════════════════════════════════════════════════════════
-- CHAT MESSAGES — full-text search
-- ════════════════════════════════════════════════════════════════════
alter table public.chat_messages add column if not exists text_tsv tsvector
  generated always as (to_tsvector('simple', coalesce(text, ''))) stored;
create index if not exists chat_messages_text_tsv_idx on public.chat_messages using gin (text_tsv);

-- ════════════════════════════════════════════════════════════════════
-- REELS — bookmarks (likes/shares columns already exist)
-- ════════════════════════════════════════════════════════════════════
alter table public.reels add column if not exists bookmarked_by text[] not null default '{}';

-- ════════════════════════════════════════════════════════════════════
-- EVENTS — real datetime + reminder tracking (start_at/end_at already exist)
-- ════════════════════════════════════════════════════════════════════
alter table public.events add column if not exists starts_at timestamptz;
alter table public.events add column if not exists reminder_sent boolean not null default false;
create index if not exists events_starts_at_idx on public.events (starts_at desc) where starts_at is not null;

-- ════════════════════════════════════════════════════════════════════
-- STORY VIEWS — let the story's author see who viewed (viewer keeps own row)
-- ════════════════════════════════════════════════════════════════════
drop policy if exists story_views_author_select on public.story_views;
create policy story_views_author_select on public.story_views for select
  to authenticated using (
    exists (
      select 1 from public.stories s
      where s.id = story_id and s.user_id = auth.uid()::text
    )
  );

-- ════════════════════════════════════════════════════════════════════
-- POST REACTIONS — multi-reaction tray (❤️🎉👏💡…)
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.post_reactions (
  post_id    text not null references public.posts(id) on delete cascade,
  user_id    text not null references public.profiles(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists post_reactions_post_idx on public.post_reactions (post_id);

drop policy if exists post_reactions_select on public.post_reactions;
create policy post_reactions_select on public.post_reactions for select
  to authenticated using (true);
drop policy if exists post_reactions_insert_own on public.post_reactions;
create policy post_reactions_insert_own on public.post_reactions for insert
  to authenticated with check (user_id = auth.uid()::text);
drop policy if exists post_reactions_update_own on public.post_reactions;
create policy post_reactions_update_own on public.post_reactions for update
  to authenticated using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);
drop policy if exists post_reactions_delete_own on public.post_reactions;
create policy post_reactions_delete_own on public.post_reactions for delete
  to authenticated using (user_id = auth.uid()::text);

-- ════════════════════════════════════════════════════════════════════
-- POLL VOTES — one row per (post, voter); poll jsonb holds question/options
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.poll_votes (
  post_id       text not null references public.posts(id) on delete cascade,
  user_id       text not null references public.profiles(id) on delete cascade,
  option_index  integer not null,
  created_at    timestamptz not null default now(),
  primary key (post_id, user_id)
);

drop policy if exists poll_votes_select on public.poll_votes;
create policy poll_votes_select on public.poll_votes for select
  to authenticated using (true);
drop policy if exists poll_votes_insert_own on public.poll_votes;
create policy poll_votes_insert_own on public.poll_votes for insert
  to authenticated with check (user_id = auth.uid()::text);
drop policy if exists poll_votes_delete_own on public.poll_votes;
create policy poll_votes_delete_own on public.poll_votes for delete
  to authenticated using (user_id = auth.uid()::text);

-- ════════════════════════════════════════════════════════════════════
-- RECOMMENDATIONS — LinkedIn-style written endorsements of people
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.recommendations (
  id         text primary key,
  author_id  text not null references public.profiles(id) on delete cascade,
  target_id  text not null references public.profiles(id) on delete cascade,
  content    text not null default '',
  status     text not null default 'pending',  -- pending | published | hidden
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recommendations_target_idx on public.recommendations (target_id, status);
create index if not exists recommendations_author_idx on public.recommendations (author_id);

drop policy if exists recommendations_select on public.recommendations;
create policy recommendations_select on public.recommendations for select
  to authenticated using (
    target_id = auth.uid()::text or author_id = auth.uid()::text or is_admin()
  );
drop policy if exists recommendations_insert_own on public.recommendations;
create policy recommendations_insert_own on public.recommendations for insert
  to authenticated with check (author_id = auth.uid()::text);
drop policy if exists recommendations_update_related on public.recommendations;
create policy recommendations_update_related on public.recommendations for update
  to authenticated using (
    target_id = auth.uid()::text or author_id = auth.uid()::text
  )
  with check (
    target_id = auth.uid()::text or author_id = auth.uid()::text
  );
drop policy if exists recommendations_delete_own on public.recommendations;
create policy recommendations_delete_own on public.recommendations for delete
  to authenticated using (author_id = auth.uid()::text or target_id = auth.uid()::text);

-- ════════════════════════════════════════════════════════════════════
-- ENDORSEMENTS — skill endorsements
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.endorsements (
  user_id    text not null references public.profiles(id) on delete cascade,
  skill      text not null,
  endorser_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, skill, endorser_id)
);
create index if not exists endorsements_user_idx on public.endorsements (user_id);

drop policy if exists endorsements_select on public.endorsements;
create policy endorsements_select on public.endorsements for select
  to authenticated using (true);
drop policy if exists endorsements_insert_own on public.endorsements;
create policy endorsements_insert_own on public.endorsements for insert
  to authenticated with check (endorser_id = auth.uid()::text);
drop policy if exists endorsements_delete_own on public.endorsements;
create policy endorsements_delete_own on public.endorsements for delete
  to authenticated using (endorser_id = auth.uid()::text);

-- ════════════════════════════════════════════════════════════════════
-- CONNECTION REQUESTS + CONNECTIONS — LinkedIn-style graph (independent of follows)
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.connection_requests (
  id         text primary key,
  from_id    text not null references public.profiles(id) on delete cascade,
  to_id      text not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending',  -- pending | accepted | declined
  created_at timestamptz not null default now(),
  unique (from_id, to_id)
);
create index if not exists connection_requests_to_idx on public.connection_requests (to_id, status);
create index if not exists connection_requests_from_idx on public.connection_requests (from_id, status);

drop policy if exists connection_requests_select on public.connection_requests;
create policy connection_requests_select on public.connection_requests for select
  to authenticated using (from_id = auth.uid()::text or to_id = auth.uid()::text or is_admin());
drop policy if exists connection_requests_insert_own on public.connection_requests;
create policy connection_requests_insert_own on public.connection_requests for insert
  to authenticated with check (from_id = auth.uid()::text);
drop policy if exists connection_requests_update on public.connection_requests;
create policy connection_requests_update on public.connection_requests for update
  to authenticated using (to_id = auth.uid()::text or from_id = auth.uid()::text)
  with check (to_id = auth.uid()::text or from_id = auth.uid()::text);
drop policy if exists connection_requests_delete_own on public.connection_requests;
create policy connection_requests_delete_own on public.connection_requests for delete
  to authenticated using (from_id = auth.uid()::text or to_id = auth.uid()::text);

create table if not exists public.connections (
  user_a     text not null references public.profiles(id) on delete cascade,
  user_b     text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index if not exists connections_user_a_idx on public.connections (user_a);
create index if not exists connections_user_b_idx on public.connections (user_b);

drop policy if exists connections_select on public.connections;
create policy connections_select on public.connections for select
  to authenticated using (user_a = auth.uid()::text or user_b = auth.uid()::text);
drop policy if exists connections_delete on public.connections;
create policy connections_delete on public.connections for delete
  to authenticated using (user_a = auth.uid()::text or user_b = auth.uid()::text);
-- (no insert policy: rows are written only by respond_connection_request, a
--  security-definer function, so users cannot fabricate connections.)

-- ════════════════════════════════════════════════════════════════════
-- FOLLOWED TOPICS — hashtag/topic follows
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.followed_topics (
  user_id    text not null references public.profiles(id) on delete cascade,
  tag        text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, tag)
);

drop policy if exists followed_topics_select on public.followed_topics;
create policy followed_topics_select on public.followed_topics for select
  to authenticated using (user_id = auth.uid()::text);
drop policy if exists followed_topics_insert_own on public.followed_topics;
create policy followed_topics_insert_own on public.followed_topics for insert
  to authenticated with check (user_id = auth.uid()::text);
drop policy if exists followed_topics_delete_own on public.followed_topics;
create policy followed_topics_delete_own on public.followed_topics for delete
  to authenticated using (user_id = auth.uid()::text);

-- ════════════════════════════════════════════════════════════════════
-- STORY HIGHLIGHTS — save stories to profile
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.story_highlights (
  id         text primary key,
  user_id    text not null references public.profiles(id) on delete cascade,
  title      text not null default 'Highlight',
  media_url  text,
  media_type text not null default 'image',
  caption    text,
  created_at timestamptz not null default now()
);
create index if not exists story_highlights_user_idx on public.story_highlights (user_id, created_at desc);

drop policy if exists story_highlights_select on public.story_highlights;
create policy story_highlights_select on public.story_highlights for select
  to authenticated using (true);
drop policy if exists story_highlights_insert_own on public.story_highlights;
create policy story_highlights_insert_own on public.story_highlights for insert
  to authenticated with check (user_id = auth.uid()::text);
drop policy if exists story_highlights_update_own on public.story_highlights;
create policy story_highlights_update_own on public.story_highlights for update
  to authenticated using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);
drop policy if exists story_highlights_delete_own on public.story_highlights;
create policy story_highlights_delete_own on public.story_highlights for delete
  to authenticated using (user_id = auth.uid()::text);

-- ════════════════════════════════════════════════════════════════════
-- RPC: share / view counters (RLS is update-own, so counters need definer)
-- ════════════════════════════════════════════════════════════════════
create or replace function public.increment_post_share(p_post_id text)
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
  update public.posts set shares = shares + 1 where id = p_post_id
    returning shares into new_count;
  if new_count is null then
    raise exception 'Post not found';
  end if;
  return new_count;
end;
$$;

create or replace function public.increment_post_view(p_post_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts set view_count = view_count + 1 where id = p_post_id;
end;
$$;

create or replace function public.increment_reel_share(p_reel_id text)
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
  update public.reels set shares = shares + 1 where id = p_reel_id
    returning shares into new_count;
  if new_count is null then
    raise exception 'Reel not found';
  end if;
  return new_count;
end;
$$;

-- ════════════════════════════════════════════════════════════════════
-- RPC: reel bookmark toggle (mirrors toggle_bookmark)
-- ════════════════════════════════════════════════════════════════════
create or replace function public.toggle_reel_bookmark(p_reel_id text, p_bookmark boolean default null)
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
            else not (my_uid = any(coalesce((select bookmarked_by from public.reels where id = p_reel_id), '{}'))) end;
  update public.reels
  set bookmarked_by = case when going
        then array_append(bookmarked_by, my_uid)
        else array_remove(bookmarked_by, my_uid) end
  where id = p_reel_id;
  return going;
end;
$$;

-- ════════════════════════════════════════════════════════════════════
-- RPC: set/clear the caller's reaction on a post (upsert = change emoji)
-- ════════════════════════════════════════════════════════════════════
create or replace function public.set_post_reaction(p_post_id text, p_emoji text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  my_uid text := auth.uid()::text;
begin
  if my_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_emoji is null then
    delete from public.post_reactions where post_id = p_post_id and user_id = my_uid;
    return null;
  end if;
  insert into public.post_reactions (post_id, user_id, emoji)
  values (p_post_id, my_uid, p_emoji)
  on conflict (post_id, user_id) do update set emoji = excluded.emoji;
  return p_emoji;
end;
$$;

-- ════════════════════════════════════════════════════════════════════
-- RPC: vote in a poll (moves an existing vote, keeps jsonb tallies in sync)
-- poll jsonb shape: { question, options: [{ text, votes }] }
-- ════════════════════════════════════════════════════════════════════
create or replace function public.vote_poll(p_post_id text, p_option_index integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_uid text := auth.uid()::text;
  prev_index integer;
  poll_data jsonb;
  opts jsonb;
begin
  if my_uid is null then
    raise exception 'not authenticated';
  end if;

  select poll into poll_data from public.posts where id = p_post_id;
  if poll_data is null then
    raise exception 'Poll not found';
  end if;

  select option_index into prev_index
  from public.poll_votes where post_id = p_post_id and user_id = my_uid;

  opts := coalesce(poll_data->'options', '[]'::jsonb);
  if p_option_index < 0 or p_option_index >= jsonb_array_length(opts) then
    raise exception 'Invalid option';
  end if;

  -- decrement previous choice
  if prev_index is not null and prev_index <> p_option_index then
    opts := jsonb_set(opts, array[prev_index::text, 'votes'],
      to_jsonb(greatest(0, coalesce((opts->prev_index->>'votes')::int, 0) - 1)));
  end if;

  if prev_index is null or prev_index <> p_option_index then
    opts := jsonb_set(opts, array[p_option_index::text, 'votes'],
      to_jsonb(coalesce((opts->p_option_index->>'votes')::int, 0) + 1));
  end if;

  update public.posts
  set poll = jsonb_set(coalesce(poll, '{}'::jsonb), '{options}', opts)
  where id = p_post_id;

  insert into public.poll_votes (post_id, user_id, option_index)
  values (p_post_id, my_uid, p_option_index)
  on conflict (post_id, user_id) do update set option_index = excluded.option_index;
end;
$$;

-- ════════════════════════════════════════════════════════════════════
-- RPC: connection requests (definer so accept can write the connections row)
-- ════════════════════════════════════════════════════════════════════
create or replace function public.send_connection_request(p_to text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  my_uid text := auth.uid()::text;
  req_id text;
  existing_status text;
begin
  if my_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_to is null or p_to = my_uid then
    raise exception 'Invalid target';
  end if;

  select status into existing_status
  from public.connection_requests
  where from_id = my_uid and to_id = p_to;

  if existing_status = 'accepted' then
    return 'already_connected';
  end if;
  if existing_status = 'pending' then
    return 'pending';
  end if;

  -- overwrite a previous declined/declined-back request
  delete from public.connection_requests
  where (from_id = my_uid and to_id = p_to)
     or (from_id = p_to and to_id = my_uid);

  req_id := 'cr_' || replace(gen_random_uuid()::text, '-', '') || '_' ||
            floor(extract(epoch from now()))::text;
  insert into public.connection_requests (id, from_id, to_id)
  values (req_id, my_uid, p_to);
  return 'sent';
end;
$$;

create or replace function public.respond_connection_request(p_request_id text, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  my_uid text := auth.uid()::text;
  req record;
  a text;
  b text;
begin
  if my_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into req from public.connection_requests where id = p_request_id;
  if not found then
    raise exception 'Request not found';
  end if;
  if req.to_id <> my_uid then
    raise exception 'Not your request';
  end if;

  if p_accept then
    update public.connection_requests set status = 'accepted' where id = p_request_id;
    a := least(req.from_id, req.to_id);
    b := greatest(req.from_id, req.to_id);
    insert into public.connections (user_a, user_b) values (a, b)
    on conflict do nothing;
    return 'accepted';
  end if;

  update public.connection_requests set status = 'declined' where id = p_request_id;
  return 'declined';
end;
$$;

-- ════════════════════════════════════════════════════════════════════
-- RPC: like counts aggregated for a post set (reaction tray display)
-- ════════════════════════════════════════════════════════════════════
create or replace function public.get_post_reactions(p_post_ids text[])
returns table (post_id text, emoji text, cnt bigint)
language sql
security definer
set search_path = public
stable
as $$
  select r.post_id, r.emoji, count(*) as cnt
  from public.post_reactions r
  where r.post_id = any (p_post_ids)
  group by r.post_id, r.emoji;
$$;
