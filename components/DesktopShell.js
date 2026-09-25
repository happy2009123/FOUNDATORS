'use client';

import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import DesktopSidebar from '@/components/DesktopSidebar';
import DesktopHeader from '@/components/DesktopHeader';
import DesktopRightPanel from '@/components/DesktopRightPanel';

// Full-screen routes. The feed rail is an overlay panel and would sit on top of
// immersive content, so it is dropped here and the stage is framed between the
// sidebar and the header instead (see .stage-frame / .fill-stage in globals.css).
// Note: /gestures itself is a normal browsing grid and keeps the rail - only the
// full-screen player at /gestures/view is immersive.
const IMMERSIVE = ['/reels', '/stories/create', '/gestures/view', '/onboarding'];

export default function DesktopShell({ children }) {
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const pathname = usePathname() || '';
  const immersive = IMMERSIVE.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (!isLoggedIn) return null;

  return (
    <>
      <DesktopSidebar />
      <DesktopHeader />
      {!immersive && <DesktopRightPanel />}
    </>
  );
}
