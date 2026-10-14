-- ============================================================
-- 0007 ADMIN LOCKDOWN — close the open bootstrap window
-- ============================================================
-- 0006 let ANY signed-in account claim the first-admin seat while
-- the admins table was empty. That window is now restricted to the
-- single earliest-created account (confirmed email), and the status
-- probe only reports 'empty' to that account — everyone else is
-- treated as if the seat is already taken. The universal, fully
-- manual path stays available: inserting the admins row from the
-- Supabase SQL Editor (service role) is never blocked.
-- ============================================================

create or replace function public.admin_bootstrap_status()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select case
    when exists (select 1 from public.admins) then 'exists'
    when auth.uid() is null then 'exists'
    when (auth.jwt() ->> 'email_confirmed_at') is null then 'exists'
    when auth.uid()::text = (
      select id from public.profiles
      where id is not null
      order by created_at asc nulls last
      limit 1
    ) then 'empty'
    else 'exists'
  end;
$$;

revoke execute on function public.admin_bootstrap_status() from public;
revoke execute on function public.admin_bootstrap_status() from anon;
grant execute on function public.admin_bootstrap_status() to authenticated;

create or replace function public.claim_first_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  if (auth.jwt() ->> 'email_confirmed_at') is null then
    return false;
  end if;

  -- Serialize concurrent claim attempts.
  perform pg_advisory_xact_lock(hashtext('foundators:claim_first_admin'));

  if exists (select 1 from public.admins) then
    return false;
  end if;

  -- Only the earliest-created account (the platform owner in
  -- practice) may take the empty seat from the client. Everyone
  -- else must be seeded from the SQL Editor.
  if auth.uid()::text <> (
    select id from public.profiles
    where id is not null
    order by created_at asc nulls last
    limit 1
  ) then
    return false;
  end if;

  if not exists (select 1 from public.profiles where id = auth.uid()::text) then
    return false;
  end if;

  insert into public.admins (user_id, role)
  values (auth.uid()::text, 'admin')
  on conflict (user_id) do nothing;

  return exists (select 1 from public.admins where user_id = auth.uid()::text);
end;
$$;

revoke execute on function public.claim_first_admin() from public;
revoke execute on function public.claim_first_admin() from anon;
grant execute on function public.claim_first_admin() to authenticated;
