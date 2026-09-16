# Security Policies — FOUNDATORS

## Row-Level Security (RLS) — Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: check if request user is authenticated
    function isAuth() {
      return request.auth != null;
    }

    // Helper: check if user owns the document
    function isOwner(userId) {
      return isAuth() && request.auth.uid == userId;
    }

    // --- Users ---
    match /users/{userId} {
      // Anyone can read public profiles
      allow read: if true;
      // Only the owner can write their own profile
      allow create, update, delete: if isOwner(userId);
    }

    // --- Posts ---
    match /posts/{postId} {
      // Anyone can read posts
      allow read: if true;
      // Only authenticated users can create
      allow create: if isAuth()
        && request.resource.data.authorId == request.auth.uid
        && request.resource.data.text.size() <= 2000;
      // Only the author can update/delete their own post
      allow update, delete: if isOwner(resource.data.authorId);
    }

    // --- Comments ---
    match /comments/{commentId} {
      allow read: if true;
      allow create: if isAuth()
        && request.resource.data.authorId == request.auth.uid
        && request.resource.data.text.size() <= 1000;
      allow update, delete: if isOwner(resource.data.authorId);
    }

    // --- Messages / Conversations ---
    match /conversations/{convId} {
      // Only participants can read
      allow read: if isAuth()
        && request.auth.uid in resource.data.participants;
      allow create: if isAuth()
        && request.auth.uid in request.resource.data.participants;
      allow update: if isAuth()
        && request.auth.uid in resource.data.participants;

      match /messages/{msgId} {
        allow read: if isAuth()
          && request.auth.uid in get(/databases/$(database)/documents/conversations/$(convId)).data.participants;
        allow create: if isAuth()
          && request.auth.uid in get(/databases/$(database)/documents/conversations/$(convId)).data.participants
          && request.resource.data.senderId == request.auth.uid;
        allow delete: if isOwner(resource.data.senderId);
      }
    }

    // --- Notifications ---
    match /notifications/{notifId} {
      allow read, update, delete: if isOwner(resource.data.userId);
      allow create: if isAuth();
    }

    // --- Reports / Blocks ---
    match /reports/{reportId} {
      allow create: if isAuth();
      allow read, update, delete: if false; // admin only
    }

    match /blocks/{blockId} {
      allow create, read, delete: if isOwner(resource.data.blockerId);
    }

    // --- Storage rules ---
    // Files must be under 5MB, only image types
    // match /b/{bucket}/o {
    //   match /uploads/{userId}/{allPaths=**} {
    //     allow read: if true;
    //     allow write: if isAuth()
    //       && request.auth.uid == userId
    //       && request.resource.size < 5 * 1024 * 1024
    //       && request.resource.contentType.matches('image/.*');
    //   }
    // }
  }
}
```

## Firebase Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/(jpeg|png|webp|gif)');
      allow delete: if request.auth != null
        && request.auth.uid == userId;
    }

    match /avatars/{userId} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size < 2 * 1024 * 1024
        && request.resource.contentType.matches('image/(jpeg|png|webp)');
    }
  }
}
```

## Client-Side Security Measures

| Layer | Implementation |
|---|---|
| **HTTPS enforcement** | HSTS header (max-age=63072000, includeSubDomains, preload) |
| **Clickjacking** | X-Frame-Options: DENY, CSP frame-ancestors 'none' |
| **MIME sniffing** | X-Content-Type-Options: nosniff |
| **XSS** | X-XSS-Protection: 1; mode=block, CSP script-src |
| **Referrer** | Referrer-Policy: strict-origin-when-cross-origin |
| **Permissions** | Camera, microphone, geolocation, payment all denied |
| **CSP** | Strict allowlist for scripts, styles, images, connections |
| **Session expiry** | 24-hour token lifetime, auto-logout on expiry |
| **Rate limiting** | Login: 5 attempts/min, Signup: 3 attempts/5min |
| **File uploads** | MIME type whitelist (JPEG/PNG/WebP/GIF), 5MB max, 2000 char text limit |
| **API keys** | All via env vars (NEXT_PUBLIC_*), never hardcoded |
| **Auth gating** | useRequireAuth() returns null before hydration, prevents flash |

## Pre-Deploy Checklist

- [ ] No `.env` file committed with real credentials
- [ ] Firebase Security Rules deployed to Firestore
- [ ] Firebase Storage Rules deployed
- [ ] HTTPS enabled on hosting domain
- [ ] CSP headers tested (no inline script errors)
- [ ] Rate limiting tested (brute force blocked)
- [ ] File upload tested (malicious files rejected)
- [ ] Session expiry tested (auto-logout after 24h)
