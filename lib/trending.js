/**
 * Simple trending score based on engagement velocity.
 * Score = (likes * 1 + comments * 2 + shares * 3) / hours_since_post
 * Boost for recency: posts in last 24h get 2x multiplier
 */
import { toMillis } from '@/lib/supabase/db';

export function calculateTrendScore(post) {
  const now = Date.now();
  // toMillis handles Timestamp shims, ISO strings, Dates and plain numbers —
  // the old .toDate() chain silently fell back to 0 (postTime epoch) for any
  // row that didn't come through the mapper, collapsing Trending scores.
  const postTime = toMillis(post.createdAt || post.created_at);
  const hoursSince = Math.max((now - postTime) / (1000 * 60 * 60), 0.1);
  
  const engagement = (post.likes || 0) * 1 + (post.commentsCount || 0) * 2 + (post.shares || 0) * 3;
  const recencyBoost = hoursSince < 24 ? 2 : 1;
  
  return (engagement * recencyBoost) / hoursSince;
}

export function sortByTrend(posts) {
  return [...posts].sort((a, b) => calculateTrendScore(b) - calculateTrendScore(a));
}
