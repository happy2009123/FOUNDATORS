'use client';

import { useState, useEffect, useCallback } from 'react';
import { isFirebaseConfigured } from '@/lib/firebase';

const TOKEN_KEY = 'foundators_fcm_token';

function getStoredToken() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {}
}

export function usePushNotifications() {
  const [token, setToken] = useState(getStoredToken);
  const [permission, setPermission] = useState(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'default';
    }
    return Notification.permission;
  });

  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  useEffect(() => {
    if (!isSupported) return;
    setPermission(Notification.permission);
  }, [isSupported]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return null;
    if (!isFirebaseConfigured) return null;

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') return null;

      const [{ getMessaging }, { getToken }] = await Promise.all([
        import('firebase/messaging'),
        import('firebase/messaging'),
      ]);

      let messaging;
      try {
        messaging = getMessaging();
      } catch {
        return null;
      }

      const fcmToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });

      if (fcmToken) {
        setToken(fcmToken);
        setStoredToken(fcmToken);
      }

      return fcmToken;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[PushNotifications]', err);
      }
      return null;
    }
  }, [isSupported]);

  return { token, permission, isSupported, requestPermission };
}
