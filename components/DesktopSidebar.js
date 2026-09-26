'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Home, Compass, Film, MessageCircle, Bell, Bookmark, User, Plus, Search, Settings, LogOut, TrendingUp, BarChart3, Lightbulb, Users, Briefcase, Sparkles } from 'lucide-react';
import Avatar from '@/components/Avatar';
import Logo from '@/components/Logo';

const NAV_ITEMS = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Compass, label: 'Explore', path: '/explore' },
  { icon: Film, label: 'Reels', path: '/reels' },
  { icon: MessageCircle, label: 'Messages', path: '/messages' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks' },
  { icon: TrendingUp, label: 'Trending', path: '/discover' },
  { icon: Users, label: 'Programmers', path: '/programmers' },
  { icon: Briefcase, label: 'Opportunities', path: '/opportunities' },
  { icon: Lightbulb, label: 'Ideas', path: '/ideas' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const logout = useStore((s) => s.logout);
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const unreadCount = useStore((s) => s.notifications.filter((n) => !n.read).length);

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[240px] flex-col border-r border-linesoft bg-card z-50">
      <div className="px-5 pt-5 pb-4">
        <button onClick={() => router.push('/home')} aria-label="Go to home" className="block cursor-pointer">
          <Logo size={32} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.path || pathname?.startsWith(item.path + '/');
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex w-full items-center gap-3.5 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all ${
                active
                  ? 'bg-gold/10 text-gold font-bold'
                  : 'text-text2 hover:bg-white/5 hover:text-text1'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
              <span>{item.label}</span>
              {item.label === 'Messages' && (
                <span className="ml-auto h-5 min-w-[20px] rounded-full bg-gold px-1.5 flex items-center justify-center text-[11px] font-bold text-[#1a1300]">3</span>
              )}
              {item.label === 'Notifications' && unreadCount > 0 && (
                <span className="ml-auto h-5 min-w-[20px] rounded-full bg-red px-1.5 flex items-center justify-center text-[11px] font-bold text-white">{unreadCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-linesoft p-3">
        <button
          onClick={() => router.push('/create')}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-[14px] font-extrabold text-[#1a1300] shadow-[0_4px_16px_-4px_rgba(184,134,11,0.5)] active:scale-[0.97]"
        >
          <Plus size={18} strokeWidth={2.5} />
          Create Post
        </button>
      </div>

      {isLoggedIn && (
        <div className="border-t border-linesoft p-3">
          <button
            onClick={() => router.push('/profile')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
          >
            <Avatar src={profile.avatar} name={profile.name} size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold truncate">{profile.name}</div>
              <div className="text-[11px] text-text2 truncate">{profile.handle}</div>
            </div>
          </button>
        </div>
      )}
    </aside>
  );
}
