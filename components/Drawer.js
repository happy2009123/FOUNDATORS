'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Home,
  Compass,
  MessageCircle,
  Bell,
  Bookmark,
  Settings,
  HelpCircle,
  LogOut,
  Sparkles,
  Gift,
  BarChart3,
  FileText,
  CompassIcon,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import Avatar from './Avatar';
import ThemeToggle from './ThemeToggle';

export default function Drawer() {
  const router = useRouter();
  const isOpen = useStore((s) => s.isDrawerOpen);
  const closeDrawer = useStore((s) => s.closeDrawer);
  const logout = useStore((s) => s.logout);
  const profile = useStore((s) => s.profile);
  const notifications = useStore((s) => s.notifications);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const showToast = useStore((s) => s.showToast);

  const go = useCallback((path) => {
    closeDrawer();
    router.push(path);
  }, [closeDrawer, router]);

  const handleLogout = useCallback(() => {
    closeDrawer();
    logout();
    showToast('Logged out');
    router.push('/login');
  }, [closeDrawer, logout, showToast, router]);

  return (
    <>
      <div
        onClick={closeDrawer}
        className={`fixed inset-0 z-[300] bg-black/60 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        className={`fixed bottom-0 left-0 top-0 z-[301] flex w-[76%] max-w-[290px] flex-col overflow-y-auto border-r border-line bg-gradient-to-b from-[#0c0c0c] to-black transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-end p-3 pt-4">
          <button
            onClick={closeDrawer}
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-gold"
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>

        <button
          onClick={() => go('/profile')}
          className="flex items-center gap-3 border-b border-linesoft px-5 pb-[18px] pt-1 text-left"
        >
          <Avatar src={profile.avatar} name={profile.name} size={50} />
          <div>
            <div className="text-[14.5px] font-extrabold">{profile.name}</div>
            <div className="text-[11.5px] text-text2">{profile.handle} · View profile</div>
          </div>
        </button>

        <nav className="flex flex-col py-1 stagger-fade">
          <DrawerLink icon={<Home size={19} />} label="Home" onClick={() => go('/home')} />
          <DrawerLink icon={<Compass size={19} />} label="Explore" onClick={() => go('/explore')} />
          <DrawerLink icon={<Sparkles size={19} />} label="Foundators Match" onClick={() => go('/match')} />
          <DrawerLink icon={<BarChart3 size={19} />} label="Analytics" onClick={() => go('/analytics')} />
          <DrawerLink icon={<FileText size={19} />} label="Drafts" onClick={() => go('/drafts')} />
          <DrawerLink icon={<Gift size={19} />} label="Gestures" onClick={() => go('/gestures')} />
          <DrawerLink icon={<MessageCircle size={19} />} label="Messages" onClick={() => go('/messages')} />
          <DrawerLink
            icon={<Bell size={19} />}
            label="Notifications"
            badge={unreadCount > 0 ? unreadCount : null}
            onClick={() => go('/notifications')}
          />
          <DrawerLink
            icon={<Bookmark size={19} />}
            label="Saved"
            onClick={() => go('/bookmarks')}
          />
          <DrawerLink icon={<Settings size={19} />} label="Settings" onClick={() => go('/settings')} />
          <div className="flex items-center justify-between px-5 py-2.5">
            <span className="text-[13.8px] font-semibold text-text2">Dark mode</span>
            <ThemeToggle />
          </div>
          <DrawerLink icon={<HelpCircle size={19} />} label="Help & Support" onClick={() => go('/help')} />

          <div className="mt-auto border-t border-linesoft pt-1.5">
            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="flex w-full items-center gap-3.5 px-5 py-3 text-left text-[13.8px] font-semibold text-brandred"
            >
              <LogOut size={19} />
              Log Out
            </button>
          </div>
        </nav>
      </div>
    </>
  );
}

function DrawerLink({ icon, label, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex w-full items-center gap-3.5 px-5 py-[15px] text-left text-[13.8px] font-semibold text-text2 active:bg-linesoft active:text-white"
    >
      <span className="text-gold">{icon}</span>
      {label}
      {badge ? (
        <span className="ml-auto rounded-full bg-gold px-[7px] py-0.5 text-[10px] font-extrabold text-[#1a1300]">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
