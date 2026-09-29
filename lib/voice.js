'use client';

import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  limit,
} from 'firebase/firestore';
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

export function voiceRoomRef(roomId) {
  return doc(db, 'voiceRooms', roomId);
}

function participantsCol(roomId) {
  return collection(db, 'voiceRooms', roomId, 'participants');
}

function requestsCol(roomId) {
  return collection(db, 'voiceRooms', roomId, 'speakerRequests');
}

function questionsCol(roomId) {
  return collection(db, 'voiceRooms', roomId, 'questions');
}

function reactionsCol(roomId) {
  return collection(db, 'voiceRooms', roomId, 'reactions');
}

function signalsCol(roomId) {
  return collection(db, 'voiceRooms', roomId, 'signals');
}

function remindersCol(roomId) {
  return collection(db, 'voiceRooms', roomId, 'reminders');
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
  const room = {
    roomId,
    hostId: profile.id,
    hostName: profile.name || 'Founder',
    hostHandle: profile.handle || '',
    hostAvatar: profile.avatar || '',
    hostVerified: !!profile.verified,
    title,
    description,
    category,
    type,
    template,
    templateData: input.templateData && typeof input.templateData === 'object' ? input.templateData : null,
    tags: Array.isArray(input.tags) ? input.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 8) : [],
    coverImageUrl: input.coverImageUrl || '',
    status: isScheduled ? 'scheduled' : 'live',
    isLocked: false,
    pinnedTopic: '',
    allowRaiseHand: input.allowRaiseHand !== false,
    allowReactions: input.allowReactions !== false,
    allowQuestions: input.allowQuestions !== false,
    maxSpeakers,
    participantCount: 1,
    speakerCount: 1,
    previewAvatars: profile.avatar ? [profile.avatar] : [],
    scheduledAt: isScheduled ? input.scheduledAt : null,
    scheduledAtMs: isScheduled ? input.scheduledAt.getTime() : null,
    createdAt: serverTimestamp(),
    createdAtMs: nowMs,
    startedAt: isScheduled ? null : serverTimestamp(),
    startedAtMs: isScheduled ? null : nowMs,
    endedAt: null,
    endedAtMs: null,
    hostBeat: serverTimestamp(),
    hostBeatMs: nowMs,
  };

  await setDoc(voiceRoomRef(roomId), room);
  await setDoc(doc(participantsCol(roomId), profile.id), {
    uid: profile.id,
    name: profile.name || 'Founder',
    handle: profile.handle || '',
    avatar: profile.avatar || '',
    verified: !!profile.verified,
    role: 'host',
    status: 'joined',
    isMuted: false,
    raisedHand: false,
    joinedAt: serverTimestamp(),
    joinedAtMs: nowMs,
    lastActiveAt: serverTimestamp(),
  });
  return roomId;
}

export async function updateVoiceRoom(roomId, patch) {
  await updateDoc(voiceRoomRef(roomId), patch);
}

export async function startVoiceRoom(roomId) {
  const nowMs = Date.now();
  await updateDoc(voiceRoomRef(roomId), {
    status: 'live',
    startedAt: serverTimestamp(),
    startedAtMs: nowMs,
    endedAt: null,
    endedAtMs: null,
    hostBeat: serverTimestamp(),
    hostBeatMs: nowMs,
  });
}

export async function endVoiceRoom(roomId, actorId) {
  await updateDoc(voiceRoomRef(roomId), {
    status: 'ended',
    endedAt: serverTimestamp(),
    endedAtMs: Date.now(),
    participantCount: 0,
    speakerCount: 0,
  });
  try {
    const [signals, reactions] = await Promise.all([
      getDocs(signalsCol(roomId)),
      getDocs(reactionsCol(roomId)),
    ]);
    const batch = writeBatch(db);
    [...signals.docs, ...reactions.docs].forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (e) {}
  try {
    const parts = await getDocs(participantsCol(roomId));
    const batch = writeBatch(db);
    parts.docs.forEach((d) => {
      if (d.id !== actorId) batch.delete(d.ref);
    });
    await batch.commit();
  } catch (e) {}
}

export async function deleteVoiceRoom(roomId) {
  const subs = ['participants', 'speakerRequests', 'questions', 'reactions', 'signals', 'reminders'];
  for (const sub of subs) {
    try {
      const snap = await getDocs(collection(db, 'voiceRooms', roomId, sub));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {}
  }
  await deleteDoc(voiceRoomRef(roomId));
}

export async function joinVoiceRoom(roomId, profile, forceRole) {
  const ref = doc(participantsCol(roomId), profile.id);
  const snap = await getDoc(ref);
  const nowMs = Date.now();
  if (snap.exists()) {
    const existing = snap.data();
    await updateDoc(ref, {
      status: 'joined',
      lastActiveAt: serverTimestamp(),
      name: profile.name || existing.name,
      avatar: profile.avatar || existing.avatar,
      verified: profile.verified !== undefined ? !!profile.verified : existing.verified,
    });
    return forceRole && forceRole !== existing.role ? forceRole : existing.role;
  }
  const role = forceRole || 'listener';
  await setDoc(ref, {
    uid: profile.id,
    name: profile.name || 'Founder',
    handle: profile.handle || '',
    avatar: profile.avatar || '',
    verified: !!profile.verified,
    role,
    status: 'joined',
    isMuted: false,
    raisedHand: false,
    joinedAt: serverTimestamp(),
    joinedAtMs: nowMs,
    lastActiveAt: serverTimestamp(),
  });
  return role;
}

export async function leaveVoiceRoom(roomId, uid) {
  try {
    await deleteDoc(doc(participantsCol(roomId), uid));
  } catch (e) {}
  try {
    await deleteDoc(doc(requestsCol(roomId), uid));
  } catch (e) {}
  await pruneSentSignals(roomId, uid);
}

export async function heartbeatVoiceRoom(roomId, uid, isHost) {
  const patch = { lastActiveAt: serverTimestamp() };
  await updateDoc(doc(participantsCol(roomId), uid), patch).catch(() => {});
  if (isHost) {
    await updateDoc(voiceRoomRef(roomId), {
      hostBeat: serverTimestamp(),
      hostBeatMs: Date.now(),
    }).catch(() => {});
  }
}

export async function updateVoiceCounts(roomId, { participantCount, speakerCount, previewAvatars }) {
  const patch = {};
  if (typeof participantCount === 'number') patch.participantCount = participantCount;
  if (typeof speakerCount === 'number') patch.speakerCount = speakerCount;
  if (Array.isArray(previewAvatars)) patch.previewAvatars = previewAvatars.slice(0, 6);
  if (Object.keys(patch).length) await updateDoc(voiceRoomRef(roomId), patch).catch(() => {});
}

export async function raiseHand(room, profile) {
  const reqRef = doc(requestsCol(room.roomId), profile.id);
  const existing = await getDoc(reqRef);
  if (existing.exists() && existing.data().status === 'pending') return;
  await setDoc(reqRef, {
    uid: profile.id,
    name: profile.name || 'Founder',
    handle: profile.handle || '',
    avatar: profile.avatar || '',
    verified: !!profile.verified,
    status: 'pending',
    requestedAt: serverTimestamp(),
    requestedAtMs: Date.now(),
  });
  await updateDoc(doc(participantsCol(room.roomId), profile.id), { raisedHand: true }).catch(() => {});
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
  await deleteDoc(doc(requestsCol(roomId), uid)).catch(() => {});
  await updateDoc(doc(participantsCol(roomId), uid), { raisedHand: false }).catch(() => {});
}

export async function approveSpeaker(room, uid, profile) {
  const batch = writeBatch(db);
  batch.update(doc(requestsCol(room.roomId), uid), { status: 'approved', decidedAt: serverTimestamp() });
  batch.update(doc(participantsCol(room.roomId), uid), {
    role: 'speaker',
    raisedHand: false,
    isMuted: false,
  });
  await batch.commit();
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
  const batch = writeBatch(db);
  batch.update(doc(requestsCol(room.roomId), uid), { status: 'rejected', decidedAt: serverTimestamp() });
  batch.update(doc(participantsCol(room.roomId), uid), { raisedHand: false });
  await batch.commit();
}

export async function setParticipantRole(roomId, uid, role) {
  await updateDoc(doc(participantsCol(roomId), uid), { role });
}

export async function removeParticipant(roomId, uid) {
  await deleteDoc(doc(participantsCol(roomId), uid)).catch(() => {});
  await deleteDoc(doc(requestsCol(roomId), uid)).catch(() => {});
}

export async function setSelfMuted(roomId, uid, muted) {
  await updateDoc(doc(participantsCol(roomId), uid), { isMuted: !!muted }).catch(() => {});
}

export async function inviteSpeaker(room, target, profile) {
  await setDoc(doc(participantsCol(room.roomId), target.uid), {
    uid: target.uid,
    name: target.name || 'Founder',
    handle: target.handle || '',
    avatar: target.avatar || '',
    verified: !!target.verified,
    role: 'listener',
    status: 'joined',
    isMuted: false,
    raisedHand: false,
    joinedAt: serverTimestamp(),
    joinedAtMs: Date.now(),
    lastActiveAt: serverTimestamp(),
    invited: true,
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
  await updateDoc(voiceRoomRef(roomId), { isLocked: !!locked });
}

export async function pinRoomTopic(roomId, topic) {
  await updateDoc(voiceRoomRef(roomId), { pinnedTopic: String(topic || '').slice(0, 200) });
}

export async function addQuestion(room, profile, text) {
  const clean = String(text || '').trim();
  if (!clean || clean.length > 500) throw new Error('Question must be 1-500 characters');
  await setDoc(doc(questionsCol(room.roomId)), {
    authorId: profile.id,
    authorName: profile.name || 'Founder',
    authorHandle: profile.handle || '',
    authorAvatar: profile.avatar || '',
    text: clean,
    status: 'pending',
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  });
}

export async function setQuestionStatus(roomId, qid, status) {
  await updateDoc(doc(questionsCol(roomId), qid), { status });
}

export async function deleteQuestion(roomId, qid) {
  await deleteDoc(doc(questionsCol(roomId), qid)).catch(() => {});
}

export async function sendReaction(room, profile, type) {
  const mine = await getDocs(query(reactionsCol(room.roomId), where('userId', '==', profile.id)));
  const batch = writeBatch(db);
  mine.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  await setDoc(doc(reactionsCol(room.roomId)), {
    userId: profile.id,
    name: profile.name || '',
    type: String(type).slice(0, 16),
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  });
}

export async function setVoiceReminder(roomId, uid, on) {
  const userRef = doc(db, 'users', uid, 'voiceReminders', roomId);
  const roomRef = doc(remindersCol(roomId), uid);
  if (on) {
    await setDoc(userRef, { roomId, createdAt: serverTimestamp(), notified: false });
    await setDoc(roomRef, { uid, createdAt: serverTimestamp() });
  } else {
    await deleteDoc(userRef).catch(() => {});
    await deleteDoc(roomRef).catch(() => {});
  }
}

export function subscribeVoiceByStatus(status, callback) {
  return onSnapshot(query(collection(db, 'voiceRooms'), where('status', '==', status)), (snap) => {
    const rows = snap.docs.map((d) => d.data());
    callback(rows);
  });
}

export function subscribeHostRooms(hostId, callback) {
  return onSnapshot(query(collection(db, 'voiceRooms'), where('hostId', '==', hostId)), (snap) => {
    callback(snap.docs.map((d) => d.data()));
  });
}

export function subscribeVoiceRoom(roomId, callback, onError) {
  return onSnapshot(
    voiceRoomRef(roomId),
    (snap) => {
      callback(snap.exists() ? snap.data() : null);
    },
    onError || (() => {})
  );
}

export function subscribeVoiceParticipants(roomId, callback) {
  return onSnapshot(participantsCol(roomId), (snap) => {
    callback(snap.docs.map((d) => d.data()));
  });
}

export function subscribeVoiceRequests(roomId, callback) {
  return onSnapshot(requestsCol(roomId), (snap) => {
    callback(snap.docs.map((d) => d.data()));
  });
}

export function subscribeVoiceQuestions(roomId, callback) {
  return onSnapshot(questionsCol(roomId), (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
    callback(rows);
  });
}

export function subscribeVoiceReactions(roomId, callback) {
  return onSnapshot(reactionsCol(roomId), (snap) => {
    const rows = snap.docs.map((d) => d.data());
    const now = Date.now();
    callback(rows.filter((r) => now - (r.createdAtMs || 0) < 20000));
  });
}

export function subscribeVoiceReminders(roomId, callback) {
  return onSnapshot(remindersCol(roomId), (snap) => {
    callback(snap.docs.map((d) => d.data()));
  });
}

export function subscribeMyVoiceReminders(uid, callback) {
  return onSnapshot(collection(db, 'users', uid, 'voiceReminders'), (snap) => {
    callback(snap.docs.map((d) => d.id));
  });
}

export async function fetchVoiceRemindersFor(roomId) {
  try {
    const snap = await getDocs(remindersCol(roomId));
    return snap.docs.map((d) => d.data().uid).filter(Boolean);
  } catch (e) {
    return [];
  }
}

export function subscribeSignals(roomId, myUid, callback) {
  return onSnapshot(query(signalsCol(roomId), where('to', '==', myUid)), (snap) => {
    callback(
      snap.docChanges().map((change) => ({
        id: change.doc.id,
        ...change.doc.data(),
      }))
    );
  });
}

export async function sendSignalFrom(roomId, from, to, kind, payload) {
  await setDoc(doc(signalsCol(roomId)), {
    from,
    to,
    kind,
    payload,
    createdAtMs: Date.now(),
  });
}

export async function deleteSignal(roomId, id) {
  await deleteDoc(doc(signalsCol(roomId), id)).catch(() => {});
}

export async function pruneSentSignals(roomId, uid) {
  try {
    const snap = await getDocs(query(signalsCol(roomId), where('from', '==', uid)));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
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
    const snap = await getDocs(query(collection(db, 'voiceRooms'), where('hostId', '==', uid), limit(maxN)));
    return snap.docs.map((d) => d.data());
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
    const snap = await getDocs(query(collection(db, 'users', room.hostId, 'followers'), limit(200)));
    const uids = snap.docs.map((d) => d.id).filter((id) => id !== room.hostId);
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
    await updateDoc(doc(db, 'users', uid, 'voiceReminders', roomId), { notified: true });
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
