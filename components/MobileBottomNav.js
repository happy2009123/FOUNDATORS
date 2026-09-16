'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Home, Compass, Film, Plus, MessageCircle, User } from 'lucide-react';

const TABS = [
  { icon: Home, path: '/home', label: 'Home' },
  { icon: Compass, path: '/explore', label: 'Explore' },
  { icon: Film, path: '/reels', label: 'Reels' },
  { icon: null, path: '/create', label: 'Create' },
  { icon: MessageCircle, path: '/messages', label: 'Messages' },
  { icon: User, path: '/profile', label: 'Profile' },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useStore((s) => s.profile);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] border-t border-linesoft bg-card/90 backdrop-blur-xl safe-bottom" role="navigation" aria-label="Main navigation">
      <div className="flex items-stretch">
        {TABS.map((tab) => {
          const active = pathname === tab.path || pathname?.startsWith(tab.path + '/');
          const Icon = tab.icon;

          if (tab.path === '/create') {
            return (
              <button
                key={tab.path}
                onClick={() => router.push(tab.path)}
                className="flex flex-1 flex-col items-center justify-center py-2.5 relative"
                aria-label="Create post"
              >
                <div className="flex h-[36px] w-[36px] items-center justify-center rounded-xl bg-gold-grad shadow-[0_4px_12px_-2px_rgba(184,134,11,0.6)]">
                  <Plus size={20} strokeWidth={2.8} className="text-[#1a1300]" />
                </div>
              </button>
            );
          }

          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className="flex flex-1 flex-col items-center justify-center py-2.5"
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              {tab.path === '/profile' ? (
                <div className={`h-[24px] w-[24px] overflow-hidden rounded-full border-2 transition-colors ${active ? 'border-gold' : 'border-transparent'}`}>
                  <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <Icon size={22} strokeWidth={active ? 2.2 : 1.4} className={active ? 'text-gold' : 'text-text2'} />
              )}
              {tab.label === 'Messages' && (
                <span className="absolute top-1.5 right-1/2 translate-x-4 h-4 min-w-[16px] rounded-full bg-gold px-1 flex items-center justify-center text-[9px] font-bold text-[#1a1300]">3</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
