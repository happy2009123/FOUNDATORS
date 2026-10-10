'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from './store';
import { useHydration } from './useHydration';
import { getSupabase } from './supabase/client';

export function useRequireAuth() {
  const router = useRouter();
  const hydrated = useHydration();
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const authReady = useStore((s) => s.authReady);

  useEffect(() => {
    // Never bounce to /login while Supabase still holds a live session:
    // a synchronously-cached session exists the moment a sign-in (or a
    // restored session) is known, even if the store has not caught up yet.
    // This is what killed the login -> home -> login loop after a re-login.
    if (hydrated && authReady && !isLoggedIn) {
      // getSession() is cached client-side; a truthy result means the
      // session is live even if the zustand store hasn't caught up yet.
      getSupabase()
        ?.auth.getSession()
        .then(({ data }) => {
          if (!data?.session) router.replace('/login');
        })
        .catch(() => router.replace('/login'));
    }
  }, [hydrated, authReady, isLoggedIn, router]);

  if (!hydrated || !authReady) return null;
  return isLoggedIn;
}
