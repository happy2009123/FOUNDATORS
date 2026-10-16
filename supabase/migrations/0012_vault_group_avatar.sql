-- 0012: Idea Vault (private ideas, versions, trusted members) + group avatars.
--
-- Vault: ideas.is_private hides an idea from the public ideas_select
-- policy; idea_versions stores immutable snapshots the author can restore;
-- idea_vault_members grants specific founders access to a private idea.
--
-- Group avatars: chats.group_avatar mirrors profiles.avatar storage.

alter table public.chats add column if not exists group_avatar text;

alter table public.ideas add column if not exists is_private boolean not null default false;

create table if not exists public.idea_versions (
  id          text primary key,
  idea_id     text not null references public.ideas(id) on delete cascade,
  version     integer not null default 1,
  title       text not null default '',
  summary     text not null default '',
  body        jsonb not null default '{}',
  created_by  text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists idea_versions_idea_idx on public.idea_versions (idea_id, version desc);

create table if not exists public.idea_vault_members (
  idea_id     text not null references public.ideas(id) on delete cascade,
  user_id     text not null,
  added_by    text not null default '',
  created_at  timestamptz not null default now(),
  primary key (idea_id, user_id)
);

alter table public.idea_versions enable row level security;
alter table public.idea_vault_members enable row level security;

-- Public read of ideas now excludes private vault ideas; the author and
-- explicitly invited vault members keep access. is_admin() bypass preserved.
drop policy if exists ideas_select on public.ideas;
create policy ideas_select on public.ideas for select
  to authenticated using (
    is_private = false
    or author_key = auth.uid()::text
    or is_admin()
    or exists (
      select 1 from public.idea_vault_members m
      where m.idea_id = ideas.id and m.user_id = auth.uid()::text
    )
  );

-- Versions: readable by whoever can see the idea; written by its author.
drop policy if exists idea_versions_select on public.idea_versions;
create policy idea_versions_select on public.idea_versions for select
  to authenticated using (
    exists (
      select 1 from public.ideas i
      where i.id = idea_id
        and (
          i.is_private = false
          or i.author_key = auth.uid()::text
          or exists (
            select 1 from public.idea_vault_members m2
            where m2.idea_id = i.id and m2.user_id = auth.uid()::text
          )
        )
    )
  );

drop policy if exists idea_versions_insert_own on public.idea_versions;
create policy idea_versions_insert_own on public.idea_versions for insert
  to authenticated with check (
    exists (
      select 1 from public.ideas i
      where i.id = idea_id and i.author_key = auth.uid()::text
    )
  );

drop policy if exists idea_versions_delete_own on public.idea_versions;
create policy idea_versions_delete_own on public.idea_versions for delete
  to authenticated using (
    exists (
      select 1 from public.ideas i
      where i.id = idea_id and i.author_key = auth.uid()::text
    )
  );

-- Vault membership: managed by the idea's author; readable by anyone who
-- can read the idea.
drop policy if exists idea_vault_members_select on public.idea_vault_members;
create policy idea_vault_members_select on public.idea_vault_members for select
  to authenticated using (
    exists (
      select 1 from public.ideas i
      where i.id = idea_id
        and (
          i.author_key = auth.uid()::text
          or i.is_private = false
          or exists (
            select 1 from public.idea_vault_members m2
            where m2.idea_id = i.id and m2.user_id = auth.uid()::text
          )
        )
    )
  );

drop policy if exists idea_vault_members_write_own on public.idea_vault_members;
create policy idea_vault_members_write_own on public.idea_vault_members for insert
  to authenticated with check (
    exists (
      select 1 from public.ideas i
      where i.id = idea_id and i.author_key = auth.uid()::text
    )
  );

drop policy if exists idea_vault_members_delete_own on public.idea_vault_members;
create policy idea_vault_members_delete_own on public.idea_vault_members for delete
  to authenticated using (
    exists (
      select 1 from public.ideas i
      where i.id = idea_id and i.author_key = auth.uid()::text
    )
  );
