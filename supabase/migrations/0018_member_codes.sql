-- 0018_member_codes.sql — shareable FD001-style member codes
-- Messages promised "search by user ID (FD001)" but no such ID existed:
-- profiles only had auth UUIDs, so UID search could never match.
-- This gives every profile a stable, unique, human-readable member code.

alter table public.profiles add column if not exists member_code text;

create sequence if not exists public.member_code_seq start 1;

-- Backfill existing profiles in creation order: FD001, FD002, ...
with ranked as (
  select id,
         row_number() over (order by created_at, id) as rn
  from public.profiles
  where member_code is null or member_code = ''
)
update public.profiles p
set member_code = 'FD' || lpad(ranked.rn::text, 4, '0')
from ranked
where p.id = ranked.id;

-- Align the sequence past every existing code
select setval(
  'public.member_code_seq',
  greatest(
    coalesce(
       (select max(nullif(regexp_replace(member_code, '[^0-9]', '', 'g'), '')::int)
       from public.profiles),
      0
    ) + 1,
    1
  ),
  false
);

-- Every future profile (signup trigger or admin insert) gets a code
create or replace function public.assign_member_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.member_code is null or new.member_code = '' then
    new.member_code := 'FD' || lpad(nextval('public.member_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists assign_member_code on public.profiles;
create trigger assign_member_code before insert on public.profiles
  for each row execute function public.assign_member_code();

create unique index if not exists profiles_member_code_idx
  on public.profiles (member_code);

comment on column public.profiles.member_code is
  'Shareable member ID (FD001, FD002...) used to find people in Messages';
