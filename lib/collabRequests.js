'use client';

// ─────────────────────────────────────────────────────────────
// COLLABORATION REQUESTS — profile-to-profile connect flow.
// Stored as users/{recipientUid}/collabRequests/{requesterUid}
// (doc id = requester ⇒ idempotent, mirrors the project
// applications pattern). Accepting opens a real 1:1 chat.
// ─────────────────────────────────────────────────────────────

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  collectionGroup,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { notifyUser } from '@/lib/notify';
import { createChat } from '@/lib/firestore';

export async function sendCollabRequest(recipient, requester, message, intent) {
  await setDoc(doc(db, 'users', recipient.id, 'collabRequests', requester.id), {
    uid: requester.id,
    name: String(requester.name || '').slice(0, 100),
    avatar: requester.avatar || '',
    handle: requester.handle || '',
    message: String(message || '').trim().slice(0, 1000),
    intent: String(intent || '').slice(0, 50),
    status: 'pending',
    createdAt: serverTimestamp(),
  });
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
  await deleteDoc(doc(db, 'users', recipientUid, 'collabRequests', requesterUid));
}

export async function decideCollabRequest(recipient, request, decision) {
  await updateDoc(doc(db, 'users', recipient.id, 'collabRequests', request.uid), {
    status: decision,
    reviewedAt: serverTimestamp(),
  });
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
  return onSnapshot(
    query(
      collection(db, 'users', uid, 'collabRequests'),
      orderBy('createdAt', 'desc'),
      limit(50)
    ),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([])
  );
}

export async function getMyRequestTo(recipientUid, requesterUid) {
  try {
    const snap = await getDoc(doc(db, 'users', recipientUid, 'collabRequests', requesterUid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (e) {
    return null;
  }
}

export async function getMySentCollabRequests(requesterUid) {
  try {
    const snap = await getDocs(
      query(collectionGroup(db, 'collabRequests'), where('uid', '==', requesterUid), limit(50))
    );
    return snap.docs.map((d) => ({
      id: d.id,
      recipientUid: d.ref.parent.parent ? d.ref.parent.parent.id : null,
      ...d.data(),
    }));
  } catch (e) {
    return [];
  }
}
