'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from './store';
import { useHydration } from './useHydration';

export function useRequireAuth() {
  const router = useRouter();
  const hydrated = useHydration();
  const isLoggedIn = useStore((s) => s.isLoggedIn);

  useEffect(() => {
    if (hydrated && !isLoggedIn) {
      router.replace('/login');
    }
  }, [hydrated, isLoggedIn, router]);

  if (!hydrated) return null;
  return isLoggedIn;
}
