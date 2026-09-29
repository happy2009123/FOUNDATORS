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

// The admin console renders its own desktop frame (sidebar + header);
// the consumer chrome must not double up on /admin routes.
const ADMIN = '/admin';

export default function DesktopShell({ children }) {
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const pathname = usePathname() || '';
  const immersive = IMMERSIVE.some((p) => pathname === p || pathname.startsWith(p + '/'));
  const isAdminRoute = pathname === ADMIN || pathname.startsWith(ADMIN + '/');
  // The copilot workspace runs its own right panel (project/task context),
  // and the Voice section renders its own categories/stats rail, so the
  // consumer right rail is dropped on both to avoid double panels.
  const noRail =
    pathname === '/copilot' ||
    pathname.startsWith('/copilot/') ||
    pathname === '/voice' ||
    pathname.startsWith('/voice/');

  if (!isLoggedIn || isAdminRoute) return null;

  return (
    <>
      <DesktopSidebar />
      <DesktopHeader />
      {!immersive && !noRail && <DesktopRightPanel />}
    </>
  );
}
