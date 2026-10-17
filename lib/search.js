'use client';

import { mapRows } from './supabase/db';

// Server-side search helpers. The old search page filtered only the most
// recent 50-60 rows in memory; these query the full tables instead.
//
// PostgREST `.or(...)` filter strings treat  , ( ) ' "  as grammar — user
// input is stripped of them before interpolation. % and _ are kept as the
// intentional wildcards we wrap around the term.

function cleanTerm(q) {
  return String(q || '')
    .replace(/[,'()"\`\\]/g, ' ')
    .replace(/[%_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

function likeOr(fields, term) {
  return fields.map((f) => `${f}.ilike.%${term}%`).join(',');
}

// ── People ────────────────────────────────────────────────
export async function searchPeople(sb, q, { limit = 10 } = {}) {
  const term = cleanTerm(q);
  if (!sb || !term) return [];
  try {
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .or(likeOr(['name', 'handle', 'role'], term))
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return mapRows(data || []);
  } catch (err) {
    console.warn('[search] people search failed:', err?.message);
    return [];
  }
}

// ── Posts ─────────────────────────────────────────────────
export async function searchPosts(sb, q, { limit = 20 } = {}) {
  const term = cleanTerm(q);
  if (!sb || !term) return [];
  try {
    const { data, error } = await sb
      .from('posts')
      .select('*')
      .or(`text.ilike.%${term}%`)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return mapRows(data || []);
  } catch (err) {
    console.warn('[search] post search failed:', err?.message);
    return [];
  }
}

// ── Projects ──────────────────────────────────────────────
export async function searchProjects(sb, q, { limit = 10 } = {}) {
  const term = cleanTerm(q);
  if (!sb || !term) return [];
  try {
    const { data, error } = await sb
      .from('projects')
      .select('*')
      .or(likeOr(['title', 'description'], term))
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return mapRows(data || []).map((p) => ({ ...p, name: p.title || '' }));
  } catch (err) {
    console.warn('[search] project search failed:', err?.message);
    return [];
  }
}

// ── Hashtags ──────────────────────────────────────────────
export function extractTags(posts, limit = 8) {
  const counts = new Map();
  (posts || []).forEach((p) => {
    const matches = String(p.text || '').match(/#[A-Za-z][A-Za-z0-9_]{1,30}/g) || [];
    matches.forEach((m) => {
      const key = m.toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });
  return Array.from(counts, ([text, posts]) => ({ text, posts }))
    .sort((a, b) => b.posts - a.posts)
    .slice(0, limit);
}

// Normalize any hashtag input ('#AI', 'AI', ' ai ') to the stored form '#ai'.
export function normalizeTag(raw) {
  const t = String(raw || '').trim().replace(/^#+/, '').toLowerCase();
  return t ? `#${t}` : '';
}

// Posts carrying an exact hashtag (word-boundary match, case-insensitive).
// ILIKE alone over-matches ('#ai' hits '#aiml'), so candidates are fetched
// broadly and filtered precisely in JS.
export async function postsWithTag(sb, tag, { limit = 30, candidates = 150 } = {}) {
  const norm = normalizeTag(tag);
  if (!sb || !norm) return [];
  try {
    const { data, error } = await sb
      .from('posts')
      .select('*')
      .ilike('text', `%${norm}%`)
      .order('created_at', { ascending: false })
      .limit(candidates);
    if (error) throw error;
    const re = new RegExp(`${norm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9_])`, 'i');
    return mapRows(data || []).filter((p) => re.test(String(p.text || ''))).slice(0, limit);
  } catch (err) {
    console.warn('[search] tag posts failed:', err?.message);
    return [];
  }
}

// ── Followed topics ───────────────────────────────────────
export async function fetchFollowedTopics(sb) {
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('followed_topics')
      .select('tag, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data || []).map((r) => r.tag);
  } catch {
    return [];
  }
}
