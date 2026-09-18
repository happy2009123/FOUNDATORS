'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Search, Hash, Users, Rocket, Code2, Lightbulb, Target, Flame, ArrowRight, X } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import TopBar from '@/components/TopBar';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useStore } from '@/lib/store';
import { auth } from '@/lib/firebase';
import Avatar from '@/components/Avatar';

const TRENDING_TAGS = [
  { tag: 'AI', posts: 1240, icon: '🤖' },
  { tag: 'StartupLife', posts: 890, icon: '🚀' },
  { tag: 'ReactNative', posts: 567, icon: '📱' },
  { tag: 'Funding', posts: 423, icon: '💰' },
  { tag: 'Design', posts: 312, icon: '🎨' },
  { tag: 'OpenSource', posts: 289, icon: '💻' },
  { tag: 'HealthTech', posts: 198, icon: '🏥' },
  { tag: 'EdTech', posts: 176, icon: '📚' },
];

const TRENDING_POSTS = [
  { id: 't1', userId: 'sophia', text: 'Just raised our Series A! 🎉 The journey from idea to this moment has been incredible. Grateful for the amazing team and investors who believe in our vision.', likes: 2341, comments: 89, tag: 'Funding' },
  { id: 't2', userId: 'arjun', text: 'Building an AI-powered code review tool. Early results are promising - catching 40% more bugs than traditional linting. Who wants to beta test?', likes: 1892, comments: 67, tag: 'AI' },
  { id: 't3', userId: 'meera', text: 'HealthSync just hit 10K users in 3 cities! The power of solving a real problem. Healthtech is underserved and we\'re changing that.', likes: 1567, comments: 45, tag: 'HealthTech' },
  { id: 't4', userId: 'rohan', text: 'FitTrack beta launching next week! AI-powered fitness coaching that adapts to your body. Early testers get lifetime premium.', likes: 1234, comments: 78, tag: 'AI' },
  { id: 't5', userId: 'daniel', text: 'Just open-sourced our React component library. 50+ accessible components, fully typed. Star us on GitHub!', likes: 987, comments: 34, tag: 'OpenSource' },
  { id: 't6', userId: 'emily', text: 'Growth marketing tip: Your landing page copy should focus on the problem, not the solution. People buy outcomes, not features.', likes: 876, comments: 23, tag: 'Design' },
  { id: 't7', userId: 'ishita', text: 'New design system drop! 200+ components, dark mode, fully responsive. Free for all Foundators users.', likes: 765, comments: 56, tag: 'Design' },
  { id: 't8', userId: 'james', text: 'Product roadmap for Q3 is ready. Key focus: reliability, speed, and user-requested features. What do you want to see?', likes: 654, comments: 43, tag: 'StartupLife' },
];

export default function ExplorePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('trending');
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const toggleFollowUser = useStore((s) => s.toggleFollowUser);
  const followedUsers = useStore((s) => s.followedUsers);

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
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchUsers();
    return () => { cancelled = true; };
  }, []);

  const filteredTags = TRENDING_TAGS.filter((t) =>
    t.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPosts = TRENDING_POSTS.filter((p) =>
    p.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainScreenShell>
      <TopBar />
      <div className="no-scrollbar flex-1 overflow-y-auto pb-20">
        <div className="px-4 pt-3 pb-2">
          <h1 className="text-[22px] font-black">Explore</h1>
          <p className="text-[12px] text-text2">Discover trending content and people</p>
        </div>

        <div className="px-4 mb-4">
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

        <div className="flex gap-2 px-4 mb-4">
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
              <div className="flex flex-wrap gap-2">
                {filteredTags.map((tag) => (
                  <button
                    key={tag.tag}
                    onClick={() => { setSearchQuery(tag.tag); setActiveTab('tags'); }}
                    className="flex items-center gap-1.5 rounded-full border border-linesoft bg-card px-3 py-2 text-[11px] font-bold text-text2 hover:border-gold/50 transition-colors"
                  >
                    <span>{tag.icon}</span>
                    <span>#{tag.tag}</span>
                    <span className="text-text3">· {tag.posts} posts</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4">
              <h2 className="mb-3 text-[14px] font-bold">Top Posts</h2>
              <div className="space-y-3">
                {filteredPosts.map((post) => {
                  const user = users[post.userId];
                  return (
                    <div
                      key={post.id}
                      onClick={() => router.push(`/post/${post.id}`)}
                      className="rounded-2xl border border-linesoft bg-card p-4 active:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <Avatar src={user?.avatar} name={user?.name} size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[13px] font-bold">{user?.name}</span>
                            {user?.verified && <span className="text-gold text-[10px]">&#10003;</span>}
                          </div>
                          <div className="text-[11px] text-text2">{user?.role}</div>
                        </div>
                        <span className="rounded-full bg-gold/10 px-2 py-1 text-[10px] font-bold text-gold">#{post.tag}</span>
                      </div>
                      <p className="text-[13px] leading-relaxed line-clamp-3">{post.text}</p>
                      <div className="mt-2 flex items-center gap-4 text-[11px] text-text3">
                        <span>❤️ {post.likes}</span>
                        <span>💬 {post.comments}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="px-4 space-y-3">
            {filteredTags.map((tag) => (
              <div
                key={tag.tag}
                className="flex items-center gap-3 rounded-2xl border border-linesoft bg-card p-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10 text-2xl">
                  {tag.icon}
                </div>
                <div className="flex-1">
                  <div className="text-[14px] font-bold">#{tag.tag}</div>
                  <div className="text-[11px] text-text2">{tag.posts.toLocaleString()} posts</div>
                </div>
                <ArrowRight size={16} className="text-text3" />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'people' && (
          <div className="px-4 space-y-3">
            {loading ? (
              <div className="py-12 text-center text-[13px] text-text3">Loading users...</div>
            ) : Object.values(users).length === 0 ? (
              <div className="py-12 text-center text-[13px] text-text2">No users found</div>
            ) : (
              Object.values(users).map((user) => {
                const key = user.id;
                const isFollowing = !!followedUsers[key];
                return (
                  <div key={key} className="flex items-center gap-3 rounded-2xl border border-linesoft bg-card p-4">
                    <Avatar src={user.avatar} name={user.name} size={48} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[14px] font-bold">{user.name}</span>
                        {user.verified && <span className="text-gold text-[10px]">&#10003;</span>}
                      </div>
                      <div className="text-[11px] text-text2">{user.role || user.bio || 'Foundator'}</div>
                    </div>
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
