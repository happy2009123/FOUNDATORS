'use client';

import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import BottomNav from '@/components/BottomNav';

const HIDE_NAV = ['/login', '/signup', '/onboarding', '/forgot-password', '/verify', '/stories/create', '/reels/create', '/messages/'];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  if (!isLoggedIn) return null;
  if (HIDE_NAV.some((p) => pathname.startsWith(p))) return null;
  return <BottomNav />;
}