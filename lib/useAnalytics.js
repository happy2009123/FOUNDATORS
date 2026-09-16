'use client';

import { useCallback, useRef, useEffect } from 'react';
import { isFirebaseConfigured } from '@/lib/firebase';

let analyticsInstance = null;

async function getAnalyticsInstance() {
  if (analyticsInstance) return analyticsInstance;
  if (!isFirebaseConfigured) return null;
  if (typeof window === 'undefined') return null;

  try {
    const [{ getAnalytics }, app] = await Promise.all([
      import('firebase/analytics'),
      import('@/lib/firebase'),
    ]);
    analyticsInstance = getAnalytics(app.default);
    return analyticsInstance;
  } catch {
    return null;
  }
}

export function useAnalytics() {
  const readyRef = useRef(false);

  useEffect(() => {
    if (readyRef.current) return;
    getAnalyticsInstance().then(() => {
      readyRef.current = true;
    });
  }, []);

  const track = useCallback(async (eventName, params) => {
    try {
      const analytics = await getAnalyticsInstance();
      if (!analytics) return;
      const { logEvent } = await import('firebase/analytics');
      logEvent(analytics, eventName, params);
    } catch {}
  }, []);

  const trackPageView = useCallback(
    (pageName) => track('page_view', { page_name: pageName }),
    [track]
  );

  const trackPostCreated = useCallback(
    () => track('post_created'),
    [track]
  );

  const trackUserSignUp = useCallback(
    (method) => track('sign_up', { method }),
    [track]
  );

  const trackUserLogin = useCallback(
    (method) => track('login', { method }),
    [track]
  );

  const trackMessageSent = useCallback(
    () => track('message_sent'),
    [track]
  );

  const trackFollow = useCallback(
    (targetUserId) => track('follow', { target_user_id: targetUserId }),
    [track]
  );

  const trackSearch = useCallback(
    (query) => track('search', { search_term: query }),
    [track]
  );

  const trackShare = useCallback(
    (contentType, contentId) =>
      track('share', { content_type: contentType, content_id: contentId }),
    [track]
  );

  return {
    track,
    trackPageView,
    trackPostCreated,
    trackUserSignUp,
    trackUserLogin,
    trackMessageSent,
    trackFollow,
    trackSearch,
    trackShare,
  };
}
