# Foundators — Production Readiness Report

Date: 2026-10-08 · Repo: `happy2009123/FOUNDATORS` · Branch: `production-readiness`
Verification: **46/46 rules tests pass** (Firestore + Storage emulators) · **`npm run build` clean**

## What was fixed

### Security rules (firestore.rules, storage.rules)
- No blanket `allow read, write` anywhere except two owner-scoped
  settings/voiceReminder paths; catch-all is `if false`.
- Users: writes limited to own doc, enforced field allowlist; `email` and
  `fcmTokens` can no longer be written to or read from the public profile doc.
- New `users/{uid}/private/{docId}` (owner || admin) now carries FCM tokens.
- Chats: immutable `participants`/`isGroup`/`createdAt`; field allowlist; the
  `unreadBy` badge can only be reset to 0 for yourself (mark-as-read) or
  advance by exactly +1 for the 1:1 partner inside a real message update that
  also advances `lastMessageAt`; `typing` only ever changes your own key.
- pending-notifications: create requires a non-empty string `userId`
  (recipient), capped at 128 chars — no more anonymous spam writes.
- Follow counters are owner-scoped ±1 with `existsAfter` anchoring.

### Data privacy (client + Cloud Functions)
- Signup/Google setDocs no longer write `email` into `users/{uid}`; the UI
  keeps showing it because the profile hydrates from Firebase Auth.
- Push tokens are written to `users/{uid}/private/fcmTokens` by PushRegistrar.
- `functions/index.js`: reads tokens from the private doc (legacy field
  unioned in), prunes invalid tokens, and enforces **hourly quotas** —
  40 pushes per recipient and 40 per actor — deleting over-quota
  notifications instead of sending them.
- One-time migration script: `npm run migrate:privacy` (dry-run by default,
  `--apply` to write).

### App correctness
- Auth/listener fixes, mock data removal, real Explore/Search/Challenges,
  honest landing stats, referral invite loop, admin Growth scoreboard.
- Sitemap: 8 malformed `<changefreq=` tags repaired — valid XML, 21 URLs.

## Verification
| Check | Result |
|---|---|
| `npm run test:rules` (46 tests, 2 accounts + anonymous) | 46 pass / 0 fail |
| `npm run build` | clean, all routes generated |
| Rules language audit (no ternaries / `.all()` / `.reduce()`) | clean, `Map.diff()` based |

## Founder actions (this machine has no Firebase credentials)

```powershell
npm run migrate:privacy -- --apply   # one-time: move legacy fcmTokens, strip email
npm run deploy:rules
npm run deploy:functions             # first time: cd functions; npm ci; cd ..
```

Then verify live: sign in as two accounts, send a DM (badge +1), mark read
(badge 0), confirm account A cannot update B's user doc or B's unread badge.
