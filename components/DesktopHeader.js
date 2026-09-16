'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Plus, Menu, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import Logo from '@/components/Logo';
import Avatar from '@/components/Avatar';

export default function DesktopHeader({ onMenuToggle }) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const unreadCount = useStore((s) => s.notifications.filter((n) => !n.read).length);

  function handleSearch(e) {
    e.preventDefault();
    if (searchVal.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchVal.trim())}`);
      setSearchVal('');
    }
  }

  return (
    <header className="hidden lg:flex fixed top-0 left-[240px] right-0 h-[60px] items-center gap-4 border-b border-linesoft bg-card/80 backdrop-blur-xl px-6 z-40">
      <div className="flex-1 max-w-[480px]">
        <form onSubmit={handleSearch} className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2 transition-all ${
          searchFocused ? 'border-gold ring-[3px] ring-gold/10 bg-white/[0.04]' : 'border-linesoft bg-white/[0.02]'
        }`}>
          <Search size={16} className="text-text3 flex-none" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search people, posts, tags..."
            className="w-full bg-transparent text-[13px] text-white placeholder:text-text3 focus:outline-none"
          />
        </form>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/create')}
          className="flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2 text-[13px] font-bold text-[#1a1300] active:scale-[0.97]"
        >
          <Plus size={16} strokeWidth={2.5} />
          Create
        </button>
        <button
          onClick={() => router.push('/notifications')}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/5 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={20} className="text-text2" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white">{unreadCount}</span>
          )}
        </button>
        <button
          onClick={() => router.push('/profile')}
          className="ml-1"
          aria-label="Profile"
        >
          <Avatar src={profile.avatar} name={profile.name} size={32} />
        </button>
      </div>
    </header>
  );
}
