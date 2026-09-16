'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, TrendingUp, Hash, Users, Filter, SlidersHorizontal } from 'lucide-react';
import { useStore } from '@/lib/store';
import { USERS } from '@/lib/data';
import { useHaptics } from '@/lib/useHaptics';
import Avatar from '@/components/Avatar';

const TRENDING = [
  { type: 'tag', text: '#AI', posts: 1240 },
  { type: 'tag', text: '#StartupLife', posts: 890 },
  { type: 'user', key: 'arjun' },
  { type: 'tag', text: '#Funding', posts: 423 },
  { type: 'user', key: 'sophia' },
];

const RECENT_SEARCHES = ['#ReactNative', 'arjun', '#HealthTech', 'meera'];

export default function SearchPage() {
  const router = useRouter();
  const { vibrate } = useHaptics();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchHistory, setSearchHistory] = useState(RECENT_SEARCHES);
  const followedUsers = useStore((s) => s.followedUsers);
  const toggleFollowUser = useStore((s) => s.toggleFollowUser);

  const results = query.trim() ? {
    users: Object.entries(USERS).filter(([key, u]) =>
      key !== 'kabir' && (u.name.toLowerCase().includes(query.toLowerCase()) || u.handle?.toLowerCase().includes(query.toLowerCase()) || u.role?.toLowerCase().includes(query.toLowerCase()))
    ),
    tags: TRENDING.filter((t) => t.type === 'tag' && t.text.toLowerCase().includes(query.toLowerCase())),
  } : { users: [], tags: [] };

  const addToHistory = useCallback((term) => {
    setSearchHistory((prev) => [term, ...prev.filter((h) => h !== term)].slice(0, 10));
  }, []);

  const removeFromHistory = useCallback((term) => {
    setSearchHistory((prev) => prev.filter((h) => h !== term));
  }, []);

  return (
    <div className="app-shell flex flex-col overflow-hidden">
      {/* Search bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 rounded-2xl border border-linesoft bg-card px-4 py-3">
          <Search size={16} className="text-text3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, tags, posts..."
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

      {/* Filters */}
      {query.trim() && (
        <div className="flex gap-2 px-4 pb-3">
          {['all', 'people', 'tags', 'posts'].map((f) => (
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
        {/* Search results */}
        {query.trim() ? (
          <div className="space-y-4">
            {/* People */}
            {(filter === 'all' || filter === 'people') && results.users.length > 0 && (
              <div>
                <h3 className="text-[12px] font-bold text-text3 mb-2">People</h3>
                {results.users.map(([key, user]) => {
                  const isFollowing = !!followedUsers[key];
                  return (
                    <div key={key} className="flex items-center gap-3 py-3">
                      <Avatar src={user.avatar} name={user.name} size={40} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[13px] font-bold">{user.name}</span>
                          {user.verified && <span className="text-gold text-[10px]">✓</span>}
                        </div>
                        <div className="text-[11px] text-text2">{user.role}</div>
                      </div>
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

            {/* Tags */}
            {(filter === 'all' || filter === 'tags') && results.tags.length > 0 && (
              <div>
                <h3 className="text-[12px] font-bold text-text3 mb-2">Tags</h3>
                {results.tags.map((tag) => (
                  <div key={tag.text} className="flex items-center gap-3 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold">
                      <Hash size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-bold">{tag.text}</div>
                      <div className="text-[11px] text-text2">{tag.posts.toLocaleString()} posts</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {results.users.length === 0 && results.tags.length === 0 && (
              <div className="py-12 text-center text-[13px] text-text2">No results for &ldquo;{query}&rdquo;</div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Recent searches */}
            {searchHistory.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] font-bold text-text3">Recent</h3>
                  <button onClick={() => setSearchHistory([])} className="text-[11px] font-bold text-gold">Clear all</button>
                </div>
                {searchHistory.map((term) => (
                  <div key={term} className="flex items-center gap-3 py-2.5">
                    <Clock size={14} className="text-text3" />
                    <button onClick={() => setQuery(term)} className="flex-1 text-left text-[13px] text-text2">{term}</button>
                    <button onClick={() => removeFromHistory(term)} className="text-text3" aria-label={`Remove ${term}`}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Trending */}
            <div>
              <h3 className="text-[12px] font-bold text-text3 mb-2">Trending</h3>
              {TRENDING.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <TrendingUp size={14} className="text-gold" />
                  <button onClick={() => setQuery(item.type === 'tag' ? item.text : USERS[item.key]?.name || '')} className="flex-1 text-left">
                    <div className="text-[13px] font-bold">{item.type === 'tag' ? item.text : USERS[item.key]?.name}</div>
                    <div className="text-[10px] text-text3">{item.type === 'tag' ? `${item.posts.toLocaleString()} posts` : USERS[item.key]?.role}</div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
