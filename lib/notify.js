'use client';

/**
 * Notification fan-out. Every producer (likes, comments, follows, chat
 * messages, admin actions) calls notifyUser(userId, ...):
 *
 *   1. createNotification inserts an in-app notification row - hydrated
 *      live over Supabase realtime into store.notifications and shown by
 *      the TopBar/Drawer bell and /notifications page.
 *   2. /api/push/send mirrors it as a device Web Push to every push
 *      subscription the recipient has registered (see lib/push.js).
 *      Best-effort: failures never affect the in-app notification.
 */
export async function notifyUser(userId, { type, actorName, actorKey, text, linkType, linkId }) {
  try {
    const { createNotification } = await import('./firestore');
    const res = await createNotification(userId, {
      type,
      actorKey,
      actorName,
      text,
      linkType,
      linkId,
    });

    // Device push mirror - fire-and-forget, never blocks the caller.
    const notificationId = res && res.success ? res.data : null;
    if (notificationId) {
      try {
        fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId }),
        }).catch(() => {});
      } catch (e) {
        // non-fatal
      }
    }
  } catch (e) {
    // Silent fail
  }
}

// Legacy Firebase names kept as no-ops so old imports don't break.
export async function sendPushNotification() {}
export async function getUserFCMTokens() {
  return [];
}
