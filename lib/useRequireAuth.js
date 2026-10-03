'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from './store';
import { useHydration } from './useHydration';
import { auth } from './firebase';

export function useRequireAuth() {
  const router = useRouter();
  const hydrated = useHydration();
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const authReady = useStore((s) => s.authReady);

  useEffect(() => {
    // Never bounce to /login while Firebase still holds a live session:
    // auth.currentUser is set synchronously the moment a sign-in (or a
    // restored session) exists, even if the store has not caught up yet.
    // This is what killed the login -> home -> login loop after a re-login.
    if (hydrated && authReady && !isLoggedIn && !auth?.currentUser) {
      router.replace('/login');
    }
  }, [hydrated, authReady, isLoggedIn, router]);

  if (!hydrated || !authReady) return null;
  return isLoggedIn;
}
