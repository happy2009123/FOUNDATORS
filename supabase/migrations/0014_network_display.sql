-- 0014_network_display.sql
-- Supplements to 0013 (which has already been run) for Phase 3 networking.
-- Additive / idempotent — safe to re-run.

-- 0013 only let the target, the author and admins SELECT recommendations,
-- so a visitor could never see published recommendations on a profile.
-- LinkedIn shows published ones to everyone; keep pending/hidden private.
drop policy if exists recommendations_select on public.recommendations;
create policy recommendations_select on public.recommendations for select
  to authenticated using (
    status = 'published'
    or target_id = auth.uid()::text
    or author_id = auth.uid()::text
    or is_admin()
  );
