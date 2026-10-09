# BETA TEST PLAN — 20–50 founders, targeting a **January 1, 2027** launch

**Owner:** founder + QA · **Created:** 2026-10-09 · **Status:** ready to schedule
**Linked:** [FOUNDATORS_QA_REPORT.md](FOUNDATORS_QA_REPORT.md) (open bugs),
[TESTING.md](TESTING.md) (suites), [DEPLOYMENT.md](DEPLOYMENT.md) (staging).

---

## 1. Goals & non-goals

**Goals**

1. Catch P0/P1 bugs in real hands before public launch (known ones are listed
   in the QA report §11 — the beta must run on a build where they are fixed).
2. Validate the **core loop**: signup → verify email → complete profile →
   publish a first post → follow someone → receive a reply/DM within 24 h.
3. Measure activation & week-1 retention on real devices/networks (not
   emulators).
4. Pressure-test email delivery (Resend), media uploads (Cloudinary), and
   push notifications with 20–50 real accounts.

**Non-goals:** visual redesign feedback, iOS app (Android via Capacitor is
optional stretch), monetization.

## 2. Cohort (target 30, range 20–50)

| Segment | Count | Why |
|---|---|---|
| Founders actively building (personal networks) | 10–15 | the core persona; will judge match/opportunity features |
| Cofounder-seekers / early idea-stage | 5–8 | exercise Match, Profile depth, collaboration requests |
| Programmers / designers open to collaboration | 5–8 | exercise Projects, DMs, voice rooms |
| Small-community organizers (accelerators, meetups) | 3–5 | group dynamics, referrals |
| "Power sceptic" friends who file good bug reports | 2–4 | quality of feedback |

**Recruitment channels:** personal WhatsApp/LinkedIn, founder Slack/Discord
communities, alumni groups, Twitter/X build-in-public posts. One shared
onboarding link with per-tester invite codes so we can attribute signups.

**Exclusion:** anyone unwilling to file feedback for 2 weeks; existing
production power users (fresh accounts keep data clean).

## 3. Timeline → January 1, 2027

| Date | Milestone |
|---|---|
| **Oct 9 (now)** | QA audit complete (this repo's report); P1-A/B/C fixes scheduled with main developer |
| **Oct 10–24** | Fix P1s + P2s; re-run all suites (target: e2e 30/30, rules 46/46) |
| **Oct 25–31** | Deploy **staging** (separate Firebase project or locked rules); smoke |
| **Nov 1–7** | Recruit wave 1 (10 testers), send invites, collect devices |
| **Nov 8–21** | **Wave 1 beta** — first 10 testers, daily triage |
| **Nov 22–30** | Triage + fixes from wave 1; recruit wave 2 (15 more) |
| **Dec 1–14** | **Wave 2 beta** — 25 total active; referral loop exercised |
| **Dec 15–21** | Bug-fix freeze candidate; recruit final wave (up to +15 → 40) |
| **Dec 22–28** | **Wave 3** + load/polish pass; docs + store listing final |
| **Dec 29–31** | **Go/no-go review** against exit criteria below |
| **Jan 1, 2027** | 🚀 Public launch |

## 4. Environment

- **Staging** (Nov–Dec): production-like deployment (DEPLOYMENT.md) against a
  dedicated Firebase project *or* `foundators-66eb7` with rules locked to a
  beta allowlist. Resend/Cloudinary keys live in staging env only.
- **Prod** (Jan 1): same code, production project, public rules.
- Testers always get a **fresh account** (invite code `BETA-<nnn>`); QA's
  emulator harness is never exposed to testers.

## 5. What testers do (mission card — paste into invites)

> 1. Sign up with your real email and click the verification link.
> 2. Finish your profile (name, handle, bio, skills) in Settings.
> 3. Publish your first post from **Create** — tell us what you're building.
> 4. Find one person in **Search/Explore** and follow them; leave a comment.
> 5. Send them a DM; try a **collaboration request** and a **voice room** if
>    more people are online.
> 6. Install on your phone (Android APK / add-to-home-screen) and use it for
>    15 min a day for two weeks.
> 7. Report anything confusing, slow, or broken — one message per issue is
>    perfect (template below).

**Issue template:**

```
[BUG] what happened → what I expected → steps → device/browser → screenshot
[FEEL] one thing that delighted / annoyed me
```

## 6. Focus areas (mapped to known risk)

| Area | Known risk (QA report) | What to watch |
|---|---|---|
| Email verification → /create | **P1-B** post button stuck disabled | can a verified user always post? |
| Profile edit | **P1-A** cold-reload empty form | edit → reload → edit again |
| First DM in a new conversation | **P1-C** send failure / lost message | first message to a new person |
| /discussion, /voice | **P2-A/B** dead route, rules crash | navigation from feed to both |
| Notifications/follows privacy | fixed in Phase 10 | wrong-person notification would be P0 |
| Mobile layouts | clean at 10 viewports | real devices may differ — flag any sideways scroll |
| Email deliverability | Resend new domain | did verification land in inbox (not spam)? |

## 7. Metrics & exit criteria (go/no-go, Dec 29)

| Metric | Target |
|---|---|
| Open P0/P1 bugs from beta reports | **0** |
| E2E suite (`qa/e2e.js`) | 30/30 incl. S07b |
| Rules suite | 46/46 |
| Signup → verified email → first post | ≥ 80% of testers succeed unaided |
| Signup → profile completed | ≥ 70% |
| Week-1 retention (beta wave 1) | ≥ 40% return on day 7 |
| Crash/console-error-free sessions | ≥ 95% |
| Median page load on 4G phone (tester-reported) | feels instant, no >3 s pages |

**No-go:** any unfixed P0/P1, or signup success < 60%.

## 8. Feedback ops

- **Channel:** one WhatsApp/Telegram group + a shared Google Form (bug
  template) + optional email `beta@…`.
- **Triage:** daily during waves (founder + QA); severity rubric mirrors the
  QA report (P0 data-loss/security, P1 core flow broken, P2 degraded, P3
  polish).
- **Fix cadence:** P0/P1 within 48 h with a note back to the reporter;
  staging redeploys Fridays.
- **Tester care:** shout-outs, founding-member badge on profile (existing
  Founding-100 mechanism), early access to new features.

## 9. Roles

| Role | Owns |
|---|---|
| Founder | recruitment, comms, go/no-go call |
| QA (this agent's scope) | staging suites, regression runs after each fix wave, updated report |
| Main developer | P1/P2 fixes, migration work (unchanged), deploys per DEPLOYMENT.md |
