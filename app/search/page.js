'use client';

// ─────────────────────────────────────────────────────────────
// SEARCH — server-side search across people, posts and projects
// (lib/search.js queries the full tables, not a 60-row client
// snapshot), hashtags derived from the recent-post pool, followed
// topics, and localStorage history. Honors ?q= from the header.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, Clock, TrendingUp, Hash, FolderKanban, FileText, Loader2, Bookmark } from 'lucide-react';
import { useStore } from '@/lib/store';
import { getSupabase } from '@/lib/supabase/client';
import { mapRows } from '@/lib/supabase/db';
import { useHaptics } from '@/lib/useHaptics';
import Avatar from '@/components/Avatar';
import { searchPeople, searchPosts, searchProjects, extractTags, fetchFollowedTopics } from '@/lib/search';

const HISTORY_KEY = 'foundators.searchHistory';

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, 10) : [];
  } catch {
    return [];
  }
}

function saveHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 10)));
  } catch {}
}

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
  const [tagPool, setTagPool] = useState([]);
  const [followedTopics, setFollowedTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
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
    setSearchHistory(loadHistory());
  }, []);

  // One-time bootstrap: blocks (to filter results), the hashtag pool and
  // the user's followed topics. No full table preload anymore.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) return;
        const { data: authRes } = await supabase.auth.getUser();
        const userId = authRes?.user?.id;
        const [tagRes, topicsRes, blockedRes] = await Promise.all([
          supabase
            .from('posts')
            .select('text, created_at')
            .order('created_at', { ascending: false })
            .limit(300),
          fetchFollowedTopics(supabase),
          userId
            ? supabase.from('blocks').select('blocked_id').eq('user_id', userId)
            : Promise.resolve({ data: null }),
        ]);
        if (cancelled) return;
        if (!tagRes.error) setTagPool(mapRows(tagRes.data || []));
        setFollowedTopics(topicsRes || []);
        if (blockedRes?.data) {
          // blocked ids are stored for reference by the server-search filter
          sessionStorage.setItem('foundators.blockedIds', JSON.stringify(blockedRes.data.map((r) => r.blocked_id)));
        }
      } catch {
        // silent — trending/trends degrade to empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Debounced server search: one round of three parallel queries per pause.
  const q = query.trim();
  useEffect(() => {
    if (!q) {
      setUsers([]);
      setPosts([]);
      setProjects([]);
      setSearching(false);
      return undefined;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const supabase = getSupabase();
      if (!supabase) { setSearching(false); return; }
      const [ppl, pst, prj] = await Promise.all([
        searchPeople(supabase, q),
        searchPosts(supabase, q),
        searchProjects(supabase, q),
      ]);
      if (cancelled) return;
      let blocked = [];
      try { blocked = JSON.parse(sessionStorage.getItem('foundators.blockedIds') || '[]'); } catch {}
      const blockedSet = new Set(blocked);
      setUsers(ppl.filter((u) => !blockedSet.has(u.id) && u.status !== 'suspended'));
      setPosts(pst);
      setProjects(prj);
      setSearching(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  const trendingTags = useMemo(() => extractTags(tagPool), [tagPool]);

  const results = useMemo(() => {
    const ql = q.toLowerCase();
    if (!ql) return { users: [], tags: [], posts: [], projects: [] };
    return {
      users,
      tags: trendingTags.filter((t) => t.text.includes(ql.startsWith('#') ? ql : `#${ql}`)),
      posts,
      projects,
    };
  }, [q, users, posts, projects, trendingTags]);

  const totalHits =
    results.users.length + results.tags.length + results.posts.length + results.projects.length;

  const addToHistory = useCallback((term) => {
    const t = String(term || '').trim();
    if (!t) return;
    setSearchHistory((prev) => {
      const next = [t, ...prev.filter((h) => h !== t)].slice(0, 10);
      saveHistory(next);
      return next;
    });
  }, []);

  const removeFromHistory = useCallback((term) => {
    setSearchHistory((prev) => {
      const next = prev.filter((h) => h !== term);
      saveHistory(next);
      return next;
    });
  }, []);

  const openTopic = useCallback((tag) => {
    const clean = String(tag || '').replace(/^#/, '').toLowerCase();
    if (clean) router.push(`/topic/${encodeURIComponent(clean)}`);
  }, [router]);

  return (
    <div className="app-shell flex flex-col overflow-hidden">
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 rounded-2xl border border-linesoft bg-card px-4 py-3">
          <Search size={16} className="text-text3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addToHistory(query); }}
            placeholder="Search people, projects, posts, tags..."
            autoFocus
            className="flex-1 bg-transparent text-[14px] text-white placeholder:text-text3 focus:outline-none"
            aria-label="Search"
          />
          {searching && <Loader2 size={15} className="animate-spin text-gold" />}
          {query && !searching && (
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
                      <button onClick={() => { addToHistory(query); router.push(`/profile/${key}`); }}>
                        <Avatar src={user.avatar} name={user.name} size={40} />
                      </button>
                      <button
                        onClick={() => { addToHistory(query); router.push(`/profile/${key}`); }}
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
                    onClick={() => { addToHistory(query); router.push(`/projects/${p.id}`); }}
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
                    onClick={() => { addToHistory(query); router.push(`/post/${p.id}`); }}
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
                  <button
                    key={tag.text}
                    onClick={() => { addToHistory(tag.text); openTopic(tag.text); }}
                    className="flex w-full items-center gap-3 py-3 text-left"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold">
                      <Hash size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-bold">{tag.text}</div>
                      <div className="text-[11px] text-text2">
                        {tag.posts} post{tag.posts === 1 ? '' : 's'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {totalHits === 0 && (
              <div className="py-12 text-center text-[13px] text-text2">
                {searching ? 'Searching…' : <>No results for &ldquo;{query}&rdquo;</>}
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

            {followedTopics.length > 0 && (
              <div>
                <h3 className="mb-2 text-[12px] font-bold text-text3">Your topics</h3>
                <div className="flex flex-wrap gap-2">
                  {followedTopics.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => openTopic(tag)}
                      className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-[12px] font-bold text-gold"
                    >
                      <Bookmark size={12} />
                      {tag}
                    </button>
                  ))}
                </div>
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
                      onClick={() => { addToHistory(item.text); openTopic(item.text); }}
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
