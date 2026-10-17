'use client';

import { randomId } from './supabase/db';
import { getSupabase } from './supabase/client';

// LinkedIn-style connection graph helpers (tables + RPCs from 0013):
//   connection_requests  (from_id → to_id, status pending|accepted|declined)
//   connections          (user_a < user_b, written only by the accept RPC)
//
// State per pair: 'none' | 'outgoing' | 'incoming' | 'connected'

export async function getConnectionState(myId, otherId) {
  const sb = getSupabase();
  if (!sb || !myId || !otherId || myId === otherId) return { state: 'none', requestId: null };
  try {
    const [reqRes, connRes] = await Promise.all([
      sb
        .from('connection_requests')
        .select('id, status, from_id, to_id, created_at')
        .or(`and(from_id.eq.${myId},to_id.eq.${otherId}),and(from_id.eq.${otherId},to_id.eq.${myId})`)
        .order('created_at', { ascending: false })
        .limit(1),
      sb
        .from('connections')
        .select('user_a, user_b, created_at')
        .or(`and(user_a.eq.${myId},user_b.eq.${otherId}),and(user_a.eq.${otherId},user_b.eq.${myId})`)
        .limit(1),
    ]);
    if (connRes?.data?.length) return { state: 'connected', requestId: null };
    const req = reqRes?.data?.[0];
    if (!req || req.status === 'declined') return { state: 'none', requestId: null };
    if (req.status === 'accepted') return { state: 'connected', requestId: null };
    return req.from_id === myId
      ? { state: 'outgoing', requestId: req.id }
      : { state: 'incoming', requestId: req.id };
  } catch (err) {
    console.warn('[network] getConnectionState failed:', err?.message);
    return { state: 'none', requestId: null };
  }
}

// Returns 'sent' | 'pending' | 'already_connected' | null
export async function sendConnectionRequest(otherId) {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.rpc('send_connection_request', { p_to: otherId });
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[network] send request failed:', err?.message);
    return null;
  }
}

// Returns 'accepted' | 'declined' | null
export async function respondConnectionRequest(requestId, accept) {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.rpc('respond_connection_request', {
      p_request_id: requestId,
      p_accept: accept,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[network] respond failed:', err?.message);
    return null;
  }
}

// Withdraw a request I sent (RLS delete allows the sender) or remove a
// connection pair (RLS delete allows either side).
export async function withdrawConnectionRequest(requestId) {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from('connection_requests').delete().eq('id', requestId);
    return !error;
  } catch {
    return false;
  }
}

export async function removeConnection(myId, otherId) {
  const sb = getSupabase();
  if (!sb || !myId || !otherId) return false;
  try {
    // The pair is stored once as (least, greatest) — match either ordering.
    // BOTH ids must appear in the filter, or this would delete unrelated pairs.
    const { error } = await sb
      .from('connections')
      .delete()
      .or(`and(user_a.eq.${myId},user_b.eq.${otherId}),and(user_a.eq.${otherId},user_b.eq.${myId})`);
    return !error;
  } catch {
    return false;
  }
}

// ── Inbox lists ───────────────────────────────────────────
export async function listIncomingRequests(myId) {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('connection_requests')
      .select('*')
      .eq('to_id', myId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

export async function listOutgoingRequests(myId) {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('connection_requests')
      .select('*')
      .eq('from_id', myId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

// Connected partner ids for a user (either side of the pair).
export async function listConnectionIds(myId) {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('connections')
      .select('user_a, user_b, created_at')
      .or(`user_a.eq.${myId},user_b.eq.${myId}`)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data || []).map((r) => (r.user_a === myId ? r.user_b : r.user_a));
  } catch {
    return [];
  }
}

// ── Skill endorsements ────────────────────────────────────
// Returns { counts: {skill: n}, mine: Set(skill) }
export async function fetchEndorsements(targetId, myId = null) {
  const sb = getSupabase();
  const empty = { counts: {}, mine: new Set() };
  if (!sb) return empty;
  try {
    const { data, error } = await sb
      .from('endorsements')
      .select('skill, endorser_id')
      .eq('user_id', targetId);
    if (error) throw error;
    const counts = {};
    const mine = new Set();
    (data || []).forEach((r) => {
      counts[r.skill] = (counts[r.skill] || 0) + 1;
      if (myId && r.endorser_id === myId) mine.add(r.skill);
    });
    return { counts, mine };
  } catch {
    return empty;
  }
}

export async function toggleEndorsement(targetId, skill, myId) {
  const sb = getSupabase();
  if (!sb || !myId || myId === targetId) return 'noop';
  try {
    const { data: existing, error: findErr } = await sb
      .from('endorsements')
      .select('skill')
      .eq('user_id', targetId)
      .eq('skill', skill)
      .eq('endorser_id', myId)
      .maybeSingle();
    if (findErr) throw findErr;
    if (existing) {
      const { error } = await sb
        .from('endorsements')
        .delete()
        .eq('user_id', targetId)
        .eq('skill', skill)
        .eq('endorser_id', myId);
      if (error) throw error;
      return 'removed';
    }
    const { error } = await sb
      .from('endorsements')
      .insert({ user_id: targetId, skill, endorser_id: myId });
    if (error) throw error;
    return 'added';
  } catch (err) {
    console.warn('[network] endorsement toggle failed:', err?.message);
    return 'error';
  }
}

// ── Written recommendations ───────────────────────────────
// status: pending (target must approve) | published | hidden
export async function fetchRecommendations(targetId) {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('recommendations')
      .select('id, author_id, target_id, content, status, created_at, updated_at')
      .eq('target_id', targetId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

export async function createRecommendation(targetId, content, status = 'pending') {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data: authRes } = await sb.auth.getUser();
    const uid = authRes?.user?.id;
    if (!uid) return null;
    const row = {
      id: randomId(),
      author_id: uid,
      target_id: targetId,
      content: String(content || '').trim(),
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await sb.from('recommendations').insert(row).select('id').single();
    if (error) throw error;
    return data?.id;
  } catch (err) {
    console.warn('[network] recommendation create failed:', err?.message);
    return null;
  }
}

export async function updateRecommendationStatus(id, status) {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb
      .from('recommendations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteRecommendation(id) {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from('recommendations').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ── People you may know ───────────────────────────────────
// Real signals only: candidates are real profiles I don't follow and am
// not connected to; ranked by shared interests/skills overlap. No fake
// seeded people — an empty graph simply returns [].
export async function peopleYouMayKnow(myId, { followedIds = [], limit = 10 } = {}) {
  const sb = getSupabase();
  if (!sb || !myId) return [];
  try {
    const [meRes, poolRes] = await Promise.all([
      sb.from('profiles').select('id, interests, skills').eq('id', myId).maybeSingle(),
      sb
        .from('profiles')
        .select('id, name, handle, role, avatar, verified, interests, skills, followers, bio')
        .neq('id', myId)
        .eq('banned', false)
        .order('followers', { ascending: false })
        .limit(80),
    ]);
    const connected = new Set(await listConnectionIds(myId));
    const excluded = new Set([myId, ...followedIds, ...connected]);
    const me = meRes?.data;
    const myTags = new Set([
      ...(me?.interests || []),
      ...(me?.skills || []),
    ].map((s) => String(s).toLowerCase()));

    const ranked = (poolRes?.data || [])
      .filter((u) => !excluded.has(u.id))
      .map((u) => {
        const theirTags = [...(u.interests || []), ...(u.skills || [])]
          .map((s) => String(s).toLowerCase());
        const overlap = theirTags.filter((t) => myTags.has(t)).length;
        return { ...u, _score: overlap * 10 + Math.min(5, Number(u.followers) / 20) };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);
    return ranked;
  } catch (err) {
    console.warn('[network] pymk failed:', err?.message);
    return [];
  }
}
