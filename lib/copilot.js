import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export const MODES = [
  {
    key: 'analyze',
    label: 'Analyze Idea',
    blurb: 'Problem, users, competitors, risks',
    placeholder: 'Describe your idea in a few sentences...',
    card: 'analysis',
  },
  {
    key: 'validate',
    label: 'Validate',
    blurb: 'Interview plan, demand test, kill criteria',
    placeholder: 'What do you want to validate, and for whom?',
    placeholderShort: 'Who is the audience?',
    card: 'validation',
  },
  {
    key: 'mvp',
    label: 'Plan MVP',
    blurb: 'Roadmap and ready-to-track tasks',
    placeholder: 'What should the first version do?',
    card: 'mvp',
  },
  {
    key: 'launch',
    label: 'Launch',
    blurb: 'Pre-launch checklist and one metric',
    placeholder: 'Launching soon? Describe where you are.',
    card: 'launch',
  },
  {
    key: 'draft',
    label: 'Build With Me',
    blurb: 'Recruit collaborators to your build',
    placeholder: 'What are you building, and who do you need?',
    card: 'bwm_draft',
  },
  {
    key: 'chat',
    label: 'Chat',
    blurb: 'Free-form founder advice',
    placeholder: 'Ask anything about building your startup...',
    card: null,
  },
];

export const CARD_LABELS = {
  analysis: 'Idea Analysis',
  validation: 'Validation Plan',
  mvp: 'MVP Roadmap',
  launch: 'Launch Checklist',
  bwm_draft: 'Build With Me Draft',
};

export function modeMeta(key) {
  return MODES.find((m) => m.key === key) || MODES[5];
}

export async function getIdToken() {
  const user = auth && auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export async function callCopilot({ mode, payload, history }) {
  const idToken = await getIdToken();
  if (!idToken) throw new Error('Sign in required');
  const res = await fetch('/api/copilot/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, mode, payload, history }),
  });
  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    json = null;
  }
  if (!res.ok || !json || !json.ok) {
    throw new Error((json && json.error) || `Request failed (${res.status})`);
  }
  return json;
}

export function conversationsRef(uid) {
  return collection(db, 'users', uid, 'copilotConversations');
}

export function conversationRef(uid, id) {
  return doc(db, 'users', uid, 'copilotConversations', id);
}

export function messagesRef(uid, id) {
  return collection(db, 'users', uid, 'copilotConversations', id, 'messages');
}

export async function listConversations(uid) {
  const snap = await getDocs(query(conversationsRef(uid), orderBy('updatedAt', 'desc'), limit(20)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createConversation(uid, data) {
  const ref = await addDoc(conversationsRef(uid), {
    title: data.title || 'New conversation',
    mode: data.mode || 'chat',
    projectId: data.projectId || null,
    projectName: data.projectName || null,
    messageCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function touchConversation(uid, id, fields) {
  await updateDoc(conversationRef(uid, id), { ...fields, updatedAt: serverTimestamp() });
}

export async function loadMessages(uid, id) {
  const snap = await getDocs(query(messagesRef(uid, id), orderBy('createdAt', 'asc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveMessage(uid, id, message) {
  const ref = await addDoc(messagesRef(uid, id), {
    role: message.role,
    text: message.text || '',
    cardType: message.cardType || null,
    card: message.card || null,
    source: message.source || null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listMyProjects(uid) {
  const snap = await getDocs(query(collection(db, 'projects'), where('ownerUid', '==', uid), limit(20)));
  const list = snap.docs.map((d) => {
    const data = d.data();
    const ts = data.createdAt && data.createdAt.toMillis ? data.createdAt.toMillis() : 0;
    return { id: d.id, ...data, _ts: ts };
  });
  list.sort((a, b) => b._ts - a._ts);
  return list.map(({ _ts, ...rest }) => rest);
}

export async function listRecentProjects() {
  const snap = await getDocs(query(collection(db, 'projects'), orderBy('createdAt', 'desc'), limit(30)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getProject(projectId) {
  const snap = await getDoc(doc(db, 'projects', projectId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listProjectTasks(projectId) {
  const snap = await getDocs(
    query(collection(db, 'projects', projectId, 'tasks'), orderBy('order', 'asc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createProjectFromCard(card, profile, conversationId) {
  const projectId = doc(collection(db, 'projects')).id;
  const tasks = Array.isArray(card.tasks) ? card.tasks.slice(0, 60) : [];
  const members = [profile.id];
  const name = String(card.title || 'New Project').trim().slice(0, 120) || 'New Project';
  const description = String(card.summary || card.problem || name).trim().slice(0, 4000);
  await setDoc(doc(db, 'projects', projectId), {
    name,
    description,
    problem: String(card.problem || '').slice(0, 2000),
    solution: String(card.solution || '').slice(0, 2000),
    targetUsers: Array.isArray(card.targetUsers) ? card.targetUsers.slice(0, 6) : [],
    features: Array.isArray(card.features) ? card.features.slice(0, 10) : [],
    tech: Array.isArray(card.tech) ? card.tech.slice(0, 6) : [],
    milestones: Array.isArray(card.milestones) ? card.milestones.slice(0, 6) : [],
    stage: 'MVP',
    status: 'building',
    progress: 0,
    ownerUid: profile.id,
    ownerName: String(profile.name || 'Founder').slice(0, 100) || 'Founder',
    ownerAvatar: profile.avatar || '',
    members,
    membersCount: members.length,
    tasksTotal: tasks.length,
    tasksDone: 0,
    source: 'copilot',
    conversationId: conversationId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  if (tasks.length) {
    await generateTasks(projectId, tasks);
  }
  return projectId;
}

export async function generateTasks(projectId, tasks) {
  const batch = writeBatch(db);
  const list = Array.isArray(tasks) ? tasks.slice(0, 60) : [];
  list.forEach((task, index) => {
    const ref = doc(collection(db, 'projects', projectId, 'tasks'));
    batch.set(ref, {
      title: String(task.title || '').slice(0, 300),
      phase: Number.isFinite(task.phase) ? task.phase : 0,
      phaseTitle: String(task.phaseTitle || '').slice(0, 120),
      status: 'todo',
      order: Number.isFinite(task.order) ? task.order : index,
      createdAt: serverTimestamp(),
    });
  });
  if (list.length) await batch.commit();
  await updateDoc(doc(db, 'projects', projectId), {
    tasksTotal: list.length,
    updatedAt: serverTimestamp(),
  });
}

export async function setTaskStatus(projectId, taskId, status) {
  await updateDoc(doc(db, 'projects', projectId, 'tasks', taskId), { status });
}

export async function bumpProjectProgress(projectId) {
  const snap = await getDocs(collection(db, 'projects', projectId, 'tasks'));
  const all = snap.docs.map((d) => d.data());
  const done = all.filter((t) => t.status === 'done').length;
  const progress = all.length ? Math.round((done / all.length) * 100) : 0;
  await updateDoc(doc(db, 'projects', projectId), {
    tasksDone: done,
    tasksTotal: all.length,
    progress,
    updatedAt: serverTimestamp(),
  });
  return progress;
}

export function bwmPostText(card) {
  return String((card && card.text) || '').slice(0, 5000);
}

export function buildPayload(mode, { idea, audience, industry, projectName, problem, solution, features, roles, commitment, message, projectContext }) {
  return { idea, audience, industry, projectName, problem, solution, features, roles, commitment, message, projectContext };
}
