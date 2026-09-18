'use client';

import { useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

export function useHaptics() {
  const isNativeRef = useRef(null);
  if (isNativeRef.current === null) {
    isNativeRef.current = Capacitor.isNativePlatform();
  }
  const isNative = isNativeRef.current;

  const vibrate = useCallback(async (style = 'medium') => {
    if (!isNative) return;
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      const map = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      };
      await Haptics.impact({ style: map[style] || ImpactStyle.Medium });
    } catch {}
  }, [isNative]);

  const notification = useCallback(async (type = 'success') => {
    if (!isNative) return;
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      const map = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error,
      };
      await Haptics.notification({ type: map[type] || NotificationType.Success });
    } catch {}
  }, [isNative]);

  const tap = useCallback(() => vibrate('light'), [vibrate]);
  const like = useCallback(() => vibrate('medium'), [vibrate]);
  const follow = useCallback(() => vibrate('medium'), [vibrate]);
  const submit = useCallback(() => vibrate('heavy'), [vibrate]);
  const send = useCallback(() => vibrate('heavy'), [vibrate]);
  const success = useCallback(() => notification('success'), [notification]);
  const error = useCallback(() => notification('error'), [notification]);

  return { vibrate, notification, tap, like, follow, submit, send, success, error };
}
