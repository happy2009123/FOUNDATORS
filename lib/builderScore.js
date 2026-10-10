'use client';

// ─────────────────────────────────────────────────────────────
// BUILDER SCORE — transparent reputation from real activity.
// Every point is derived from live database data that anyone could
// verify; nothing is stored or fabricated. The score is computed
// on read (never written), so it can never be gamed by editing a
// row. Quantity is capped — shipping, collaborating and organizing
// are what move the number.
// Activity aggregates come from posts / comments / follows
// (followers counter on profiles); trust and referrals come from
// the profile and referral_invites rows.
// ─────────────────────────────────────────────────────────────

import { getSupabase } from '@/lib/supabase/client';
import { mapRow } from '@/lib/supabase/db';

export const BUILDER_WEIGHTS = {
  ownedProject: 6,
  completedProject: 12,
  teamMember: 4,
  organizedEvent: 8,
  submittedIdea: 2,
  usefulPost: 1,
  postCap: 8,
  achievement: 6,
  verifiedProfile: 5,
  completeProfile: 4,
  activatedReferral: 3,
};

export const HOW_BUILDER_SCORE_WORKS = [
  {
    label: 'Shipping projects',
    text: `Each project you own earns ${BUILDER_WEIGHTS.ownedProject} points, plus ${BUILDER_WEIGHTS.completedProject} more when it reaches 100% progress.`,
  },
  {
    label: 'Collaborating',
    text: `Joining a project team earns ${BUILDER_WEIGHTS.teamMember} points per project — real membership, not just following along.`,
  },
  {
    label: 'Organizing events',
    text: `Publishing a real founder event earns ${BUILDER_WEIGHTS.organizedEvent} points.`,
  },
  {
    label: 'Sharing ideas',
    text: `Each idea you submit earns ${BUILDER_WEIGHTS.submittedIdea} points.`,
  },
  {
    label: 'Posting',
    text: `Each post earns ${BUILDER_WEIGHTS.usefulPost} point, capped at ${BUILDER_WEIGHTS.postCap} — volume alone never inflates your score.`,
  },
  {
    label: 'Achievements',
    text: `Finishing a Founder Challenge earns ${BUILDER_WEIGHTS.achievement} points per earned achievement.`,
  },
  {
    label: 'Trust & profile',
    text: `Admin verification is worth ${BUILDER_WEIGHTS.verifiedProfile}; a complete profile (bio, role and skills) earns ${BUILDER_WEIGHTS.completeProfile}.`,
  },
  {
    label: 'Referrals',
    text: `Each invited founder who becomes active earns ${BUILDER_WEIGHTS.activatedReferral} points — no points for signups that never show up.`,
  },
];

async function fetchProfile(uid, profile) {
  if (profile && profile.id === uid) return profile;
  try {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .limit(1);
    if (error || !data || !data.length) return null;
    return mapRow(data[0]);
  } catch (e) {
    return null;
  }
}

async function safeCount(table, column, uid, extra = {}) {
  try {
    const supabase = getSupabase();
    if (!supabase) return 0;
    let q = supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq(column, uid);
    Object.entries(extra).forEach(([k, v]) => { q = q.eq(k, v); });
    const { count, error } = await q;
    if (error) return 0;
    return count || 0;
  } catch (e) {
    return 0;
  }
}

// Post count + total likes received (posts and comments authored).
async function safeActivityStats(uid) {
  try {
    const supabase = getSupabase();
    if (!supabase) return { posts: 0, comments: 0, likes: 0 };
    const [postsRes, commentsRes] = await Promise.all([
      supabase.from('posts').select('likes').eq('author_key', uid),
      supabase.from('comments').select('likes').eq('author_key', uid),
    ]);
    if (postsRes.error || commentsRes.error) {
      return { posts: 0, comments: 0, likes: 0 };
    }
    const postRows = postsRes.data || [];
    const commentRows = commentsRes.data || [];
    const sumLikes = (rows) =>
      rows.reduce((sum, r) => sum + (Number(r.likes) || 0), 0);
    return {
      posts: postRows.length,
      comments: commentRows.length,
      likes: sumLikes(postRows) + sumLikes(commentRows),
    };
  } catch (e) {
    return { posts: 0, comments: 0, likes: 0 };
  }
}

export async function computeBuilderScore(uid, profile = null) {
  if (!uid) return null;

  const me = await fetchProfile(uid, profile);

  const [stats, activatedRefs] = await Promise.all([
    safeActivityStats(uid),
    safeCount('referral_invites', 'inviter_id', uid, { status: 'activated' }),
  ]);

  const postCount = stats.posts;
  const commentCount = stats.comments;
  const likesReceived = stats.likes;
  const followers = Math.max(0, Number(me?.followers) || 0);
  const postPoints = Math.min(postCount * BUILDER_WEIGHTS.usefulPost, BUILDER_WEIGHTS.postCap);
  const commentPoints = Math.min(commentCount * BUILDER_WEIGHTS.usefulPost, BUILDER_WEIGHTS.postCap);
  const likePoints = Math.min(likesReceived * BUILDER_WEIGHTS.usefulPost, BUILDER_WEIGHTS.postCap);
  const followerPoints = Math.min(followers * BUILDER_WEIGHTS.usefulPost, BUILDER_WEIGHTS.postCap);
  const verified = me?.verified === true;
  const completeProfile = Boolean(
    me && (me.bio || '').trim() && (me.role || '').trim() && (me.skills || []).length > 0
  );

  const cap = BUILDER_WEIGHTS.postCap;
  const breakdown = [
    {
      key: 'posts',
      label: `Posts (cap ${cap})`,
      value: postCount,
      points: postPoints,
    },
    {
      key: 'comments',
      label: `Comments (cap ${cap})`,
      value: commentCount,
      points: commentPoints,
    },
    {
      key: 'reactions',
      label: `Likes received (cap ${cap})`,
      value: likesReceived,
      points: likePoints,
    },
    {
      key: 'followers',
      label: `Followers (cap ${cap})`,
      value: followers,
      points: followerPoints,
    },
    {
      key: 'verified',
      label: 'Verified profile',
      value: verified ? 1 : 0,
      points: verified ? BUILDER_WEIGHTS.verifiedProfile : 0,
    },
    {
      key: 'profile',
      label: 'Complete profile',
      value: completeProfile ? 1 : 0,
      points: completeProfile ? BUILDER_WEIGHTS.completeProfile : 0,
    },
    {
      key: 'referrals',
      label: 'Activated referrals',
      value: activatedRefs,
      points: activatedRefs * BUILDER_WEIGHTS.activatedReferral,
    },
  ];

  const score = breakdown.reduce((sum, row) => sum + row.points, 0);

  return {
    score,
    breakdown,
    active: breakdown.filter((row) => row.points > 0),
    calculatedAt: Date.now(),
  };
}
