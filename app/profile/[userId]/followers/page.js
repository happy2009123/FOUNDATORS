'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import SubpageHeader from '@/components/SubpageHeader';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useStore } from '@/lib/store';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { useHaptics } from '@/lib/useHaptics';
import Avatar from '@/components/Avatar';

function FollowersInner() {
  const router = useRouter();
  const { userId } = useParams();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'following' ? 'following' : 'followers');
  const [search, setSearch] = useState('');
  const [followers, setFollowers] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const toggleFollowUser = useStore((s) => s.toggleFollowUser);
  const followedUsers = useStore((s) => s.followedUsers);
  const myId = useStore((s) => s.profile?.id);
  const { vibrate } = useHaptics();

  useEffect(() => {
    let cancelled = false;
    async function fetchLists() {
      try {
        const followersSnap = await getDocs(collection(db, 'users', userId, 'followers'));
        const followerIds = followersSnap.docs.map((d) => d.id);

        const followerProfiles = await Promise.all(
          followerIds.map(async (fid) => {
            const snap = await getDoc(doc(db, 'users', fid));
            return snap.exists() ? { id: fid, ...snap.data() } : null;
          })
        );

        const followingSnap = await getDocs(collection(db, 'users', userId, 'following'));
        const followingIds = followingSnap.docs.map((d) => d.id);

        const followingProfiles = await Promise.all(
          followingIds.map(async (fid) => {
            const snap = await getDoc(doc(db, 'users', fid));
            return snap.exists() ? { id: fid, ...snap.data() } : null;
          })
        );

        if (!cancelled) {
          setFollowers(followerProfiles.filter(Boolean));
          setFollowingList(followingProfiles.filter(Boolean));
        }
      } catch {
        if (!cancelled) {
          setFollowers([]);
          setFollowingList([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (userId) fetchLists();
    return () => { cancelled = true; };
  }, [userId]);

  const list = tab === 'followers' ? followers : followingList;
  const filtered = list.filter((user) => {
    if (!user) return false;
    const q = search.toLowerCase();
    return (
      user.name?.toLowerCase().includes(q) ||
      user.handle?.toLowerCase().includes(q)
    );
  });

  function openProfile(user) {
    if (user.id === myId) router.push('/profile');
    else router.push(`/profile/${user.id}`);
  }

  function followBtn(user) {
    const isFollowing = !!followedUsers[user.id];
    const isMe = user.id === myId;
    if (isMe) return null;
    return (
      <button
        onClick={(e) => { e.stopPropagation(); vibrate('light'); toggleFollowUser(user.id); }}
        aria-label={isFollowing ? `Unfollow ${user.name}` : `Follow ${user.name}`}
        className={`rounded-full border px-4 py-2 text-[11px] font-bold transition-all ${
          isFollowing ? 'border-transparent bg-gold-grad text-[#1a1300]' : 'border-gold text-gold'
        }`}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </button>
    );
  }

  return (
    <div className="app-shell flex flex-col overflow-hidden">
      <SubpageHeader title={tab === 'followers' ? 'Followers' : 'Following'} />

      <div className="flex border-b border-linesoft">
        <button
          onClick={() => setTab('followers')}
          className={`flex-1 py-3 text-[13px] font-bold transition-colors ${tab === 'followers' ? 'text-gold border-b-2 border-gold' : 'text-text3'}`}
        >
          Followers ({followers.length})
        </button>
        <button
          onClick={() => setTab('following')}
          className={`flex-1 py-3 text-[13px] font-bold transition-colors ${tab === 'following' ? 'text-gold border-b-2 border-gold' : 'text-text3'}`}
        >
          Following ({followingList.length})
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

      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-6">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-linesoft bg-card p-3.5">
              <div className="skeleton h-11 w-11 flex-none rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="skeleton mb-1.5 h-3.5 w-28 rounded-full" />
                <div className="skeleton h-3 w-20 rounded-full" />
              </div>
              <div className="skeleton h-7 w-16 flex-none rounded-full" />
            </div>
          ))
        ) : (
          filtered.map((user) => (
            <div
              key={user.id}
              onClick={() => openProfile(user)}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-linesoft bg-card p-3.5 transition-colors hover:border-gold/30"
            >
              <Avatar src={user.avatar} name={user.name} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="truncate text-[13px] font-bold">{user.name}</span>
                  {user.verified && <VerifiedBadge size={13} />}
                </div>
                <div className="truncate text-[11px] text-text2">{user.role || user.handle}</div>
              </div>
              {followBtn(user)}
            </div>
          ))
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-[13px] text-text2">
            {search
              ? 'No users found'
              : tab === 'followers'
                ? 'No followers yet'
                : 'Not following anyone yet'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FollowersPage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell flex flex-col overflow-hidden">
          <SubpageHeader title="Followers" />
          <div className="flex-1 px-4 pt-4">
            <div className="skeleton mb-2 h-10 w-full rounded-2xl" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton mb-2 h-16 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      }
    >
      <FollowersInner />
    </Suspense>
  );
}
