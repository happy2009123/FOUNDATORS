'use client';

// ─────────────────────────────────────────────────────────────
// BUILDER SCORE — transparent reputation from real activity.
// Every point is derived from Firestore data that anyone could
// verify; nothing is stored or fabricated. The score is computed
// on read (never written), so it can never be gamed by editing a
// document. Quantity of posts is capped — shipping, collaborating
// and organizing are what move the number.
// ─────────────────────────────────────────────────────────────

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  query,
  where,
  limit,
} from 'firebase/firestore';

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

async function safeCount(q) {
  try {
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch (e) {
    return 0;
  }
}

async function safeGetDocs(q) {
  try {
    const snap = await getDocs(q);
    return snap.docs;
  } catch (e) {
    return [];
  }
}

async function fetchProfile(uid, profile) {
  if (profile && profile.id === uid) return profile;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (e) {
    return null;
  }
}

export async function computeBuilderScore(uid, profile = null) {
  if (!uid) return null;

  const me = await fetchProfile(uid, profile);

  const [
    ownedDocs,
    memberCount,
    eventCount,
    ideaCount,
    postCount,
    achievementDocs,
    inviteDocs,
  ] = await Promise.all([
    safeGetDocs(
      query(collection(db, 'projects'), where('ownerUid', '==', uid), limit(50))
    ),
    safeCount(
      query(collection(db, 'projects'), where('members', 'array-contains', uid))
    ),
    safeCount(query(collection(db, 'events'), where('creatorKey', '==', uid))),
    safeCount(query(collection(db, 'ideas'), where('authorKey', '==', uid))),
    safeCount(query(collection(db, 'posts'), where('authorKey', '==', uid))),
    safeGetDocs(collection(db, 'users', uid, 'achievements')),
    safeGetDocs(
      query(
        collection(db, 'users', uid, 'invites'),
        where('activated', '==', true),
        limit(100)
      )
    ),
  ]);

  const owned = ownedDocs.length;
  const completed = ownedDocs.filter((d) => {
    const p = d.data();
    return typeof p.progress === 'number' && p.progress >= 100;
  }).length;
  const collaborations = Math.max(0, memberCount - owned);
  const postPoints = Math.min(postCount * BUILDER_WEIGHTS.usefulPost, BUILDER_WEIGHTS.postCap);
  const verified = me?.verified === true;
  const completeProfile = Boolean(
    me && (me.bio || '').trim() && (me.role || '').trim() && (me.skills || []).length > 0
  );

  const breakdown = [
    {
      key: 'owned',
      label: 'Projects owned',
      value: owned,
      points: owned * BUILDER_WEIGHTS.ownedProject,
    },
    {
      key: 'completed',
      label: 'Projects completed',
      value: completed,
      points: completed * BUILDER_WEIGHTS.completedProject,
    },
    {
      key: 'collab',
      label: 'Team collaborations',
      value: collaborations,
      points: collaborations * BUILDER_WEIGHTS.teamMember,
    },
    {
      key: 'events',
      label: 'Events organized',
      value: eventCount,
      points: eventCount * BUILDER_WEIGHTS.organizedEvent,
    },
    {
      key: 'ideas',
      label: 'Ideas shared',
      value: ideaCount,
      points: ideaCount * BUILDER_WEIGHTS.submittedIdea,
    },
    {
      key: 'posts',
      label: `Posts (cap ${BUILDER_WEIGHTS.postCap})`,
      value: postCount,
      points: postPoints,
    },
    {
      key: 'achievements',
      label: 'Achievements',
      value: achievementDocs.length,
      points: achievementDocs.length * BUILDER_WEIGHTS.achievement,
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
      value: inviteDocs.length,
      points: inviteDocs.length * BUILDER_WEIGHTS.activatedReferral,
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
