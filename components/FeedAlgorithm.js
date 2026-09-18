'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import PostCard from './PostCard';

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

export default function FeedAlgorithm() {
  const [feedType, setFeedType] = useState('foryou');
  const profile = useStore((s) => s.profile);
  const followedUsers = useStore((s) => s.followedUsers);
  const posts = useStore((s) => s.posts);

  const feedPosts = useMemo(() => {
    if (feedType === 'following') {
      return posts.filter(
        (p) => followedUsers[p.authorKey] || p.authorKey === profile?.id
      );
    }
    return [...posts].sort((a, b) => {
      const scoreA = scorePost(a, profile, followedUsers);
      const scoreB = scorePost(b, profile, followedUsers);
      return scoreB - scoreA;
    });
  }, [feedType, profile, followedUsers, posts]);

  return (
    <div className="mt-3">
      {/* Feed type toggle */}
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
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {feedPosts.length > 0 ? (
          feedPosts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="px-[18px] py-12 text-center">
            <div className="text-[14px] font-bold text-text2">No posts yet</div>
            <div className="mt-1 text-[12px] text-text3">Follow people to see their posts here</div>
          </div>
        )}
      </div>
    </div>
  );
}
