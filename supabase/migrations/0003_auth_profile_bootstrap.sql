-- ─────────────────────────────────────────────────────────────
-- 0003: profile bootstrap
--
-- WHY: signups happen BEFORE a session exists (email confirmation is on),
-- so the client's insert into public.profiles is rejected by RLS and the
-- row never gets created. The user then logs in, useAuthInit finds no row,
-- Providers.js forces /onboarding, onboarding's UPDATE hits 0 rows, the
-- store flag never flips and the user is bounced back to the name prompt
-- in an infinite loop.
--
-- FIX (server-side, cannot be bypassed by the client):
--   1. auto-create the profile row the instant an auth user is created
--   2. backfill every existing auth user that is missing a profile row
-- ─────────────────────────────────────────────────────────────

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

  insert into public.profiles (id, email, name, handle, avatar, profile_completed, created_at, updated_at)
  values (new.id::text, new.email, v_name, v_handle, v_avatar, false, now(), now())
  on conflict (id) do nothing;

  return new;
exception
  -- never let profile creation block a signup
  when others then
    raise notice 'handle_new_user skipped: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── backfill: existing auth users with no profile row ──────
-- idempotent; safe to re-run. profile_completed stays as-is for
-- users who already have a row (this only touches the missing ones).
insert into public.profiles (id, email, name, handle, avatar, profile_completed, created_at, updated_at)
select
  u.id::text,
  u.email,
  coalesce(
    nullif(u.raw_user_meta_data->>'name', ''),
    nullif(u.raw_user_meta_data->>'full_name', ''),
    split_part(coalesce(u.email, ''), '@', 1),
    'User'
  ),
  '@' || lower(regexp_replace(
    coalesce(
      nullif(u.raw_user_meta_data->>'name', ''),
      nullif(u.raw_user_meta_data->>'full_name', ''),
      split_part(coalesce(u.email, ''), '@', 1),
      'User'
    ), '\s+', '', 'g')),
  coalesce(nullif(u.raw_user_meta_data->>'avatar_url', ''), nullif(u.raw_user_meta_data->>'picture', '')),
  false,
  now(),
  now()
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id::text)
on conflict (id) do nothing;

-- grant execute so the auth server can run the trigger function
grant execute on function public.handle_new_user() to supabase_auth_admin;
grant execute on function public.handle_new_user() to authenticated;
