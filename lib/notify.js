'use client';

import { db } from './firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

/**
 * Send push notification to a user.
 * Stores a pending notification in Firestore.
 * A Cloud Function (or external service) should pick these up and send via FCM Admin SDK.
 *
 * For now, this also creates in-app notifications which the user sees immediately.
 */
export async function sendPushNotification(targetUserId, { title, body, data }) {
  try {
    // 1. Create in-app notification (already handled by createNotification)
    // 2. Store push payload for external processing
    await addDoc(collection(db, 'pending-notifications'), {
      targetUserId,
      title,
      body,
      data: data || {},
      sent: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    // Silent fail — push is best-effort
  }
}

/**
 * Get a user's FCM tokens from Firestore
 */
export async function getUserFCMTokens(userId) {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists()) return [];
    const data = userSnap.data();
    return data.fcmTokens || [];
  } catch {
    return [];
  }
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

    // 2. Queue push notification
    const title = 'Foundators';
    const body = text;
    const pushData = { type, linkType, linkId, userId: actorKey };

    await sendPushNotification(userId, { title, body, data: pushData });
  } catch (e) {
    // Silent fail
  }
}
