'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';

export default function PushRegistrar() {
  const settings = useStore((s) => s.settings);
  const showToast = useStore((s) => s.showToast);
  const router = useRouter();
  const { notification } = useHaptics();

  const handleNotificationAction = useCallback((notification) => {
    const data = notification?.data || notification?.notification?.data || {};
    notification('success');
    if (data.type === 'message') {
      router.push(`/messages/${data.chatId || ''}`);
    } else if (data.type === 'post') {
      router.push(`/post/${data.postId || ''}`);
    } else if (data.type === 'profile') {
      router.push(`/profile/${data.userId || ''}`);
    } else {
      router.push('/notifications');
    }
  }, [notification, router]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!settings.pushNotifications) return;

    async function register() {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') {
          showToast('Push notifications permission denied');
          return;
        }
        await PushNotifications.register();

        PushNotifications.addListener('registration', (token) => {
          // Token received - would send to backend
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          showToast(`${notification.title || 'New notification'}`);
          notification('success');
        });

        PushNotifications.addListener('pushNotificationActionPerformed', handleNotificationAction);
      } catch {
        // Push not available on this platform
      }
    }
    register();
  }, [settings.pushNotifications, showToast, notification, handleNotificationAction]);

  return null;
}
