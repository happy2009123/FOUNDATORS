# AI Copilot Messaging Fix Report

**Branch:** `production-readiness`
**Scope:** Diagnose and fix "AI Founder Copilot messages not receiving replies"
**Deployment:** Not deployed. Verification only (build + tests). No production credentials were used and no paid AI calls were made.

---

## 0. Premise correction (read first)

The task brief describes a **Supabase backend** and an **OpenRouter** API. Neither exists in this codebase:

| Claimed | Actual |
|---|---|
| Supabase (auth/db/storage) | **Firebase** — Auth (9099), Firestore (8080), Storage (9199) emulators; `lib/firebase.js`, `lib/firebaseConfig.js` |
| OpenRouter API | A **generic OpenAI-compatible endpoint** in `app/api/copilot/route.js` |

Evidence: `grep -ri "supabase"` and `grep -ri "openrouter"` return **zero** matches across the repo. The AI provider is configured by three env vars read in `callAI()` (`app/api/copilot/route.js:365+`):

- `AI_API_KEY` — provider key
- `AI_BASE_URL` — defaults to `https://api.openai.com/v1`
- `AI_MODEL` — defaults to `gpt-4o-mini`

**No migration was performed.** All Firebase features were preserved. Every fix below targets the actual stack.

---

## 1. Summary of root causes

Five distinct defects were found. Four of them directly produce the reported symptom "messages not receiving replies". All were **reproduced** before being fixed, then **re-verified** after.

| # | Defect | Symptom | Severity |
|---|---|---|---|
| 1 | `verifyIdToken` always called **production** identitytoolkit | Every request → HTTP 401 `Token verification failed`. **No reply at all.** | Blocking |
| 2 | Response-type mismatch (`analyze` vs `analysis`) | AI reply never accepted → silent template fallback (key configured: hard 502) | Major |
| 3 | Frontend `cardType` set to the mode key, not the card type | `CardView` returned `null` → **empty assistant bubble** | Major |
| 4 | Provider errors swallowed by `catch { source = 'template' }` | Misconfigured key/model looked like a working template | Moderate |
| 5 | Two independent `mode` states (sidebar vs `CopilotHome`) | Sidebar mode selection silently did nothing | Moderate |

---

## 2. Root cause 1 — emulator tokens rejected by production auth (blocking)

**This is the primary reason no message ever got a reply in local/QA environments.**

`verifyIdToken()` in `app/api/copilot/route.js` was hard-coded to the production endpoint:

```
https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=<API key>
```

The Firebase **Auth emulator** mints emulator-signed ID tokens. Those are rejected by Google's production endpoint, so **every** request failed:

```
HTTP 401  Token verification failed (lookup-400:INVALID_ID_TOKEN)
```

Because `callCopilot()` in `lib/copilot.js` throws on `!res.ok`, the frontend rendered the error bubble *"I could not reach the Copilot: …"* — a reply, but an error, never content.

Reproduced directly (`qa/debug-copilot.js`):

```
[2] production accounts:lookup with EMULATOR token -> 400 INVALID_ID_TOKEN
[3] EMULATOR accounts:lookup control             -> 200 (user returned)
```

**Fix** (`app/api/copilot/route.js:18-41`):

- Added a loopback-pinned `authEmulatorHost` constant, derived from `FIREBASE_AUTH_EMULATOR_HOST` or `NEXT_PUBLIC_USE_EMULATORS === '1'`.
- The host is **regex-validated** to `^https?://(localhost|127\.0\.0\.1)(:\d+)?$`. A non-loopback value is discarded, so production verification can never be redirected.
- In emulator mode, verification targets `${host}/identitytoolkit.googleapis.com/v1/accounts:lookup?key=demo`.
- The production path is byte-for-byte unchanged when no emulator env is set.

---

## 3. Root cause 2 — response type never matched the mode key

The system prompts ask for a **card type** (`analysis`, `validation`, `mvp`, `launch`, `bwm_draft`), but the POST handler compared the parsed `type` against the **mode key** (`analyze`, `validate`, …):

```js
const expected = mode === 'draft' ? 'bwm_draft' : mode;   // 'analyze' / 'validate'
if (parsed && parsed.type === expected) { ... }           // prompt returned 'analysis' → never true
```

So `analyze` (the **default mode**) and `validate` could never accept an AI card.

**Fix** (`app/api/copilot/route.js:346-354`, used at `:496-501`): added a `RESPONSE_TYPES` map mirroring `MODES[].card` in `lib/copilot.js`:

```js
const RESPONSE_TYPES = { analyze: 'analysis', validate: 'validation',
                         mvp: 'mvp', launch: 'launch', draft: 'bwm_draft' };
```

---

## 4. Root cause 3 — frontend stored the wrong `cardType`

`app/copilot/page.js:180` stored the mode key as the card type:

```js
cardType: structured ? (modeKey === 'draft' ? 'bwm_draft' : modeKey) : null,
```

But `CardView` (`components/copilot/Cards.js:311-319`) only dispatches on `analysis` / `validation` / `mvp` / `launch` / `bwm_draft` and returns `null` for anything else. Analyze and validate replies therefore rendered as an **empty bubble** — the exact reported symptom.

**Fix** (`app/copilot/page.js:176-181`): derive the canonical type via `modeMeta(modeKey).card`.

**Backfill for already-persisted messages** (`components/copilot/Cards.js:311-315`): a `LEGACY_CARD_TYPE` map (`analyze → analysis`, `validate → validation`) is applied inside `CardView`, so historical conversations saved with the wrong key now render instead of staying blank.

---

## 5. Root cause 4 — provider failures were silent

The old handler did `catch (err) { source = 'template' }`, so a wrong key, wrong model name, exhausted credits, or a network outage all produced a normal-looking template reply. There was no way to tell "AI is off" from "AI is broken".

**Fix** (`app/api/copilot/route.js:483-526`):

- Failures are captured in `aiFailure`.
- If **`AI_API_KEY` is set** and the reply is unusable → **HTTP 502** with a specific message:
  - `AI provider error: <message>` (network, HTTP status from provider)
  - `AI provider returned an unusable response` (unparseable / wrong card type)
- If **no key is configured** → the **documented template fallback is unchanged**. E2E test S28 (`qa/e2e.js`) depends on this and asserts only "no crash".

This is a deliberate split: missing key is a supported offline configuration; a present-but-broken key is a deployment error and must be visible.

---

## 6. Root cause 5 — two disconnected mode states

`CopilotHome` (`components/copilot/Home.js:26`) kept a **private** `useState('analyze')`, while the desktop sidebar and the mobile panel wrote to the **page-level** `mode` via `switchMode()` (`app/copilot/page.js:314`).

On the home screen both selectors are visible, so clicking e.g. "Chat" in the sidebar changed the header label but `Start` still sent `mode: 'analyze'`. Reproduced:

```
1) sidebar Chat clicked      -> apiMode = analyze   (wrong)
2) CopilotHome pill Chat     -> apiMode = chat      (correct)
3) CopilotHome pill Launch   -> apiMode = launch    (correct)
```

**Fix**: `CopilotHome` is now **controlled** — it accepts `mode` / `onPickMode` and falls back to local state when the parent does not supply them (`components/copilot/Home.js:24-40`). The page passes `mode={mode}` and `onPickMode={switchMode}` (`app/copilot/page.js:626-633`). `newChat()` also resets `mode` to `analyze` (`:278`) so the previous conversation's mode does not leak into a fresh one.

After the fix:

```
1) sidebar Chat clicked      -> apiMode = chat      PASS
2) CopilotHome pill Chat     -> apiMode = chat      PASS
3) CopilotHome pill Launch   -> apiMode = launch    PASS
```

---

## 7. Files changed

| File | Change |
|---|---|
| `app/api/copilot/route.js` | Emulator-aware `verifyIdToken`; `RESPONSE_TYPES` map; `aiFailure` capture and HTTP 502 surfacing |
| `app/copilot/page.js` | Canonical `cardType` via `modeMeta(...).card`; `newChat()` resets mode; `CopilotHome` receives `mode` / `onPickMode` |
| `components/copilot/Cards.js` | `LEGACY_CARD_TYPE` backfill so old messages render |
| `components/copilot/Home.js` | Controlled `mode` prop with local-state fallback |

Net: **4 files, +90 / −27 lines.** No new dependencies. No secrets added or logged.

New QA probes (added, untracked alongside this report): `qa/mock-ai-server.js`, `qa/debug-copilot*.js`.

---

## 8. Tests executed and results

### 8.1 API-level (`qa/debug-copilot.js`) — template mode (no key)

| Case | Expected | Result |
|---|---|---|
| chat, short question | 200 `source=template` | PASS |
| chat, long question | 200 `source=template` | PASS |
| analyze (card mode) | 200 `source=template`, `type:"analysis"` | PASS |
| empty message | 400 `Message is empty` | PASS |
| missing session token | 401 `Sign in required` | PASS |
| unknown mode | 400 `Unknown mode` | PASS |
| production lookup w/ emulator token | 400 `INVALID_ID_TOKEN` (documents defect 1) | PASS |

### 8.2 AI path — local mock provider (`qa/mock-ai-server.js`, port 8099)

No paid API calls. A local OpenAI-compatible mock was used, driven by `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL`. The mock honours the `type ("…")` each system prompt requests.

| Case | Expected | Result |
|---|---|---|
| chat, valid | 200 `source=ai` | PASS |
| chat, long question | 200 `source=ai` | PASS |
| analyze card | 200 `source=ai`, `type:"analysis"` | PASS |
| **invalid model** (`bogus-*` → provider 404) | 502 `AI provider error: AI provider returned 404` | PASS |
| **empty provider content** | 502 `AI provider returned an empty response` | PASS |
| **malformed card JSON** | 502 `AI provider returned an unusable response` | PASS |
| **provider unreachable** (dead base URL) | 502 `AI provider error: fetch failed` | PASS |

### 8.3 Browser UI matrix (`qa/debug-copilot-ui.js`)

Verified **twice** — once with the mock provider (`source=ai`) and once with no key (`source=template`). All five modes correct in both runs:

```
AI path:       Analyze Idea apiMode=analyze src=ai card=Y modeOK=true kindOK=true
               Validate     apiMode=validate src=ai card=Y modeOK=true kindOK=true
               Plan MVP     apiMode=mvp src=ai card=Y modeOK=true kindOK=true
               Launch       apiMode=launch src=ai card=Y modeOK=true kindOK=true
               Chat         apiMode=chat src=ai card=N modeOK=true kindOK=true

Template path: 5/5 modeOK=true kindOK=true, cards rendered, no empty bubbles
```

`card=N` for Chat is correct — chat returns plain text, not a card.

### 8.4 Conversation persistence and isolation (`qa/debug-copilot-reopen.js`)

| Check | Result |
|---|---|
| Messages persist; reload returns to home; **reopening the recent conversation restores the assistant reply** | PASS |
| Second account sees **no** bubbles and **no** leaked title from account A | PASS |

### 8.5 Mode-selection regression (`qa/debug-copilot-side.js`, `qa/debug-copilot-diverge.js`)

Sidebar and in-card selectors now agree; the mode sent to `/api/copilot` matches the one clicked in all six cases. PASS.

### 8.6 Full E2E (`node qa\e2e.js`)

**Result with the copilot fixes: 31 pass / 3 fail.**
**Result on a clean baseline (fixes stashed): 31 pass / 3 fail.**

The failing set is identical in kind and is **pre-existing**, unrelated to this work:

- `S07b` — *intended* P1 repro (Post button disabled on a one-shot mount check; documented as expected-fail).
- `S06` / `S17` / `S30` — profile-bio and account-switch flakes; the specific failing test **shifts between runs** (S14 ↔ S10 ↔ S17), which is the signature of flakiness rather than a regression. All are in profile/messaging code paths untouched by this change (`git diff --stat` confirms the diff is copilot-only).

`S28` (copilot smoke — "no crash") **PASS**.

### 8.7 Security rules (`npm run test:rules`)

**48 pass / 0 fail / 2 skipped** — matches the pre-existing baseline. No rules changes were needed; `firestore.rules` L462-489 already accept exactly the fields `saveMessage` writes (`role`, `text`, `createdAt`, role ∈ `[user, assistant]`, ≤12000 chars).

### 8.8 Production build (`next build`)

- **Turbopack (default): fails** — 35 × `Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'`. **Pre-existing**: the identical failure occurs with all four copilot files stashed. `fonts.googleapis.com` is reachable (HTTP 200), so this is a Turbopack/Next 16.3.5 font-fetch issue in this environment, not a code defect.
- **Webpack (`next build --webpack`): succeeds, exit 0.** `✓ Compiled successfully in 68s`, 101/101 static pages generated, and both `/api/copilot` and `/copilot` compiled and listed in the route table.

---

## 9. Environment variables

| Variable | Status | Effect |
|---|---|---|
| `AI_API_KEY` | **Not set anywhere** (Process / User / Machine; no `.env`, `.env.local`; no `dotenv`) | Route serves the built-in template. This is the supported offline mode. |
| `AI_BASE_URL` | Not set | Defaults to `https://api.openai.com/v1` |
| `AI_MODEL` | Not set | Defaults to `gpt-4o-mini` |
| `NEXT_PUBLIC_USE_EMULATORS` | Set to `1` in QA launcher scripts only | Enables emulator token verification |
| `FIREBASE_AUTH_EMULATOR_HOST` | Optional; read by the fix | Alternative way to select the emulator |

`lib/firebaseConfig.js` contains a **Firebase web API key**. That value is a public client identifier by design (it ships in every Firebase web bundle) and is not a secret. **No AI provider key exists in the repo.** Nothing sensitive was added, printed, or committed.

To enable real AI locally, copy `.env.example` to `.env.local` and set `AI_API_KEY` (and optionally `AI_BASE_URL` / `AI_MODEL`).

---

## 10. Remaining blockers and honest limitations

1. **No real AI provider was exercised.** No key is available and the brief forbids unnecessary paid calls. The AI path was proven against a local mock that implements the OpenAI chat-completions contract. Behaviour against a specific real provider/model (format adherence, JSON quality, latency) is **unverified**.
2. **Production verification is impossible** here — no production credentials. Emulator-token behaviour is by definition local-only. In production, `identitytoolkit` **does** verify JWT signatures. (Noted during testing: the Auth *emulator* accepts tampered signatures — a documented emulator characteristic, not a code defect and not reachable in production, since the loopback host is only used when explicitly opted in.)
3. **Turbopack production build fails on Google Fonts** in this environment. Pre-existing, confirmed on a clean baseline. Workaround: `next build --webpack` succeeds. Worth a separate fix (e.g. self-hosting the font) but out of scope here.
4. **Legacy messages** saved with the wrong `cardType` now render via the `LEGACY_CARD_TYPE` backfill, but their stored value is still wrong on disk. A one-off migration would be cleaner; the UI-level fix was chosen as the smaller, safer change.
5. **E2E S06/S17/S30 (and occasionally S10/S14)** remain flaky, pre-existing, and outside this change's scope. Reproduced identically on a clean baseline.

---

## 11. Reproducing the verification

```bash
# 1. emulators + dev server
qa-start-emu.cmd          # auth 9099, firestore 8080, storage 9199
qa-start-dev.cmd          # next dev 3100  (no AI key -> template mode)

# 2. template-mode API trace + UI matrix + persistence
node qa/debug-copilot.js
node qa/debug-copilot-ui.js
node qa/debug-copilot-reopen.js

# 3. AI path against the local mock (no paid calls)
node qa/mock-ai-server.js &                       # port 8099
# restart dev with AI_API_KEY/AI_BASE_URL/AI_MODEL pointing at the mock, then:
node qa/debug-copilot-ai.js
node qa/debug-copilot-fail.js
node qa/debug-copilot-ui.js

# 4. regressions
node qa/e2e.js
set JAVA_HOME=<jdk21+>
npx firebase-tools emulators:exec --only firestore,storage --project demo-rules-test "node --test tests/rules.test.js"

# 5. build
npx next build --webpack      # Turbopack build fails on Google Fonts (pre-existing)
```

---

## 12. Conclusion

All five defects were reproduced, fixed with minimal targeted changes, and re-verified end-to-end at the API, browser-UI, persistence, rules, E2E, and build layers. Message delivery now works in every mode, in both template and AI configurations, and genuine provider failures are surfaced as HTTP 502 instead of being silently replaced by a template.

Changes are staged for commit on `production-readiness`. **Not deployed.**
