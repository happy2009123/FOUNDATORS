# SETUP — running FOUNDATORS locally

**Prerequisites**

| Tool | Version | Notes |
|---|---|---|
| Node.js | **≥ 24** (enforced by `engines` in `package.json`) | `node --version` |
| npm | ships with Node | |
| Java (JRE/JDK) | 17+ | only needed for the Firebase **emulators** |
| Firebase CLI | any recent | `npx firebase-tools --version` (fetched on demand) |
| Playwright browser | once per machine | `npx playwright install chromium` |

## 1. Install

```bash
npm install
```

## 2. Environment

```bash
copy .env.example .env      # Windows
cp .env.example .env        # macOS/Linux
```

Fill in the keys you have (see `ENVIRONMENT.md` for every variable). Minimum to
boot the UI: nothing — the Firebase web config is baked into
`lib/firebaseConfig.js` for the `foundators-66eb7` project. `RESEND_API_KEY`
(email verification), Cloudinary (uploads), and `AI_API_KEY` (Copilot) are
optional; the app degrades gracefully without them.

## 3. Choose a data mode

### Mode A — local emulators (recommended for development/QA)

```bash
npx firebase emulators:start --only auth,firestore,storage --project foundators-66eb7
set NEXT_PUBLIC_USE_EMULATORS=1        # macOS/Linux: export ...
npm run dev
```

- Emulator ports are pinned in `firebase.json` (Auth **9099**, Firestore
  **8080**, Storage **9199**, UI disabled, `singleProjectMode: true`).
- The env flag makes `lib/firebase.js` call `connect*Emulator()`; with the
  flag unset the app talks to production exactly as before.
- The emulator seeds **empty** data — sign up fresh accounts; your real
  production account is never touched in this mode.

### Mode B — production Firebase (default)

```bash
npm run dev
```

Writes go to the real `foundators-66eb7` project. Use a test account.

## 4. Run

```bash
npm run dev          # http://localhost:3000
npm run build && npm run start   # production server
```

## 5. Rules / functions (backend-owned)

```bash
npm run test:rules        # 46-test emulator suite, starts its own emulators
npm run deploy:rules      # firestore.rules + storage.rules -> foundators-66eb7
npm run deploy:functions  # functions/ -> foundators-66eb7
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `ER_SCHEMA` / engines error from npm | Node < 24 — upgrade Node |
| Emulator port already in use | another emulator instance running — `firebase emulators:stop` or kill the process on 9099/8080/9199 |
| SDK hits production while emulators run | `NEXT_PUBLIC_USE_EMULATORS=1` not set in the shell that runs `npm run dev` |
| `/api/email` returns 401 in emulator mode | expected — the route verifies tokens against production Identity Toolkit; verify emails via the emulator OOB endpoint (see `TESTING.md`) |
| Playwright fails to launch | `npx playwright install chromium` |
