'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, VolumeX, Ban, Search } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import Avatar from '@/components/Avatar';
import AuthSkeleton from '@/components/AuthSkeleton';
import { useRequireAuth } from '@/lib/useRequireAuth';

export default function BlockedMutedPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const { vibrate } = useHaptics();
  const showToast = useStore((s) => s.showToast);
  const blockedUsers = useStore((s) => s.blockedUsers);
  const [tab, setTab] = useState('blocked');
  const [search, setSearch] = useState('');

  const blockedList = Object.keys(blockedUsers).filter((k) => blockedUsers[k]);
  const mutedList = [];

  const list = tab === 'blocked' ? blockedList : mutedList;

  if (!ready) return <AuthSkeleton />;

  return (
    <div className="app-shell flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-linesoft px-4 py-3">
        <button onClick={() => router.back()} className="h-8 w-8 flex items-center justify-center" aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[16px] font-bold">Blocked & Muted</h1>
      </div>

      <div className="flex border-b border-linesoft">
        <button
          onClick={() => setTab('blocked')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-bold transition-colors ${tab === 'blocked' ? 'text-gold border-b-2 border-gold' : 'text-text3'}`}
        >
          <Ban size={13} /> Blocked ({blockedList.length})
        </button>
        <button
          onClick={() => setTab('muted')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-bold transition-colors ${tab === 'muted' ? 'text-gold border-b-2 border-gold' : 'text-text3'}`}
        >
          <VolumeX size={13} /> Muted ({mutedList.length})
        </button>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-2xl border border-linesoft bg-card px-4 py-2.5">
          <Search size={14} className="text-text3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1 bg-transparent text-[13px] text-white placeholder:text-text3 focus:outline-none"
            aria-label="Search users"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-2">
        {list.map((key) => (
          <div key={key} className="flex items-center gap-3 rounded-2xl border border-linesoft bg-card p-3.5">
            <Avatar src={null} name={key} size={44} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[13px] font-bold">{key}</span>
              </div>
              <div className="text-[11px] text-text2">Blocked user</div>
            </div>
            <button
              onClick={() => {
                vibrate('light');
                showToast(tab === 'blocked' ? `Unblocked ${key}` : `Unmuted ${key}`);
              }}
              className="rounded-full border border-linesoft px-4 py-2 text-[11px] font-bold text-text2"
            >
              {tab === 'blocked' ? 'Unblock' : 'Unmute'}
            </button>
          </div>
        ))}
        {list.length === 0 && (
          <div className="py-12 text-center">
            <div className="text-[14px] font-bold text-text2">
              {tab === 'blocked' ? 'No blocked users' : 'No muted users'}
            </div>
            <div className="mt-1 text-[12px] text-text3">
              {tab === 'blocked' ? 'Blocked users will appear here' : 'Muted users will appear here'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
