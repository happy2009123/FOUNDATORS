'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from './store';
import { useHydration } from './useHydration';

export function useRequireAuth() {
  const router = useRouter();
  const hydrated = useHydration();
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const authReady = useStore((s) => s.authReady);

  useEffect(() => {
    if (hydrated && authReady && !isLoggedIn) {
      router.replace('/login');
    }
  }, [hydrated, authReady, isLoggedIn, router]);

  if (!hydrated || !authReady) return null;
  return isLoggedIn;
}
