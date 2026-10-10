'use client';

// ─────────────────────────────────────────────────────────────
// PROJECTS 2.0 — collaboration data layer.
// Standalone project creation (outside Copilot), follow, apply/
// approve membership flow and project questions. Membership only
// ever changes through the owner accepting an application.
// ─────────────────────────────────────────────────────────────

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { subscribeQuery } from '@/lib/supabase/realtime';
import { mapRow, mapRows, toRow, randomId } from '@/lib/supabase/db';
import { notifyUser } from '@/lib/notify';
import { activateInviteIfNeeded } from '@/lib/referrals';

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

function requireSupabase() {
  if (!isSupabaseConfigured() || !getSupabase()) {
    throw new Error('Supabase not configured');
  }
  return getSupabase();
}

// RLS keys every write off auth.uid(), never off a possibly stale profile.
async function currentUid(fallback) {
  try {
    const { data } = await getSupabase().auth.getSession();
    return data?.session?.user?.id || fallback || null;
  } catch {
    return fallback || null;
  }
}

async function fetchProfileMap(ids) {
  const list = [...new Set((ids || []).filter(Boolean))].slice(0, 30);
  if (!list.length) return new Map();
  try {
    const { data } = await getSupabase()
      .from('profiles')
      .select('id, name, handle, avatar')
      .in('id', list);
    return new Map((data || []).map((p) => [p.id, p]));
  } catch {
    return new Map();
  }
}

// Owner card + follow state + legacy aliases the pages still read.
async function hydrateProject(project) {
  let owner = null;
  let following = false;
  let uid = null;
  try {
    const supabase = getSupabase();
    uid = await currentUid();
    const [ownerRes, followRes] = await Promise.all([
      supabase.from('profiles').select('name, avatar').eq('id', project.ownerId).maybeSingle(),
      uid
        ? supabase
            .from('project_followers')
            .select('user_id')
            .eq('project_id', project.id)
            .eq('user_id', uid)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    owner = ownerRes?.data || null;
    following = Boolean(followRes?.data);
  } catch {
    // owner/follow hydration is best-effort — the project row itself is fine
  }
  const members = Array.isArray(project.members) ? project.members : [];
  return {
    ...project,
    name: project.title || '',
    ownerUid: project.ownerId || '',
    ownerName: owner?.name || '',
    ownerAvatar: owner?.avatar || '',
    membersCount: members.length,
    // project_followers is RLS-scoped to own rows, so this is "do I follow",
    // not the full roster — followers_count carries the total.
    followers: uid && following ? [uid] : [],
    teamRequirements: project.lookingFor || '',
  };
}

async function hydrateApplications(rows) {
  const map = await fetchProfileMap(rows.map((r) => r.userId));
  return rows.map((r) => {
    const p = map.get(r.userId);
    return {
      ...r,
      uid: r.userId,
      name: p?.name || '',
      handle: p?.handle || '',
      avatar: p?.avatar || '',
    };
  });
}

async function hydrateQuestions(rows) {
  const map = await fetchProfileMap(rows.map((r) => r.authorId));
  return rows.map((r) => {
    const p = map.get(r.authorId);
    return {
      ...r,
      authorKey: r.authorId,
      authorName: p?.name || '',
      authorAvatar: p?.avatar || '',
    };
  });
}

export async function createStandaloneProject(profile, data) {
  const supabase = requireSupabase();
  const projectId = randomId();
  const ownerUid = (await currentUid(profile.id)) || profile.id;
  const members = [ownerUid];
  // problem/solution/category/goals/progress have no columns in projects.
  const { error } = await supabase.from('projects').insert(
    toRow({
      id: projectId,
      ownerId: ownerUid,
      title: String(data.name || '').trim().slice(0, 120) || 'Untitled project',
      description: String(data.description || '').trim().slice(0, 4000),
      stage: PROJECT_STAGES.includes(data.stage) ? data.stage : 'Idea',
      skillsNeeded: sanitizeList(data.skillsNeeded, 10, 40),
      lookingFor: String(data.teamRequirements || '').trim().slice(0, 1000) || null,
      status: 'open',
      members,
    })
  );
  if (error) throw new Error(error.message);
  activateInviteIfNeeded(ownerUid).catch(() => {});
  return projectId;
}

export function subscribeProject(projectId, cb) {
  if (!isSupabaseConfigured() || !getSupabase()) return () => {};
  return subscribeQuery({
    key: `project:${projectId}`,
    table: 'projects',
    filter: `id=eq.${projectId}`,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return hydrateProject(mapRow(data));
    },
    onData: (project) => cb(project, null),
    // Distinguish a real error (offline / RLS denial / channel failure)
    // from "project does not exist" (which arrives as onData(null)) — both
    // used to report null, so the page could never show a retryable state.
    onError: (err) => cb(null, err),
  });
}

export function subscribeProjectApplications(projectId, cb) {
  if (!isSupabaseConfigured() || !getSupabase()) return () => {};
  return subscribeQuery({
    key: `project-applications:${projectId}`,
    table: 'project_applications',
    filter: `project_id=eq.${projectId}`,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('project_applications')
        .select('*')
        .eq('project_id', projectId)
        // Withdrawn rows stay in the table (no DELETE policy) but must stay
        // invisible — the old code deleted the doc outright.
        .neq('status', 'withdrawn')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return hydrateApplications(mapRows(data));
    },
    onData: cb,
    onError: () => cb([]),
  });
}

export function subscribeProjectQuestions(projectId, cb) {
  if (!isSupabaseConfigured() || !getSupabase()) return () => {};
  return subscribeQuery({
    key: `project-questions:${projectId}`,
    table: 'project_questions',
    filter: `project_id=eq.${projectId}`,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('project_questions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      return hydrateQuestions(mapRows(data));
    },
    onData: cb,
    onError: () => cb([]),
  });
}

export async function toggleProjectFollow(projectId, uid, follow) {
  const supabase = requireSupabase();
  const { data: existing, error: findErr } = await supabase
    .from('project_followers')
    .select('user_id')
    .eq('project_id', projectId)
    .eq('user_id', uid)
    .limit(1);
  if (findErr) throw new Error(findErr.message);
  const has = Boolean(existing?.length);
  if (follow && !has) {
    const { error } = await supabase
      .from('project_followers')
      .insert({ project_id: projectId, user_id: uid });
    if (error) throw new Error(error.message);
  } else if (!follow && has) {
    const { error } = await supabase
      .from('project_followers')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', uid);
    if (error) throw new Error(error.message);
  }
  if (follow !== has) {
    // followers_count lives on the project row, which only the owner may
    // update — a non-owner's bump is silently dropped by RLS.
    const { data: proj } = await supabase
      .from('projects')
      .select('followers_count')
      .eq('id', projectId)
      .maybeSingle();
    if (proj) {
      await supabase
        .from('projects')
        .update({ followers_count: Math.max(0, (proj.followers_count || 0) + (follow ? 1 : -1)) })
        .eq('id', projectId);
    }
  }
}

// Owner edit of the project's core details (rules: owner or admin update).
// Values are trimmed/capped exactly like createStandaloneProject so the
// same validation guarantees hold. updated_at is maintained by the
// projects_updated_at trigger.
export async function updateProjectDetails(projectId, data) {
  const supabase = requireSupabase();
  const patch = {};
  const putStr = (key, value, max) => {
    if (value === undefined) return;
    patch[key] = String(value ?? '').trim().slice(0, max);
  };
  putStr('title', data.name, 120);
  putStr('description', data.description, 4000);
  putStr('lookingFor', data.teamRequirements, 1000);
  // problem/solution/goals/category have no columns in projects — dropped.
  if (data.stage !== undefined) {
    patch.stage = PROJECT_STAGES.includes(data.stage) ? data.stage : 'Idea';
  }
  if (data.skillsNeeded !== undefined) {
    patch.skillsNeeded = sanitizeList(data.skillsNeeded, 10, 40);
  }
  if (patch.title === '') {
    throw new Error('Project name is required');
  }
  if (!Object.keys(patch).length) return { success: true };
  const { error } = await supabase
    .from('projects')
    .update(toRow(patch))
    .eq('id', projectId);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Owner delete: applications/questions/tasks/followers/members all reference
// projects(id) ON DELETE CASCADE, so the single parent delete replaces the
// old subcollection sweep.
export async function deleteProject(projectId) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function applyToProject(projectId, profile, message) {
  const supabase = requireSupabase();
  const uid = (await currentUid(profile.id)) || profile.id;
  const clean = String(message || '').trim().slice(0, 1000);
  // RLS exposes no DELETE on project_applications (and only the owner may
  // decide status), so a re-apply UPDATES the applicant's own row instead of
  // the old delete-then-create dance — same "clean pending application" end
  // state, and an update the applicant is always allowed to make.
  const { data: existingRows, error: findErr } = await supabase
    .from('project_applications')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', uid)
    .limit(1);
  if (findErr) throw new Error(findErr.message);
  const existing = existingRows?.[0];
  if (existing) {
    const { error } = await supabase
      .from('project_applications')
      .update({ message: clean, status: 'pending', created_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('project_applications').insert({
      id: randomId(),
      project_id: projectId,
      user_id: uid,
      message: clean,
      status: 'pending',
    });
    if (error) throw new Error(error.message);
  }
  try {
    const { data: proj } = await supabase
      .from('projects')
      .select('owner_id, title')
      .eq('id', projectId)
      .maybeSingle();
    if (proj?.owner_id && proj.owner_id !== uid) {
      notifyUser(proj.owner_id, {
        type: 'collab',
        actorKey: uid,
        actorName: profile.name || 'A founder',
        text: `${profile.name || 'A founder'} applied to join ${proj.title}`,
        linkType: 'project',
        linkId: projectId,
      });
    }
  } catch {
    // notification is best-effort
  }
}

export async function withdrawApplication(projectId, uid) {
  const supabase = requireSupabase();
  // No DELETE policy — withdraw is a status change that the owner's
  // subscription filters out (the old code deleted the doc).
  const { error } = await supabase
    .from('project_applications')
    .update({ status: 'withdrawn' })
    .eq('project_id', projectId)
    .eq('user_id', uid);
  if (error) throw new Error(error.message);
}

export async function decideApplication(projectId, owner, application, decision, projectName) {
  const supabase = requireSupabase();
  const applicantUid = application?.uid || application?.user_id;
  const { error: statusErr } = await supabase
    .from('project_applications')
    .update({ status: decision })
    .eq('project_id', projectId)
    .eq('user_id', applicantUid);
  if (statusErr) throw new Error(statusErr.message);
  if (decision === 'accepted') {
    // project_members only allows self-inserts under RLS, so membership is
    // recorded in the owner-editable projects.members jsonb (as before).
    const { data: proj, error: projErr } = await supabase
      .from('projects')
      .select('members')
      .eq('id', projectId)
      .maybeSingle();
    if (projErr) throw new Error(projErr.message);
    const members = Array.isArray(proj?.members) ? proj.members : [];
    if (proj && !members.includes(applicantUid)) {
      const { error } = await supabase
        .from('projects')
        .update({ members: [...members, applicantUid] })
        .eq('id', projectId);
      if (error) throw new Error(error.message);
    }
  }
  notifyUser(applicantUid, {
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
  const supabase = requireSupabase();
  const uid = (await currentUid(profile.id)) || profile.id;
  const questionId = randomId();
  const { error } = await supabase.from('project_questions').insert({
    id: questionId,
    project_id: projectId,
    author_id: uid,
    text: clean,
  });
  if (error) throw new Error(error.message);
  try {
    const { data: proj } = await supabase
      .from('projects')
      .select('owner_id, title')
      .eq('id', projectId)
      .maybeSingle();
    if (proj?.owner_id && proj.owner_id !== uid) {
      notifyUser(proj.owner_id, {
        type: 'comment',
        actorKey: uid,
        actorName: profile.name || 'A founder',
        text: `${profile.name || 'A founder'} asked a question on ${proj.title}`,
        linkType: 'project',
        linkId: projectId,
      });
    }
  } catch {
    // notification is best-effort
  }
  return questionId;
}

export async function fetchUsersByIds(uids) {
  const list = (Array.isArray(uids) ? uids : []).slice(0, 20);
  if (!list.length || !isSupabaseConfigured() || !getSupabase()) return [];
  try {
    const { data, error } = await getSupabase().from('profiles').select('*').in('id', list);
    if (error) return [];
    return mapRows(data);
  } catch {
    return [];
  }
}

export function isProjectMember(project, uid) {
  return Boolean(project && Array.isArray(project.members) && uid && project.members.includes(uid));
}
