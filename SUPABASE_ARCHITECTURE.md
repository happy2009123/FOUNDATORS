# FOUNDATORS — Supabase Architecture

> Migration branch: `supabase-migration` · Project: `jelpluhryisspxeikguk.supabase.co`
> Replaces the Firebase stack (Auth, Firestore, Storage, FCM) with Supabase
> (GoTrue Auth, PostgreSQL + RLS, Storage, Realtime). No UI/route/feature was
> changed — only the data layer underneath.

## 1. Module map

| Module | Responsibility |
| --- | --- |
| `lib/supabase/client.js` | Browser singleton (`getSupabase()`, `isSupabaseConfigured()`), auth storage key `foundators-supabase-auth` |
| `lib/supabase/server.js` | `getSupabaseAdmin()` — server-only client for API routes (secret key). Throws if called in the browser |
| `lib/supabase/db.js` | Row mapping: `mapRow/mapRows` (snake_case → camelCase + timestamp shims), `toRow`, `toMillis`, `ts`, `ok/fail`, `randomId` |
| `lib/supabase/realtime.js` | `subscribeQuery` — ref-counted, de-duplicated, 300 ms debounced re-query replacement for `onSnapshot`; `subscribeRow`, `teardownAllSubscriptions` |
| `lib/supabase/auth.js` | `signUp`, `signInWithEmail`, `sendPasswordReset`, `updatePassword`, `signOut`, `onAuthStateChange`, `signInWithGooglePopup` |
| `lib/firestore.js` | **Façade kept intact** — all 43 original exports with the original Firebase-era signatures and `{success, data/error}` envelopes, now implemented on Supabase. Existing call sites did not have to change |
| `app/FirestoreProvider.js` | Hydrates the Zustand store with 7 `subscribeQuery` listeners (profile, follows → feed, notifications, chats, bookmarks, blocks) |
| `lib/store.js` | Zustand store — no Firebase imports left; blocks/reports write to `blocks` / `reports` tables |
| `lib/useFirebaseAuth.js` | Auth state hook (name kept for compatibility): restores session, `ensureProfileRow` upsert, onboarding flags |
| `lib/authActions.js` | `signOutFully`: presence → `auth.signOut()` → `teardownAllSubscriptions()` |
| `lib/presence.js` | Heartbeat writes `profiles.last_seen`; privacy honours `user_settings.settings.showOnlineStatus` |
| `app/auth/callback/page.js` | PKCE landing for OAuth/e-mail-link, posts `foundators:supabase-oauth` to a popup opener |
| `app/api/*/route.js` | Verify `Authorization: Bearer <supabase access token>` → `auth.getUser(jwt)` |

## 2. Authentication flow

1. **Signup** → `supabase.auth.signUp()`. With email confirmation on, there is
   **no session yet**, so the client cannot insert the profile row itself (RLS
   rejects it). The row is created server-side by the `on_auth_user_created`
   trigger (`0003_auth_profile_bootstrap.sql`); the client's `ensureProfileRow`
   is a second, idempotent net (`ON CONFLICT DO NOTHING`) that also self-heals
   accounts whose row is missing. An existing user is **never** re-asked for
   name/onboarding. Welcome e-mail is sent from `/api/email`.
2. **Login** → `signInWithPassword`; `ensureProfileRow` runs after every
   sign-in so a missing row is repaired before the UI reads it. Session is
   persisted by supabase-js in `localStorage` under `foundators-supabase-auth`
   (survives refresh).
3. **Session/refresh persistence** → `onAuthStateChange` drives the store;
   `useRequireAuth` bounces unauthenticated visitors with `getSession()`.
4. **Password reset** → `resetPasswordForEmail` (GoTrue mail) — no data change,
   the same password hashes cannot be moved from Firebase (documented in
   `MIGRATION_RUNBOOK.md`).
5. **Google sign-in** → popup `signInWithOAuth({ skipBrowserRedirect: true })`
   + `app/auth/callback` exchange. **The Google provider must be enabled in the
   Supabase dashboard** (it is currently disabled).
6. **Logout** → `signOutFully` (presence stop → signOut → teardown listeners) so
   no listener of the previous account survives into the next one.

## 3. Data conventions

* **Ids are `TEXT`** — Firebase UIDs and new Supabase UUIDs coexist, which keeps
  every migrated row and every historical link working.
* **Timestamps**: tables use `timestamptz`. `mapRow` wraps `_at`/`last_seen`
  columns in a Firestore-Timestamp-compatible shim (`{toDate,toMillis,seconds}`),
  so every existing `x?.toDate?.()` call site still works.
* **Envelope**: service functions return `{success:true,data}` /
  `{success:false,error}` exactly as before.
* **Writes that used to be transactions** are SQL RPCs:
  `toggle_like`, `toggle_comment_like`, `toggle_reel_like`,
  `toggle_bookmark`, `toggle_follow`, `send_message`, `delete_comment`,
  `array_toggle_self` — atomic, counter-safe, RLS-checked.

## 4. Realtime

* Table changes → `subscribeQuery({key, table, queryFn, onData, onError})`.
  Keys are ref-counted: mounting the same view twice yields one channel, and the
  last unmount tears it down. Every payload is re-queried through `queryFn`
  (debounced 300 ms) so RLS filtering and camelisation stay identical to REST.
* Chat "typing…" is a **broadcast** channel (`chat-typing:<convId>`) because the
  `chats` table deliberately has no `typing` column.
* Voice signalling uses `voice_signals` rows (table is in the realtime
  publication) — WebRTC media itself is peer-to-peer.

## 5. Storage & media

* Buckets: `uploads`, `avatars`, `covers` (public read, owner-scoped write —
  first path segment must equal `auth.uid()`).
* Heavy post/story media still goes through **Cloudinary**: `/api/cloudinary/sign`
  now requires `Bearer <supabase access token>` and signs server-side.

## 6. Retired / intentionally removed

* **FCM push** (`firebase-messaging-sw.js`, service worker registration, `PushRegistrar`
  is a no-op, `lib/notify.js` push helpers are no-ops) — replaced by in-app
  notifications. Firebase Cloud Functions directory was removed.
* `lib/firebase.js`, `lib/firebaseConfig.js`, `lib/useFirestore.js` — deleted.
* `firebase` npm package — removed from `package.json` (73 packages dropped).

## 7. Environment (`.env.local`, git-ignored)

```
NEXT_PUBLIC_SUPABASE_URL=https://jelpluhryisspxeikguk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon JWT>
SUPABASE_SECRET_KEY=<service/secret key — server routes only>
```
Firebase variables are kept read-only for the historical project; nothing in
the app reads them any more.
