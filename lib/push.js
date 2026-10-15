'use client';

// Web Push: subscribe the device, save the subscription (RLS own-only row
// in push_subscriptions), refresh silently on later sign-ins. Delivery
// happens server-side in /api/push/send via web-push + VAPID.

import { getSupabase, isSupabaseConfigured } from './supabase/client';
import { toRow, randomId } from './supabase/db';
import { useStore } from './store';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    !!VAPID_PUBLIC
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export async function enablePushNotifications() {
  if (!isPushSupported()) return { ok: false, error: 'unsupported' };
  if (!isSupabaseConfigured()) return { ok: false, error: 'not-configured' };
  try {
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    if (perm !== 'granted') return { ok: false, error: 'denied' };
    const reg = await navigator.serviceWorker.register('/sw.js');
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }
    const uid = useStore.getState().profile?.id;
    if (!uid) return { ok: false, error: 'signed-out' };
    const { error } = await getSupabase()
      .from('push_subscriptions')
      .upsert(
        toRow({ id: randomId(), userId: uid, endpoint: sub.endpoint, subscription: sub.toJSON() }),
        { onConflict: 'endpoint' }
      );
    if (error) return { ok: false, error: error.message };
    useStore.getState().updateSettings?.({ pushNotifications: true });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e && e.message) || 'subscribe-failed' };
  }
}

export async function disablePushNotifications() {
  if (!isPushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      if (isSupabaseConfigured() && getSupabase()) {
        await getSupabase().from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
      await sub.unsubscribe();
    }
    useStore.getState().updateSettings?.({ pushNotifications: false });
  } catch (e) {
    // best-effort cleanup
  }
}

// Silent re-subscribe on sign-in when permission was already granted
// (endpoints can rotate between visits; the upsert keeps the row fresh).
export async function resubscribeIfGranted() {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  try {
    await enablePushNotifications();
  } catch (e) {
    // never surface
  }
}
