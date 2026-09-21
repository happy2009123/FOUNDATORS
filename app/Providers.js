'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useHydration } from '@/lib/useHydration';
import { useStore } from '@/lib/store';
import { useSecurityAudit } from '@/lib/useSecurityAudit';
import { initErrorTracking } from '@/lib/errorTracking';
import { useAuthInit } from '@/lib/useAuthInit';
import FirestoreProvider from './FirestoreProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import DesktopShell from '@/components/DesktopShell';
import Toast from '@/components/Toast';
import Drawer from '@/components/Drawer';
import OfflineBanner from '@/components/OfflineBanner';
import PushRegistrar from '@/components/PushRegistrar';
import CookieBanner from '@/components/CookieBanner';
import SkipToContent from '@/components/SkipToContent';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

export default function Providers({ children }) {
  useHydration();
  useAuthInit();
  useSecurityAudit();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useStore((s) => s.theme);
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const authReady = useStore((s) => s.authReady);
  const profileCompleted = useStore((s) => s.profileCompleted);

  useEffect(() => {
    initErrorTracking();
  }, []);

  useEffect(() => {
    if (!authReady || !isLoggedIn) return;
    const skip = ['/login', '/signup', '/onboarding', '/forgot-password'].some(p => pathname.startsWith(p));
    if (!skip && !profileCompleted) {
      router.replace('/onboarding');
    }
  }, [authReady, isLoggedIn, profileCompleted, pathname, router]);

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

  return (
    <ErrorBoundary>
      <FirestoreProvider>
        <SkipToContent />
        <EmailVerificationBanner />
        <KeyboardShortcuts />
        <OfflineBanner />
        <PushRegistrar />
        <DesktopShell />
        <div id="main-content">{children}</div>
        <Drawer />
        <Toast />
        <CookieBanner />
        <PWAInstallPrompt />
      </FirestoreProvider>
    </ErrorBoundary>
  );
}
