-- ════════════════════════════════════════════════════════════════════
-- 0015 — REFERRAL HARDENING
-- Closes the self-activation hole (invited_id could update their own
-- invite row with status='activated' and hand their inviter +3 Builder
-- Score). Activation now goes through an activity-gated SECURITY DEFINER
-- function: the caller must be the invitee AND have a real post or
-- project before the invite flips to activated.
-- Run this migration in the Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.activate_referral()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only the invitee themselves, and only with real activity on the platform.
  if not exists (
    select 1 from public.posts where author_key = auth.uid()::text
    union all
    select 1 from public.projects where owner_id = auth.uid()::text
  ) then
    return;
  end if;

  update public.referral_invites
     set status = 'activated',
         activated_at = coalesce(activated_at, now())
   where invited_id = auth.uid()::text
     and status <> 'activated';
end;
$$;

revoke execute on function public.activate_referral() from anon;
grant execute on function public.activate_referral() to authenticated;

-- Invited users may no longer update their invite row directly — only the
-- inviter can (e.g. to withdraw). Activation is RPC-only from here on.
drop policy if exists referral_update_own on public.referral_invites;
create policy referral_update_own on public.referral_invites
  for update to authenticated
  using (inviter_id = auth.uid()::text)
  with check (inviter_id = auth.uid()::text);
