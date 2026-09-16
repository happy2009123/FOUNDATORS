'use client';

import { useEffect } from 'react';
import { useHydration } from '@/lib/useHydration';
import { useStore } from '@/lib/store';
import { useSecurityAudit } from '@/lib/useSecurityAudit';
import { initErrorTracking } from '@/lib/errorTracking';
import { syncProfileToFirestore } from '@/lib/useFirestore';
import DesktopShell from '@/components/DesktopShell';
import Toast from '@/components/Toast';
import Drawer from '@/components/Drawer';
import OfflineBanner from '@/components/OfflineBanner';
import PushRegistrar from '@/components/PushRegistrar';
import CookieBanner from '@/components/CookieBanner';
import SkipToContent from '@/components/SkipToContent';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';

export default function Providers({ children }) {
  useHydration();
  useSecurityAudit();
  const theme = useStore((s) => s.theme);
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const sessionExpiry = useStore((s) => s.sessionExpiry);
  const logout = useStore((s) => s.logout);

  useEffect(() => {
    initErrorTracking();
  }, []);

  // System-aware theme detection
  useEffect(() => {
    if (theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = document.documentElement;
      root.classList.remove('theme-dark', 'theme-light');
      root.classList.add(mediaQuery.matches ? 'theme-dark' : 'theme-light');
      root.setAttribute('data-theme', mediaQuery.matches ? 'dark' : 'light');
    };
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  useEffect(() => {
    if (theme === 'system') return;
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light');
    root.classList.add(`theme-${theme}`);
    root.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!isLoggedIn || !sessionExpiry) return;
    const remaining = sessionExpiry - Date.now();
    if (remaining <= 0) {
      logout();
      return;
    }
    const timer = setTimeout(() => logout(), remaining);
    return () => clearTimeout(timer);
  }, [isLoggedIn, sessionExpiry, logout]);

  // Sync profile to Firestore when logged in
  const profile = useStore((s) => s.profile);
  useEffect(() => {
    if (isLoggedIn && profile?.id) {
      syncProfileToFirestore(profile).catch(() => {});
    }
  }, [isLoggedIn, profile?.name, profile?.handle, profile?.bio, profile?.avatar]);

  return (
    <>
      <SkipToContent />
      <KeyboardShortcuts />
      <OfflineBanner />
      <PushRegistrar />
      <DesktopShell />
      <div id="main-content">
        {children}
      </div>
      <Drawer />
      <Toast />
      <CookieBanner />
    </>
  );
}
