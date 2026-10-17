'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, VolumeX, Ban, Search, EyeOff } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import Avatar from '@/components/Avatar';
import AuthSkeleton from '@/components/AuthSkeleton';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { getUserProfile } from '@/lib/firestore';

export default function BlockedMutedPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const { vibrate } = useHaptics();
  const showToast = useStore((s) => s.showToast);
  const blockedUsers = useStore((s) => s.blockedUsers);
  const unblockUser = useStore((s) => s.unblockUser);
  const mutedUsers = useStore((s) => s.mutedUsers);
  const toggleMuteUser = useStore((s) => s.toggleMuteUser);
  const hiddenPosts = useStore((s) => s.hiddenPosts);
  const unhidePost = useStore((s) => s.unhidePost);
  const [tab, setTab] = useState('blocked');
  const [search, setSearch] = useState('');
  const [names, setNames] = useState({});

  const blockedList = Object.keys(blockedUsers).filter((k) => blockedUsers[k]);
  const mutedList = Object.keys(mutedUsers).filter((k) => mutedUsers[k]);
  const hiddenList = Object.entries(hiddenPosts || {})
    .filter(([, v]) => v)
    .sort((a, b) => (b[1]?.at || 0) - (a[1]?.at || 0));

  const userKeys = tab === 'blocked' ? blockedList : tab === 'muted' ? mutedList : [];
  const q = search.trim().toLowerCase();
  const list =
    tab === 'hidden'
      ? hiddenList.filter(
          ([, v]) =>
            !q ||
            (v?.text || '').toLowerCase().includes(q) ||
            (v?.authorName || '').toLowerCase().includes(q)
        )
      : userKeys.filter((k) => !q || k.toLowerCase().includes(q) || (names[k]?.name || '').toLowerCase().includes(q));

  // Resolve display names for the user lists (blocked/muted rows previously
  // rendered raw uid strings).
  useEffect(() => {
    if (!ready) return;
    const keys = (tab === 'blocked' ? blockedList : tab === 'muted' ? mutedList : [])
      .filter((k) => !names[k]);
    keys.slice(0, 30).forEach((k) => {
      getUserProfile(k).then((res) => {
        const u = res?.success ? res.data : null;
        if (u) setNames((prev) => ({ ...prev, [k]: u }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tab, blockedList.length, mutedList.length]);

  if (!ready) return <AuthSkeleton />;

  const TABS = [
    { key: 'blocked', label: 'Blocked', count: blockedList.length, icon: Ban },
    { key: 'muted', label: 'Muted', count: mutedList.length, icon: VolumeX },
    { key: 'hidden', label: 'Hidden', count: hiddenList.length, icon: EyeOff },
  ];

  return (
    <div className="app-shell flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-linesoft px-4 py-3">
        <button onClick={() => router.back()} className="h-8 w-8 flex items-center justify-center" aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[16px] font-bold">Blocked, Muted & Hidden</h1>
      </div>

      <div className="flex border-b border-linesoft">
        {TABS.map(({ key, label, count, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSearch(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-bold transition-colors ${tab === key ? 'text-gold border-b-2 border-gold' : 'text-text3'}`}
          >
            <Icon size={13} /> {label} ({count})
          </button>
        ))}
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-2xl border border-linesoft bg-card px-4 py-2.5">
          <Search size={14} className="text-text3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'hidden' ? 'Search hidden posts...' : 'Search...'}
            className="flex-1 bg-transparent text-[13px] text-white placeholder:text-text3 focus:outline-none"
            aria-label="Search list"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
        {tab === 'hidden'
          ? list.map(([postId, preview]) => (
              <div key={postId} className="flex items-start gap-3 rounded-2xl border border-linesoft bg-card p-3.5">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white/5 text-text2">
                  <EyeOff size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold">
                    {preview?.authorName || 'Hidden post'}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-[12px] text-text2">
                    {preview?.text || 'Post content hidden from your feed'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    vibrate('light');
                    unhidePost(postId);
                    showToast('Post restored to your feed');
                  }}
                  className="flex-none rounded-full border border-linesoft px-4 py-2 text-[11px] font-bold text-text2"
                >
                  Unhide
                </button>
              </div>
            ))
          : list.map((key) => (
              <div key={key} className="flex items-center gap-3 rounded-2xl border border-linesoft bg-card p-3.5">
                <Avatar src={names[key]?.avatar || null} name={names[key]?.name || key} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[13px] font-bold truncate">
                      {names[key]?.name || key}
                    </span>
                  </div>
                  <div className="truncate text-[11px] text-text2">
                    {names[key]?.handle || (tab === 'muted' ? 'Muted user' : 'Blocked user')}
                  </div>
                </div>
                <button
                  onClick={() => {
                    vibrate('light');
                    if (tab === 'blocked') {
                      unblockUser(key);
                      showToast(`Unblocked ${names[key]?.name || 'user'}`);
                    } else {
                      toggleMuteUser(key);
                      showToast(`Unmuted ${names[key]?.name || 'user'}`);
                    }
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
              {tab === 'blocked'
                ? 'No blocked users'
                : tab === 'muted'
                ? 'No muted users'
                : 'No hidden posts'}
            </div>
            <div className="mt-1 text-[12px] text-text3">
              {tab === 'blocked'
                ? 'Blocked users will appear here'
                : tab === 'muted'
                ? 'Muted users will appear here'
                : 'Posts you hide from the feed will appear here'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
