-- 0010: Web Push subscriptions + expired-story purge.
--
-- Push: browser push subscriptions keyed by endpoint (unique globally).
-- Clients upsert their own row (RLS own-only); /api/push/send reads with
-- the service role (SUPABASE_SECRET_KEY) to fan out to a recipient's
-- devices - the recipient's session is obviously not available server-side.
--
-- Stories: rows already carry expires_at (24h) and every read path filters
-- on it, but nothing ever deleted them. purge_expired_stories() is a
-- security-definer function any authenticated client may call once on
-- app load (story views cascade via FK).

create table if not exists public.push_subscriptions (
  id text primary key,
  user_id text not null,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create or replace function public.purge_expired_stories()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.stories
  where expires_at is not null
    and expires_at < now();
$$;

revoke execute on function public.purge_expired_stories() from public, anon;
grant execute on function public.purge_expired_stories() to authenticated;
