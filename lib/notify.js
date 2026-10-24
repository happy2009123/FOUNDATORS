'use client';

/**
 * Notification fan-out. Every producer (likes, comments, follows, chat
 * messages, admin actions) calls notifyUser(userId, ...):
 *
 *   1. The recipient's notification preferences (settings page →
 *      user_settings.settings.notifications) are checked first — a type the
 *      recipient turned off is skipped entirely (in-app row AND push).
 *      Quiet hours suppress only the device push; the in-app row is kept.
 *   2. createNotification inserts an in-app notification row - hydrated
 *      live over Supabase realtime into store.notifications and shown by
 *      the TopBar/Drawer bell and /notifications page.
 *   3. /api/push/send mirrors it as a device Web Push to every push
 *      subscription the recipient has registered (see lib/push.js).
 *      Best-effort: failures never affect the in-app notification.
 */

// Notification type → preference key on the notification settings page.
// Types without a key (voice_*, collab, system, …) are always delivered.
const PREF_KEY_BY_TYPE = {
  like: 'likes',
  comment: 'comments',
  follow: 'follows',
  mention: 'mentions',
  message: 'messages',
  story_reply: 'storyReplies',
  share: 'postShares',
};

// Module-level cache for the DB fallback (avoids a user_settings read per
// notification). The Zustand store is always consulted first — it's sync
// and fresher right after the user saves preferences.
let dbPrefsCache = { uid: null, prefs: null, at: 0 };
const DB_PREFS_TTL_MS = 60_000;

async function getNotifPrefs(userId) {
  // Fast path: in-session settings mirror (set by the settings page save).
  try {
    const { useStore } = await import('./store');
    const sp = useStore.getState()?.settings?.notifications;
    if (sp) return sp;
  } catch {}

  const now = Date.now();
  if (dbPrefsCache.uid === userId && dbPrefsCache.prefs && now - dbPrefsCache.at < DB_PREFS_TTL_MS) {
    return dbPrefsCache.prefs;
  }
  try {
    const { getSupabase } = await import('./supabase/client');
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .maybeSingle();
      const prefs = data?.settings?.notifications || null;
      dbPrefsCache = { uid: userId, prefs, at: now };
      return prefs;
    }
  } catch {}
  return null;
}

// Local-time quiet-hours window check ("HH:MM" strings, window may wrap
// midnight, e.g. 22:00 → 08:00).
function inQuietHours(prefs) {
  if (!prefs?.quietHoursEnabled || !prefs.quietHoursStart || !prefs.quietHoursEnd) return false;
  const [sh, sm] = String(prefs.quietHoursStart).split(':').map((n) => parseInt(n, 10));
  const [eh, em] = String(prefs.quietHoursEnd).split(':').map((n) => parseInt(n, 10));
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return false;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (start === end) return false;
  return start < end ? cur >= start && cur < end : cur >= start || cur < end;
}

export async function notifyUser(userId, { type, actorName, actorKey, text, linkType, linkId }) {
  try {
    const prefs = await getNotifPrefs(userId);

    // Honor the recipient's per-type opt-out (in-app + push).
    const prefKey = PREF_KEY_BY_TYPE[type];
    if (prefKey && prefs && prefs[prefKey] === false) return;

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
    // Quiet hours silence the device but keep the in-app row.
    const notificationId = res && res.success ? res.data : null;
    if (notificationId && !inQuietHours(prefs)) {
      try {
        // The route verifies the caller: only the actor (or recipient) of a
        // notification may fan it out, so attach the session token.
        let token = null;
        try {
          const { getSupabase } = await import('./supabase/client');
          const { data } = await getSupabase()?.auth.getSession();
          token = data?.session?.access_token || null;
        } catch {}
        fetch('/api/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
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
