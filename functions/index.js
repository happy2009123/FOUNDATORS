const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

// Anti-spam quotas: at most this many pushes per recipient and per
// claimed sender per calendar hour. Over-quota notifications are
// deleted before any FCM call is made, so spam is never delivered.
const RECIPIENT_CAP = 40;
const ACTOR_CAP = 40;

function hourKey() {
  return new Date().toISOString().slice(0, 13).replace(/[-:T]/g, "");
}

function actorBucket(actor) {
  const safe = String(actor).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 128);
  return safe ? safe : null;
}

async function loadTokens(targetUserId) {
  const db = admin.firestore();
  const privateSnap = await db
    .doc(`users/${targetUserId}/private/fcmTokens`)
    .get();
  const legacySnap = await db.doc(`users/${targetUserId}`).get();
  const tokens = new Set(
    (privateSnap.exists && Array.isArray(privateSnap.data().tokens)
      ? privateSnap.data().tokens
      : []
    ).concat(
      legacySnap.exists && Array.isArray(legacySnap.data().fcmTokens)
        ? legacySnap.data().fcmTokens
        : []
    )
  );
  return { tokens: [...tokens], privateSnap, legacySnap };
}

async function pruneTokens(targetUserId, invalidTokens, refs) {
  const db = admin.firestore();
  const batch = db.batch();
  if (refs.privateSnap.exists) {
    batch.update(refs.privateSnap.ref, {
      tokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
    });
  }
  if (refs.legacySnap.exists && refs.legacySnap.data().fcmTokens) {
    batch.update(refs.legacySnap.ref, {
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
    });
  }
  await batch.commit();
}

async function checkQuota(notif) {
  const db = admin.firestore();
  const key = hourKey();
  const rRef = db.doc(`push-quota/r_${notif.targetUserId}_${key}`);
  const actor = actorBucket(notif.data && notif.data.userId);
  const aRef = actor ? db.doc(`push-quota/a_${actor}_${key}`) : null;

  return db.runTransaction(async (tx) => {
    const rSnap = await tx.get(rRef);
    const aSnap = aRef ? await tx.get(aRef) : null;
    const rCount = rSnap.exists ? rSnap.data().count || 0 : 0;
    const aCount = aSnap && aSnap.exists ? aSnap.data().count || 0 : 0;
    if (rCount >= RECIPIENT_CAP || (aRef && aCount >= ACTOR_CAP)) {
      return false;
    }
    tx.set(rRef, { count: rCount + 1 }, { merge: true });
    if (aRef) tx.set(aRef, { count: aCount + 1 }, { merge: true });
    return true;
  });
}

exports.sendPushNotification = onDocumentCreated(
  "pending-notifications/{notifId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const notif = snap.data();

    if (notif.sent) return;

    try {
      const withinQuota = await checkQuota(notif);
      if (!withinQuota) {
        // Drop the spam silently — never deliver over-quota payloads.
        await snap.ref.delete();
        return;
      }

      const { tokens, privateSnap, legacySnap } = await loadTokens(
        notif.targetUserId
      );

      if (tokens.length === 0) {
        await snap.ref.update({ sent: true, reason: "no_tokens" });
        return;
      }

      const message = {
        notification: {
          title: notif.title || "Foundators",
          body: notif.body || "",
        },
        data: notif.data || {},
        tokens: tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (resp.error?.code === "messaging/registration-token-not-registered") {
          invalidTokens.push(tokens[idx]);
        }
      });

      if (invalidTokens.length > 0) {
        await pruneTokens(notif.targetUserId, invalidTokens, {
          privateSnap,
          legacySnap,
        });
      }

      await snap.ref.update({ sent: true, delivered: response.successCount });
    } catch (error) {
      console.error("Push notification error:", error);
      await snap.ref.update({ sent: true, error: error.message });
    }
  }
);
