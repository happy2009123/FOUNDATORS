'use client';

import { useRequireAuth } from '@/lib/useRequireAuth';
import BottomNav from '@/components/BottomNav';
import PageTransition from '@/components/PageTransition';

export default function MainScreenShell({ children }) {
  const ready = useRequireAuth();

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <div className="no-scrollbar flex-1 overflow-y-auto pb-[60px] lg:pb-0">
        {ready ? (
          <PageTransition>{children}</PageTransition>
        ) : (
          <div className="px-[18px] pt-4 animate-pulse">
            <div className="skeleton mb-3 h-10 w-full rounded-2xl" />
            <div className="skeleton mb-3 h-24 w-full rounded-2xl" />
            <div className="skeleton mb-3 h-16 w-full rounded-2xl" />
            <div className="skeleton mb-3 h-16 w-full rounded-2xl" />
          </div>
        )}
      </div>
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
