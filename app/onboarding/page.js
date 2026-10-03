'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { auth } from '@/lib/firebase';
import Onboarding from '@/components/Onboarding';
import AuthSkeleton from '@/components/AuthSkeleton';

export default function OnboardingPage() {
  const router = useRouter();
  const authReady = useStore((s) => s.authReady);
  const isLoggedIn = useStore((s) => s.isLoggedIn);

  useEffect(() => {
    // auth?.currentUser keeps a just-signed-in user off /login even if
    // the store has not caught up yet (same guard as useRequireAuth).
    if (authReady && !isLoggedIn && !auth?.currentUser) {
      router.replace('/login');
    }
  }, [authReady, isLoggedIn, router]);

  if (!authReady) return <AuthSkeleton />;
  if (!isLoggedIn) return null;

  return <Onboarding />;
}
