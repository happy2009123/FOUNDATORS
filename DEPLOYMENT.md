# DEPLOYMENT — shipping FOUNDATORS (web + Firebase backend)

The system has two deployables:

1. **Web app** — Next.js 16 (App Router) to any Node host or Vercel.
2. **Firebase backend** — `firestore.rules`, `storage.rules`, and `functions/`
   to project `foundators-66eb7`.

Both are required for a working production deployment; rules/functions
deploys need Firebase credentials the QA agent does not have (founder runs
them — see the checklist in `READINESS_REPORT.md`).

---

## 1. Pre-deploy checklist

- [ ] `npm run build` completes clean (expected: 101 static pages, TS pass).
- [ ] `npm run test:rules` → 46/46 pass.
- [ ] `node qa/e2e.js` against local emulators → see `TESTING.md` for expected results.
- [ ] Open issues reviewed in `FOUNDATORS_QA_REPORT.md` — **P1 bugs should be
      fixed before launch** (see its §11 launch checklist).
- [ ] `.env` values present on the target host (see `ENVIRONMENT.md`):
      Resend, Cloudinary, AI key, optional Sentry DSN.
- [ ] Custom domain added at the host + DNS propagated.
- [ ] Firebase Console: authorized domains includes the production domain
      (Auth → Settings → Authorized domains), otherwise email/password
      sign-in and OOB links will be rejected.

## 2. Deploy the Firebase backend (founder machine, needs login)

```bash
# rules first — they gate all data access
npm run deploy:rules

# cloud functions (notifications, email, quotas)
npm run deploy:functions
```

One-off data migrations, if the release needs them:

```bash
npm run migrate:privacy    # backfills private subcollections (see scripts/)
```

Verify in the Firebase Console: Rules tab shows the deployed source, Functions
tab lists the deployed functions with no error banner.

## 3. Deploy the web app

### Option A — Vercel (recommended)

```bash
npm install -g vercel
vercel login
vercel --prod
```

Import the repo, keep framework preset = **Next.js**, set the environment
variables from `ENVIRONMENT.md` in Project → Settings → Environment Variables,
then deploy. GitHub-flow alternative: push the branch and import at
[vercel.com/new](https://vercel.com/new) with default settings.

### Option B — any Node host (Railway, Render, Fly.io, VPS…)

```bash
npm ci
npm run build
npm run start          # PORT env var changes the port (default 3000)
```

Use a process manager (systemd / pm2 / Docker) so the server restarts on
crash and on new deploys. `npm ci` guarantees lockfile-exact installs.

### Option C — Netlify

```bash
npm install -g netlify-cli
netlify deploy --build --prod
```

## 4. Post-deploy verification (smoke, ~5 min)

1. Load `/` and `/login` — no console errors, TLS OK.
2. Sign up a throwaway account → verification email arrives (Resend) →
   click through → account shows verified.
3. Create a post, follow a second account, send a DM between them — data
   round-trips (Firestore console shows the writes).
4. Admin routes (`/admin`) deny a normal user.
5. Mobile viewport (390×844): bottom nav visible; desktop (≥1024px): sidebar.
6. Check error tracking (Sentry DSN) receives a test event if configured.

## 5. Rollback

- **Web:** Vercel instant rollback to the previous deployment (or redeploy the
  last good commit on the host).
- **Rules/functions:** re-run `npm run deploy:rules` / `deploy:functions` from
  the last known-good git tag — rules are plain files, versions are the git
  history. Keep a tag like `rules-YYYYMMDD` before each rules deploy.

## 6. Notes for the ongoing Firebase → Supabase migration

This deployment surface is untouched by the migration work; if the backend
target changes, only §2 and the emulator/env wiring in `lib/firebase.js`
move — the Next.js host side (§3) stays the same.
