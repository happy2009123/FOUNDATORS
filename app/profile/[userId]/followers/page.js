'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Search } from 'lucide-react';
import SubpageHeader from '@/components/SubpageHeader';
import { useStore } from '@/lib/store';
import { USERS } from '@/lib/data';
import { useHaptics } from '@/lib/useHaptics';
import Avatar from '@/components/Avatar';

const MOCK_FOLLOWERS = [
  { key: 'arjun', mutual: 5 },
  { key: 'meera', mutual: 3 },
  { key: 'rohan', mutual: 8 },
  { key: 'sophia', mutual: 2 },
  { key: 'daniel', mutual: 6 },
  { key: 'emily', mutual: 1 },
  { key: 'ishita', mutual: 4 },
  { key: 'james', mutual: 7 },
];

const MOCK_FOLLOWING = [
  { key: 'arjun' },
  { key: 'sophia' },
  { key: 'rohan' },
  { key: 'meera' },
];

export default function FollowersPage() {
  const router = useRouter();
  const { userId } = useParams();
  const [tab, setTab] = useState('followers');
  const [search, setSearch] = useState('');
  const toggleFollowUser = useStore((s) => s.toggleFollowUser);
  const followedUsers = useStore((s) => s.followedUsers);
  const { vibrate } = useHaptics();

  const list = tab === 'followers' ? MOCK_FOLLOWERS : MOCK_FOLLOWING;
  const filtered = list.filter((item) => {
    const user = USERS[item.key];
    if (!user) return false;
    return user.name.toLowerCase().includes(search.toLowerCase()) || user.handle?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="app-shell flex flex-col overflow-hidden">
      <SubpageHeader title={tab === 'followers' ? 'Followers' : 'Following'} />

      {/* Tabs */}
      <div className="flex border-b border-linesoft">
        <button
          onClick={() => setTab('followers')}
          className={`flex-1 py-3 text-[13px] font-bold transition-colors ${tab === 'followers' ? 'text-gold border-b-2 border-gold' : 'text-text3'}`}
        >
          Followers ({MOCK_FOLLOWERS.length})
        </button>
        <button
          onClick={() => setTab('following')}
          className={`flex-1 py-3 text-[13px] font-bold transition-colors ${tab === 'following' ? 'text-gold border-b-2 border-gold' : 'text-text3'}`}
        >
          Following ({MOCK_FOLLOWING.length})
        </button>
      </div>

      {/* Search */}
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

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2">
        {filtered.map((item) => {
          const user = USERS[item.key];
          if (!user) return null;
          const isFollowing = !!followedUsers[item.key];
          return (
            <div key={item.key} className="flex items-center gap-3 rounded-2xl border border-linesoft bg-card p-3.5">
              <Avatar src={user.avatar} name={user.name} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[13px] font-bold">{user.name}</span>
                  {user.verified && <span className="text-gold text-[10px]">✓</span>}
                </div>
                <div className="text-[11px] text-text2">{user.role}</div>
                {item.mutual && (
                  <div className="text-[10px] text-text3">{item.mutual} mutual connections</div>
                )}
              </div>
              <button
                onClick={() => { vibrate('light'); toggleFollowUser(item.key); }}
                className={`rounded-full border px-4 py-2 text-[11px] font-bold transition-all ${
                  isFollowing ? 'border-transparent bg-gold text-[#1a1300]' : 'border-gold text-gold'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-[13px] text-text2">No users found</div>
        )}
      </div>
    </div>
  );
}
