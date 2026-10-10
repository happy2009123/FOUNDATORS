import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { mapRow, mapRows, toRow, randomId } from '@/lib/supabase/db';

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

function requireSupabase() {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
  return getSupabase();
}

export async function getIdToken() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return (data && data.session && data.session.access_token) || null;
}

export async function callCopilot({ mode, payload, history }) {
  const token = await getIdToken();
  if (!token) throw new Error('Sign in required');
  const res = await fetch('/api/copilot/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mode, payload, history }),
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
  return { table: 'copilot_threads', uid };
}

export function conversationRef(uid, id) {
  return { table: 'copilot_threads', uid, id };
}

export function messagesRef(uid, id) {
  return { table: 'copilot_messages', uid, threadId: id };
}

export async function listConversations(uid) {
  const ref = conversationsRef(uid);
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from(ref.table)
    .select('*')
    .eq('user_id', ref.uid)
    .order('updated_at', { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return mapRows(data);
}

export async function createConversation(uid, data) {
  const ref = conversationsRef(uid);
  const supabase = requireSupabase();
  const id = randomId();
  const { error } = await supabase
    .from(ref.table)
    .insert(toRow({ id, userId: ref.uid, title: (data && data.title) || 'New chat' }));
  if (error) throw new Error(error.message);
  return id;
}

export async function touchConversation(uid, id, fields) {
  const ref = conversationRef(uid, id);
  const supabase = requireSupabase();
  const patch = { updatedAt: new Date() };
  if (fields && fields.title !== undefined) patch.title = String(fields.title);
  const { error } = await supabase
    .from(ref.table)
    .update(toRow(patch))
    .eq('id', ref.id)
    .eq('user_id', ref.uid);
  if (error) throw new Error(error.message);
}

// copilot_messages has a single content column, so messages that carry a
// card or source marker are stored as a JSON envelope; plain text stays raw.
function encodeMessageContent(message) {
  const text = message.text || '';
  const cardType = message.cardType || null;
  const card = message.card || null;
  const source = message.source || null;
  if (!cardType && !card && !source) return text;
  return JSON.stringify({ __c: 1, text, cardType, card, source });
}

function decodeMessageContent(content) {
  const raw = content || '';
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.__c === 1) {
        return {
          text: parsed.text || '',
          cardType: parsed.cardType || null,
          card: parsed.card || null,
          source: parsed.source || null,
        };
      }
    } catch (e) {
      // plain text that merely looks like JSON
    }
  }
  return { text: raw, cardType: null, card: null, source: null };
}

function mapMessage(row) {
  const mapped = mapRow(row);
  return {
    id: mapped.id,
    role: mapped.role,
    createdAt: mapped.createdAt,
    ...decodeMessageContent(mapped.content),
  };
}

export async function loadMessages(uid, id) {
  const ref = messagesRef(uid, id);
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from(ref.table)
    .select('*')
    .eq('thread_id', ref.threadId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(mapMessage);
}

export async function saveMessage(uid, id, message) {
  const ref = messagesRef(uid, id);
  const supabase = requireSupabase();
  const messageId = randomId();
  const { error } = await supabase
    .from(ref.table)
    .insert(
      toRow({
        id: messageId,
        threadId: ref.threadId,
        role: message.role,
        content: encodeMessageContent(message),
      })
    );
  if (error) throw new Error(error.message);
  return messageId;
}

function mapProject(row) {
  const mapped = mapRow(row);
  const owner = mapped.owner && typeof mapped.owner === 'object' ? mapped.owner : null;
  const members = Array.isArray(mapped.members) ? mapped.members : [];
  return {
    ...mapped,
    name: mapped.title || '',
    ownerUid: mapped.ownerId || '',
    ownerName: (owner && owner.name) || '',
    ownerAvatar: (owner && owner.avatar) || '',
    membersCount: members.length,
  };
}

// tasksTotal / tasksDone / progress were Firestore columns; the Supabase
// schema has none, so they are derived from project_tasks on every read
// (best-effort: RLS may hide tasks on projects the caller does not own).
async function mapProjectsWithStats(supabase, rows) {
  const mapped = rows.map(mapProject);
  if (!mapped.length) return mapped;
  const { data: taskRows } = await supabase
    .from('project_tasks')
    .select('project_id, status')
    .in('project_id', rows.map((r) => r.id));
  const stats = new Map();
  for (const t of taskRows || []) {
    const s = stats.get(t.project_id) || { total: 0, done: 0 };
    s.total += 1;
    if (t.status === 'done') s.done += 1;
    stats.set(t.project_id, s);
  }
  return mapped.map((p) => {
    const s = stats.get(p.id);
    const total = s ? s.total : 0;
    const done = s ? s.done : 0;
    return {
      ...p,
      tasksTotal: total,
      tasksDone: done,
      progress: total ? Math.round((done / total) * 100) : 0,
    };
  });
}

export async function listMyProjects(uid) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('projects')
    .select('*, owner:profiles(name, avatar)')
    .eq('owner_id', uid)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return mapProjectsWithStats(supabase, data || []);
}

export async function listRecentProjects() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('projects')
    .select('*, owner:profiles(name, avatar)')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return mapProjectsWithStats(supabase, data || []);
}

export async function getProject(projectId) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('projects')
    .select('*, owner:profiles(name, avatar)')
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const mapped = await mapProjectsWithStats(supabase, [data]);
  return mapped[0] || null;
}

function mapTask(row, index) {
  const mapped = mapRow(row);
  const { priority, ...rest } = mapped;
  let meta = null;
  if (typeof priority === 'string' && priority.startsWith('{')) {
    try {
      const parsed = JSON.parse(priority);
      if (parsed && parsed.__c === 1) meta = parsed;
    } catch (e) {
      // not the copilot envelope
    }
  }
  return {
    ...rest,
    phase: meta && Number.isFinite(meta.phase) ? meta.phase : 0,
    phaseTitle: meta ? String(meta.phaseTitle || '') : '',
    order: meta && Number.isFinite(meta.order) ? meta.order : index,
  };
}

export async function listProjectTasks(projectId) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(mapTask);
}

export async function createProjectFromCard(card, profile, conversationId) {
  const supabase = requireSupabase();
  const projectId = randomId();
  const tasks = Array.isArray(card.tasks) ? card.tasks.slice(0, 60) : [];
  const name = String(card.title || 'New Project').trim().slice(0, 120) || 'New Project';
  const description = String(card.summary || card.problem || name).trim().slice(0, 4000);
  const { error } = await supabase.from('projects').insert(
    toRow({
      id: projectId,
      ownerId: profile.id,
      title: name,
      description,
      stage: 'MVP',
      skillsNeeded: Array.isArray(card.tech) ? card.tech.slice(0, 10) : [],
      status: 'building',
      members: [profile.id],
    })
  );
  if (error) throw new Error(error.message);
  if (tasks.length) await generateTasks(projectId, tasks);
  return projectId;
}

export async function generateTasks(projectId, tasks) {
  const supabase = requireSupabase();
  const list = Array.isArray(tasks) ? tasks.slice(0, 60) : [];
  if (list.length) {
    // project_tasks has no order column: stagger created_at so the card's
    // task order survives the created_at-ascending read. phase/phaseTitle/
    // order have no columns either — they ride along as a marker-guarded
    // JSON envelope in priority (this module is the only task writer).
    const base = Date.now();
    const rows = list.map((task, index) =>
      toRow({
        id: randomId(),
        projectId,
        title: String(task.title || '').slice(0, 300),
        status: 'todo',
        priority: JSON.stringify({
          __c: 1,
          phase: Number.isFinite(task.phase) ? task.phase : 0,
          phaseTitle: String(task.phaseTitle || '').slice(0, 120),
          order: Number.isFinite(task.order) ? task.order : index,
        }),
        createdAt: new Date(base + index),
      })
    );
    const { error } = await supabase.from('project_tasks').insert(rows);
    if (error) throw new Error(error.message);
  }
  const { error: touchError } = await supabase
    .from('projects')
    .update(toRow({ updatedAt: new Date() }))
    .eq('id', projectId);
  if (touchError) throw new Error(touchError.message);
}

export async function setTaskStatus(projectId, taskId, status) {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('project_tasks')
    .update(toRow({ status, updatedAt: new Date() }))
    .eq('id', taskId)
    .eq('project_id', projectId);
  if (error) throw new Error(error.message);
}

export async function bumpProjectProgress(projectId) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('project_tasks')
    .select('status')
    .eq('project_id', projectId);
  if (error) throw new Error(error.message);
  const all = data || [];
  const done = all.filter((t) => t.status === 'done').length;
  const progress = all.length ? Math.round((done / all.length) * 100) : 0;
  const { error: touchError } = await supabase
    .from('projects')
    .update(toRow({ updatedAt: new Date() }))
    .eq('id', projectId);
  if (touchError) throw new Error(touchError.message);
  return progress;
}

export function bwmPostText(card) {
  return String((card && card.text) || '').slice(0, 5000);
}

export function buildPayload(mode, { idea, audience, industry, projectName, problem, solution, features, roles, commitment, message, projectContext }) {
  return { idea, audience, industry, projectName, problem, solution, features, roles, commitment, message, projectContext };
}
