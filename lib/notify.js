'use client';

/**
 * Send push notification to a user.
 * Firebase Cloud Messaging was retired with the Firebase migration
 * (see components/PushRegistrar.js — intentionally a no-op): there is no
 * push transport or token store during the Supabase migration, so this is
 * best-effort and does nothing. A future web-push implementation restores it.
 *
 * In-app notifications (what the user actually sees) are created by
 * notifyUser → createNotification and delivered over Supabase realtime.
 */
export async function sendPushNotification(targetUserId, { title, body, data }) {
  // No push transport during the Supabase migration — silent no-op.
}

/**
 * Get a user's push tokens.
 * No FCM/token column exists on profiles (FCM retired) — always [].
 */
export async function getUserFCMTokens(userId) {
  return [];
}

/**
 * Send notification to user (in-app + push)
 * This is the main function to call from store actions
 */
export async function notifyUser(userId, { type, actorName, actorKey, text, linkType, linkId }) {
  try {
    // 1. Create in-app notification
    const { createNotification } = await import('./firestore');
    await createNotification(userId, {
      type,
      actorKey,
      actorName,
      text,
      linkType,
      linkId,
    });

    // 2. Queue push notification (no-op during the Supabase migration)
    const title = 'Foundators';
    const body = text;
    const pushData = { type, linkType, linkId, userId: actorKey };

    await sendPushNotification(userId, { title, body, data: pushData });
  } catch (e) {
    // Silent fail
  }
}
