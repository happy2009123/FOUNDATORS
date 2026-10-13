-- ============================================================
-- 0006 ADMIN CONSOLE: first-admin bootstrap + admin-wide reads
-- ============================================================
-- Three gaps kept /admin from working end to end:
--   1. The admins table ships empty with no in-app way to seed the
--      first administrator (chicken-and-egg: only admins can insert
--      admins, and nobody is an admin yet). Two SECURITY DEFINER
--      RPCs let the first signed-in user claim the role exactly
--      once, while the table is still empty.
--   2. chats / chat_messages RLS only exposes rows to participants,
--      so the admin Messages monitor was always empty.
--   3. referral_invites / collab_requests RLS only exposes rows to
--      their own participants, so Growth could not show platform
--      totals and rendered "Not available client-side".
-- ============================================================

-- ─── 1. First-admin bootstrap ────────────────────────────────

create or replace function public.admin_bootstrap_status()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select case
    when exists (select 1 from public.admins) then 'exists'
    else 'empty'
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

  -- Serialize concurrent claim attempts so two users racing the
  -- empty window cannot both become "the first" admin.
  perform pg_advisory_xact_lock(hashtext('foundators:claim_first_admin'));

  if exists (select 1 from public.admins) then
    return false;
  end if;

  -- FK: admins.user_id references profiles(id) — a session without
  -- a profile row cannot claim (signup always creates one).
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

-- ─── 2. Admin-wide read policies (additive; own/member policies stay) ──

drop policy if exists chats_admin_select on public.chats;
create policy chats_admin_select on public.chats for select
  to authenticated using (is_admin());

drop policy if exists chat_messages_admin_select on public.chat_messages;
create policy chat_messages_admin_select on public.chat_messages for select
  to authenticated using (is_admin());

drop policy if exists referral_admin_select on public.referral_invites;
create policy referral_admin_select on public.referral_invites for select
  to authenticated using (is_admin());

drop policy if exists collab_requests_admin_select on public.collab_requests;
create policy collab_requests_admin_select on public.collab_requests for select
  to authenticated using (is_admin());

-- ─── 3. Report resolution notes ──────────────────────────────
-- Moderation passes a resolution note when resolving a report, but
-- reports had no column to store it in, so the note was silently
-- dropped by updateReport()'s column whitelist.

alter table public.reports add column if not exists resolution text;
