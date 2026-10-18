-- 0017_opportunities.sql — real job/opportunity board (Phase 8B)
-- /opportunities was a self-documented placeholder: it queried a table that
-- never existed and rendered zero results. This creates the board with
-- per-poster write access and a publicly readable (to signed-in users) list.

create table if not exists public.opportunities (
  id           text primary key,
  created_by   text not null references public.profiles(id) on delete cascade,
  type         text not null default 'job'
               check (type in ('job','freelance','investment','funding','mentorship','partnership')),
  title        text not null,
  org          text not null default '',
  location     text not null default '',
  remote       boolean not null default false,
  compensation text not null default '',
  description  text not null default '',
  link         text not null default '',
  status       text not null default 'open' check (status in ('open','closed')),
  created_at   timestamptz not null default now()
);

create index if not exists opportunities_created_idx on public.opportunities (created_at desc);
create index if not exists opportunities_type_idx on public.opportunities (type, status);

alter table public.opportunities enable row level security;

drop policy if exists opportunities_select on public.opportunities;
create policy opportunities_select on public.opportunities for select
  to authenticated using (true);

drop policy if exists opportunities_insert_own on public.opportunities;
create policy opportunities_insert_own on public.opportunities for insert
  to authenticated with check (created_by = auth.uid()::text);

drop policy if exists opportunities_update_own on public.opportunities;
create policy opportunities_update_own on public.opportunities for update
  to authenticated using (created_by = auth.uid()::text)
  with check (created_by = auth.uid()::text);

drop policy if exists opportunities_delete_own on public.opportunities;
create policy opportunities_delete_own on public.opportunities for delete
  to authenticated using (created_by = auth.uid()::text);
