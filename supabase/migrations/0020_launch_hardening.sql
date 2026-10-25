-- ════════════════════════════════════════════════════════════════════
-- 0020 — LAUNCH HARDENING PART 2
--   1. Private `chat-media` bucket: DM photos/voice/files stop being
--      world-readable; senders upload under foundators/<uid>/ and read
--      back via short-lived-permission SIGNED URLs (stored in the
--      message text). Old messages in the public `uploads` bucket keep
--      working untouched.
--   2. Database-backed rate limiter: counters shared across serverless
--      instances (in-memory maps were bypassable across cold starts).
--      Used by lib/apiRateLimit.js when SUPABASE_SECRET_KEY is set.
--   3. Repair achievements_insert (0019 tightened it to admin-only, but
--      the app legitimately auto-creates `challenge_<id>` definitions):
--      clients may create ONLY definitions bound to a real challenge.
-- Run in the Supabase SQL Editor (after 0019).
-- ════════════════════════════════════════════════════════════════════

-- ─── 1. private chat-media bucket ───
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do update set public = false;

drop policy if exists chat_media_insert on storage.objects;
create policy chat_media_insert on storage.objects for insert
  to authenticated with check (
    bucket_id = 'chat-media'
    and storage.foldername(name)[1] = 'foundators'
    and storage.foldername(name)[2] = auth.uid()::text
  );

drop policy if exists chat_media_select_owner on storage.objects;
create policy chat_media_select_owner on storage.objects for select
  to authenticated using (
    bucket_id = 'chat-media'
    and storage.foldername(name)[1] = 'foundators'
    and storage.foldername(name)[2] = auth.uid()::text
  );

drop policy if exists chat_media_update_owner on storage.objects;
create policy chat_media_update_owner on storage.objects for update
  to authenticated
  using (
    bucket_id = 'chat-media'
    and storage.foldername(name)[1] = 'foundators'
    and storage.foldername(name)[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'chat-media'
    and storage.foldername(name)[1] = 'foundators'
    and storage.foldername(name)[2] = auth.uid()::text
  );

drop policy if exists chat_media_delete_owner on storage.objects;
create policy chat_media_delete_owner on storage.objects for delete
  to authenticated using (
    bucket_id = 'chat-media'
    and storage.foldername(name)[1] = 'foundators'
    and storage.foldername(name)[2] = auth.uid()::text
  );

-- ─── 2. shared rate limiter ───
create table if not exists public.rate_limits (
  key               text primary key,
  count             integer not null default 0,
  window_started_at timestamptz not null default now(),
  expires_at        timestamptz not null
);
create index if not exists rate_limits_expires_idx on public.rate_limits (expires_at);
alter table public.rate_limits enable row level security;
-- no policies: only the SECURITY DEFINER function below touches it.

create or replace function public.rate_limit_hit(p_key text, p_limit integer, p_window_ms integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count   integer;
  v_started timestamptz;
  v_window  interval := make_interval(secs => greatest(1, p_window_ms) / 1000.0);
  v_retry   integer;
begin
  if p_key is null or length(p_key) < 1 or length(p_key) > 200
     or p_limit is null or p_limit < 1 or p_window_ms is null or p_window_ms < 1000 then
    return jsonb_build_object('ok', false, 'retry_after', 1, 'remaining', 0);
  end if;

  -- opportunistic cleanup of expired windows (keeps the table tiny)
  delete from public.rate_limits where expires_at < now();

  select count, window_started_at into v_count, v_started
    from public.rate_limits where key = p_key for update;

  if not found then
    insert into public.rate_limits (key, count, window_started_at, expires_at)
    values (p_key, 1, now(), now() + v_window);
    return jsonb_build_object('ok', true, 'remaining', greatest(0, p_limit - 1));
  end if;

  if v_started + v_window <= now() then
    update public.rate_limits
       set count = 1, window_started_at = now(), expires_at = now() + v_window
     where key = p_key;
    return jsonb_build_object('ok', true, 'remaining', greatest(0, p_limit - 1));
  end if;

  update public.rate_limits set count = count + 1 where key = p_key;
  v_count := v_count + 1;

  if v_count > p_limit then
    v_retry := greatest(1, ceil(extract(epoch from (v_started + v_window - now()))));
    return jsonb_build_object('ok', false, 'retry_after', v_retry, 'remaining', 0);
  end if;
  return jsonb_build_object('ok', true, 'remaining', greatest(0, p_limit - v_count));
end;
$$;

revoke execute on function public.rate_limit_hit(text, integer, integer) from anon, authenticated, public;
grant  execute on function public.rate_limit_hit(text, integer, integer) to service_role;

-- ─── 3. challenge achievement definitions may be auto-created again ───
drop policy if exists achievements_insert on public.achievements;
create policy achievements_insert on public.achievements for insert
  to authenticated with check (
    is_admin()
    or (
      starts_with(id, 'challenge_')
      and exists (
        select 1 from public.challenges c
        where c.id = substring(id from 10)
      )
    )
  );
