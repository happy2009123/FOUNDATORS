'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import PostCard from './PostCard';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import { sortByTrend } from '@/lib/trending';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, startAfter } from 'firebase/firestore';

function scorePost(post, profile, followedUsers) {
  let score = 0;
  const isFollowing = followedUsers[post.authorKey];
  if (isFollowing) score += 50;
  if (post.authorKey === profile?.id) score += 100;
  if (post.text) {
    const interests = profile?.interests || [];
    const text = post.text.toLowerCase();
    const interestMatch = interests.some((i) => text.includes(i.toLowerCase().split(' ')[0]));
    if (interestMatch) score += 30;
    if (post.likes > 50) score += 10;
    if (post.likes > 20) score += 5;
    if (text.includes('?')) score += 5;
    const emojis = (text.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length;
    score += Math.min(emojis * 2, 6);
  }
  return score;
}

const PAGE_SIZE = 20;

// Module-level cache so navigating away and back to /home doesn't re-query
// Firestore from scratch. Cleared only on hard refresh.
let cachedInitial = null;

export default function FeedAlgorithm() {
  const [feedType, setFeedType] = useState('foryou');
  const profile = useStore((s) => s.profile);
  const followedUsers = useStore((s) => s.followedUsers);
  const posts = useStore((s) => s.posts);

  const [firestorePosts, setFirestorePosts] = useState(() => cachedInitial?.posts || []);
  const [lastDoc, setLastDoc] = useState(() => cachedInitial?.lastDoc || null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(() => cachedInitial ? cachedInitial.hasMore : true);
  const [initialLoaded, setInitialLoaded] = useState(() => !!cachedInitial);

  const loadInitial = useCallback(async () => {
    if (!db || cachedInitial) return;
    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      cachedInitial = {
        posts: fetched,
        lastDoc: snap.docs[snap.docs.length - 1] || null,
        hasMore: snap.docs.length === PAGE_SIZE,
      };
      setFirestorePosts(fetched);
      setLastDoc(cachedInitial.lastDoc);
      setHasMore(cachedInitial.hasMore);
      setInitialLoaded(true);
    } catch {
      setInitialLoaded(true);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !lastDoc || !db) return;
    setLoadingMore(true);
    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      const newPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFirestorePosts(prev => [...prev, ...newPosts]);
      if (cachedInitial) cachedInitial.posts = [...cachedInitial.posts, ...newPosts];
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(newPosts.length === PAGE_SIZE);
    } catch {}
    setLoadingMore(false);
  }, [hasMore, loadingMore, lastDoc]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const lastRef = useInfiniteScroll(loadMore, hasMore);

  const allPosts = useMemo(() => {
    if (firestorePosts.length > 0) return firestorePosts;
    return posts;
  }, [firestorePosts, posts]);

  const feedPosts = useMemo(() => {
    if (feedType === 'trending') {
      return sortByTrend(allPosts);
    }
    if (feedType === 'following') {
      return allPosts.filter(
        (p) => followedUsers[p.authorKey] || p.authorKey === profile?.id
      );
    }
    return [...allPosts].sort((a, b) => {
      const scoreA = scorePost(a, profile, followedUsers);
      const scoreB = scorePost(b, profile, followedUsers);
      return scoreB - scoreA;
    });
  }, [feedType, profile, followedUsers, allPosts]);

  return (
    <div className="mt-3">
      <div className="flex items-center gap-1 px-[18px] mb-3">
        <button
          onClick={() => setFeedType('foryou')}
          className={`rounded-full px-4 py-2 text-[12px] font-bold transition-all ${
            feedType === 'foryou'
              ? 'bg-gold text-[#1a1300]'
              : 'bg-white/5 text-text2 hover:bg-white/10'
          }`}
          aria-label="For You feed"
        >
          For You
        </button>
        <button
          onClick={() => setFeedType('following')}
          className={`rounded-full px-4 py-2 text-[12px] font-bold transition-all ${
            feedType === 'following'
              ? 'bg-gold text-[#1a1300]'
              : 'bg-white/5 text-text2 hover:bg-white/10'
          }`}
          aria-label="Following feed"
        >
          Following
        </button>
        <button
          onClick={() => setFeedType('trending')}
          className={`rounded-full px-4 py-2 text-[12px] font-bold transition-all ${
            feedType === 'trending'
              ? 'bg-gold text-[#1a1300]'
              : 'bg-white/5 text-text2 hover:bg-white/10'
          }`}
          aria-label="Trending feed"
        >
          Trending
        </button>
      </div>

      <div className="space-y-4">
        {feedPosts.length > 0 ? (
          feedPosts.map((post, i) => (
            <div key={post.id} ref={i === feedPosts.length - 1 ? lastRef : null}>
              <PostCard post={post} />
            </div>
          ))
        ) : (
          <div className="px-[18px] py-12 text-center">
            <div className="text-[14px] font-bold text-text2">No posts yet</div>
            <div className="mt-1 text-[12px] text-text3">Follow people to see their posts here</div>
          </div>
        )}
        {loadingMore && (
          <div className="py-4 text-center">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent inline-block" />
          </div>
        )}
      </div>
    </div>
  );
}
