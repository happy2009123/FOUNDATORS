'use client';

import { getSupabase, isSupabaseConfigured } from './supabase/client';
import { subscribeQuery } from './supabase/realtime';
import { mapRow, mapRows, toRow, randomId, toMillis, ts } from './supabase/db';
import { notifyUser } from './notify';

export const VOICE_CATEGORIES = [
  'Startup',
  'AI',
  'Technology',
  'Fundraising',
  'Marketing',
  'Product',
  'Design',
  'Leadership',
  'Students',
  'Co-Founder Search',
  'MVP',
  'Business',
  'Career',
  'Open Discussion',
  'Other',
];

export const VOICE_ROOM_TYPES = [
  { key: 'public', label: 'Public', hint: 'Anyone can join' },
  { key: 'followers', label: 'Followers only', hint: 'Only your followers' },
  { key: 'private', label: 'Private', hint: 'Invite only' },
];

export const VOICE_TEMPLATES = [
  { key: 'standard', label: 'Founder Room', hint: 'Open founder conversation' },
  { key: 'ama', label: 'Founder AMA', hint: 'Listeners submit questions' },
  { key: 'pitch', label: 'Pitch Room', hint: 'Present your startup' },
  { key: 'cofounder', label: 'Co-Founder Search', hint: 'Find a co-founder' },
];

export const VOICE_MAX_SPEAKERS_DEFAULT = 8;
export const VOICE_MAX_SPEAKERS_LIMIT = 12;
export const VOICE_SPEAKER_ROLES = ['host', 'coHost', 'speaker'];

const ROOM_BASE_COLUMNS = ['id', 'title', 'host_id', 'channel', 'participants', 'active', 'ended_at'];
const warnedMissingRoomColumns = new Set();

function requireSupabase() {
  if (!isSupabaseConfigured() || !getSupabase()) {
    throw new Error('Supabase not configured');
  }
  return getSupabase();
}

async function currentUid(fallback) {
  try {
    const { data } = await getSupabase().auth.getSession();
    return data?.session?.user?.id || fallback || null;
  } catch {
    return fallback || null;
  }
}

function pickRoomBase(row) {
  const base = {};
  for (const key of ROOM_BASE_COLUMNS) {
    if (row[key] !== undefined) base[key] = row[key];
  }
  return base;
}

function warnDroppedRoomColumns(attempted, persisted) {
  const dropped = Object.keys(attempted).filter((k) => !(k in persisted));
  if (!dropped.length) return;
  const signature = dropped.sort().join(',');
  if (warnedMissingRoomColumns.has(signature)) return;
  warnedMissingRoomColumns.add(signature);
  console.warn(
    `voice_sessions is missing column(s): ${dropped.join(', ')} — run the voice migration SQL. Base fields were still saved.`
  );
}

async function insertRoom(payload) {
  const supabase = requireSupabase();
  const row = toRow(payload);
  const { error } = await supabase.from('voice_sessions').insert(row).select('id');
  if (!error) return true;
  const base = pickRoomBase(row);
  const retry = await supabase.from('voice_sessions').insert(base).select('id');
  if (retry.error) {
    throw new Error(retry.error.message || 'Could not create voice room');
  }
  warnDroppedRoomColumns(row, base);
  return true;
}

async function patchRoom(roomId, patch, { optional = false } = {}) {
  let supabase;
  try {
    supabase = requireSupabase();
  } catch (e) {
    if (optional) return false;
    throw e;
  }
  const payload = toRow(patch);
  delete payload.id;
  const { data, error } = await supabase
    .from('voice_sessions')
    .update(payload)
    .eq('id', roomId)
    .select('id');
  if (!error) {
    if (!data || !data.length) {
      if (optional) return false;
      throw new Error('Voice room not found');
    }
    return true;
  }
  const base = pickRoomBase(payload);
  delete base.id;
  if (!Object.keys(base).length) {
    if (optional) return false;
    throw new Error(
      `voice_sessions is missing column(s): ${Object.keys(payload).join(', ')} — run the voice migration SQL (${error.message})`
    );
  }
  const retry = await supabase.from('voice_sessions').update(base).eq('id', roomId).select('id');
  if (retry.error) {
    if (optional) return false;
    throw new Error(retry.error.message || 'Could not update voice room');
  }
  if (!retry.data || !retry.data.length) {
    if (optional) return false;
    throw new Error('Voice room not found');
  }
  warnDroppedRoomColumns(payload, base);
  return true;
}

async function readParticipantsRaw(roomId) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('voice_sessions')
    .select('participants')
    .eq('id', roomId)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Could not load participants');
  return Array.isArray(data?.participants) ? data.participants : [];
}

function shapeParticipant(p) {
  if (!p || typeof p !== 'object') return p;
  const out = { ...p };
  if (out.lastActiveAt && toMillis(out.lastActiveAt)) out.lastActiveAt = ts(out.lastActiveAt);
  if (out.joinedAt && toMillis(out.joinedAt)) out.joinedAt = ts(out.joinedAt);
  return out;
}

async function mutateParticipants(roomId, mutate) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('voice_sessions')
    .select('id, participants')
    .eq('id', roomId)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Could not read room participants');
  if (!data) throw new Error('Voice room not found');
  const roster = Array.isArray(data.participants) ? data.participants : [];
  const next = mutate([...roster]) || roster;
  const { data: saved, error: writeError } = await supabase
    .from('voice_sessions')
    .update({ participants: next })
    .eq('id', roomId)
    .select('id');
  if (writeError) throw new Error(writeError.message || 'Could not update room participants');
  if (!saved || !saved.length) throw new Error('Voice room not found');
  return next;
}

async function mutateRoomList(roomId, key, mutate) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('voice_sessions')
    .select(key)
    .eq('id', roomId)
    .maybeSingle();
  if (error) {
    throw new Error(
      `Voice sessions are missing the "${key}" column — run the voice migration SQL (${error.message})`
    );
  }
  if (!data) throw new Error('Voice room not found');
  const list = Array.isArray(data[key]) ? data[key] : [];
  const next = mutate([...list]) || [];
  const { data: saved, error: writeError } = await supabase
    .from('voice_sessions')
    .update({ [key]: next })
    .eq('id', roomId)
    .select('id');
  if (writeError) {
    throw new Error(
      `Voice sessions are missing the "${key}" column — run the voice migration SQL (${writeError.message})`
    );
  }
  if (!saved || !saved.length) throw new Error('Voice room not found');
  return next;
}

async function readRoomList(roomId, key) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('voice_sessions')
    .select(key)
    .eq('id', roomId)
    .maybeSingle();
  if (error) {
    throw new Error(
      `Voice sessions are missing the "${key}" column — run the voice migration SQL (${error.message})`
    );
  }
  const list = data ? data[key] : null;
  return Array.isArray(list) ? list : [];
}

async function fetchHosts(ids) {
  const list = [...new Set((ids || []).filter(Boolean))].slice(0, 30);
  if (!list.length) return {};
  try {
    const { data, error } = await requireSupabase()
      .from('profiles')
      .select('id, name, handle, avatar, verified')
      .in('id', list);
    if (error) return {};
    const map = {};
    (data || []).forEach((p) => {
      map[p.id] = { name: p.name, handle: p.handle, avatar: p.avatar, verified: !!p.verified };
    });
    return map;
  } catch {
    return {};
  }
}

function shapeRoom(row, hosts) {
  const roster = Array.isArray(row.participants) ? row.participants : [];
  const joined = roster.filter((p) => p && p.status === 'joined');
  const speakers = joined.filter((p) => VOICE_SPEAKER_ROLES.includes(p.role));
  const preview = [...speakers, ...joined.filter((p) => !VOICE_SPEAKER_ROLES.includes(p.role))]
    .map((p) => p.avatar)
    .filter(Boolean)
    .slice(0, 6);
  const endedAtMs = toMillis(row.endedAt);
  const createdAtMs = toMillis(row.createdAt);
  const host = (hosts && row.hostId && hosts[row.hostId]) || null;
  return {
    ...row,
    roomId: row.id,
    hostName: (host && host.name) || row.hostName || 'Founder',
    hostHandle: (host && host.handle) || row.hostHandle || '',
    hostAvatar: (host && host.avatar) || row.hostAvatar || '',
    hostVerified: host ? host.verified : row.hostVerified !== undefined ? !!row.hostVerified : false,
    status: endedAtMs ? 'ended' : row.active === false ? 'scheduled' : 'live',
    description: row.description || '',
    category: row.category || 'Other',
    type: row.type || 'public',
    template: row.template || 'standard',
    templateData: row.templateData !== undefined ? row.templateData : null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    coverImageUrl: row.coverImageUrl || '',
    isLocked: !!row.isLocked,
    pinnedTopic: row.pinnedTopic || '',
    allowRaiseHand: row.allowRaiseHand !== false,
    allowReactions: row.allowReactions !== false,
    allowQuestions: row.allowQuestions !== false,
    maxSpeakers: Number(row.maxSpeakers) || VOICE_MAX_SPEAKERS_DEFAULT,
    participantCount: joined.length,
    speakerCount: speakers.length,
    previewAvatars: preview,
    scheduledAt: row.scheduledAt || null,
    scheduledAtMs: toMillis(row.scheduledAt) || null,
    createdAt: row.createdAt || null,
    createdAtMs,
    startedAt: row.startedAt || null,
    startedAtMs: toMillis(row.startedAt) || createdAtMs,
    endedAt: row.endedAt || null,
    endedAtMs: endedAtMs || null,
    hostBeat: row.hostBeat || null,
    hostBeatMs: toMillis(row.hostBeat) || createdAtMs,
    questions: Array.isArray(row.questions) ? row.questions : [],
    reactions: Array.isArray(row.reactions) ? row.reactions : [],
    reminders: Array.isArray(row.reminders) ? row.reminders : [],
  };
}

function makeRoomId() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  const bytes = new Uint8Array(12);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 12; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  for (let i = 0; i < 12; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return `vr_${out}`;
}

export function voiceRoomRef(roomId) {
  return { table: 'voice_sessions', id: roomId };
}

export function voiceRoomPath(roomId) {
  return `/voice/room/${roomId}`;
}

export function voiceRoomUrl(roomId) {
  if (typeof window === 'undefined') return `/voice/room/${roomId}`;
  return `${window.location.origin}/voice/room/${roomId}`;
}

export async function createVoiceRoom(profile, input) {
  const title = String(input.title || '').trim();
  if (title.length < 4 || title.length > 120) throw new Error('Room title must be 4-120 characters');
  const description = String(input.description || '').trim().slice(0, 1000);
  const category = VOICE_CATEGORIES.includes(input.category) ? input.category : 'Other';
  const type = ['public', 'followers', 'private'].includes(input.type) ? input.type : 'public';
  const template = VOICE_TEMPLATES.some((t) => t.key === input.template) ? input.template : 'standard';
  const isScheduled = input.mode === 'schedule';
  if (isScheduled && !input.scheduledAt) throw new Error('Pick a date and time');
  if (isScheduled && input.scheduledAt.getTime() < Date.now() - 60000) throw new Error('Pick a future time');
  const maxSpeakers = Math.min(
    VOICE_MAX_SPEAKERS_LIMIT,
    Math.max(2, parseInt(input.maxSpeakers, 10) || VOICE_MAX_SPEAKERS_DEFAULT)
  );

  const roomId = makeRoomId();
  const nowMs = Date.now();
  const now = new Date();
  const hostId = (await currentUid(profile.id)) || profile.id;
  await insertRoom({
    id: roomId,
    title,
    hostId,
    participants: [
      {
        uid: hostId,
        name: profile.name || 'Founder',
        handle: profile.handle || '',
        avatar: profile.avatar || '',
        verified: !!profile.verified,
        role: 'host',
        status: 'joined',
        isMuted: false,
        raisedHand: false,
        joinedAt: now.toISOString(),
        joinedAtMs: nowMs,
        lastActiveAt: now.toISOString(),
      },
    ],
    active: !isScheduled,
    endedAt: null,
    description,
    category,
    type,
    template,
    templateData: input.templateData && typeof input.templateData === 'object' ? input.templateData : null,
    tags: Array.isArray(input.tags) ? input.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 8) : [],
    coverImageUrl: input.coverImageUrl || '',
    isLocked: false,
    pinnedTopic: '',
    allowRaiseHand: input.allowRaiseHand !== false,
    allowReactions: input.allowReactions !== false,
    allowQuestions: input.allowQuestions !== false,
    maxSpeakers,
    scheduledAt: isScheduled ? input.scheduledAt : null,
    startedAt: isScheduled ? null : now,
    hostBeat: now,
    questions: [],
    reactions: [],
    reminders: [],
  });
  return roomId;
}

export async function updateVoiceRoom(roomId, patch) {
  await patchRoom(roomId, patch);
}

export async function startVoiceRoom(roomId) {
  const now = new Date();
  await patchRoom(roomId, {
    active: true,
    endedAt: null,
    startedAt: now,
    hostBeat: now,
  });
}

export async function endVoiceRoom(roomId, actorId) {
  try {
    await patchRoom(roomId, { active: false, endedAt: new Date() });
  } catch (e) {
    console.error('Error updating voice room status', e);
  }
  try {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('voice_signals').delete().eq('session_id', roomId);
      await patchRoom(roomId, { reactions: [] }, { optional: true });
    }
  } catch (e) {
    console.error('Error deleting voice room signals/reactions', e);
    throw e;
  }
}

export async function deleteVoiceRoom(roomId) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('voice_sessions').delete().eq('id', roomId);
  if (error) {
    console.error('Error deleting voice room', error);
    throw new Error(error.message || 'Could not delete voice room');
  }
}

export async function joinVoiceRoom(roomId, profile, forceRole) {
  const uid = profile.id;
  const nowMs = Date.now();
  const nowIso = new Date().toISOString();
  let role = forceRole || 'listener';
  await mutateParticipants(roomId, (roster) => {
    const idx = roster.findIndex((p) => p && p.uid === uid);
    if (idx >= 0) {
      const existing = roster[idx];
      role = forceRole && forceRole !== existing.role ? forceRole : existing.role;
      roster[idx] = {
        ...existing,
        status: 'joined',
        lastActiveAt: nowIso,
        name: profile.name || existing.name,
        avatar: profile.avatar || existing.avatar,
        verified: profile.verified !== undefined ? !!profile.verified : existing.verified,
      };
    } else {
      role = forceRole || 'listener';
      roster.push({
        uid,
        name: profile.name || 'Founder',
        handle: profile.handle || '',
        avatar: profile.avatar || '',
        verified: !!profile.verified,
        role,
        status: 'joined',
        isMuted: false,
        raisedHand: false,
        joinedAt: nowIso,
        joinedAtMs: nowMs,
        lastActiveAt: nowIso,
      });
    }
    return roster;
  });
  return role;
}

export async function leaveVoiceRoom(roomId, uid) {
  try {
    await mutateParticipants(roomId, (roster) => roster.filter((p) => !p || p.uid !== uid));
  } catch (e) {
    console.error('Error leaving voice room', e);
    throw e;
  }
  await pruneSentSignals(roomId, uid);
}

export async function heartbeatVoiceRoom(roomId, uid, isHost) {
  try {
    const nowIso = new Date().toISOString();
    await mutateParticipants(roomId, (roster) =>
      roster.map((p) => (p && p.uid === uid ? { ...p, lastActiveAt: nowIso } : p))
    );
  } catch {}
  if (isHost) {
    try {
      await patchRoom(roomId, { hostBeat: new Date() }, { optional: true });
    } catch {}
  }
}

export async function updateVoiceCounts(roomId, { participantCount, speakerCount, previewAvatars }) {
  const patch = {};
  if (typeof participantCount === 'number' && participantCount >= 0 && participantCount <= 50) patch.participantCount = participantCount;
  if (typeof speakerCount === 'number' && speakerCount >= 0 && speakerCount <= 12) patch.speakerCount = speakerCount;
  if (Array.isArray(previewAvatars)) patch.previewAvatars = previewAvatars.slice(0, 6);
  if (Object.keys(patch).length) {
    try {
      await patchRoom(roomId, patch, { optional: true });
    } catch (e) {
      console.error('Error updating voice counts', e);
    }
  }
}

export async function raiseHand(room, profile) {
  const nowMs = Date.now();
  const nowIso = new Date().toISOString();
  let alreadyPending = false;
  await mutateParticipants(room.roomId, (roster) => {
    const idx = roster.findIndex((p) => p && p.uid === profile.id);
    if (idx < 0) return roster;
    const p = roster[idx];
    if (p.requestStatus === 'pending') {
      alreadyPending = true;
      return roster;
    }
    roster[idx] = {
      ...p,
      requestStatus: 'pending',
      requestedAt: nowIso,
      requestedAtMs: nowMs,
      decidedAt: undefined,
      decidedAtMs: undefined,
      raisedHand: true,
    };
    return roster;
  });
  if (alreadyPending) return;
  if (room.hostId !== profile.id) {
    notifyUser(room.hostId, {
      type: 'voice_request',
      actorKey: profile.id,
      actorName: profile.name || 'A founder',
      text: `${profile.name || 'A founder'} requested to speak in “${room.title}”.`,
      linkType: 'voice_room',
      linkId: room.roomId,
    });
  }
}

export async function cancelHand(roomId, uid) {
  try {
    await mutateParticipants(roomId, (roster) =>
      roster.map((p) => {
        if (!p || p.uid !== uid) return p;
        return {
          ...p,
          raisedHand: false,
          requestStatus: undefined,
          requestedAt: undefined,
          requestedAtMs: undefined,
          decidedAt: undefined,
          decidedAtMs: undefined,
        };
      })
    );
  } catch {}
}

export async function approveSpeaker(room, uid, profile) {
  await mutateParticipants(room.roomId, (roster) => {
    const idx = roster.findIndex((p) => p && p.uid === uid);
    if (idx < 0) throw new Error('Participant not found');
    roster[idx] = {
      ...roster[idx],
      requestStatus: 'approved',
      decidedAt: new Date().toISOString(),
      role: 'speaker',
      raisedHand: false,
      isMuted: false,
    };
    return roster;
  });
  notifyUser(uid, {
    type: 'voice_approved',
    actorKey: room.hostId,
    actorName: profile ? profile.name || room.hostName : room.hostName,
    text: `You are now a speaker in “${room.title}”.`,
    linkType: 'voice_room',
    linkId: room.roomId,
  });
}

export async function rejectSpeaker(room, uid) {
  await mutateParticipants(room.roomId, (roster) => {
    const idx = roster.findIndex((p) => p && p.uid === uid);
    if (idx < 0) throw new Error('Participant not found');
    roster[idx] = {
      ...roster[idx],
      requestStatus: 'rejected',
      decidedAt: new Date().toISOString(),
      raisedHand: false,
    };
    return roster;
  });
}

export async function setParticipantRole(roomId, uid, role) {
  await mutateParticipants(roomId, (roster) => {
    const idx = roster.findIndex((p) => p && p.uid === uid);
    if (idx < 0) throw new Error('Participant not found');
    roster[idx] = { ...roster[idx], role };
    return roster;
  });
}

export async function removeParticipant(roomId, uid) {
  try {
    await mutateParticipants(roomId, (roster) => roster.filter((p) => !p || p.uid !== uid));
  } catch {}
}

export async function setSelfMuted(roomId, uid, muted) {
  try {
    await mutateParticipants(roomId, (roster) =>
      roster.map((p) => (p && p.uid === uid ? { ...p, isMuted: !!muted } : p))
    );
  } catch {}
}

export async function inviteSpeaker(room, target, profile) {
  const nowMs = Date.now();
  const nowIso = new Date().toISOString();
  await mutateParticipants(room.roomId, (roster) => {
    const entry = {
      uid: target.uid,
      name: target.name || 'Founder',
      handle: target.handle || '',
      avatar: target.avatar || '',
      verified: !!target.verified,
      role: 'listener',
      status: 'joined',
      isMuted: false,
      raisedHand: false,
      joinedAt: nowIso,
      joinedAtMs: nowMs,
      lastActiveAt: nowIso,
      invited: true,
    };
    const idx = roster.findIndex((p) => p && p.uid === target.uid);
    if (idx >= 0) roster[idx] = entry;
    else roster.push(entry);
    return roster;
  });
  notifyUser(target.uid, {
    type: 'voice_invite',
    actorKey: profile.id,
    actorName: profile.name || room.hostName,
    text: `${profile.name || 'The host'} invited you to speak in “${room.title}”.`,
    linkType: 'voice_room',
    linkId: room.roomId,
  });
}

export async function toggleRoomLock(roomId, locked) {
  await patchRoom(roomId, { isLocked: !!locked });
}

export async function pinRoomTopic(roomId, topic) {
  await patchRoom(roomId, { pinnedTopic: String(topic || '').slice(0, 200) });
}

export async function addQuestion(room, profile, text) {
  const clean = String(text || '').trim();
  if (!clean || clean.length > 500) throw new Error('Question must be 1-500 characters');
  const now = new Date();
  await mutateRoomList(room.roomId, 'questions', (list) => [
    ...list,
    {
      id: randomId(),
      authorId: profile.id,
      authorName: profile.name || 'Founder',
      authorHandle: profile.handle || '',
      authorAvatar: profile.avatar || '',
      text: clean,
      status: 'pending',
      createdAt: now.toISOString(),
      createdAtMs: now.getTime(),
    },
  ]);
}

export async function setQuestionStatus(roomId, qid, status) {
  await mutateRoomList(roomId, 'questions', (list) =>
    list.map((q) => (q && q.id === qid ? { ...q, status } : q))
  );
}

export async function deleteQuestion(roomId, qid) {
  try {
    await mutateRoomList(roomId, 'questions', (list) => list.filter((q) => !q || q.id !== qid));
  } catch {}
}

export async function sendReaction(room, profile, type) {
  const now = new Date();
  await mutateRoomList(room.roomId, 'reactions', (list) => [
    ...list.filter((r) => !r || r.userId !== profile.id),
    {
      userId: profile.id,
      name: profile.name || '',
      type: String(type).slice(0, 16),
      createdAt: now.toISOString(),
      createdAtMs: now.getTime(),
    },
  ]);
}

async function writeUserReminder(uid, roomId, on) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('user_settings')
    .select('settings')
    .eq('user_id', uid)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Could not read voice reminders');
  const settings = (data && data.settings) || {};
  const reminders = { ...(settings.voiceReminders || {}) };
  if (on) reminders[roomId] = { roomId, createdAtMs: Date.now(), notified: false };
  else delete reminders[roomId];
  const { error: writeError } = await supabase.from('user_settings').upsert(
    { user_id: uid, settings: { ...settings, voiceReminders: reminders }, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
  if (writeError) throw new Error(writeError.message || 'Could not save voice reminder');
}

export async function setVoiceReminder(roomId, uid, on) {
  if (on) {
    await writeUserReminder(uid, roomId, true);
    try {
      await mutateRoomList(roomId, 'reminders', (list) =>
        list.some((r) => r && r.uid === uid) ? list : [...list, { uid, createdAtMs: Date.now() }]
      );
    } catch {}
  } else {
    await writeUserReminder(uid, roomId, false).catch(() => {});
    try {
      await mutateRoomList(roomId, 'reminders', (list) => list.filter((r) => !r || r.uid !== uid));
    } catch {}
  }
}

export function subscribeVoiceByStatus(status, callback, onError, maxN = 30) {
  return subscribeQuery({
    key: 'voice:sessions',
    table: 'voice_sessions',
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('voice_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message || 'Could not load voice rooms');
      const rooms = mapRows(data)
        .map((row) => shapeRoom(row, null))
        .filter((room) => room.status === status)
        .slice(0, maxN);
      const hosts = await fetchHosts(rooms.map((r) => r.hostId));
      return rooms.map((r) => shapeRoom(r, hosts));
    },
    onData: (rooms) => callback(Array.isArray(rooms) ? rooms : []),
    onError,
  });
}

export function subscribeHostRooms(hostId, callback) {
  return subscribeQuery({
    key: `voice:host-rooms:${hostId}`,
    table: 'voice_sessions',
    filter: `host_id=eq.${hostId}`,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('voice_sessions')
        .select('*')
        .eq('host_id', hostId)
        .order('created_at', { ascending: false })
        .limit(120);
      if (error) throw new Error(error.message || 'Could not load rooms');
      const rooms = mapRows(data).map((row) => shapeRoom(row, null));
      const hosts = await fetchHosts([hostId]);
      return rooms.map((r) => shapeRoom(r, hosts));
    },
    onData: (rooms) => callback(Array.isArray(rooms) ? rooms : []),
  });
}

export function subscribeVoiceRoom(roomId, callback, onError) {
  return subscribeQuery({
    key: `voice:room:${roomId}`,
    table: 'voice_sessions',
    filter: `id=eq.${roomId}`,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('voice_sessions')
        .select('*')
        .eq('id', roomId)
        .maybeSingle();
      if (error) throw new Error(error.message || 'Could not load voice room');
      if (!data) return null;
      const hosts = await fetchHosts([data.host_id]);
      return shapeRoom(mapRow(data), hosts);
    },
    onData: (room) => callback(room || null),
    onError: onError || (() => {}),
  });
}

export function subscribeVoiceParticipants(roomId, callback) {
  return subscribeQuery({
    key: `voice:room:${roomId}`,
    table: 'voice_sessions',
    filter: `id=eq.${roomId}`,
    queryFn: () => readParticipantsRaw(roomId),
    onData: (roster) => callback((Array.isArray(roster) ? roster : []).map(shapeParticipant)),
  });
}

export function subscribeVoiceRequests(roomId, callback) {
  return subscribeQuery({
    key: `voice:room:${roomId}`,
    table: 'voice_sessions',
    filter: `id=eq.${roomId}`,
    queryFn: () => readParticipantsRaw(roomId),
    onData: (roster) => {
      const requests = (Array.isArray(roster) ? roster : [])
        .filter((p) => p && p.requestStatus)
        .map((p) => ({
          uid: p.uid,
          name: p.name || 'Founder',
          handle: p.handle || '',
          avatar: p.avatar || '',
          verified: !!p.verified,
          status: p.requestStatus,
          requestedAt: p.requestedAt && toMillis(p.requestedAt) ? ts(p.requestedAt) : null,
          requestedAtMs: p.requestedAtMs || 0,
          decidedAt: p.decidedAt && toMillis(p.decidedAt) ? ts(p.decidedAt) : null,
        }));
      callback(requests);
    },
  });
}

export function subscribeVoiceQuestions(roomId, callback) {
  return subscribeQuery({
    key: `voice:room:${roomId}`,
    table: 'voice_sessions',
    filter: `id=eq.${roomId}`,
    queryFn: () => readRoomList(roomId, 'questions'),
    onData: (rows) => {
      const list = (Array.isArray(rows) ? rows : []).slice();
      list.sort((a, b) => (a?.createdAtMs || 0) - (b?.createdAtMs || 0));
      callback(list);
    },
  });
}

export function subscribeVoiceReactions(roomId, callback) {
  return subscribeQuery({
    key: `voice:room:${roomId}`,
    table: 'voice_sessions',
    filter: `id=eq.${roomId}`,
    queryFn: () => readRoomList(roomId, 'reactions'),
    onData: (rows) => {
      const now = Date.now();
      callback((Array.isArray(rows) ? rows : []).filter((r) => now - (r?.createdAtMs || 0) < 20000));
    },
  });
}

export function subscribeVoiceReminders(roomId, callback) {
  return subscribeQuery({
    key: `voice:room:${roomId}`,
    table: 'voice_sessions',
    filter: `id=eq.${roomId}`,
    queryFn: () => readRoomList(roomId, 'reminders'),
    onData: (rows) => callback(Array.isArray(rows) ? rows : []),
  });
}

export function subscribeMyVoiceReminders(uid, callback) {
  return subscribeQuery({
    key: `voice:my-reminders:${uid}`,
    table: 'user_settings',
    filter: `user_id=eq.${uid}`,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('user_settings')
        .select('settings')
        .eq('user_id', uid)
        .maybeSingle();
      if (error) throw new Error(error.message || 'Could not load reminders');
      const reminders = data?.settings?.voiceReminders;
      return reminders && typeof reminders === 'object' ? Object.keys(reminders) : [];
    },
    onData: (ids) => callback(Array.isArray(ids) ? ids : []),
  });
}

export async function fetchVoiceRemindersFor(roomId) {
  try {
    const { data } = await requireSupabase()
      .from('voice_sessions')
      .select('reminders')
      .eq('id', roomId)
      .maybeSingle();
    const list = data?.reminders;
    return Array.isArray(list) ? list.map((r) => r?.uid).filter(Boolean) : [];
  } catch (e) {
    return [];
  }
}

export function subscribeSignals(roomId, myUid, callback) {
  const seen = new Set();
  const cutoff = Date.now() - 5 * 60 * 1000;
  return subscribeQuery({
    key: `voice:signals:${roomId}`,
    table: 'voice_signals',
    filter: `session_id=eq.${roomId}`,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('voice_signals')
        .select('*')
        .eq('to_id', myUid)
        .gte('created_at', new Date(cutoff).toISOString())
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw new Error(error.message || 'Could not load signals');
      return mapRows(data);
    },
    onData: (rows) => {
      const fresh = (Array.isArray(rows) ? rows : [])
        .filter((row) => row && row.id && !seen.has(row.id))
        .map((row) => {
          seen.add(row.id);
          return {
            id: row.id,
            from: row.fromId,
            to: row.toId,
            kind: row.kind,
            payload: row.payload,
            createdAtMs: toMillis(row.createdAt),
          };
        });
      if (fresh.length) callback(fresh);
    },
  });
}

export async function sendSignalFrom(roomId, from, to, kind, payload) {
  const supabase = requireSupabase();
  const row = {
    id: randomId(),
    session_id: roomId,
    from_id: from,
    to_id: to || null,
    kind,
    payload: payload || {},
  };
  // Signalling is the backbone of voice: a single dropped SDP/ICE write
  // leaves both sides waiting forever. Retry with backoff before giving up.
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const { error } = await supabase.from('voice_signals').insert(attempt === 0 ? row : { ...row, id: randomId() });
      if (!error) return;
      lastError = error;
    } catch (e) {
      lastError = e;
    }
    await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
  }
  throw new Error((lastError && lastError.message) || 'Could not send signal');
}

export async function deleteSignal(roomId, id) {
  try {
    await getSupabase().from('voice_signals').delete().eq('id', id);
  } catch {}
}

export async function pruneSentSignals(roomId, uid) {
  try {
    await getSupabase().from('voice_signals').delete().eq('session_id', roomId).eq('from_id', uid);
  } catch (e) {}
}

export async function reportVoiceRoom(room, reporterId, reason) {
  const { useStore } = await import('./store');
  useStore.getState().reportItem({
    type: 'voice_room',
    targetType: 'voice_room',
    targetUserId: room.hostId,
    reason,
    details: `Room ${room.roomId}: ${room.title}`,
    reportedId: room.hostId,
    reporterId,
  });
}

export async function fetchHostRooms(uid, maxN = 60) {
  try {
    const { data, error } = await requireSupabase()
      .from('voice_sessions')
      .select('*')
      .eq('host_id', uid)
      .order('created_at', { ascending: false })
      .limit(maxN);
    if (error) throw new Error(error.message || 'Could not load rooms');
    const rooms = mapRows(data).map((row) => shapeRoom(row, null));
    const hosts = await fetchHosts([uid]);
    return rooms.map((r) => shapeRoom(r, hosts));
  } catch (e) {
    return [];
  }
}

export function canModerateRoom(room, uid, role) {
  if (!room || !uid) return false;
  if (room.hostId === uid) return true;
  return role === 'coHost';
}

export function isRoomSpeaker(role) {
  return VOICE_SPEAKER_ROLES.includes(role);
}

export function scoreVoiceRooms(rooms, profile, followedUsers) {
  const followed = followedUsers || {};
  const skills = (profile && Array.isArray(profile.skills) ? profile.skills : []).join(' ').toLowerCase();
  return rooms
    .map((room) => {
      let score = 0;
      if (followed[room.hostId]) score += 4;
      const haystack = `${room.title} ${room.description} ${room.category} ${(room.tags || []).join(' ')}`.toLowerCase();
      if (skills) {
        skills.split(/[,\s]+/).forEach((s) => {
          if (s.length > 2 && haystack.includes(s)) score += 3;
        });
      }
      if (room.template === 'cofounder') score += 1;
      if (room.status === 'live') score += 2;
      score += Math.min(3, (room.participantCount || 0) / 20);
      return { room, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.room);
}

export async function shareVoiceRoom(room, showToast) {
  const url = voiceRoomUrl(room.roomId);
  const shareData = { title: room.title, text: `${room.title} — Foundators Voice`, url };
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share(shareData);
      return true;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return false;
  }
  try {
    await navigator.clipboard.writeText(url);
    if (showToast) showToast('Room link copied!');
    return true;
  } catch (e) {
    if (showToast) showToast('Could not copy link');
    return false;
  }
}

export async function notifyRoomStarted(room) {
  try {
    const uids = await fetchVoiceRemindersFor(room.roomId);
    const chunks = uids.slice(0, 300);
    for (const uid of chunks) {
      notifyUser(uid, {
        type: 'voice_started',
        actorKey: room.hostId,
        actorName: room.hostName,
        text: `${room.hostName}'s room “${room.title}” is starting now.`,
        linkType: 'voice_room',
        linkId: room.roomId,
      }).catch(() => {});
    }
  } catch (e) {}
}

export async function notifyFollowersOfRoom(room) {
  try {
    const { data } = await requireSupabase()
      .from('follows')
      .select('follower_id')
      .eq('following_id', room.hostId)
      .limit(200);
    const uids = (data || []).map((r) => r.follower_id).filter((id) => id && id !== room.hostId);
    for (const uid of uids) {
      notifyUser(uid, {
        type: 'voice_live',
        actorKey: room.hostId,
        actorName: room.hostName,
        text: `${room.hostName} is hosting a room: “${room.title}”.`,
        linkType: 'voice_room',
        linkId: room.roomId,
      }).catch(() => {});
    }
  } catch (e) {}
}

export async function markReminderNotified(uid, roomId) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', uid)
      .maybeSingle();
    const settings = (data && data.settings) || {};
    const reminders = { ...(settings.voiceReminders || {}) };
    if (!reminders[roomId]) return;
    reminders[roomId] = { ...reminders[roomId], notified: true };
    await supabase
      .from('user_settings')
      .upsert(
        { user_id: uid, settings: { ...settings, voiceReminders: reminders }, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
  } catch (e) {}
}

export function upcomingReminderDelta(room) {
  if (!room || room.status !== 'scheduled' || !room.scheduledAtMs) return null;
  const delta = room.scheduledAtMs - Date.now();
  if (delta <= 0 || delta > 15 * 60 * 1000) return null;
  return room;
}

export function formatRoomTime(room) {
  if (!room) return '';
  const ms = room.status === 'scheduled' ? room.scheduledAtMs : room.startedAtMs || room.createdAtMs;
  if (!ms) return '';
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
