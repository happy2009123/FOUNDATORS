# FOUNDATORS — Security & RLS

Model: **every table is protected by Row Level Security**; the client never
holds a service-role key. Admin powers come from the `admins` table +
`is_admin()` (a SECURITY DEFINER function), *not* from a profile column a user
could edit.

## 1. Authentication boundary

| Concern | Implementation |
| --- | --- |
| Who is "me" | `auth.uid()` inside policies (`auth.uid()::text` compared to `TEXT` ids so Firebase UIDs work too) |
| Anonymous access | all policies are `to authenticated` (or `to public` only for storage read) — anon selects return 0 rows |
| Server routes | `/api/*` receive `Authorization: Bearer <access token>` and validate with `auth.getUser(jwt)` |
| Service key | `SUPABASE_SECRET_KEY` is read only by `lib/supabase/server.js` (server-only, throws in the browser) |
| Session | supabase-js stores it under `foundators-supabase-auth`; logout tears down all realtime channels |

## 2. Policy matrix (per table)

Legend: **own** = `id`/`user_id`/`author_key`/`owner_id` equals `auth.uid()::text`.

| Table | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| profiles | all authenticated | own id | own id (+ privilege trigger) | own id |
| admins | all authenticated | — (admin only, **no client policy**) | — | — |
| posts | all | own author | own author | own author |
| comments | all | own author | own author | own author |
| follows | all | follower = self | — | follower = self |
| chats | participant | participant | participant | participant |
| chat_messages | chat member | member + `sender_key = self` | sender / admin | sender / admin |
| notifications | own | authenticated, `actor_key` cannot be forged as someone else | own | own |
| blocks | own | own | — | own |
| reports | **admin only** | own | admin | admin |
| stories | all | own user | — | own user |
| story_views | own | own viewer | — | own |
| projects | all | own owner | own owner | own owner |
| project_members | all | own user | — | member |
| project_applications | project members | own user | project members | — |
| project_questions | all | authenticated | — | — |
| project_tasks | project members | project member | project member | — |
| project_followers | all | own | — | own |
| collab_requests | participants | own sender | participants | own sender |
| referral_invites | own | self as inviter or invited | own | own |
| events | all | own host | own host | own host |
| reels | all | own user | own user | own user |
| reel_comments | all | own user | — | own user |
| ideas | all | own author | own author | own author |
| idea_comments | all | own author | — | own author |
| voice_sessions | all authenticated | own host | call participant | host / admin |
| voice_signals | all | authenticated | — | authenticated |
| copilot_threads / copilot_messages | own | own | own | own |
| user_settings | own | own | own | own |
| analytics_events | **admin or own** (0002) | self or null | — | — |
| admin_actions | **admin only** | admin | admin | admin |
| achievements | all | authenticated (0002) | — | — |
| user_achievements | all | own user | — | — |
| challenges | all | creator = self or admin (0002) | creator / admin | creator / admin |
| challenge_entries | all | own user | — | own user (0002) |
| founding_members | all authenticated | admin | admin | admin |

Tables with **no client policy at all** (only `is_admin()` can touch them):
`admins`. Granting an admin is therefore a dashboard/SQL operation only:
`insert into public.admins (user_id) values ('<profile-id>');`

## 3. Server-side privilege guards

* `guard_profile_privileges()` (0002) — a `before update` trigger on `profiles`
  that freezes `role`, `verified`, `banned`, `status`, `founding_number`,
  `followers`, `following` for non-admins, so editing your own profile can never
  mint a verified badge, un-ban an account or tamper with counters.
  The counter triggers flag their own updates with the transaction-local
  GUC `foundators.trusted_counts` so normal follow-count maintenance still works.
* `guard_self_array()` (0001) — `liked_by` / `bookmarked_by` updates may only add
  or remove **the acting user's own id**; nobody can remove someone else's like.
* All RPCs are `security definer` but re-check `auth.uid()` and table policies
  internally; counters are maintained transactionally (no client-side increments).
* `is_admin()` is the single source of truth for admin checks everywhere
  (policies, RPCs, the privilege trigger).

## 4. Storage

Buckets `uploads`, `avatars`, `covers`:
* `select` → `to public` (media is meant to be viewable, same as the old rules).
* `insert/update/delete` → `to authenticated` **and** the object path must be
  owned by the caller: the first path segment must equal `auth.uid()`, or the
  file name must start with the uid (`<uid>.png`, `<uid>_…`). Writing into
  another user's folder is rejected at the storage layer.

## 5. Secrets

* Never exposed: `SUPABASE_SECRET_KEY`, Cloudinary secret, AI keys — all in
  `.env.local` (git-ignored) and only read inside `app/api/*/route.js`.
* The publishable/anon key is public by design and is the only credential in
  the browser bundle.

## 6. Known limitations / follow-ups

1. `SUPABASE_SECRET_KEY` currently in `.env.local` is rejected (401) by GoTrue
   and PostgREST → the three API routes fail until it is replaced with the real
   key from **Project Settings → API**.
2. The **Google** auth provider is disabled in the project, so Google sign-in
   fails until it is enabled (dashboard → Authentication → Providers → Google).
3. E-mail confirmation is ON (correct for production); test accounts must be
   created with a working service key.
4. Push/FCM was retired; there is no server-side push write path any more.
