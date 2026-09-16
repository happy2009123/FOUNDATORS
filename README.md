# Foundators

A social network for founders — built with Next.js 14 (App Router), Tailwind CSS, and Zustand.

This is a real, deployable web app converted from the original prototype. All state
(auth session, follows, bookmarks, published posts, comments, chats) lives in the
browser via `localStorage`, so there's no backend/database to set up — it works out
of the box.

## What's in here

Beyond the original social-feed prototype, this includes a first pass at the
**Foundators Match** system:

- **"What are you building today?"** launcher (`/match`) — pick an intent
  (find a co-founder, find a job, find funding, learn a skill, etc.)
- **Live match scoring** — people are ranked by *real, computed* overlap
  between their skills and what you're looking for, not random numbers
- **Idea → Team generator** — describe what you want to build, get a
  suggested team of roles based on keywords in your description
- **Opportunity feed** — jobs, freelance gigs, funding, projects, mentorship,
  grants, and events, filtered by intent
- **Near Me / Global toggle** — local-first discovery of founders and startups
- **Builder Score** — a reputation card on every profile (projects, 
  collaborations, verified skills, referrals, community contribution)

**Honest scope note:** the match scores, team suggestions, and Builder Score
numbers are computed by transparent heuristics against seed data, not a real
ML model or verified activity history — building those "for real" needs an
actual backend, a real database of activity, and (for smarter matching) an
LLM API integration. The UI, routing, and data flow here are real and
production-shaped; swapping the heuristics for real backend calls later is a
`lib/store.js` change, not a UI rewrite.

**Not yet built** (flagged, not silently skipped): daily challenges &
gamification points, a dedicated programmer-marketplace detail view, and a
per-project "Foundators AI" assistant (this one specifically needs a real AI
API key and backend — happy to wire it up to the Claude API if you want that
next).

## Run it locally

You'll need [Node.js 18+](https://nodejs.org) installed.

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Deploy it

### Option A — Vercel (recommended, made by the Next.js team)

**Fastest path — no GitHub required:**

```bash
npm install -g vercel
vercel login
vercel --prod
```

Follow the prompts (accept the defaults — it auto-detects Next.js). You'll get a live
URL in about a minute.

**Or via GitHub:**

1. Push this folder to a new GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. Leave all settings on their defaults and click **Deploy**.

### Option B — Netlify

```bash
npm install -g netlify-cli
netlify deploy --build --prod
```

### Option C — any Node host (Railway, Render, Fly.io, a VPS, etc.)

```bash
npm install
npm run build
npm run start
```

This starts a production server on port 3000 (set the `PORT` env var to change it).

## Project structure

```
app/
  page.js                    Splash screen
  login/, signup/            Auth screens
  (main)/                    Shared layout + bottom nav for the 4 main tabs
    home/  discover/  messages/  profile/
  messages/[chatId]/         Individual chat thread
  profile/[userId]/          Another founder's profile
  startup/[startupId]/       Startup profile
  post/[postId]/             Comment thread on a post
  discussion/[discussionId]/ Discussion thread
  list/[mode]/                "View all" — people / startups / discussions
  create/                    New post composer
  notifications/  settings/  help/
components/                  Shared UI (PostCard, PersonCard, Drawer, TopBar, ...)
lib/
  data.js                    Seed content (users, startups, posts, discussions)
  store.js                   Zustand store — all app state and actions live here
  useHydration.js            Client-side localStorage rehydration
  useRequireAuth.js          Route guard — redirects to /login if signed out
```

## Notes

- **State/data is per-browser.** Since there's no backend, what you see is stored in
  your own browser's `localStorage`. Clearing site data resets the app to its seed
  content (2 sample founders' posts, 3 sample startups, etc.).
- **Images** are placeholder avatars from `i.pravatar.cc` — swap `lib/data.js` with
  your own image URLs (or wire up file uploads) when you're ready to go further.
- **To add a real backend later**, the natural next step is to replace the Zustand
  store's local state with API calls (e.g. to a Postgres + Prisma backend, or
  Supabase/Firebase), keeping the same action names (`toggleFollowUser`,
  `publishPost`, `sendMessage`, etc.) so the UI components don't need to change.
