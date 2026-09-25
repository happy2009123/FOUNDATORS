'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flame, UserPlus, ArrowRight, MapPin, AtSign } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useStore } from '@/lib/store';

const FALLBACK_TAGS = [
  { tag: 'AI', posts: 1240 },
  { tag: 'StartupLife', posts: 890 },
  { tag: 'ReactNative', posts: 567 },
  { tag: 'Funding', posts: 423 },
  { tag: 'Design', posts: 312 },
  { tag: 'OpenSource', posts: 289 },
];

const QUICK_LINKS = [
  '/opportunities',
  '/analytics',
  '/ideas',
  '/events',
  '/settings',
];

export default function DesktopRightPanel() {
  const router = useRouter();
  const toggleFollowUser = useStore((s) => s.toggleFollowUser);
  const followedUsers = useStore((s) => s.followedUsers);
  const myId = useStore((s) => s.profile?.id);
  const [users, setUsers] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function fetchUsers() {
      try {
        const userId = auth?.currentUser?.uid;
        const snap = await getDocs(collection(db, 'users'));
        let blockedIds = new Set();
        if (userId) {
          const blockedSnap = await getDocs(collection(db, 'users', userId, 'blocked'));
          blockedIds = new Set(blockedSnap.docs.map((d) => d.id));
        }
        if (!cancelled) {
          const map = {};
          snap.docs.filter((d) => !blockedIds.has(d.id)).forEach((d) => { map[d.id] = { id: d.id, ...d.data() }; });
          setUsers(map);
        }
      } catch {
        // silently fail
      }
    }
    fetchUsers();
    return () => { cancelled = true; };
  }, []);

  const suggestions = useMemo(() => {
    return Object.values(users)
      .filter((u) => !followedUsers[u.id] && u.id !== myId)
      .slice(0, 4)
      .map((u) => ({
        ...u,
        reason: (u.skills || []).slice(0, 2).join(' + ') || 'Open to connect',
      }));
  }, [users, followedUsers, myId]);

  return (
    <aside className="hidden xl:flex fixed right-0 top-[60px] bottom-0 w-[320px] flex-col overflow-y-auto no-scrollbar border-l border-linesoft bg-[var(--bg)] px-5 py-6 z-30">
      {/* Trending */}
      <section className="rounded-2xl border border-linesoft bg-card p-4">
        <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.14em] text-gold">
          <Flame size={13} /> Trending
        </div>
        <div className="mt-3 space-y-2">
          {FALLBACK_TAGS.map((t) => (
            <button
              key={t.tag}
              onClick={() => router.push(`/explore?q=${encodeURIComponent(t.tag)}`)}
              className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
            >
              <span className="text-[13px] font-bold">#{t.tag}</span>
              <span className="text-[10.5px] text-text3">{t.posts.toLocaleString()} posts</span>
            </button>
          ))}
        </div>
      </section>

      {/* People to follow */}
      <section className="mt-5 rounded-2xl border border-linesoft bg-card p-4">
        <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.14em] text-gold">
          <UserPlus size={13} /> People to follow
        </div>
        <div className="mt-2 space-y-2.5">
          {suggestions.length === 0 && (
            <div className="py-3 text-center text-[11.5px] text-text3">All caught up. Check back soon!</div>
          )}
          {suggestions.map((u) => (
            <div key={u.id} className="flex items-center gap-2.5 rounded-xl px-1 py-1.5">
              <button onClick={() => router.push(`/profile/${u.id}`)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                <Avatar src={u.avatar} name={u.name} size={38} />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-bold">{u.name}</div>
                  <div className="flex items-center gap-1 truncate text-[10.5px] text-text3">
                    {u.location && <MapPin size={9} className="flex-none" />}
                    {u.location || u.handle || u.reason}
                  </div>
                </div>
              </button>
              <button
                onClick={() => toggleFollowUser(u.id)}
                aria-label={`Follow ${u.name}`}
                className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border text-[11px] ${
                  followedUsers[u.id]
                    ? 'border-linesoft bg-transparent text-text2'
                    : 'border-gold bg-gold/10 text-gold'
                }`}
              >
                {followedUsers[u.id] ? '✓' : '+'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="mt-5 rounded-2xl border border-linesoft bg-card p-4">
        <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.14em] text-gold">
          <AtSign size={13} /> Shortcuts
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_LINKS.map((path) => {
            const label = path.replace('/', '').charAt(0).toUpperCase() + path.slice(2);
            return (
              <button
                key={path}
                onClick={() => router.push(path)}
                className="flex items-center gap-1 rounded-full border border-linesoft px-3 py-1.5 text-[11.5px] font-semibold text-text2 hover:bg-white/[0.04]"
              >
                {label === 'Reels' ? 'Reels' : label}
                <ArrowRight size={11} />
              </button>
            );
          })}
        </div>
      </section>
    </aside>
  );
}