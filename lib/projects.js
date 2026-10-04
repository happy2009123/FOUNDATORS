'use client';

// ─────────────────────────────────────────────────────────────
// PROJECTS 2.0 — collaboration data layer.
// Standalone project creation (outside Copilot), follow, apply/
// approve membership flow and project questions. Membership only
// ever changes through the owner accepting an application.
// ─────────────────────────────────────────────────────────────

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  arrayUnion,
  increment,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { notifyUser } from '@/lib/notify';

export const PROJECT_CATEGORIES = [
  'AI',
  'FinTech',
  'EdTech',
  'SaaS',
  'HealthTech',
  'Climate',
  'Developer Tools',
  'Consumer',
  'Other',
];

export const PROJECT_STAGES = ['Idea', 'Prototype', 'MVP', 'Launched', 'Growth'];

function sanitizeList(value, max, itemMax) {
  return (Array.isArray(value) ? value : [])
    .slice(0, max)
    .map((s) => String(s || '').trim().slice(0, itemMax))
    .filter(Boolean);
}

export async function createStandaloneProject(profile, data) {
  const projectId = doc(collection(db, 'projects')).id;
  const members = [profile.id];
  await setDoc(doc(db, 'projects', projectId), {
    name: String(data.name || '').trim().slice(0, 120) || 'Untitled project',
    description: String(data.description || '').trim().slice(0, 4000),
    problem: String(data.problem || '').trim().slice(0, 2000),
    solution: String(data.solution || '').trim().slice(0, 2000),
    stage: PROJECT_STAGES.includes(data.stage) ? data.stage : 'Idea',
    category: PROJECT_CATEGORIES.includes(data.category) ? data.category : 'Other',
    skillsNeeded: sanitizeList(data.skillsNeeded, 10, 40),
    teamRequirements: String(data.teamRequirements || '').trim().slice(0, 1000),
    goals: String(data.goals || '').trim().slice(0, 2000),
    status: 'building',
    progress: 0,
    ownerUid: profile.id,
    ownerName: String(profile.name || 'Founder').slice(0, 100) || 'Founder',
    ownerAvatar: profile.avatar || '',
    members,
    membersCount: 1,
    tasksTotal: 0,
    tasksDone: 0,
    followers: [],
    source: 'manual',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return projectId;
}

export function subscribeProject(projectId, cb) {
  return onSnapshot(
    doc(db, 'projects', projectId),
    (snap) => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    () => cb(null)
  );
}

export function subscribeProjectApplications(projectId, cb) {
  return onSnapshot(
    query(
      collection(db, 'projects', projectId, 'applications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    ),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([])
  );
}

export function subscribeProjectQuestions(projectId, cb) {
  return onSnapshot(
    query(
      collection(db, 'projects', projectId, 'questions'),
      orderBy('createdAt', 'asc'),
      limit(100)
    ),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([])
  );
}

export async function toggleProjectFollow(projectId, uid, follow) {
  await updateDoc(doc(db, 'projects', projectId), {
    followers: follow ? arrayUnion(uid) : arrayRemove(uid),
  });
}

export async function applyToProject(projectId, profile, message) {
  await setDoc(doc(db, 'projects', projectId, 'applications', profile.id), {
    uid: profile.id,
    name: String(profile.name || '').slice(0, 100),
    avatar: profile.avatar || '',
    handle: profile.handle || '',
    message: String(message || '').trim().slice(0, 1000),
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  try {
    const snap = await getDoc(doc(db, 'projects', projectId));
    if (snap.exists()) {
      const owner = snap.data().ownerUid;
      if (owner && owner !== profile.id) {
        notifyUser(owner, {
          type: 'collab',
          actorKey: profile.id,
          actorName: profile.name || 'A founder',
          text: `${profile.name || 'A founder'} applied to join ${snap.data().name}`,
          linkType: 'project',
          linkId: projectId,
        });
      }
    }
  } catch (e) {
    // notification is best-effort
  }
}

export async function withdrawApplication(projectId, uid) {
  await deleteDoc(doc(db, 'projects', projectId, 'applications', uid));
}

export async function decideApplication(projectId, owner, application, decision, projectName) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'projects', projectId, 'applications', application.uid), {
    status: decision,
    reviewedAt: serverTimestamp(),
  });
  if (decision === 'accepted') {
    batch.update(doc(db, 'projects', projectId), {
      members: arrayUnion(application.uid),
      membersCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
  notifyUser(application.uid, {
    type: 'collab',
    actorKey: owner.id,
    actorName: owner.name || 'Project owner',
    text:
      decision === 'accepted'
        ? `${owner.name || 'The owner'} accepted your application to join ${projectName || 'the project'}`
        : `${owner.name || 'The owner'} reviewed your application`,
    linkType: 'project',
    linkId: projectId,
  });
}

export async function addProjectQuestion(projectId, profile, text) {
  const clean = String(text || '').trim().slice(0, 1000);
  if (!clean) return null;
  const ref = await addDoc(collection(db, 'projects', projectId, 'questions'), {
    text: clean,
    authorKey: profile.id,
    authorName: String(profile.name || 'Founder').slice(0, 100),
    authorAvatar: profile.avatar || '',
    createdAt: serverTimestamp(),
  });
  try {
    const snap = await getDoc(doc(db, 'projects', projectId));
    if (snap.exists()) {
      const owner = snap.data().ownerUid;
      if (owner && owner !== profile.id) {
        notifyUser(owner, {
          type: 'comment',
          actorKey: profile.id,
          actorName: profile.name || 'A founder',
          text: `${profile.name || 'A founder'} asked a question on ${snap.data().name}`,
          linkType: 'project',
          linkId: projectId,
        });
      }
    }
  } catch (e) {
    // notification is best-effort
  }
  return ref.id;
}

export async function fetchUsersByIds(uids) {
  const list = (Array.isArray(uids) ? uids : []).slice(0, 20);
  try {
    const snaps = await Promise.all(list.map((id) => getDoc(doc(db, 'users', id))));
    return snaps.filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data() }));
  } catch (e) {
    return [];
  }
}

export function isProjectMember(project, uid) {
  return Boolean(project && Array.isArray(project.members) && uid && project.members.includes(uid));
}
