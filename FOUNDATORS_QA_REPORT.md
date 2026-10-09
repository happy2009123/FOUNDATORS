# FOUNDATORS — QA & Operations Report

**Date:** 2026-10-09 · **Auditor:** QA/Operations agent (TEAM assignment, Phases 1–10)
**Repo/branch:** `production-readiness` @ `dfe3405` + working-tree QA harness (see §10)
**Scope:** full product audit, two-account isolation E2E, responsive QA (10 viewports), black-box security QA, performance QA, rules regression, docs/launch prep.
**Environment:** LOCAL only — Firebase emulators (Auth 9099 / Firestore 8080 / Storage 9199) + Next dev 3100, Playwright 1.64, Node 20+. **No production project data was read or written.**

---

## 1. Executive summary

**Verdict: NOT launch-ready.** All planned suites ran to completion; every expected-deny security probe passed, the rules regression suite is intact (48 pass + 2 documented skips), and responsive QA is clean at all 10 viewports — but **three P1 functional bugs** are confirmed with deterministic reproductions, two of them data-affecting (a lost first chat message; a profile edit form that silently refuses to save after a cold reload).

| Suite | Result | Notes |
|---|---|---|
| E2E (two isolated accounts, `qa/e2e.js`) | **33 pass / 1 fail** | The 1 failure (S07b) is *intended bug evidence* for P1-B, not a suite defect; includes S22–S25 feature smokes (bookmark persistence, `/explore`, `/reels`, `/notifications`) |
| Admin console E2E (`qa/admin.js`, 15 routes) | **5 / 5 pass** | deny → seed `admins/{uid}` → live guard flip → route smokes → revoke |
| Security probes (`qa/security-sdk.js`, X01–X27) | **24 pass / 0 fail / 3 info** | Every privileged probe denied; 3 informational writes are cosmetic by design |
| Rules regression (`npm run test:rules`) | **48 pass / 0 fail / 2 skipped** | Baseline 46 intact + 2 new passing tests (voice GET, chat typing ownership); the 2 skips assert the desired behavior for the open P1-C/P2-B rules bugs and flip green when those are fixed |
| Responsive (`qa/responsive.js`, 10 viewports × 10 routes) | **10 / 10 pass** | No horizontal overflow anywhere; sidebar ↔ bottom-nav switches correctly at `lg` (1024px); re-run carries per-route attribution + component-stack capture for React key warnings (none fired) |
| Performance (`qa/perf.js` + `next build`) | **9 routes measured** | Dev TTFB 71–321 ms, FCP 272–852 ms; prod bundle 3.3 MB static / 2.8 MB JS (§8) |
| Static recon (`qa/recon.js`) | done | 34 routes catalogued; 2 dead/broken routes found (P2) |
| Route sweep + a11y (`qa/routes.js`, 70 routes, anon + signed-in) | **68/70 healthy** | Broken: `/discussion` (P2-A), `/startup` (no index page); console-error classes: P2-C hooks crash, P2-B voice rules, P3-C nested buttons; a11y gaps → P3-D |

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

- **Suggested fix:** (a) rules — prefix the chat update rule with `resource != null &&` so it denies cleanly instead of crashing; (b) client — skip `markRead`'s `updateDoc` when the chat document does not exist (or check existence first), and surface a real retry on send failure. (c) Coverage: `tests/rules.test.js` already carries a **skipped** `chats: update on a MISSING doc fails cleanly (no evaluation error)` test plus a passing typing-ownership test — the skipped one enables when (a) lands.

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
  (plus a null-safe helper for `participants` reads). **Coverage gap now closed:**
  `tests/rules.test.js` gained a passing GET test (proves the bug is list-only)
  and a **skipped** `voiceRooms: admin can list rooms` test that asserts the
  desired behavior — it flips green when L1281 is guarded.
- **Extended evidence (route sweep):** `/voice/room/{id}` additionally throws
  permission-denied listener errors at **L1313** and **L1403** — the same
  unguarded list rules for room subcollections.

### P2-A — Discussion feature is a shell: dead index, orphaned list, no data
Evidence (full source map of every `discussion` reference):
- `app/discussion/page.js` missing → bare `/discussion` **404s** (index).
- Detail pages `app/discussion/[discussionId]/{page,layout,loading}.js` exist, but
  `page.js:26` reads `useStore(s => s.discussions[id])` and `lib/store.js` **never
  populates `discussions`**: init `{}` at L69/L433, and the only mutator
  (`addDiscussionComment`, L437) no-ops on missing IDs (`if (!s.discussions[discId])
  return {}`). There is **no `discussions` Firestore collection, loader, or create
  flow anywhere** → the detail page always renders its "not found" branch (L37).
- The real list route `app/list/[mode]` handles `mode === 'discussions'` ("Trending
  Discussions", L18/L67) but **nothing links to `/list/*`** → orphaned.
- The only inbound links point at the logically-dead detail view:
  `components/DiscussionCard.js:13` (rendered only from the orphaned list) and
  `app/notifications/page.js:75` (`linkType === 'discussion'` → lands on "not found").
- Legacy smell: `app/discussion/[discussionId]/layout.js:8-9` generateStaticParams
  seeds fake IDs (`saas`, `users100`) — localStorage-era leftover.
- **Impact:** entire feature is UI scaffolding with zero data plumbing; users can
  never see a discussion, and discussion notifications dead-end.
- **Suggested fix:** either wire it (Firestore collection + loader + create flow +
  entry links from home/nav) or remove the routes, `DiscussionCard`, the store slice
  and the `linkType === 'discussion'` branch.
- **Route-sweep confirmation (`qa/routes.js`):** `/discussion` and
  `/discussion/{id}` both render the 404 state; a related hygiene gap —
  `/startup` has **no index page** (only `/startup/{id}` exists; nothing in
  the sidebar links the index, but notifications/rows push into `/startup/{id}`).

### P3-A — Duplicate React children keys in the /home Opportunity Radar (located)
`Encountered two children with the same key` fires on **`/home`** right after
people data loads. Captured live via the E2E stack/key instrumentation
(`keyWarnings` in `qa/results/e2e.json`): the duplicate key values were
**user display names** (`"Bob QA"`, `"Key Probe Five"`).
- **Root cause:** `app/home/page.js:114` renders the Opportunity-Radar cards as
  `radar.map((r) => <button key={r.name} …)` where `radar` is built from
  Firestore **people matches** (L70–89, `name: u.name || 'Unknown'`). Display
  names are not unique — any two matches with the same name (very common once
  the user base grows; already reproducible in QA because repeated E2E runs
  create several `"Bob QA"`/`"Alice QA"` docs) produce duplicate keys, which
  React can use to silently drop/reorder radar cards.
- **Secondary:** `components/copilot/Cards.js:201` keys AI-generated feature
  chips by `f.name` — same class of bug if the model emits two features with
  identical names.
- **Suggested fix:** carry the id into the radar objects (`id: u.id`) and use
  `key={r.id}` (fallback `href`); for copilot chips key by an index/id, not
  the label.
- **Why it looked intermittent:** it needs ≥2 same-name people in `matches`,
  and it only fires once the matches listener has data — hence one capture in
  the original responsive run, none in empty-data probes, and 3 captures in
  E2E once same-named users had accumulated. `qa/e2e.js` now records the step,
  URL, key value and stack automatically when it fires.

### P3-B — Signup hydration race (cosmetic)
Intermittent first-render flash during signup/onboarding hydration (observed as `/home` vs `/onboarding` landing differences across runs). No data impact.

### P2-C — Hooks-order crash on `/bookmarks/collections`
Opening `/bookmarks/collections` logs a React **Rules of Hooks** violation:
`Rendered more hooks than during the previous render`.
- **Root cause:** `app/bookmarks/collections/page.js:28` —
  `if (!ready) return <AuthSkeleton />;` sits **above** the `useMemo` at
  L31–36. First paint (auth not ready) runs 6 hooks; once `ready` flips
  true the same component runs a 7th hook → React treats the tree as
  corrupt (console error + unstable remount).
- **Suggested fix:** move the `useMemo` (and any other hooks) above the
  early return — early returns must never precede hook calls.
- **Evidence:** `qa/debug-hooks.js` (deterministic repro, 4 hooks-order errors
  captured on load); also `qa/routes.js` (`qa/results/routes.json`).

### P3-C — Nested `<button>` on `/gestures/community`
Hydration error: `In HTML, <button> cannot be a descendant of <button>`.
- **Root cause:** `app/gestures/community/page.js:208` — the trend **card
  itself** is a `<button onClick={push detail}>` and L230 renders the
  star/favorite `<button>` **inside** it. Invalid HTML; click handling and
  keyboard focus are unreliable.
- **Suggested fix:** make the card a `<div role="link">`/`<a>` (or
  `div + onClick`) and keep the inner star button, stopping propagation.
- **Evidence:** `qa/debug-nested.js` (hydration error + 3 live `button button`
  DOM pairs).

### P3-D — Accessibility gaps (sitewide patterns, found by `qa/routes.js`)
- **Nameless back button on every subpage:** `components/SubpageHeader.js:17`
  — icon-only `<button>` with `ChevronLeft` and no `aria-label` (the single
  recurring nameless button on ~30 routes).
- **Settings toggles have no accessible name:** the shared `Toggle` in
  `app/settings/notifications/page.js:63-72` (and the privacy page ×6) sets
  `role="switch"`/`aria-checked` but no `aria-label`/`aria-labelledby` —
  screen readers announce an unnamed switch (11 on notifications, 6 on
  privacy).
- **Unlabeled file inputs:** `app/create` and `app/settings/edit-profile`
  render `input[type=file]` with no label/aria-label.
- **Zero `<a href>` elements sitewide:** navigation is entirely
  `button + router.push` (sidebar, header, cards). Not crawlable by search
  engines or link-checkers, no middle-click/new-tab, worse keyboard
  semantics. Recommend real `<a href>`/`next/link` for every route change
  (also fixes P2-A-class dead-link discovery).

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

**Expected-deny probes: all denied (24/24).** Cross-account: profile edit/delete, post edit/delete, private subcollection read/write, admin grant — **denied**. Self-escalation: verified/status, foundingNumber, builderScore, follower inflation, email/fcmTokens smuggling, admin field — **denied**. Admin-only reads (`reports`, `pending-notifications`) — **denied**. Notification creation without recipient — **denied**. Deep isolation (X23–X27): an outsider creating a chat *between* two other users, a participant spoofing `senderKey` as their partner, writing another user's notification-settings subcollection, deleting someone else's story, and a requester self-accepting their own collaboration request — **all denied**. Combined with `tests/rules.test.js` **48 pass / 0 fail / 2 documented skips** and storage-rules coverage inside that suite, the rules posture is good; the P1/P2 issues are availability/correctness bugs, not authorization holes.

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

- `qa/e2e.js` (34 steps incl. S03b/S07b/S15b + S22–S25, per-step P3-A
  key-warning stack capture), `qa/admin.js` (A01–A05, 15 admin routes),
  `qa/security-sdk.js` (X01–X27), `qa/responsive.js` (10 vp, per-route
  console/key attribution), `qa/routes.js` (70-route health + a11y sweep,
  anon + signed-in), `qa/perf.js`, `qa/recon.js`.
- Evidence scripts: `debug-save`, `debug-verified{,2,3}`, `debug-msg{,2}`, `debug-chatrules`,
  `debug-seq`, `debug-batch`, `debug-row`, `debug-dup`, `debug-voice`, `debug-rest-chat`,
  `debug-keys`/`debug-keys2` (P3-A hunt), `debug-signup` (signup→profile-doc probe) …
  + `qa/notes.md` (working evidence log).
- Results: `qa/results/{e2e,security-sdk,responsive,perf,recon,admin,key-warnings*}.json`;
  screenshots: `qa/screenshots/` (gitignored).
- Harness wiring (also uncommitted until the QA commit): `firebase.json` → emulator ports; `lib/firebase.js` → env-gated `connect*Emulator()` calls; `package.json` → `playwright` devDependency.
- **No application code, rules, or functions were modified by QA.**

---

## 11. Launch checklist vs Jan 1, 2027

| # | Item | Status |
|---|---|---|
| 1 | Fix P1-A edit-profile cold-load | **BLOCKER** |
| 2 | Fix P1-B /create emailVerified race | **BLOCKER** |
| 3 | Fix P1-C messaging rules crash / message loss | **BLOCKER** |
| 4 | Fix discussion feature (no data/no entry links, dead index — P2-A), repair `/voice` rules helpers (P2-B) | Should-fix |
| 4b | Fix P3-A `key={r.name}` in `app/home/page.js:114` (duplicate-name radar cards) | Nice-to-fix |
| 4c | Fix P2-C hooks-order crash (`app/bookmarks/collections/page.js:28` early return above `useMemo`) | Should-fix |
| 4d | P3-D a11y: label `SubpageHeader` back button + settings toggles + file inputs; prefer real `<a href>` nav | Nice-to-fix |
| 5 | Re-run `qa/e2e.js` (expect 33/34 with S07b flipped to pass), `test:rules` 48/0/2 → 50/0/0 once P1-C/P2-B skips are enabled | After fixes |
| 6 | Staging deploy + `next start` perf re-measure (§7) | Pre-launch |
| 7 | Founder Firebase credential checklist (`READINESS_REPORT.md`) | Open |
| 8 | Beta program kick-off (`BETA_TEST_PLAN.md`) | Target Dec 2026 |
