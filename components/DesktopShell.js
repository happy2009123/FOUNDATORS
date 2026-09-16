'use client';

import { useStore } from '@/lib/store';
import DesktopSidebar from '@/components/DesktopSidebar';
import DesktopHeader from '@/components/DesktopHeader';

export default function DesktopShell({ children }) {
  const isLoggedIn = useStore((s) => s.isLoggedIn);

  if (!isLoggedIn) return null;

  return (
    <>
      <DesktopSidebar />
      <DesktopHeader />
    </>
  );
}
