# QA evidence notes (working file for FOUNDATORS_QA_REPORT.md)

## P1-A: edit-profile cold-load empty form
- app/settings/edit-profile/page.js L27-35: `useState(profile.name || '')` initializes during
  AuthSkeleton render (profile undefined) → fields stay empty → Save → "Name cannot be empty".
- Repro: cold full-reload /settings/edit-profile. SPA nav OK.
- e2e S06 passes only with explicit fill workaround (documented in step).

## P1-B: /create Post permanently disabled after full reload (emailVerified race)
- app/create/page.js:36: one-shot `isEmailVerified()` effect runs before auth.currentUser restores,
  returns false, never re-checks. EmailVerificationBanner rechecks (30s interval + focus); create does not.
- e2e S07b = intended FAIL (bug evidence): "P1 repro: Post disabled=true hint=true although
  accounts:lookup says emailVerified=true".
- Fix suggestion: `auth.authStateReady()` before check + interval/focus re-check.

## P1-C: messaging first-send data loss / PERMISSION_DENIED (rules crash)
Evidence chain (all grounded):
1. firestore.rules L863-864 chat UPDATE rule derefs `resource.data.participants` — on a
   not-yet-existing chat the emulator throws:
   `Null value error. firestore.rules line [864], column [21]`
   (firebase-debug.log stack: EvaluationException, DefaultEmulatorRulesAuthorizer.checkCommit).
2. app/messages/[chatId]/page.js L223-243 `markRead` effect runs on thread mount and does
   `updateDoc(chats/{convId}, {unreadBy.<me>:0})` even when the chat doc does not exist yet
   (chat is created only on FIRST SEND, L355-369 lib/firestore.js).
3. Browser WebChannel co-pipelines the doomed markRead update with sendMessage's writes into
   ONE commit → whole commit denied. Emulator log shows the exact aggregate:
   `evaluation error at L810:24 for 'create' @ L810, false for 'create' @ L1528,
    evaluation error at L863:24 for 'update' @ L863, false for 'update' @ L1528,
    false for 'update' @ L863, false for 'update' @ L1528`
   (identical to deterministic repro qa/debug-batch.js V1 `[update-missing + create]` = FAIL;
    V2 `[create + update-on-created]` = OK; qa/debug-seq.js sequential = all PASS).
4. Observable user impact (qa/debug-row.js browser run):
   - console: `Send failed: PERMISSION_DENIED: evaluation error at L810:24 ...` (page L367 →
     toast "Message not sent: ..."),
   - chat doc persisted with `lastMessage: "ROWPROBE ..."` (list preview shows the text),
   - `chats/{convId}/messages` subcollection EMPTY (qa/debug-dup.js: messages: 0)
     → message body LOST while preview lies.
5. e2e: intermittent `[B] Send failed` console error; S14/S15 sometimes pass (timing dependent).
6. Independent deterministic crash: markRead alone on missing chat → 12:44:25/28 emulator
   `Null value error line 864 col 21` (caught as console.warn 'Failed to mark messages read').
Fix suggestions: (a) rules: prefix update rule with `resource != null &&` guard (clean deny);
(b) client: markRead should skip when chat doc absent (or use setDoc merge after existence check).

## P2: /discussion dead route
- Only app/discussion/[discussionId]/{page,layout,loading}.js exist; no index page → /discussion 404s.

## P2-B: /voice room list listeners crash (DETERMINISTIC, evidence complete)
- qa/debug-voice.js (2026-10-09): signed-in user opens /voice →
  console x2: `Uncaught Error in snapshot listener: FirebaseError: [code=permission-denied]:
  Null value error. for 'list' @ L1281, false for 'list' @ L1528`
- Root cause: firestore.rules L1281 `allow read: if voiceRoomReadable(resource.data, roomId) || isAdmin();`
  — for LIST queries `resource` is null → `room.hostId` inside the helper throws
  **Null value error BEFORE `|| isAdmin()` is evaluated** → every onSnapshot on
  `voiceRooms` is denied, even for admins, even with the collection EMPTY
  (verified: `voiceRooms` = 0 docs via owner REST, still throws).
- /voice/create page itself loads with 0 errors (no listeners until submit).
- App's createVoiceRoom (lib/voice.js L104+) writes roomId/hostId/title/type/status
  matching the create rule — ad-hoc seed without roomId/type was denied (my seed's
  fault, not app's). Create rule L1285-1292 itself fine.
- Fix: guard null resource in the read rule, e.g.
  `allow read: if (resource != null && voiceRoomReadable(resource.data, roomId)) || isAdmin();`
  (and same pattern for participants where applicable), or make the helper null-safe.
- Same bug CLASS as P1-C: missing `resource != null` guard on update/read deref.
- Coverage gap note: tests/rules.test.js 46/46 passes because no test does a
  LIST over voiceRooms → recommend adding one.

## Admin positive-path E2E (qa/admin.js) — 5/5 PASS
- A01 normal user denied /admin (guard "Access denied") ✓
- A02 seed admins/{uid} via emulator owner REST (PATCH, Bearer owner) → guard
  flips LIVE via onSnapshot ✓ (dev UI even ships a "Copy my UID" hint for this)
- A03 all 15 /admin routes smoke: no app error, not denied, not stuck, no empty body ✓
- A04 admin reads privileged collections: admins/{uid} get-own exists,
  reports list ok, pending-notifications list ok (4 docs) ✓
  — NOTE: `admins` collection rule only allows get-own (`uid() == adminUid`),
  whole-collection list denied BY DESIGN; collection is `pending-notifications` (hyphen).
- A05 revoke (DELETE admins/{uid}) → denied again ✓
- Owner REST safety: script refuses to run unless localhost:8080 answers as emulator.

## E2E suite hardening (2026-10-09 stability run)
- Stability run #2: 27/3 — S07/S30 failed on FIXED waits (post existed: S08/S09/S10
  passed). Added `waitForText()` polling (12s) for S07/S08/S30 + failure snippets
  (url + body slice). Suite flake, not app regression.


## P3: hydration race on signup (from earlier), duplicate React children keys warning, etc.

## Environment limitations (NOT prod bugs)
- /api/email 401 locally: app/api/email/route.js verifies idToken against PRODUCTION
  identitytoolkit → emulator tokens rejected. No middleware.js exists.
- zustand partialize persists only theme/settings/savedCollections — profile NOT in localStorage;
  assertions on store profile.id are INVALID (removed from S17/S18; chip assertions kept).

## E2E helper fixes (my code, not app bugs)
- leftHalfClick: now picks SMALLEST left-half match (first-in-DOM was a full-width wrapper div
  whose center is a dead zone) — this was the S15b failure cause, NOT an app bug.
  Coordinate click on real row navigates fine (debug-row.js proof: /messages/<convId>/).
- S07/S08/S30 assertions must use ?tab=posts (default tab is 'about'; post exists = "1 POSTS" badge).
