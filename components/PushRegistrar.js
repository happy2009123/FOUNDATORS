'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { isFirebaseConfigured, isMessagingConfigured } from '@/lib/firebase';

export default function PushRegistrar() {
  const settings = useStore((s) => s.settings);
  const profile = useStore((s) => s.profile);
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const showToast = useStore((s) => s.showToast);
  const router = useRouter();
  const { notification } = useHaptics();

  const handleNotificationAction = useCallback((data) => {
    if (data.type === 'message') {
      router.push(`/messages/${data.chatId || ''}`);
    } else if (data.type === 'post') {
      router.push(`/post/${data.postId || ''}`);
    } else if (data.type === 'profile' || data.type === 'follow') {
      router.push(`/profile/${data.userId || ''}`);
    } else {
      router.push('/notifications');
    }
  }, [router]);

  useEffect(() => {
    if (!isLoggedIn || !profile?.id || !settings.pushNotifications) return;
    if (!isMessagingConfigured) return;

    let messaging = null;

    async function registerWebPush() {
      try {
        // Check if browser supports notifications
        if (!('Notification' in window)) return;
        if (!('serviceWorker' in navigator)) return;

        // Request permission
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return;

        // Import Firebase messaging
        const { getMessaging, getToken } = await import('firebase/messaging');
        messaging = getMessaging();

        // Register service worker and get token
        const reg = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined,
          serviceWorkerRegistration: reg,
        });

        if (token) {
          // Store FCM token in Firestore
          const { db } = await import('@/lib/firebase');
          const { doc, setDoc, arrayUnion, serverTimestamp } = await import('firebase/firestore');
          await setDoc(doc(db, 'users', profile.id), {
            fcmTokens: arrayUnion(token),
            lastTokenUpdate: serverTimestamp(),
          }, { merge: true });
        }

        // Listen for foreground messages
        const { onMessage } = await import('firebase/messaging');
        onMessage(messaging, (payload) => {
          const title = payload.notification?.title || 'Foundators';
          const body = payload.notification?.body || '';
          const data = payload.data || {};

          // Show in-app notification
          showToast(`${title}: ${body}`);

          // Also show browser notification if permitted
          if (Notification.permission === 'granted') {
            new Notification(title, {
              body,
              icon: '/icon-192.png',
              data,
              tag: data.type || 'default',
            });
          }
        });
      } catch (err) {
        // Push not available on this platform or config missing
      }
    }

    async function registerCapacitorPush() {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } = await import('@capacitor/push-notifications');
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') return;

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token) => {
          if (token.value) {
            const { db } = await import('@/lib/firebase');
            const { doc, setDoc, arrayUnion, serverTimestamp } = await import('firebase/firestore');
            await setDoc(doc(db, 'users', profile.id), {
              fcmTokens: arrayUnion(token.value),
              lastTokenUpdate: serverTimestamp(),
            }, { merge: true });
          }
        });

        PushNotifications.addListener('pushNotificationReceived', (pushNotification) => {
          showToast(pushNotification.title || 'New notification');
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const data = action.notification?.data || {};
          handleNotificationAction(data);
        });
      } catch (err) {
        // Not on Capacitor
      }
    }

    registerWebPush();
    registerCapacitorPush();

    return () => {
      if (messaging) {
        // Cleanup if needed
      }
    };
  }, [isLoggedIn, profile?.id, settings.pushNotifications, showToast, handleNotificationAction]);

  return null;
}
