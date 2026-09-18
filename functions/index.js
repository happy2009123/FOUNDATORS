const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendPushNotification = onDocumentCreated(
  "pending-notifications/{notifId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const notif = snap.data();

    if (notif.sent) return;

    try {
      const userDoc = await admin.firestore().doc(`users/${notif.targetUserId}`).get();
      const tokens = userDoc.data()?.fcmTokens || [];

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
        await admin.firestore().doc(`users/${notif.targetUserId}`).update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
        });
      }

      await snap.ref.update({ sent: true, delivered: response.successCount });
    } catch (error) {
      console.error("Push notification error:", error);
      await snap.ref.update({ sent: true, error: error.message });
    }
  }
);
