// Gestures data layer (migration 0017). Replaces the in-memory store seeds
// that made the community gallery, trending page, collab signing and shared
// links forget everything on reload.
import { getSupabase } from '@/lib/supabase/client';
import { mapRow, mapRows, toRow, randomId } from '@/lib/supabase/db';

// ── Gesture instances (personal greetings) ──────────────────────────
export async function createGestureInstance({ authorKey, templateKey, customizations }) {
  const supabase = getSupabase();
  if (!supabase) return { error: 'not-configured' };
  const id = randomId();
  const { error } = await supabase
    .from('gesture_instances')
    .insert(toRow({
      id,
      authorKey,
      templateKey: templateKey || '',
      customizations: customizations || {},
    }));
  if (error) return { error: error.message };
  return { id };
}

export async function listGestureInstances({ authorKey = null, limit = 60 } = {}) {
  const supabase = getSupabase();
  if (!supabase) return [];
  let q = supabase
    .from('gesture_instances')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (authorKey) q = q.eq('author_key', authorKey);
  const { data, error } = await q;
  if (error) return [];
  return mapRows(data);
}

export async function getGestureInstance(id) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('gesture_instances')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return null;
  return mapRow(data);
}

export async function reactToGestureInstance(id, reaction) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('react_to_gesture', {
    p_instance_id: id,
    p_reaction: reaction,
  });
  if (error) return null;
  return data;
}

export async function incrementGestureInstanceView(id) {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.rpc('increment_gesture_view', { p_instance_id: id }).then(() => {});
}

// ── Community templates ─────────────────────────────────────────────
export async function listGestureTemplates({ authorKey = null } = {}) {
  const supabase = getSupabase();
  if (!supabase) return [];
  let q = supabase
    .from('gesture_templates')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (authorKey) q = q.eq('author_key', authorKey);
  const { data, error } = await q;
  if (error) return [];
  return mapRows(data);
}

export async function getGestureTemplate(id) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('gesture_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return null;
  return mapRow(data);
}

export async function publishGestureTemplate({ name, description, category, code, css, js, authorKey }) {
  const supabase = getSupabase();
  if (!supabase) return { error: 'not-configured' };
  const id = randomId();
  const { error } = await supabase
    .from('gesture_templates')
    .insert(toRow({
      id,
      name,
      description: description || '',
      category: category || 'hi',
      authorKey,
      code: code || '',
      css: css || '',
      js: js || '',
    }));
  if (error) return { error: error.message };
  return { id };
}

export async function toggleGestureStar(templateId, userKey) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('toggle_gesture_star', {
    p_template_id: templateId,
    p_user_key: userKey,
  });
  if (error) return null;
  return data;
}

export async function forkGestureTemplate(templateId) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('fork_gesture_template', {
    p_template_id: templateId,
  });
  if (error) return null;
  return data;
}

export async function incrementGestureTemplateView(templateId) {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.rpc('increment_gesture_template_view', { p_template_id: templateId }).then(() => {});
}

export async function setGestureTemplateFeatured(templateId, isFeatured) {
  const supabase = getSupabase();
  if (!supabase) return { error: 'not-configured' };
  const { error } = await supabase
    .from('gesture_templates')
    .update({ is_featured: isFeatured })
    .eq('id', templateId);
  if (error) return { error: error.message };
  return {};
}

// ── Template comments ───────────────────────────────────────────────
export async function listTemplateComments(templateId) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('gesture_template_comments')
    .select('*')
    .eq('template_id', templateId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) return [];
  return mapRows(data);
}

export async function addTemplateComment(templateId, { authorKey, text }) {
  const supabase = getSupabase();
  if (!supabase) return { error: 'not-configured' };
  const id = randomId();
  const { error } = await supabase
    .from('gesture_template_comments')
    .insert(toRow({ id, templateId, authorKey, text }));
  if (error) return { error: error.message };
  return { id };
}

export async function likeGestureComment(commentId) {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.rpc('like_gesture_comment', { p_comment_id: commentId }).then(() => {});
}

// ── Collaborative gestures ──────────────────────────────────────────
export async function createGestureCollab({ title, templateKey, category, recipients, themeKey, deadline, ownerKey }) {
  const supabase = getSupabase();
  if (!supabase) return { error: 'not-configured' };
  const id = randomId();
  const { error } = await supabase
    .from('gesture_collabs')
    .insert(toRow({
      id,
      title,
      templateKey: templateKey || '',
      category: category || '',
      ownerKey,
      recipients: Array.isArray(recipients) ? recipients : [],
      themeKey: themeKey || 'gold',
      deadline: deadline || null,
    }));
  if (error) return { error: error.message };
  return { id };
}

export async function listGestureCollabs({ ownerKey = null } = {}) {
  const supabase = getSupabase();
  if (!supabase) return [];
  let q = supabase
    .from('gesture_collabs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (ownerKey) q = q.eq('owner_key', ownerKey);
  const { data, error } = await q;
  if (error) return [];
  return mapRows(data);
}

export async function getGestureCollab(id) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('gesture_collabs')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return null;
  return mapRow(data);
}

export async function listGestureSignatures(collabId) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('gesture_signatures')
    .select('*')
    .eq('collab_id', collabId)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) return [];
  return mapRows(data);
}

export async function signGestureCollab(collabId, { authorKey, name, message }) {
  const supabase = getSupabase();
  if (!supabase) return { error: 'not-configured' };
  const id = randomId();
  const { error } = await supabase
    .from('gesture_signatures')
    .insert(toRow({ id, collabId, authorKey, name: name || '', message }));
  if (error) return { error: error.message };
  return { id };
}

export async function closeGestureCollab(collabId) {
  const supabase = getSupabase();
  if (!supabase) return { error: 'not-configured' };
  const { error } = await supabase
    .from('gesture_collabs')
    .update({ is_open: false })
    .eq('id', collabId);
  if (error) return { error: error.message };
  return {};
}
