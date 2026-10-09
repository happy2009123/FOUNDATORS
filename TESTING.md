# TESTING — how to run every suite and what "green" looks like

Four layers, all runnable locally. The security/rules suites use the Firebase
emulators; E2E/security/responsive/perf use Playwright against the Next dev
server. **Nothing here touches production data** — emulators only.

```bash
npx playwright install chromium     # once per machine, for the browser suites
```

Start the stack (two terminals):

```bash
npx firebase emulators:start --only auth,firestore,storage --project foundators-66eb7
set NEXT_PUBLIC_USE_EMULATORS=1     # macOS/Linux: export NEXT_PUBLIC_USE_EMULATORS=1
npm run dev                          # or a dedicated port: npx next dev -p 3100
```

> The QA scripts target **port 3100** (`npx next dev -p 3100`); adjust
> `BASE` in the script if you run the default 3000.

---

## 1. Rules regression (fastest, authoritative for security)

```bash
npm run test:rules
```

Starts its own ephemeral emulators (`emulators:exec`) and runs
`tests/rules.test.js` via `node --test`. Requires JDK/JRE **21+** (if
`firebase-tools` complains about the Java version, set `JAVA_HOME` to a 21+
runtime first). Stop any long-running persistent emulators before invoking it
so its ports are free.

**Green:** `pass 48 / fail 0 / skipped 2` — Firestore + Storage rules (auth,
posts, chat privacy, notifications, voice, admin, image content-types…). The
2 skips are intentional: they assert the **desired** behavior for the open
P1-C and P2-B rules bugs (clean denial on missing chat docs; admin listing of
`voiceRooms`) and are enabled once those bugs are fixed — see
`FOUNDATORS_QA_REPORT.md`.

## 2. E2E — two-account product flow

```bash
node qa/e2e.js
```

Registers a **fresh Alice + Bob** pair every run (emulator-verified emails),
then drives both contexts through signup/session, profile edit, posts,
likes/comments, follows/notifications, messaging, logout/re-login, admin
denial, privacy checks and feature smokes.

**Green (current expected baseline):** `33 pass, 1 fail` — the single
failure is **S07b, intended bug evidence for P1-B** in
`FOUNDATORS_QA_REPORT.md` (Post button disabled after a full reload of
`/create`). After P1-B is fixed, expect `34 pass, 0 fail`.
The suite also attributes React duplicate-key warnings (P3-A) to the exact
step + component stack when they fire (`keyWarnings` in `qa/results/e2e.json`).

Artifacts: `qa/results/e2e.json`, `qa/screenshots/`.

## 2b. Admin console lifecycle

```bash
node qa/admin.js
```

Fresh user is denied `/admin`, then `admins/{uid}` is seeded through the
**emulator's owner REST API** (the script hard-refuses to run unless
`localhost:8080` identifies as the emulator — never production), the guard
must flip live, all **15 `/admin/*` routes** must smoke clean, privileged
reads (`reports`, `pending-notifications`) must succeed as admin, and access
must be revoked when the doc is deleted.

**Green:** `5 pass, 0 fail`. Artifact: `qa/results/admin.json`.

## 3. Security probes (black-box, expected-deny)

```bash
node qa/security-sdk.js
```

X01–X27 through the real SDK: cross-account writes, private-subcollection
access, admin-grant, self-escalation (verified/status/founder-number/builder
score/followers), email/fcm smuggling, notification spoofing, admin-only
reads, plus deep isolation (outsider chat creation, `senderKey` spoofing,
foreign settings writes, foreign story deletion, collab-request self-accept).

**Green:** `24 pass, 0 fail, 3 info` — the 3 infos are documented cosmetic
writes (uid/role fields, CF-enforced sender claim).

## 4. Responsive QA (10 viewports)

```bash
node qa/responsive.js
```

360×800 → 1920×1080, ten routes each: horizontal-overflow detection with
offender listing, sidebar (`≥1024`) ↔ bottom-nav (`<1024`) mode assertions,
screenshots.

**Green:** `10 pass, 0 fail`. Artifacts: `qa/results/responsive.json`,
`qa/screenshots/responsive/` (gitignored).

## 5. Performance

```bash
node qa/perf.js          # dev-mode, 9 routes × 3 cold loads (medians)
npm run build            # production compile + .next/static sizes
```

**Green:** routes complete without timeout; flags anything over the
dev-mode thresholds printed at the end (TTFB >1s, FCP >3s, load >8s,
>120 resources, transfer >3MB). Prod bundle recorded in
`FOUNDATORS_QA_REPORT.md` §7. Artifacts: `qa/results/perf.json`.

## 6. Static recon (optional)

```bash
node qa/recon.js         # route/asset/service inventory -> qa/results/recon.json
```

## Conventions

- Evidence scripts for already-confirmed bugs live in `qa/debug-*.js`
  (one deterministic repro per bug) — see `qa/notes.md` for the map.
- Suites never mutate app source; expected-failure steps are labeled in the
  output (`S07b`) so a red step ≠ a broken suite.
- Emulator logs: `firebase-debug.log` / `firestore-debug.log` (gitignored) are
  the ground truth for rules evaluation errors.
