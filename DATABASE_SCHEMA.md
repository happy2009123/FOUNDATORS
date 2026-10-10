# FOUNDATORS — Database Schema (Supabase / PostgreSQL)

Migrations (run in order in the dashboard **SQL Editor**):
1. `supabase/migrations/0001_init.sql` — tables, FKs, indexes, triggers, RPCs, RLS, storage, realtime publication.
2. `supabase/migrations/0002_backfill_columns.sql` — schema-fidelity columns the UI already reads/writes + RLS gaps found in verification.
3. `supabase/migrations/0003_auth_profile_bootstrap.sql` — `on_auth_user_created` trigger (auto-creates `profiles`) + backfill of accounts missing a profile row.

Both files are **idempotent** (every statement uses `if not exists` /
`drop policy if exists` / `add column if not exists`) and can be re-run safely.

## 1. Identity strategy

* Every primary key is **`TEXT`** — no `uuid` type, no `auth.users` foreign key.
  `profiles.id` is either the original **Firebase UID** (migrated accounts) or the
  **Supabase auth uid** (new accounts). This is what keeps every historical URL,
  mention and cross-row reference valid.
* Referential integrity to `profiles` is enforced with `references public.profiles(id)`
  on `author_key`, `owner_id`, `user_id`, … and `on delete cascade`.

## 2. Tables (30)

| Group | Tables |
| --- | --- |
| Identity | `profiles`, `admins`, `user_settings`, `founding_members`, `blocks` |
| Social graph | `follows`, `notifications`, `reports` |
| Content | `posts`, `comments`, `stories`, `story_views`, `reels`, `reel_comments`, `ideas`, `idea_comments`, `events` |
| Messaging | `chats`, `chat_messages` |
| Collaboration | `projects`, `project_members`, `project_applications`, `project_questions`, `project_tasks`, `project_followers`, `collab_requests` |
| Growth | `referral_invites`, `achievements`, `user_achievements`, `challenges`, `challenge_entries`, `analytics_events`, `admin_actions` |
| Voice / AI | `voice_sessions`, `voice_signals`, `copilot_threads`, `copilot_messages` |

### Key columns worth knowing

* `profiles`: `status` (`active`/`suspended`), `founding_number`, `verified`, `banned`,
  `onboarded`, `profile_completed`, `last_seen`, `skills text[]`, denormalised `followers/following`.
* `posts`: `author_key`, `liked_by text[]`, `bookmarked_by text[]`, `comments_count`, `views`,
  `reposted_from`, `tag_type`.
* `chats`: `participants text[]`, `participant_names/participant_avatars jsonb`,
  `unread_by jsonb` (per-uid counters), deterministic `id = sorted(uidA, uidB).join('__')`.
* `events`: `date` (free-text label), `is_today`, `price`, `price_value`, `attendees text[]`.
* `challenges`: `category`, `points`, `time_limit` (display), `time_limit_sec`, `creator_key`.
* `ideas`: `description`, `audience`, `tech`, `upvotes text[]`.
* `reels`: `effect`, `video_url` (NOT NULL), `audio_name`.

## 3. Indexes (25)

`profiles(handle,name)`, `posts(author_key,created_at desc)`, `posts(created_at desc)`,
`comments(post_id,created_at asc)`, `comments(reply_to)`, `follows(following_id)`,
`chats` **GIN(participants)**, `chat_messages(chat_id,created_at asc)`,
`notifications(user_id,created_at desc)`, `stories(user_id)`, `stories(expires_at)`,
`projects(owner_id,created_at desc)`, `project_applications(project_id,status)`,
`collab_requests(to_id,status)`, `referral_invites(inviter_id)`,
`events(start_at desc)`, `reels(created_at desc)`, `reel_comments(reel_id)`,
`ideas(created_at desc)`, `idea_comments(idea_id)`, `voice_signals(session_id)`,
`copilot_threads(user_id,updated_at desc)`, `copilot_messages(thread_id)`,
`analytics_events(event_type,created_at desc)`.

## 4. Triggers

| Trigger | Purpose |
| --- | --- |
| `set_updated_at` (8 tables) | keeps `updated_at` correct |
| `on_auth_user_created` (0003) | creates the `profiles` row the instant an auth user is created (SECURITY DEFINER — runs before any client session/RLS applies) |
| `guard_self_array` (posts/comments/reels) | a user can only add/remove **itself** in `liked_by`/`bookmarked_by` |
| `bump_comments_count` | `comments_count` follows insert/delete of `comments` |
| `bump_follow_counts` | `profiles.followers/following` follow `follows` |
| `bump_reel_comments`, `bump_idea_comments` | comment counters on reels/ideas |

## 5. RPCs (SECURITY DEFINER, RLS-aware)

| RPC | Replaces |
| --- | --- |
| `is_admin()` | server-side admin check (reads `admins`) |
| `toggle_like(post)` / `toggle_comment_like` / `toggle_reel_like` | arrayUnion/arrayRemove + increment |
| `toggle_bookmark(post, bookmark)` | bookmark array maintenance |
| `toggle_follow(target)` | follow/unfollow transaction |
| `send_message(chat, …)` | addDoc + chat last_message/unread_by update |
| `delete_comment(post, comment)` | transactional delete + counter fix |
| `array_toggle_self(table, id, column)` | generic self-toggle for `events.attendees`, `ideas.upvotes`, … |

## 6. Realtime publication

`profiles, posts, comments, follows, chats, chat_messages, notifications, stories,
projects, ideas, events, reels, collab_requests, referral_invites, voice_sessions,
voice_signals, user_settings, admins, project_applications`
(added via a `do $$ … exception when duplicate_object` loop, so re-running is safe).

## 7. Storage buckets

`uploads`, `avatars`, `covers` — created with `on conflict do nothing`, all public
for read, owner-scoped for write/update/delete.

## 8. Verification

`node scripts/test-supabase-verify.mjs` probes every table/column listed above,
runs the RLS/isolation/realtime/storage/RPC checks and writes `verify-report.json`.
