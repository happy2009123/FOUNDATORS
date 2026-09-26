'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Bell } from 'lucide-react';
import Logo, { Wordmark } from './Logo';
import { useStore } from '@/lib/store';

export default function TopBar() {
  const router = useRouter();
  const openDrawer = useStore((s) => s.openDrawer);
  const notifications = useStore((s) => s.notifications);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  return (
    <div className="sticky-header lg:hidden flex flex-none items-center justify-between px-5 pb-2.5 pt-3.5">
      <button
        onClick={openDrawer}
        aria-label="Open menu"
        className="flex h-[44px] w-[44px] items-center justify-center rounded-full text-gold-hi active:bg-linesoft"
      >
        <Menu size={20} strokeWidth={2} />
      </button>
      <button
        onClick={() => router.push('/home')}
        aria-label="Go to home"
        className="flex items-center gap-2.5"
      >
        <Logo size={24} />
        <Wordmark size="text-[16px]" />
      </button>
      <button
        onClick={() => router.push('/notifications')}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        className="relative flex h-[44px] w-[44px] items-center justify-center rounded-full text-gold-hi active:bg-linesoft"
      >
        <Bell size={20} strokeWidth={2} className={unreadCount > 0 ? 'bell-ring' : ''} />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-black bg-gold px-[3px] text-[10px] font-extrabold text-[#1a1300] badge-bounce">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
