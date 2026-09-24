'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Film, Plus, MessageCircle, User } from 'lucide-react';
import { useHaptics } from '@/lib/useHaptics';

const TABS = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/reels', icon: Film, label: 'Reels' },
  { href: '__create__', icon: Plus, label: 'Create' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { vibrate } = useHaptics();

  return (
    <nav
      aria-label="Main navigation"
      className="safe-bottom fixed bottom-0 left-0 right-0 z-[70] flex flex-none items-end justify-between border-t border-linesoft bg-black/95 backdrop-blur-md px-[22px] pb-1.5 pt-2 lg:hidden"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)' }}
    >
      {TABS.map((tab) => {
        if (tab.href === '__create__') {
          return (
            <div key="create" className="-mt-[22px] flex flex-1 justify-center">
              <button
                onClick={() => { router.push('/create'); vibrate('medium'); }}
                className="flex h-[54px] w-[54px] items-center justify-center rounded-full border-4 border-black bg-gold-grad text-[#1a1300] shadow-[0_6px_18px_rgba(184,134,11,0.5)]"
              >
                <Plus size={24} />
              </button>
            </div>
          );
        }
        const Icon = tab.icon;
        const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
        return (
          <button
            key={tab.href}
            onClick={() => router.push(tab.href)}
            aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-1.5 text-[10.5px] font-bold ${
              active ? 'text-gold drop-shadow-[0_0_6px_rgba(217,172,61,0.6)]' : 'text-text3'
            }`}
          >
            <Icon size={22} strokeWidth={2} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
