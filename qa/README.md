# QA harness

All QA tooling lives here. **Suite docs and expected results: [../TESTING.md](../TESTING.md).
Findings & bug evidence: [../FOUNDATORS_QA_REPORT.md](../FOUNDATORS_QA_REPORT.md).**

Nothing in `qa/` modifies application code; everything runs against the local
Firebase emulators.

## Suites

| Script | What it does | Expected green |
|---|---|---|
| `e2e.js` | two-account product E2E (S01–S30 incl. S22–S25 feature smokes, fresh users per run) | 33/34 — S07b intentionally fails (P1 bug evidence) |
| `admin.js` | admin console lifecycle: deny → seed `admins/{uid}` (emulator owner REST) → 15 route smokes → revoke | 5/5 |
| `security-sdk.js` | X01–X27 expected-deny probes via the real SDK | 24 pass / 0 fail / 3 info |
| `responsive.js` | 10 viewports × 10 routes: overflow, nav mode, screenshots | 10/10 |
| `routes.js` | 70-route health + accessibility sweep (anon + signed-in), link harvest; also surfaces auth-emulator-outage as blanket signup failure | 68/70 healthy (2 known 404s) |
| `perf.js` | dev-mode perf, 9 routes × 3 cold loads → `results/perf.json` | completes, thresholds printed |
| `recon.js` | static route/asset inventory → `results/recon.json` | informational |

## Evidence scripts (one deterministic repro per confirmed bug)

| Script | Bug |
|---|---|
| `debug-save.js` | P1-A edit-profile cold-load empty form |
| `debug-verified2.js` / `debug-verified3.js` | P1-B /create emailVerified race (SPA vs reload) |
| `debug-batch.js` / `debug-seq.js` / `debug-chatrules.js` | P1-C rules crash: `[update-on-missing + create]` batch denied, sequential OK |
| `debug-row.js` | P1-C browser send path + conversation-row click proof |
| `debug-dup.js` | P1-C message body lost (`messages: 0` while preview exists) |
| `debug-voice.js` | P2-B `/voice` list listeners: `Null value error for 'list' @ L1281` (empty collection too) |
| `debug-keys.js` | P3-A duplicate-key hunt: `console.error` stack capture across 2 viewports × logged-out/onboarding/logged-in routes |
| `debug-signup.js` | signup → `users/{uid}` profile-doc chain probe (used when diagnosing onboarding-gate failures) |
| `debug-search.js` / `debug-search2.js` | S26 false-positive: combined input selector hit `DesktopHeader`'s form input (navigates only on Enter); strict `input[aria-label="Search"]` = 5/5 pass |
| `debug-msg.js` / `debug-msg2.js` | earlier P1-C reproductions |

`notes.md` — working evidence log feeding the QA report.

## Artifacts (gitignored)

- `results/*.json` — machine-readable suite output
- `screenshots/` — E2E + responsive screenshots

## Conventions

- PowerShell-friendly: run scripts with `node qa\<name>.js`; no `&&`/`head`.
- Fresh users per run (`<suite>.<timestamp>@qa.test`); verification via
  emulator OOB endpoint (see `e2e.js` `verifyEmail()`).
- Port **3100** for the dev server in suite scripts (start with
  `npx next dev -p 3100` and `NEXT_PUBLIC_USE_EMULATORS=1`).

## Emulator hygiene (important)

After ~1.5 h of continuous suites the Firestore emulator has OOM'd
(`java.lang.OutOfMemoryError: Java heap space`). Symptoms mid-suite: skeleton
loaders (data fetches hang), auth refresh fails → session dies → routes bounce
to `/login` or the onboarding gate fires (profile doc write lost) → responsive
nav assertions collapse. **Restart the emulators before long runs**: kill the
`firebase-tools emulators:start` node pair + `java.exe` emulator processes,
then relaunch `%TEMP%\opencode\qa-start-emu.cmd` and verify 9099/8080/9199
answer before starting a suite. A signup whose `users/{uid}` doc is missing
but whose auth user exists (see `debug-signup.js`) is the tell-tale sign of a
half-ready emulator, not an app bug.

## Emulator hygiene (important)

After ~1.5 h of continuous suites the Firestore emulator has OOM'd
(`java.lang.OutOfMemoryError: Java heap space`). Symptoms mid-suite: skeleton
loaders (data fetches hang), auth refresh fails → session dies → routes bounce
to `/login` or the onboarding gate fires (profile doc write lost) → responsive
nav assertions collapse. **Restart the emulators before long runs**: kill the
`firebase-tools emulators:start` node pair + `java.exe` emulator processes,
then relaunch `%TEMP%\opencode\qa-start-emu.cmd` and verify 9099/8080/9199
answer before starting a suite. A signup whose `users/{uid}` doc is missing
but whose auth user exists (see `debug-signup.js`) is the tell-tale sign of a
half-ready emulator, not an app bug.
