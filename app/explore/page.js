'use client';

// ─────────────────────────────────────────────────────────────
// EXPLORE — trending built from REAL posts: hashtags are
// extracted from recent post text with true counts, Top Posts
// are the most-liked recent posts (never seeded fabrications).
// People tab stays fully real.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Hash, Users, Flame, ArrowRight, X } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import TopBar from '@/components/TopBar';
import { db } from '@/lib/firebase';
import { collection, getDocs, query as firestoreQuery, orderBy, limit } from 'firebase/firestore';
import { useStore } from '@/lib/store';
import { auth } from '@/lib/firebase';
import Avatar from '@/components/Avatar';

const TAG_ICONS = ['🤖', '🚀', '📱', '💰', '🎨', '💻', '🏥', '📚'];

function tagIcon(index) {
  return TAG_ICONS[index % TAG_ICONS.length];
}

function likeCount(p) {
  if (Array.isArray(p.likedBy)) return p.likedBy.length;
  return Number(p.likes) || 0;
}

function extractTags(posts) {
  const counts = new Map();
  posts.forEach((p) => {
    const matches = String(p.text || '').match(/#[A-Za-z][A-Za-z0-9_]{1,30}/g) || [];
    matches.forEach((m) => {
      const key = m.slice(1);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });
  return Array.from(counts, ([tag, posts]) => ({ tag, posts }))
    .sort((a, b) => b.posts - a.posts)
    .slice(0, 12);
}

export default function ExplorePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('trending');
  const [users, setUsers] = useState({});
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const toggleFollowUser = useStore((s) => s.toggleFollowUser);
  const followedUsers = useStore((s) => s.followedUsers);

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      try {
        const userId = auth?.currentUser?.uid;
        const [snap, postSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(firestoreQuery(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(60))),
        ]);
        let blockedIds = new Set();
        if (userId) {
          const blockedSnap = await getDocs(collection(db, 'users', userId, 'blocked'));
          blockedIds = new Set(blockedSnap.docs.map((d) => d.id));
        }
        if (!cancelled) {
          const map = {};
          snap.docs
            .filter((d) => !blockedIds.has(d.id))
            .forEach((d) => { map[d.id] = { id: d.id, ...d.data() }; });
          setUsers(map);
          setPosts(postSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
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

  const topPosts = useMemo(
    () =>
      [...posts]
        .sort((a, b) => likeCount(b) - likeCount(a))
        .slice(0, 8),
    [posts]
  );

  const filteredTags = trendingTags.filter((t) =>
    t.tag.toLowerCase().includes(searchQuery.toLowerCase().replace(/^#/, ''))
  );

  const filteredPosts = topPosts.filter(
    (p) =>
      String(p.text || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(p.tagType || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainScreenShell>
      <TopBar />
      <div className="no-scrollbar flex-1 overflow-y-auto pb-20">
        <div className="px-4 pt-3 pb-2">
          <h1 className="text-[22px] font-black">Explore</h1>
          <p className="text-[12px] text-text2">Discover trending content and people</p>
        </div>

        <div className="mb-4 px-4">
          <div className="flex items-center gap-2 rounded-2xl border border-linesoft bg-card px-4 py-3">
            <Search size={16} className="text-text3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags, people, posts..."
              aria-label="Search explore"
              className="flex-1 bg-transparent text-[13px] text-white placeholder:text-text3 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-text3" aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="mb-4 flex gap-2 px-4">
          {[
            { key: 'trending', label: 'Trending', icon: Flame },
            { key: 'tags', label: 'Tags', icon: Hash },
            { key: 'people', label: 'People', icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold transition-all ${
                activeTab === key
                  ? 'bg-gold text-[#1a1300]'
                  : 'bg-white/5 text-text2 hover:bg-white/10'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'trending' && (
          <div className="space-y-4">
            <div className="px-4">
              <h2 className="mb-3 text-[14px] font-bold">Trending Topics</h2>
              {filteredTags.length === 0 ? (
                <p className="text-[12.5px] text-text3">
                  {loading
                    ? 'Loading…'
                    : 'No hashtags yet — post with #AI or #buildinpublic to start one.'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredTags.map((tag, i) => (
                    <button
                      key={tag.tag}
                      onClick={() => { setSearchQuery(tag.tag); setActiveTab('tags'); }}
                      className="flex items-center gap-1.5 rounded-full border border-linesoft bg-card px-3 py-2 text-[11px] font-bold text-text2 transition-colors hover:border-gold/50"
                    >
                      <span>{tagIcon(i)}</span>
                      <span>#{tag.tag}</span>
                      <span className="text-text3">· {tag.posts} post{tag.posts === 1 ? '' : 's'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4">
              <h2 className="mb-3 text-[14px] font-bold">Top Posts</h2>
              {filteredPosts.length === 0 ? (
                <p className="text-[12.5px] text-text3">
                  {loading ? 'Loading…' : 'No posts yet — be the first to share what you are building.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredPosts.map((post) => {
                    const user = users[post.authorKey];
                    const likes = likeCount(post);
                    return (
                      <div
                        key={post.id}
                        onClick={() => router.push(`/post/${post.id}`)}
                        className="cursor-pointer rounded-2xl border border-linesoft bg-card p-4 transition-colors active:bg-white/5"
                      >
                        <div className="mb-2 flex items-center gap-2.5">
                          <Avatar
                            src={post.authorAvatar || user?.avatar}
                            name={post.authorName || user?.name}
                            size={36}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="truncate text-[13px] font-bold">
                                {post.authorName || user?.name}
                              </span>
                              {(post.authorKey && users[post.authorKey]?.verified) && (
                                <span className="text-[10px] text-gold">&#10003;</span>
                              )}
                            </div>
                            <div className="truncate text-[11px] text-text2">
                              {user?.role || 'Foundator'}
                            </div>
                          </div>
                          {post.tagType ? (
                            <span className="rounded-full bg-gold/10 px-2 py-1 text-[10px] font-bold text-gold">
                              {String(post.tagType)}
                            </span>
                          ) : null}
                        </div>
                        <p className="line-clamp-3 text-[13px] leading-relaxed">{post.text}</p>
                        <div className="mt-2 flex items-center gap-4 text-[11px] text-text3">
                          <span>❤️ {likes}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="space-y-3 px-4">
            {filteredTags.length === 0 ? (
              <p className="py-8 text-center text-[12.5px] text-text3">
                {loading ? 'Loading…' : 'No hashtags in recent posts yet.'}
              </p>
            ) : (
              filteredTags.map((tag, i) => (
                <div
                  key={tag.tag}
                  className="flex items-center gap-3 rounded-2xl border border-linesoft bg-card p-4"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10 text-2xl">
                    {tagIcon(i)}
                  </div>
                  <div className="flex-1">
                    <div className="text-[14px] font-bold">#{tag.tag}</div>
                    <div className="text-[11px] text-text2">
                      {tag.posts} post{tag.posts === 1 ? '' : 's'}
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-text3" />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'people' && (
          <div className="space-y-3 px-4">
            {loading ? (
              <div className="py-12 text-center text-[13px] text-text3">Loading users...</div>
            ) : Object.values(users).length === 0 ? (
              <div className="py-12 text-center text-[13px] text-text2">No users found</div>
            ) : (
              Object.values(users).map((user) => {
                const key = user.id;
                const isFollowing = !!followedUsers[key];
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-2xl border border-linesoft bg-card p-4"
                  >
                    <button onClick={() => router.push(`/profile/${key}`)}>
                      <Avatar src={user.avatar} name={user.name} size={48} />
                    </button>
                    <button
                      onClick={() => router.push(`/profile/${key}`)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-1">
                        <span className="truncate text-[14px] font-bold">{user.name}</span>
                        {user.verified && <span className="text-[10px] text-gold">&#10003;</span>}
                      </div>
                      <div className="truncate text-[11px] text-text2">
                        {user.role || user.bio || 'Foundator'}
                      </div>
                    </button>
                    <button
                      onClick={() => toggleFollowUser(key)}
                      className={`rounded-full border px-4 py-2 text-[11px] font-bold transition-all ${
                        isFollowing
                          ? 'border-transparent bg-gold text-[#1a1300]'
                          : 'border-gold text-gold'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </MainScreenShell>
  );
}
