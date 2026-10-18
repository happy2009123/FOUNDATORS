'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flame, UserPlus, ArrowRight, MapPin, AtSign } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { getSupabase } from '@/lib/supabase/client';
import { mapRows } from '@/lib/supabase/db';
import { extractTags } from '@/lib/search';
import { useStore } from '@/lib/store';

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
  const [trendingTags, setTrendingTags] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function fetchUsers() {
      try {
        const supabase = getSupabase();
        if (!supabase) return;
        const { data: authRes } = await supabase.auth.getUser();
        const userId = authRes?.user?.id;
        const snap = await supabase.from('profiles').select('*').limit(100);
        if (snap.error) throw snap.error;
        let blockedIds = new Set();
        if (userId) {
          const blockedSnap = await supabase.from('blocks').select('blocked_id').eq('user_id', userId);
          if (blockedSnap.error) throw blockedSnap.error;
          blockedIds = new Set((blockedSnap.data || []).map((r) => r.blocked_id));
        }
        // Real hashtag frequency from recent posts (same helper /explore uses).
        const postSnap = await supabase
          .from('posts')
          .select('text')
          .order('created_at', { ascending: false })
          .limit(300);
        if (postSnap.error) throw postSnap.error;
        if (!cancelled) {
          setTrendingTags(extractTags((postSnap.data || []).map((r) => ({ text: r.text })), 6));
        }
        if (!cancelled) {
          const map = {};
          mapRows(snap.data || [])
            .filter((d) => !blockedIds.has(d.id))
            .forEach((d) => { map[d.id] = d; });
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
          {trendingTags.length === 0 && (
            <p className="text-[11.5px] text-text3">No hashtags yet — posts with tags show up here.</p>
          )}
          {trendingTags.map((t) => (
            <button
              key={t.text}
              onClick={() => router.push(`/topic/${encodeURIComponent(t.text.replace('#', ''))}`)}
              className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
            >
              <span className="text-[13px] font-bold">{t.text}</span>
              <span className="text-[10.5px] text-text3">{t.posts.toLocaleString()} {t.posts === 1 ? 'post' : 'posts'}</span>
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