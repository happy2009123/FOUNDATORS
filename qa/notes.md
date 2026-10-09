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

## P2: /voice rules null-value listeners
- voiceRoomReadable/voiceRoomData helpers (firestore.rules ~L1280-1468) → onSnapshot throws
  `permission-denied ... Null value` in console on /voice.

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
