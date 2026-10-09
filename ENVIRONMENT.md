# ENVIRONMENT — every runtime variable, where it is read, and what it does

All variables load from `.env` / `.env.local` (see `.env.example`). Anything
prefixed `NEXT_PUBLIC_` is **embedded in the browser bundle** — never put a
secret behind it.

## Core app

| Variable | Side | Read in | Required | Purpose |
|---|---|---|---|---|
| `NEXT_PUBLIC_USE_EMULATORS` | client | `lib/firebase.js` | no | `1` points Auth/Firestore/Storage SDKs at the local emulators (9099/8080/9199). Leave unset in production. |

The browser Firebase config itself is **not** env-driven — it lives in
`lib/firebaseConfig.js` (web API keys are public by design; security is
enforced by `firestore.rules` / `storage.rules`).

## Firebase (server-side API routes)

| Variable | Side | Read in | Required | Purpose |
|---|---|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | both | `app/api/{email,cloudinary/sign,copilot}/route.js` | fallback | overrides the baked-in key for token verification |
| `FIREBASE_WEB_API_KEY` | server | same routes | fallback | second-priority alias for the same key |
| `FIREBASE_API_KEY` | server | same routes | fallback | lowest-priority alias |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` … `NEXT_PUBLIC_FIREBASE_APP_ID` | client | conventional config slots in `.env.example` | no | documented for parity; app currently uses `lib/firebaseConfig.js` |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | client | `components/PushRegistrar.js` | for web push | VAPID key for push subscription |

## Email (Resend)

| Variable | Side | Read in | Required | Purpose |
|---|---|---|---|---|
| `RESEND_API_KEY` | server | `app/api/email/route.js` | for verification emails | Resend API key (server-only) |
| `EMAIL_FROM` | server | `app/api/email/route.js` | for verification emails | must use a **verified** domain, e.g. `FOUNDATORS <hello@yourdomain.com>` |

## Media (Cloudinary)

| Variable | Side | Read in | Required | Purpose |
|---|---|---|---|---|
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | client | `lib/cloudinary.js` | for uploads | rendering/upload URLs |
| `CLOUDINARY_CLOUD_NAME` | server | `app/api/cloudinary/sign/route.js` | for uploads | upload signature |
| `CLOUDINARY_API_KEY` | server | same | for uploads | upload signature |
| `CLOUDINARY_API_SECRET` | server | same | for uploads | **secret** — sign uploads server-side only |

## AI Copilot (server-only, optional)

| Variable | Side | Read in | Required | Purpose |
|---|---|---|---|---|
| `AI_API_KEY` | server | `app/api/copilot/route.js` | no | without it the Copilot page degrades gracefully (E2E S28 asserts no crash) |
| `AI_BASE_URL` | server | same | no | alternate OpenAI-compatible endpoint |
| `AI_MODEL` | server | same | no | model id |

## Observability

| Variable | Side | Read in | Required | Purpose |
|---|---|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | client | `lib/errorTracking.js` | no | browser error reporting |

## Built-in (framework) variables

| Variable | Side | Purpose |
|---|---|---|
| `NODE_ENV` | both | set by Next (`development`/`production`); gates error-detail verbosity in `components/ErrorBoundary.js`, `lib/admin.js`, `lib/errorTracking.js`, `lib/store.js` |
| `PORT` | server | `npm run start` port (default 3000) |

## Security rules for this file

- `.env` is git-ignored; commit **only** `.env.example`.
- Never prefix a secret with `NEXT_PUBLIC_`.
- `CLOUDINARY_API_SECRET`, `RESEND_API_KEY`, `AI_API_KEY` are server-only —
  any route that reads them must not be reachable from client code.
