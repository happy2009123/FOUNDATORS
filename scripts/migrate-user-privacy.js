'use strict';

/**
 * One-time privacy migration for FOUNDATORS.
 *
 * Removes the account-private fields that the hardened security rules
 * now forbid on the PUBLIC profile document:
 *
 *   users/{uid}.email        -> lives in Firebase Auth / the session
 *   users/{uid}.fcmTokens    -> moved to users/{uid}/private/fcmTokens
 *   users/{uid}.lastTokenUpdate -> moved alongside the tokens
 *
 * The public profile doc is readable by every signed-in user (it is the
 * directory), so nothing sensitive may live on it.
 *
 * SAFE BY DEFAULT: runs as a dry run and only writes with --apply.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/serviceAccount.json \
 *     node scripts/migrate-user-privacy.js           # dry run
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/serviceAccount.json \
 *     node scripts/migrate-user-privacy.js --apply   # write
 */

const path = require('path');

function loadAdmin() {
  try {
    return require('firebase-admin');
  } catch (e) {
    // Fall back to the functions workspace dependency.
    return require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  }
}

const admin = loadAdmin();
const APPLY = process.argv.includes('--apply');

if (!admin.apps.length) admin.initializeApp();

const FIELDS = ['email', 'fcmTokens', 'lastTokenUpdate'];

async function main() {
  const db = admin.firestore();
  const users = await db.collection('users').get();
  console.log(`Scanned ${users.size} user documents (mode: ${APPLY ? 'APPLY' : 'dry run'})`);

  let affected = 0;
  let tokenDocs = 0;
  let batch = db.batch();
  let pending = 0;
  const report = { email: 0, fcmTokens: 0, lastTokenUpdate: 0 };

  for (const doc of users.docs) {
    const data = doc.data();
    const present = FIELDS.filter((f) => Object.prototype.hasOwnProperty.call(data, f));
    if (present.length === 0) continue;
    affected += 1;
    present.forEach((f) => { report[f] += 1; });

    if (APPLY) {
      // Move legacy push tokens into the owner-only private doc first.
      if (Array.isArray(data.fcmTokens) && data.fcmTokens.length > 0) {
        await db.doc(`users/${doc.id}/private/fcmTokens`).set(
          {
            tokens: data.fcmTokens,
            migratedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        tokenDocs += 1;
      }
      const removal = {};
      FIELDS.forEach((f) => {
        if (Object.prototype.hasOwnProperty.call(data, f)) {
          removal[f] = admin.firestore.FieldValue.delete();
        }
      });
      batch.update(doc.ref, removal);
      pending += 1;
      if (pending >= 400) {
        await batch.commit();
        batch = db.batch();
        pending = 0;
      }
    }
  }

  if (APPLY && pending > 0) await batch.commit();

  console.log(`Documents with private fields: ${affected}`);
  console.log(`  email: ${report.email}`);
  console.log(`  fcmTokens: ${report.fcmTokens} (migrated to private: ${tokenDocs})`);
  console.log(`  lastTokenUpdate: ${report.lastTokenUpdate}`);
  if (!APPLY) {
    console.log('DRY RUN — nothing written. Re-run with --apply to execute.');
  } else {
    console.log('Done. Re-run without --apply to verify: expect 0 affected.');
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
