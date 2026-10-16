'use client';

// Idea Vault: version snapshots + trusted-member access for private ideas.
// Used by the idea detail modal (author-only panel). All writes go through
// RLS: versions/members can only be written by the idea's author_key.

import { getSupabase } from './supabase/client';
import { mapRows, randomId, toRow } from './supabase/db';

export async function saveIdeaVersion(idea, uid) {
  const s = getSupabase();
  if (!s) throw new Error('Supabase not configured');

  const versionsRes = await s
    .from('idea_versions')
    .select('version')
    .eq('idea_id', idea.id)
    .order('version', { ascending: false })
    .limit(1);
  if (versionsRes.error) throw versionsRes.error;
  const nextV =
    ((versionsRes.data && versionsRes.data[0] && versionsRes.data[0].version) || 0) + 1;

  const { error } = await s.from('idea_versions').insert(
    toRow({
      id: `v_${randomId()}`,
      ideaId: idea.id,
      version: nextV,
      title: idea.name || '',
      summary: idea.tagline || '',
      body: {
        description: idea.description || '',
        problem: idea.problem || '',
        solution: idea.solution || '',
        audience: idea.audience || '',
        tech: idea.tech || '',
        stage: idea.stage || '',
      },
      createdBy: uid,
    })
  );
  if (error) throw error;
  return nextV;
}

export async function fetchIdeaVersions(ideaId) {
  const s = getSupabase();
  if (!s) return [];
  const { data, error } = await s
    .from('idea_versions')
    .select('*')
    .eq('idea_id', ideaId)
    .order('version', { ascending: false })
    .limit(20);
  if (error) throw error;
  return mapRows(data || []);
}

export async function fetchVaultMembers(ideaId) {
  const s = getSupabase();
  if (!s) return [];
  const { data, error } = await s
    .from('idea_vault_members')
    .select('*')
    .eq('idea_id', ideaId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return mapRows(data || []);
}

export async function addVaultMember(ideaId, uid, addedBy) {
  const s = getSupabase();
  if (!s) throw new Error('Supabase not configured');
  const { error } = await s
    .from('idea_vault_members')
    .upsert(
      toRow({ ideaId, userId: uid, addedBy }),
      { onConflict: 'idea_id,user_id', ignoreDuplicates: true }
    );
  if (error) throw error;
  return true;
}

export async function removeVaultMember(ideaId, uid) {
  const s = getSupabase();
  if (!s) throw new Error('Supabase not configured');
  const { error } = await s
    .from('idea_vault_members')
    .delete()
    .eq('idea_id', ideaId)
    .eq('user_id', uid);
  if (error) throw error;
  return true;
}

export async function restoreIdeaVersion(idea, versionRow) {
  const s = getSupabase();
  if (!s) throw new Error('Supabase not configured');
  const body = versionRow.body || {};
  const { error } = await s
    .from('ideas')
    .update(
      toRow({
        title: versionRow.title,
        summary: versionRow.summary,
        description: body.description || '',
        problem: body.problem || '',
        solution: body.solution || '',
        audience: body.audience || '',
        tech: body.tech || '',
        stage: body.stage || '',
      })
    )
    .eq('id', idea.id);
  if (error) throw error;
  return true;
}
