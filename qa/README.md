# QA harness

All QA tooling lives here. **Suite docs and expected results: [../TESTING.md](../TESTING.md).
Findings & bug evidence: [../FOUNDATORS_QA_REPORT.md](../FOUNDATORS_QA_REPORT.md).**

Nothing in `qa/` modifies application code; everything runs against the local
Firebase emulators.

## Suites

| Script | What it does | Expected green |
|---|---|---|
| `e2e.js` | two-account product E2E (S01–S30, fresh users per run) | 29/30 — S07b intentionally fails (P1 bug evidence) |
| `security-sdk.js` | X01–X22 expected-deny probes via the real SDK | 19 pass / 0 fail / 3 info |
| `responsive.js` | 10 viewports × 10 routes: overflow, nav mode, screenshots | 10/10 |
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
