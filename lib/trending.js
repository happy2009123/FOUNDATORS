/**
 * Simple trending score based on engagement velocity.
 * Score = (likes * 1 + comments * 2 + shares * 3) / hours_since_post
 * Boost for recency: posts in last 24h get 2x multiplier
 */
export function calculateTrendScore(post) {
  const now = Date.now();
  const postTime = post.createdAt?.toDate?.()?.getTime?.() || 0;
  const hoursSince = Math.max((now - postTime) / (1000 * 60 * 60), 0.1);
  
  const engagement = (post.likes || 0) * 1 + (post.commentsCount || 0) * 2 + (post.shares || 0) * 3;
  const recencyBoost = hoursSince < 24 ? 2 : 1;
  
  return (engagement * recencyBoost) / hoursSince;
}

export function sortByTrend(posts) {
  return [...posts].sort((a, b) => calculateTrendScore(b) - calculateTrendScore(a));
}
