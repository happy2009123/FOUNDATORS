# FOUNDATORS — Migration Runbook (Firebase → Supabase)

Status: **code migration complete, verification in progress.**
Nothing was deployed and **no Firebase data was deleted or modified.**

---

## 1. What was changed

| Area | Firebase before | Supabase now |
| --- | --- | --- |
| Auth | Firebase Auth | GoTrue (`lib/supabase/auth.js`, `lib/useFirebaseAuth.js`) |
| Database | Firestore collections/subcollections | 30 PostgreSQL tables + RLS (`supabase/migrations/*.sql`) |
| Transactions | `runTransaction`/`increment` | SQL RPCs (`toggle_*`, `send_message`, `array_toggle_self`, …) |
| Live queries | `onSnapshot` | `subscribeQuery` (ref-counted channels + re-query) |
| Storage | Firebase Storage | Supabase Storage (`uploads`, `avatars`, `covers`) + Cloudinary for heavy media |
| Push | FCM + Cloud Functions | **Retired** (in-app notifications only) |
| Server | Firebase ID token in API routes | Supabase access token verified with `auth.getUser(jwt)` |

`lib/firestore.js` was **rewritten, not removed**: its 43 exports keep the
original names, signatures and `{success, data/error}` envelopes, so almost no
consumer had to change shape.

---

## 2. Applying the SQL (dashboard, ~1 min)

The project has no `psql`, no Supabase CLI and no Docker, so the migrations are
applied by hand:

1. Open <https://supabase.com/dashboard> → project **jelpluhryisspxeikguk**.
2. **SQL Editor** → *New query*.
3. Open `supabase/migrations/0001_init.sql`, select **all** its text
   (**not** the file path) → paste → **Run**.
   Expected: `Success. No rows returned`.
4. Repeat for `supabase/migrations/0002_backfill_columns.sql`.
   Expected: the same success message.
5. Repeat for `supabase/migrations/0003_auth_profile_bootstrap.sql`.
   Expected: the same success message. This one is **required** — it adds an
   `auth.users` trigger that creates the `profiles` row the moment an account
   is created, and backfills every existing account that is missing one. Without
   it, a user who signed up before email confirmation could never persist a
   profile and was bounced back to the onboarding name prompt forever.

All three files are idempotent — re-running them is harmless.

---

## 3. Verifying

```bash
node scripts/test-supabase-verify.mjs
```

Creates two throwaway accounts (USER A / USER B) and runs:

| Section | Checks |
| --- | --- |
| auth | signup, profile load, onboarding flag, session restore, logout/login isolation, password reset |
| isolation | notifications, posts, profiles, `user_settings`, chats, projects, no cross-account rows |
| database | 30 tables + every expected column, `timestamptz` declarations, PK uniqueness, idempotent SQL |
| rls | RLS enabled + policy present on every table, anon blocked, admin tables closed, no self-grant, privilege escalation blocked, delete-own works |
| storage | own upload OK, foreign folder write denied, public read, foreign delete denied, buckets present |
| realtime | one event, no duplicates, no cross-account leakage |
| rpc | `send_message` writes exactly one row, `toggle_like` idempotent + counter/array consistent, `array_toggle_self` RSVP, comment ownership, follow uniqueness |

Output: console table + `verify-report.json`. Exit code ≠ 0 when anything FAILs.

Manual UI pass (two real accounts in two browsers/profiles):
signup → login → refresh → password reset → post → comment → like → follow →
messages → stories → projects → Build With Me → Copilot → voice → admin.

Responsive smoke test at: 360×800, 390×844, 430×932, 768×1024, 820×1180,
1024×768, 1280×720, 1366×768, 1440×900, 1920×1080 (mobile layout must not regress).

---

## 4. Build / lint

```bash
npm install
npm run build      # the project's only check (pure JS, no tsconfig/eslint)
```

`npm run lint` exists (`next lint`) but the repo has no ESLint config.

---

## 5. Firebase — what still exists, and why

Deliberately **kept** (read-only history, nothing deleted):

* Firebase project `foundators-66eb7` and all of its data.
* `firestore.rules`, `storage.rules` — needed if Firebase is ever re-enabled;
  they were re-published to the console during the previous phase.
* `NEXT_PUBLIC_FIREBASE_*` variables in `.env.local` (no code reads them).

Deliberately **removed** (no longer required by the app):

* `lib/firebase.js`, `lib/firebaseConfig.js`, `lib/useFirestore.js`
* `public/firebase-messaging-sw.js`, `functions/` (Cloud Functions for FCM)
* the `firebase` npm package (−73 packages in `node_modules`)

**Password hashes cannot be moved** from Firebase to GoTrue. Existing users
either (a) sign in with Google (identity linking requires the Google provider to
be enabled first), or (b) use *Forgot password* once. This is documented, not
worked around.

Data migration script: `scripts/migrate-firebase.mjs` is **not** run
automatically — it needs a Firebase service-account JSON, and importing data is
a deliberate, one-time, manual step. Never delete Firebase data as part of this.

---

## 6. Rollback

1. `git checkout main` (the Firebase branch is untouched).
2. Revert `.env.local` if needed — Firebase keys were never removed.
3. The Supabase project can be left as-is; nothing in Firebase was altered.

---

## 7. Open items for the next phase

1. Run `0002_backfill_columns.sql` (adds `profiles.status`,
   `posts.views`, `events.date/is_today/price_*`, `ideas.description/audience/tech`,
   `reels.effect`, `challenges.category/points/time_limit*` and the RLS gaps).
2. Replace `SUPABASE_SECRET_KEY` in `.env.local` with the real secret from
   **Project Settings → API** (the current one 401s).
3. Enable the **Google** provider (Authentication → Providers) for Google login.
4. Run `node scripts/test-supabase-verify.mjs` and keep `verify-report.json`.
5. Optional: decide the FCM/push policy — it was retired during migration.
