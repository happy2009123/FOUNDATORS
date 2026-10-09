# FOUNDATORS — QA & Operations Report

**Date:** 2026-10-09 · **Auditor:** QA/Operations agent (TEAM assignment, Phases 1–10)
**Repo/branch:** `production-readiness` @ `dfe3405` + working-tree QA harness (see §10)
**Scope:** full product audit, two-account isolation E2E, responsive QA (10 viewports), black-box security QA, performance QA, rules regression, docs/launch prep.
**Environment:** LOCAL only — Firebase emulators (Auth 9099 / Firestore 8080 / Storage 9199) + Next dev 3100, Playwright 1.64, Node 20+. **No production project data was read or written.**

---

## 1. Executive summary

**Verdict: NOT launch-ready.** All planned suites ran to completion; every expected-deny security probe passed, the rules regression suite is intact (46/46), and responsive QA is clean at all 10 viewports — but **three P1 functional bugs** are confirmed with deterministic reproductions, two of them data-affecting (a lost first chat message; a profile edit form that silently refuses to save after a cold reload).

| Suite | Result | Notes |
|---|---|---|
| E2E (two isolated accounts, `qa/e2e.js`) | **29 pass / 1 fail** | The 1 failure (S07b) is *intended bug evidence* for P1-B, not a suite defect |
| Admin console E2E (`qa/admin.js`, 15 routes) | **5 / 5 pass** | deny → seed `admins/{uid}` → live guard flip → route smokes → revoke |
| Security probes (`qa/security-sdk.js`, X01–X27) | **24 pass / 0 fail / 3 info** | Every privileged probe denied; 3 informational writes are cosmetic by design |
| Rules regression (`node --test tests/rules.test.js`) | **46 / 46 pass** | Baseline intact |
| Responsive (`qa/responsive.js`, 10 viewports × 10 routes) | **10 / 10 pass** | No horizontal overflow anywhere; sidebar ↔ bottom-nav switches correctly at `lg` (1024px) |
| Performance (`qa/perf.js` + `next build`) | **9 routes measured** | Dev TTFB 71–321 ms, FCP 272–852 ms; prod bundle 3.3 MB static / 2.8 MB JS (§8) |
| Static recon (`qa/recon.js`) | done | 34 routes catalogued; 2 dead/broken routes found (P2) |

**Launch blockers (must fix before Jan 1, 2027):** P1-A, P1-B, P1-C. **Should fix:** P2-A, P2-B. Nice-to-fix: P3s.

---

## 2. Confirmed bugs

### P1-A — Edit-profile form is empty after a cold page load (silent save failure)
- **Symptom:** open `/settings/edit-profile` via full page reload (cold load) → Name / Handle / Bio fields render **empty** even though Firestore has values. Pressing Save shows *"Name cannot be empty"*; nothing persists. Works fine when reached by in-app (SPA) navigation.
- **Root cause:** `app/settings/edit-profile/page.js:27–35` — `useState(profile.name || '')` runs during the auth `AuthSkeleton` render when `profile` is still `undefined`, so the empty string is captured and never re-synced.
- **Repro:** (1) sign in, (2) hard-reload `/settings/edit-profile`, (3) observe empty fields, (4) Save → error.
- **Evidence:** `qa/debug-save.js`, e2e S06 (passes only because the suite explicitly fills the fields — documented workaround).
- **Suggested fix:** derive state from profile once auth is ready (e.g. `useEffect` that hydrates when `profile` flips from null, or keys on `profile.id`), instead of one-shot `useState` before hydration.

### P1-B — `/create`: Post button permanently disabled after full reload (emailVerified race)
- **Symptom:** verified user, server says `emailVerified: true` (via REST `accounts:lookup`), yet on a **full reload** of `/create` the Post button stays disabled forever with hint *"verify your email…"*. SPA navigation to `/create` shows it enabled.
- **Root cause:** `app/create/page.js:36` — one-shot `isEmailVerified()` effect runs before `auth.currentUser` restores (returns `false`) and never re-checks. The `EmailVerificationBanner` re-checks (30 s interval + window focus); `/create` does not.
- **Repro:** sign up → verify via emulator OOB → SPA to `/create` (enabled) → hard reload → disabled indefinitely.
- **Evidence:** **e2e S07b — FAIL is the intended repro** ("P1 repro: Post disabled=true hint=true although accounts:lookup says emailVerified=true"); `qa/debug-verified2.js` / `debug-verified3.js`.
- **Suggested fix:** await `auth.authStateReady()` before the first check, and re-check on an interval/focus like the banner does.

### P1-C — Messaging: first send intermittently fails with PERMISSION_DENIED and can lose the message body
This is a three-part chain, all confirmed:

1. **Rules crash on update of a missing chat.** `firestore.rules:863–864` chat UPDATE rule dereferences `resource.data.participants` with no `resource != null` guard. Emulator log (`firebase-debug.log`) shows the exact failure:
   `EvaluationException: firestore.rules line [864], column [21]. Null value error.`
2. **Client writes before the chat exists.** The chat document is created only on first send (`lib/firestore.js:349–369`), but the thread page's `markRead` effect (`app/messages/[chatId]/page.js:223–243`) runs on mount and issues `updateDoc(chats/{convId}, {unreadBy.<me>: 0})` against a chat that does not exist yet. The browser SDK co-pipelines this doomed update with `sendMessage`'s writes into one commit — **the entire commit is denied**.
   - Deterministic repro: `qa/debug-batch.js` — V1 `[update-on-missing + create]` batch **FAILS** with the same aggregate error the browser logs:
     `evaluation error at L810:24 for 'create' @ L810, … evaluation error at L863:24 for 'update' @ L863, …`
     V2 `[create + update-on-created]` and sequential writes (`qa/debug-seq.js`) all **PASS**.
3. **Observable impact (worst case, captured live):** `qa/debug-row.js` browser run —
   - console: `Send failed: PERMISSION_DENIED …` → user toast *"Message not sent"* (page L367),
   - the chat document **is** written with `lastMessage: "ROWPROBE …"` (list preview shows the text),
   - but `chats/{convId}/messages` is **empty** (`qa/debug-dup.js` → `messages: 0`) → **message body lost while the preview lies.**

   In E2E the failure is timing-dependent: intermittent `[B] Send failed` console errors; sends sometimes succeed (S14/S15 pass), sometimes users must resend.

- **Suggested fix:** (a) rules — prefix the chat update rule with `resource != null &&` so it denies cleanly instead of crashing; (b) client — skip `markRead`'s `updateDoc` when the chat document does not exist (or check existence first), and surface a real retry on send failure.

### P2-B — `/voice`: room-list listeners crash on every load (deterministic)
- **Symptom:** opening `/voice` throws, twice per load:
  `Uncaught Error in snapshot listener: FirebaseError: [code=permission-denied]: Null value error. for 'list' @ L1281, false for 'list' @ L1528`
  → the room list can never populate — for *any* user, including admins.
- **Root cause:** `firestore.rules:1281` —
  `allow read: if voiceRoomReadable(resource.data, roomId) || isAdmin();`
  For **list** queries `resource` is null, so `room.hostId` inside the helper
  throws a Null-value evaluation error **before** `|| isAdmin()` is ever
  evaluated. Confirmed against an **empty** `voiceRooms` collection (owner REST
  shows 0 docs; error still fires). Same missing-`resource != null` guard
  class as P1-C.
- **Evidence:** `qa/debug-voice.js` (captured console signature above);
  `/voice/create` itself loads with 0 errors, and the app's `createVoiceRoom`
  (`lib/voice.js:104+`) writes the `roomId/hostId/type/status` fields the
  create rule (L1285–1292) demands — so creation is fine; **reads/lists** are broken.
- **Suggested fix:** `allow read: if (resource != null && voiceRoomReadable(resource.data, roomId)) || isAdmin();`
  (plus a null-safe helper for `participants` reads) — and **add a LIST test to
  `tests/rules.test.js`** (the 46/46 suite passes today because no test lists `voiceRooms`).

### P2-A — `/discussion` is a dead route
`app/discussion/[discussionId]/{page,layout,loading}.js` exist, but there is **no**
`app/discussion/page.js` → `/discussion` 404s. Either add an index (list) page or
remove inbound links to it.

### P3-A — Duplicate React children keys (console warning)
`Encountered two children with the same key` on `/home` (E2E + responsive runs). Non-unique keys can silently drop/reorder list rows — worth locating in the home feed/story sections.

### P3-B — Signup hydration race (cosmetic)
Intermittent first-render flash during signup/onboarding hydration (observed as `/home` vs `/onboarding` landing differences across runs). No data impact.

### Informational (accepted by design, X-probes)
- **X16** — owner can write the cosmetic `uid` field on their own profile doc (path-independent; no privilege gained).
- **X17** — owner can set free-text `role: "admin"`; the real gate is `admins/{uid}` (X06 denied). Recommend the UI/rules treat `role` as display-only everywhere.
- **X19** — sender claim inside `pendingNotifications` data is enforced by Cloud Function quota, not rules (documented design).

---

## 3. Two-account isolation E2E (`qa/e2e.js`)

Fresh pair per run (Alice + Bob, emulator-verified emails), cookie-banner dismissal, in-viewport clicking, Node-side Firestore assertions.

- **S01–S06** signup/session/onboarding/profile — PASS (S06 via documented fill workaround, P1-A).
- **S07–S10** posts/likes/comments — PASS (S07b FAIL = intended P1-B evidence).
- **S11–S13** follow / follower count (DB + UI) / notification isolation — PASS.
- **S14–S16, S15b** messaging send/receive/reply/realtime, list-row navigation — PASS.
- **S17–S19** logout switch / re-login / notification settings persistence — PASS.
- **S20–S21** admin denial, public doc privacy (no email/fcmTokens) — PASS.
- **S26–S30** search, project create, Copilot smoke, story page, data intact — PASS.

Console errors captured this run: `401 @/api/email/` (×2, environment — §9), duplicate-children-key (P3-A). The intermittent `[B] Send failed` (P1-C) appears across runs.

**Stability hardening:** a repeat run surfaced fixed-wait flakes in S07/S30 (post existed — S08/S09/S10 passed); assertions now poll (`waitForText`, 12 s) and failures include URL + body snippet.

### Admin console — positive path (`qa/admin.js`, 5/5)

The admin surface was previously tested only for *denial*; this suite proves the full lifecycle against the emulator (owner-token seeding **only** works locally — the script hard-refuses unless `localhost:8080` answers as the emulator):

- **A01** normal user hits `/admin` → "Access denied" guard (rules + UI agree) ✔
- **A02** seed `admins/{uid}` (emulator owner REST) → guard flips **live** via `onSnapshot`, no reload needed ✔
- **A03** all **15** `/admin/*` routes smoke: no app error, no denial, no stuck guard, no empty body (screenshot per route) ✔
- **A04** admin reads privileged collections: `admins/{uid}` get-own exists, `reports` list OK, `pending-notifications` list OK ✔
  - note: whole-collection **list of `admins`** is denied by design (`allow read: if … uid() == adminUid`) — get-own only
- **A05** delete the admin doc → access revoked immediately on next check ✔

## 4. Security QA

**Expected-deny probes: all denied (24/24).** Cross-account: profile edit/delete, post edit/delete, private subcollection read/write, admin grant — **denied**. Self-escalation: verified/status, foundingNumber, builderScore, follower inflation, email/fcmTokens smuggling, admin field — **denied**. Admin-only reads (`reports`, `pending-notifications`) — **denied**. Notification creation without recipient — **denied**. Deep isolation (X23–X27): an outsider creating a chat *between* two other users, a participant spoofing `senderKey` as their partner, writing another user's notification-settings subcollection, deleting someone else's story, and a requester self-accepting their own collaboration request — **all denied**. Combined with `tests/rules.test.js` **46/46** and storage-rules coverage inside that suite, the rules posture is good; the P1/P2 issues are availability/correctness bugs, not authorization holes.

## 5. Responsive QA (`qa/responsive.js`)

Viewports: 360×800, 390×844, 430×932, 768×1024, 820×1180, 1024×768, 1280×720, 1366×768, 1440×900, 1920×1080 — each against `/login`, `/signup`, `/`, `/home`, `/create`, `/messages`, `/search`, `/settings`, `/notifications`, `/profile/{me}`.

- **10/10 pass:** zero horizontal overflow (with offending-element detection), correct nav mode at every width (`aside` DesktopSidebar visible ≥1024; `nav[aria-label="Main navigation"]` bottom bar visible <1024 and hidden on auth pages).
- 100 screenshots: `qa/screenshots/responsive/`.

## 6. Recon findings

34 routes catalogued (`qa/recon.js`, `qa/results/recon.json`). Headline items: `/discussion` dead (P2-A), `/voice` rules crash (P2-B), no `middleware.js` (relevant to §9), `/admin` correctly denies normal users (E2E S20).

## 7. Performance (`qa/perf.js` + production build)

Dev-mode (median of 3 cold loads per route): TTFB **71–321 ms**, FCP **272–852 ms**, DCL **120–846 ms**, load **394–1019 ms**, 38–45 resources per page. Raw transfer ~7 MB/page is **dev-server artifact** (unminified, source-mapped) — not indicative of production.

Production `next build` (Next.js 16.3.5 Turbopack): **compiles clean** (101/101 static pages, TypeScript pass). `.next/static`: **3.3 MB total / 2.8 MB JS across 125 files**; largest chunk 556 KB, next 228 KB / 159 KB. Recommendation: budget the first-load route chunks post-code-splitting and re-measure on a staging deploy with `next start` before launch.

## 8. Docs & launch prep (assignment Phases 6–7)

- `SETUP.md`, `ENVIRONMENT.md`, `DEPLOYMENT.md`, `TESTING.md` written; `README.md` updated with the QA/testing entry points.
- `BETA_TEST_PLAN.md` — 20–50 tester program with target date **Jan 1, 2027** launch timeline and staged rollout.
- Founder action items from Phase 10 remain open in `READINESS_REPORT.md`.

## 9. Environment limitations (NOT production bugs)

1. **`/api/email` 401 locally:** `app/api/email/route.js` validates idTokens against the **production** Identity Toolkit; emulator tokens are rejected by design. Signup still completes; verification is done via emulator OOB (`emulator/v1/oobCodes`). No `middleware.js` exists in the repo.
2. **Dev-mode perf numbers** are not production SLOs (see §7).
3. **Playwright/Emulator harness** needs `NEXT_PUBLIC_USE_EMULATORS=1` (env-gated wiring in `lib/firebase.js`, §10).

## 10. Artifacts & QA harness (all mine, `qa/`)

- `qa/e2e.js` (30 steps + S03b/S07b/S15b), `qa/admin.js` (A01–A05, 15 admin routes),
  `qa/security-sdk.js` (X01–X22), `qa/responsive.js` (10 vp), `qa/perf.js`, `qa/recon.js`.
- Evidence scripts: `debug-save`, `debug-verified{,2,3}`, `debug-msg{,2}`, `debug-chatrules`,
  `debug-seq`, `debug-batch`, `debug-row`, `debug-dup`, `debug-voice`, `debug-rest-chat`, …
  + `qa/notes.md` (working evidence log).
- Results: `qa/results/{e2e,security-sdk,responsive,perf,recon}.json`; screenshots: `qa/screenshots/` (gitignored).
- Harness wiring (also uncommitted until the QA commit): `firebase.json` → emulator ports; `lib/firebase.js` → env-gated `connect*Emulator()` calls; `package.json` → `playwright` devDependency.
- **No application code, rules, or functions were modified by QA.**

---

## 11. Launch checklist vs Jan 1, 2027

| # | Item | Status |
|---|---|---|
| 1 | Fix P1-A edit-profile cold-load | **BLOCKER** |
| 2 | Fix P1-B /create emailVerified race | **BLOCKER** |
| 3 | Fix P1-C messaging rules crash / message loss | **BLOCKER** |
| 4 | Fix or unlink `/discussion`, repair `/voice` rules helpers | Should-fix |
| 5 | Re-run `qa/e2e.js` (expect 30/30 with S07b flipped to pass), `test:rules` 46/46 | After fixes |
| 6 | Staging deploy + `next start` perf re-measure (§7) | Pre-launch |
| 7 | Founder Firebase credential checklist (`READINESS_REPORT.md`) | Open |
| 8 | Beta program kick-off (`BETA_TEST_PLAN.md`) | Target Dec 2026 |
