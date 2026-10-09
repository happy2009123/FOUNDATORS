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

## Round: stability / completion evidence

- Firestore emulator OOM (java.lang.OutOfMemoryError, heap space) at 14:47 during
  responsive R05 � after ~1.5h of continuous suites. Symptom: skeleton loaders
  (data fetches hang) then auth refresh fails -> session dies -> login pages;
  responsive run collapsed 3/10 (infra artifact, not a responsive regression).
  FIX/OPS: restart emulators (kill node firebase + java, relaunch
  %TEMP%\opencode\qa-start-emu.cmd) before long runs. Fresh emulators confirmed
  up 9099/8080/9199; re-ran responsive after restart.
- P3-A duplicate-key warning: not reproduced in 24 targeted probes (2 viewports
  x logged-out + onboarding + logged-in routes, with scroll) via
  qa/debug-keys.js; responsive rerun carries per-route attribution + component
  stacks (console.error override) to pin it if it fires.
- P2-A fully mapped: discussions store always {} (no collection/loader/creator),
  /list/discussions orphaned, detail pages always "not found", notifications
  linkType=discussion dead-ends. Report section rewritten.

## Round: completion pass (final verification)

- Responsive: attributed re-run 10/10 PASS (per-route @url on console errors +
  per-route key-warning stacks). Key warnings: none over 10 viewports.
- Rules: 50 tests -> 48 pass / 0 fail / 2 skipped (clean emulators:exec run;
  requires JAVA_HOME=JRE21 in this environment). New: voiceRooms GET pass,
  chat typing ownership pass (bob changing alice's typing value denied; own key
  allowed), + 2 SKIPPED desired-behavior tests for P1-C (missing-doc clean
  denial) and P2-B (admin list). NOTE: the first typing assertion was a no-op
  (identical-value write is legal) - fixed to a real value change.
- Rules harness ops: npm run test:rules uses emulators:exec -> STOP persistent
  emulators first (ports 8080/9199), restart after.
- E2E with S22-S25 feature smokes (bookmark persist, /explore, /reels,
  /notifications): 33 pass / 1 fail (S07b intended). One intermediate run had
  an S26 search flake alongside Firestore WebChannel 400s right after emulator
  restart -> cleared on re-run (infra, not app).
- P3-A reproduced ONCE in e2e context A (duplicate-key warning); e2e.js now
  installs a console.error stack-capture init script and drains per step
  (keyWarnings with step id + url + component stack land in e2e.json).

- P3-A attribution: e2e run captured 3 warnings all at step=S05 url=/home
  (right after onboarding completion). Stack shows warnOnInvalidKey via
  app console override (useSecurityAudit.detectConsoleOverride) -> React
  internals; widened capture (60 frames + actual key value args[1]) in a
  follow-up run. qa/debug-keys2.js standalone onboarding replica could not
  advance the wizard (controlled-input fill not registering; button stays
  disabled) - use the e2e S05 flow as the repro vehicle instead.

- P3-A CLOSED: root cause app/home/page.js:114 radar.map(key={r.name}) where
  radar = people matches keyed by DISPLAY NAME (page.js:70-89 name:u.name).
  Duplicate when >=2 matches share a name (QA has many "Bob QA" from reruns).
  Captured live in e2e keyWarnings: key values "Bob QA"/"Key Probe Five" on
  /home at S04/S05. Secondary: components/copilot/Cards.js:201 key={f.name}.
  Fix: carry u.id into radar, key={r.id}. S26 also hardened with waitForText
  (fixed 3s wait flaked 2/4 runs on debounced search).

- S26 closed: false-positive/flake root cause = combined selector
  "input[aria-label=Search], input[placeholder*=Search]".first() hit
  components/DesktopHeader.js:32 header form input (DOM-first, visible
  lg+); that input only navigates on Enter (handleSearch onSubmit), so the
  /search query state never changed � S26 passed only when "Alice" appeared
  elsewhere (PEOPLE TO FOLLOW). qa/debug-search.js probe: 5/5 fail with old
  selector, 5/5 pass with strict input[aria-label="Search"] (page input,
  app/search/page.js:128). Test defect, not an app bug. Final confirmation
  run launched.

- Route sweep (qa/routes.js, 70 routes, anon + signed-in): 68/70 healthy.
  404s: /discussion (P2-A, known) + /startup (hygiene - only /startup/{id}
  exists; nothing links the index). Console-error classes pinned:
  P2-C hooks-order crash on /bookmarks/collections (app/bookmarks/collections/
  page.js:28 early return sits above the useMemo at L31 - 6 hooks on first
  paint, 7 once ready flips true); P3-C nested <button> on /gestures/community
  (card L208 wraps star button L230); P2-B voice-room listener errors at
  L1313/L1403 (unguarded subcollection list rules, same class as L1281).
  A11y (P3-D): SubpageHeader.js:17 back button has no aria-label (the single
  recurring nameless button across ~30 routes); settings Toggle
  (app/settings/notifications/page.js:63-72 + privacy) sets role=switch but
  no accessible name (11 + 6); unlabeled file inputs on /create and
  /settings/edit-profile; zero <a href> sitewide (nav is 100% button+push).
  Ops: first routes run failed at signup - auth emulator (9099) had died;
  restarted via qa-start-emu.cmd, ports 9099/8080/9199 confirmed before rerun.

- Dedicated repros written & confirmed:
  * qa/debug-hooks.js -> P2-C REPRO OK, 4 hooks-order errors on
    /bookmarks/collections load (Rendered more hooks than previous render;
    updateMemo/updateWorkInProgressHook stacks).
  * qa/debug-nested.js -> P3-C REPRO OK, 2 hydration errors + 3 live
    document.querySelectorAll("button button") pairs on /gestures/community
    (outer card button wraps star/favorite button). Outer-text samples:
    "31 12", "24 8", "18 5" (star counters).
  Report evidence lines updated to cite these probes.
