'use client';

// ─────────────────────────────────────────────────────────────
// COLLABORATION REQUESTS — profile-to-profile connect flow.
// Stored in collab_requests with id = `${requesterUid}__${recipientUid}`
// (one row per pair ⇒ idempotent, mirrors the old
// users/{recipient}/collabRequests/{requester} doc-id pattern).
// Requester name/avatar/handle are read live from profiles instead of
// being denormalized into the row. Accepting opens a real 1:1 chat.
// ─────────────────────────────────────────────────────────────

import { getSupabase } from '@/lib/supabase/client';
import { subscribeQuery } from '@/lib/supabase/realtime';
import { mapRow, mapRows, toRow } from '@/lib/supabase/db';
import { notifyUser } from '@/lib/notify';
import { createChat } from '@/lib/firestore';

async function profilesByIds(ids) {
  const list = [...new Set((ids || []).filter(Boolean))];
  if (!list.length) return {};
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('id, name, avatar, handle')
    .in('id', list);
  if (error) throw error;
  const map = {};
  (data || []).forEach((p) => { map[p.id] = p; });
  return map;
}

function shapeRequest(row, profile) {
  return {
    id: row.id,
    uid: row.fromId,
    recipientUid: row.toId,
    name: profile?.name || '',
    avatar: profile?.avatar || '',
    handle: profile?.handle || '',
    message: row.message || '',
    intent: row.role || '',
    status: row.status || 'pending',
    createdAt: row.createdAt,
  };
}

// side: 'from' shapes against the requester (incoming inbox),
//        'to' shapes against the recipient (sent list).
async function fetchAndShape(column, uid, side, limitN) {
  const { data, error } = await getSupabase()
    .from('collab_requests')
    .select('*')
    .eq(column, uid)
    .order('created_at', { ascending: false })
    .limit(limitN);
  if (error) throw error;
  const rows = mapRows(data);
  const profiles = await profilesByIds(
    rows.map((r) => (side === 'from' ? r.fromId : r.toId))
  );
  return rows.map((r) =>
    shapeRequest(r, profiles[side === 'from' ? r.fromId : r.toId])
  );
}

export async function sendCollabRequest(recipient, requester, message, intent) {
  const { error } = await getSupabase()
    .from('collab_requests')
    .upsert(
      toRow({
        id: `${requester.id}__${recipient.id}`,
        fromId: requester.id,
        toId: recipient.id,
        message: String(message || '').trim().slice(0, 1000),
        role: String(intent || '').slice(0, 50),
        status: 'pending',
      }),
      { onConflict: 'id', ignoreDuplicates: false }
    );
  if (error) throw error;
  notifyUser(recipient.id, {
    type: 'collab_request',
    actorKey: requester.id,
    actorName: requester.name || 'A founder',
    text: `${requester.name || 'A founder'} wants to collaborate with you`,
    linkType: 'request',
    linkId: requester.id,
  });
}

export async function withdrawCollabRequest(recipientUid, requesterUid) {
  const { error } = await getSupabase()
    .from('collab_requests')
    .delete()
    .eq('from_id', requesterUid)
    .eq('to_id', recipientUid);
  if (error) throw error;
}

export async function decideCollabRequest(recipient, request, decision) {
  // updated_at is maintained by the set_updated_at trigger.
  const { error } = await getSupabase()
    .from('collab_requests')
    .update({ status: decision })
    .eq('from_id', request.uid)
    .eq('to_id', recipient.id);
  if (error) throw error;
  if (decision === 'accepted') {
    const res = await createChat({
      participants: [recipient.id, request.uid],
      participantNames: {
        [recipient.id]: recipient.name || '',
        [request.uid]: request.name || '',
      },
      participantAvatars: {
        [recipient.id]: recipient.avatar || '',
        [request.uid]: request.avatar || '',
      },
      lastMessage: '',
    });
    notifyUser(request.uid, {
      type: 'collab',
      actorKey: recipient.id,
      actorName: recipient.name || 'A founder',
      text: `${recipient.name || 'A founder'} accepted your collaboration request — say hi`,
      linkType: 'message',
      linkId: res && res.success ? res.data : null,
    });
  } else {
    notifyUser(request.uid, {
      type: 'collab',
      actorKey: recipient.id,
      actorName: recipient.name || 'A founder',
      text: `${recipient.name || 'A founder'} reviewed your collaboration request`,
      linkType: 'profile',
      linkId: recipient.id,
    });
  }
}

export function subscribeIncomingCollabRequests(uid, cb) {
  return subscribeQuery({
    key: `collab-incoming:${uid}`,
    table: 'collab_requests',
    filter: `to_id=eq.${uid}`,
    queryFn: () => fetchAndShape('to_id', uid, 'from', 50),
    onData: cb,
    onError: () => cb([]),
  });
}

export async function getMyRequestTo(recipientUid, requesterUid) {
  try {
    const { data, error } = await getSupabase()
      .from('collab_requests')
      .select('*')
      .eq('from_id', requesterUid)
      .eq('to_id', recipientUid)
      .limit(1);
    if (error) throw error;
    if (!data || !data.length) return null;
    const row = mapRow(data[0]);
    const profiles = await profilesByIds([row.fromId]);
    return shapeRequest(row, profiles[row.fromId]);
  } catch (e) {
    return null;
  }
}

export async function getMySentCollabRequests(requesterUid) {
  try {
    return await fetchAndShape('from_id', requesterUid, 'to', 50);
  } catch (e) {
    return [];
  }
}
