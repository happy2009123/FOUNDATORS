'use client';

// ─────────────────────────────────────────────────────────────
// SEARCH — real Firestore data across people, projects, posts
// and hashtags derived from actual post text. Honors ?q= from
// the desktop header. No seeded/fake trending entries.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, Clock, TrendingUp, Hash, FolderKanban, FileText } from 'lucide-react';
import { useStore } from '@/lib/store';
import { getSupabase } from '@/lib/supabase/client';
import { mapRows } from '@/lib/supabase/db';
import { useHaptics } from '@/lib/useHaptics';
import Avatar from '@/components/Avatar';

function extractTags(posts) {
  const counts = new Map();
  posts.forEach((p) => {
    const matches = String(p.text || '').match(/#[A-Za-z][A-Za-z0-9_]{1,30}/g) || [];
    matches.forEach((m) => {
      const key = m.toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });
  return Array.from(counts, ([text, posts]) => ({ text, posts }))
    .sort((a, b) => b.posts - a.posts)
    .slice(0, 8);
}

// Inner component uses useSearchParams, which requires a Suspense boundary
// in the App Router — see the default export at the bottom.
function SearchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { vibrate } = useHaptics();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchHistory, setSearchHistory] = useState([]);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const followedUsers = useStore((s) => s.followedUsers);
  const toggleFollowUser = useStore((s) => s.toggleFollowUser);

  // Reactive ?q= — the old window.location read ran ONCE on mount, so a
  // second deep-link from the desktop header while already on /search
  // silently no-op'd. urlQ changes re-apply the query every time.
  const urlQ = searchParams.get('q');
  useEffect(() => {
    if (urlQ) setQuery(urlQ);
  }, [urlQ]);

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      try {
        const supabase = getSupabase();
        if (!supabase) return;
        const { data: authRes } = await supabase.auth.getUser();
        const userId = authRes?.user?.id;
        const [usersRes, postRes, projectRes, blockedRes] = await Promise.all([
          supabase.from('profiles').select('*').order('updated_at', { ascending: false }).limit(50),
          supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(60),
          supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(30),
          userId
            ? supabase.from('blocks').select('blocked_id').eq('user_id', userId)
            : Promise.resolve({ data: null }),
        ]);
        if (usersRes.error) throw usersRes.error;
        if (postRes.error) throw postRes.error;
        if (projectRes.error) throw projectRes.error;
        if (blockedRes?.error) throw blockedRes.error;
        if (!cancelled) {
          const blockedIds = new Set((blockedRes?.data || []).map((r) => r.blocked_id));
          setUsers(
            mapRows(usersRes.data || []).filter(
              (u) =>
                !blockedIds.has(u.id) &&
                u.id !== userId &&
                u.status !== 'suspended'
            )
          );
          setPosts(mapRows(postRes.data || []));
          setProjects(
            mapRows(projectRes.data || []).map((p) => ({ ...p, name: p.title || '' }))
          );
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, []);

  const trendingTags = useMemo(() => extractTags(posts), [posts]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { users: [], tags: [], posts: [], projects: [] };
    return {
      users: users.filter(
        (u) =>
          String(u.name || '').toLowerCase().includes(q) ||
          String(u.handle || '').toLowerCase().includes(q) ||
          String(u.role || '').toLowerCase().includes(q)
      ),
      tags: trendingTags.filter((t) => t.text.includes(q.startsWith('#') ? q : `#${q}`)),
      posts: posts
        .filter((p) => String(p.text || '').toLowerCase().includes(q))
        .slice(0, 20),
      projects: projects
        .filter(
          (p) =>
            String(p.name || '').toLowerCase().includes(q) ||
            String(p.description || '').toLowerCase().includes(q)
        )
        .slice(0, 10),
    };
  }, [query, users, posts, projects, trendingTags]);

  const totalHits =
    results.users.length + results.tags.length + results.posts.length + results.projects.length;

  const addToHistory = useCallback((term) => {
    setSearchHistory((prev) => [term, ...prev.filter((h) => h !== term)].slice(0, 10));
  }, []);

  const removeFromHistory = useCallback((term) => {
    setSearchHistory((prev) => prev.filter((h) => h !== term));
  }, []);

  return (
    <div className="app-shell flex flex-col overflow-hidden">
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 rounded-2xl border border-linesoft bg-card px-4 py-3">
          <Search size={16} className="text-text3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, projects, posts, tags..."
            autoFocus
            className="flex-1 bg-transparent text-[14px] text-white placeholder:text-text3 focus:outline-none"
            aria-label="Search"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-text3" aria-label="Clear">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {query.trim() && (
        <div className="flex gap-2 px-4 pb-3">
          {['all', 'people', 'projects', 'posts', 'tags'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all capitalize ${
                filter === f ? 'bg-gold text-[#1a1300]' : 'bg-white/5 text-text2'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4">
        {query.trim() ? (
          <div className="space-y-4">
            {(filter === 'all' || filter === 'people') && results.users.length > 0 && (
              <div>
                <h3 className="mb-2 text-[12px] font-bold text-text3">People</h3>
                {results.users.map((user) => {
                  const key = user.id;
                  const isFollowing = !!followedUsers[key];
                  return (
                    <div key={key} className="flex items-center gap-3 py-3">
                      <button onClick={() => router.push(`/profile/${key}`)}>
                        <Avatar src={user.avatar} name={user.name} size={40} />
                      </button>
                      <button
                        onClick={() => router.push(`/profile/${key}`)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-1">
                          <span className="truncate text-[13px] font-bold">{user.name}</span>
                          {user.verified && <span className="text-[10px] text-gold">&#10003;</span>}
                        </div>
                        <div className="truncate text-[11px] text-text2">{user.role}</div>
                      </button>
                      <button
                        onClick={() => { vibrate('light'); toggleFollowUser(key); addToHistory(user.name); }}
                        className={`rounded-full border px-4 py-1.5 text-[11px] font-bold transition-all ${
                          isFollowing ? 'border-transparent bg-gold text-[#1a1300]' : 'border-gold text-gold'
                        }`}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {(filter === 'all' || filter === 'projects') && results.projects.length > 0 && (
              <div>
                <h3 className="mb-2 text-[12px] font-bold text-text3">Projects</h3>
                {results.projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => router.push(`/projects/${p.id}`)}
                    className="flex w-full items-center gap-3 py-3 text-left"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold">
                      <FolderKanban size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold">{p.name}</div>
                      <div className="truncate text-[11px] text-text2">{p.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {(filter === 'all' || filter === 'posts') && results.posts.length > 0 && (
              <div>
                <h3 className="mb-2 text-[12px] font-bold text-text3">Posts</h3>
                {results.posts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => router.push(`/post/${p.id}`)}
                    className="block w-full py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar src={p.authorAvatar} name={p.authorName} size={24} />
                      <span className="truncate text-[12px] font-bold">{p.authorName}</span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-text2">
                      {p.text}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {(filter === 'all' || filter === 'tags') && results.tags.length > 0 && (
              <div>
                <h3 className="mb-2 text-[12px] font-bold text-text3">Tags</h3>
                {results.tags.map((tag) => (
                  <div key={tag.text} className="flex items-center gap-3 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold">
                      <Hash size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-bold">{tag.text}</div>
                      <div className="text-[11px] text-text2">
                        {tag.posts} post{tag.posts === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalHits === 0 && (
              <div className="py-12 text-center text-[13px] text-text2">
                No results for &ldquo;{query}&rdquo;
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {searchHistory.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[12px] font-bold text-text3">Recent</h3>
                  <button onClick={() => setSearchHistory([])} className="text-[11px] font-bold text-gold">
                    Clear all
                  </button>
                </div>
                {searchHistory.map((term) => (
                  <div key={term} className="flex items-center gap-3 py-2.5">
                    <Clock size={14} className="text-text3" />
                    <button
                      onClick={() => setQuery(term)}
                      className="flex-1 text-left text-[13px] text-text2"
                    >
                      {term}
                    </button>
                    <button
                      onClick={() => removeFromHistory(term)}
                      className="text-text3"
                      aria-label={`Remove ${term}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <h3 className="mb-2 text-[12px] font-bold text-text3">Trending tags</h3>
              {trendingTags.length === 0 ? (
                <div className="py-4 text-[12.5px] text-text3">
                  {loading ? 'Loading…' : 'No hashtags in recent posts yet — start a conversation with #AI or #buildinpublic.'}
                </div>
              ) : (
                trendingTags.map((item) => (
                  <div key={item.text} className="flex items-center gap-3 py-2.5">
                    <TrendingUp size={14} className="text-gold" />
                    <button
                      onClick={() => { setQuery(item.text); addToHistory(item.text); }}
                      className="flex-1 text-left"
                    >
                      <div className="text-[13px] font-bold">{item.text}</div>
                      <div className="text-[10px] text-text3">
                        {item.posts} post{item.posts === 1 ? '' : 's'}
                      </div>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div>
              <h3 className="mb-2 text-[12px] font-bold text-text3">Jump to</h3>
              <button
                onClick={() => router.push('/projects')}
                className="flex w-full items-center gap-3 py-2.5 text-left"
              >
                <FolderKanban size={14} className="text-gold" />
                <span className="text-[13px] text-text2">Browse projects looking for builders</span>
              </button>
              <button
                onClick={() => router.push('/opportunities')}
                className="flex w-full items-center gap-3 py-2.5 text-left"
              >
                <FileText size={14} className="text-gold" />
                <span className="text-[13px] text-text2">Live opportunities</span>
              </button>
            </div>

            {loading && (
              <div className="py-6 text-center text-[12px] text-text3">Loading…</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchInner />
    </Suspense>
  );
}
