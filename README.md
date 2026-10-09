# Foundators

A social network for founders — **Next.js 16 (App Router), React 19, Tailwind
CSS, Zustand, and Firebase** (Auth, Firestore, Storage, Cloud Functions) with
an optional Capacitor Android wrapper.

Posts, comments, follows, chats, notifications, voice rooms, admin tools and
the Founders Match system all run against Firestore with security rules as the
authorization layer. Email verification goes through Resend; uploads through
Cloudinary; the AI Copilot page through an OpenAI-compatible API.

## Quick start

```bash
npm install
npx playwright install chromium     # only for the test suites
npm run dev                          # http://localhost:3000
```

For **local development against the Firebase emulators** (recommended — keeps
production data untouched):

```bash
npx firebase emulators:start --only auth,firestore,storage --project foundators-66eb7
set NEXT_PUBLIC_USE_EMULATORS=1      # macOS/Linux: export NEXT_PUBLIC_USE_EMULATORS=1
npm run dev
```

Full instructions, modes, and troubleshooting → **[SETUP.md](SETUP.md)**.

## Documentation map

| Doc | What's in it |
|---|---|
| [SETUP.md](SETUP.md) | prerequisites, install, emulator vs production data mode, troubleshooting |
| [ENVIRONMENT.md](ENVIRONMENT.md) | every env var, which side reads it, secret handling (`.env.example`) |
| [DEPLOYMENT.md](DEPLOYMENT.md) | web host deploys, Firebase rules/functions deploys, pre/post-checklists, rollback |
| [TESTING.md](TESTING.md) | how to run rules/E2E/security/responsive/perf suites and what green looks like |
| [FOUNDATORS_QA_REPORT.md](FOUNDATORS_QA_REPORT.md) | full QA audit: confirmed bugs (P1–P3), suite results, launch checklist |
| [BETA_TEST_PLAN.md](BETA_TEST_PLAN.md) | 20–50 tester program and the rollout timeline to Jan 1, 2027 |
| [READINESS_REPORT.md](READINESS_REPORT.md) | security-hardening report + founder Firebase action items |
| [SECURITY.md](SECURITY.md) | threat model and rules conventions |
| [FIREBASE-STRUCTURE.md](FIREBASE-STRUCTURE.md) | collections/subcollections layout |
| [APP-STORE-LISTING.md](APP-STORE-LISTING.md) | Android store copy |

## Scripts

```bash
npm run dev                 # dev server
npm run build && npm start   # production server (PORT env var, default 3000)
npm run test:rules          # 46-test Firestore/Storage rules suite (own emulators)
npm run deploy:rules        # deploy firestore.rules + storage.rules
npm run deploy:functions    # deploy cloud functions
npm run migrate:privacy     # one-off privacy backfill (scripts/)
npm run generate-icons      # PWA icons
npm run build:android       # next build && cap sync android
```

QA suites (`node qa/e2e.js`, `qa/security-sdk.js`, `qa/responsive.js`,
`qa/perf.js`) are documented in [TESTING.md](TESTING.md).

## Project structure

```
app/                    Next.js App Router routes
  login/ signup/ onboarding/
  home/ explore/ create/ search/ messages/[chatId]/
  profile/[userId]/ post/[postId]/ discussion/[discussionId]/
  notifications/ settings/ admin/ voice/ reels/ projects/ ...
  api/                  route handlers (email, copilot, cloudinary/sign)
components/             UI (PostCard, PersonCard, BottomNav, DesktopSidebar, ...)
lib/
  firebase.js           SDK init + env-gated emulator wiring
  firebaseConfig.js     web Firebase config (public by design)
  firestore.js          typed Firestore read/write helpers
  store.js              Zustand store (session, feed, contacts, collections)
  rules helpers live in firestore.rules (the authorization layer)
firestore.rules         authorization rules (46-test suite in tests/)
storage.rules           upload rules (covered by the same suite)
functions/              cloud functions (notifications, quotas, email)
qa/                     QA harness: E2E, security, responsive, perf, evidence
tests/                  rules regression tests (node --test)
```

## Notes

- **Authorization is server-enforced.** The client never decides permissions —
  `firestore.rules` / `storage.rules` do; the 46-test suite is the contract.
- **Local dev by default touches real Firebase.** Use
  `NEXT_PUBLIC_USE_EMULATORS=1` (Setup.md Mode A) unless you intend to write
  to production.
- **Known open bugs** are tracked with reproductions in
  [FOUNDATORS_QA_REPORT.md](FOUNDATORS_QA_REPORT.md) — check it before
  launching or handing the app to testers.
