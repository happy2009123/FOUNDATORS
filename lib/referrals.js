'use client';

// ─────────────────────────────────────────────────────────────
// REFERRALS — closes the half-built invite pipeline.
// Link:  /signup?ref=<uid>   (uids are already public in URLs)
// Capture: signup page remembers ?ref= in sessionStorage (survives
// the Google redirect), and the invite doc is created by the
// invitee under the inviter (rules enforce doc id == invitee uid).
// Activation: flips activated=true after a meaningful action
// (first post or first project) — which is what Builder Score's
// "Activated referrals" row counts (3 points each).
// ─────────────────────────────────────────────────────────────

import { db } from '@/lib/firebase';
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

const REF_KEY = 'foundators_ref';

export function rememberReferralFromUrl() {
  try {
    const p = new URLSearchParams(window.location.search);
    const ref = p.get('ref');
    if (ref) sessionStorage.setItem(REF_KEY, ref.slice(0, 128));
  } catch (e) {
    // storage unavailable
  }
}

export function readReferralCode() {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get('ref') || sessionStorage.getItem(REF_KEY) || '';
  } catch (e) {
    return '';
  }
}

function clearReferralCode() {
  try {
    sessionStorage.removeItem(REF_KEY);
  } catch (e) {
    // storage unavailable
  }
}

export function referralLinkFor(uid) {
  try {
    return `${window.location.origin}/signup?ref=${uid}`;
  } catch (e) {
    return `/signup?ref=${uid}`;
  }
}

// Called right after a NEW account's user doc is created.
export async function recordInviteIfAny(newUid, invitedName) {
  try {
    const ref = readReferralCode();
    if (!ref || ref === newUid) return;
    const inviter = await getDoc(doc(db, 'users', ref));
    if (!inviter.exists()) return;
    await setDoc(doc(db, 'users', ref, 'invites', newUid), {
      invitedUid: newUid,
      invitedName: String(invitedName || '').slice(0, 100),
      joinedAt: serverTimestamp(),
      activated: false,
    });
    await updateDoc(doc(db, 'users', newUid), { invitedBy: ref });
    clearReferralCode();
  } catch (e) {
    // referral recording is best-effort — never blocks signup
  }
}

// Called after a meaningful action (first post, first project).
export async function activateInviteIfNeeded(uid) {
  try {
    if (!uid) return;
    const me = await getDoc(doc(db, 'users', uid));
    const inviter = me.exists() ? me.data().invitedBy : '';
    if (!inviter) return;
    const inviteRef = doc(db, 'users', inviter, 'invites', uid);
    const snap = await getDoc(inviteRef);
    if (snap.exists() && !snap.data().activated) {
      await updateDoc(inviteRef, { activated: true });
    }
  } catch (e) {
    // activation is best-effort
  }
}

export function subscribeMyInvites(uid, cb) {
  return onSnapshot(
    query(
      collection(db, 'users', uid, 'invites'),
      orderBy('joinedAt', 'desc'),
      limit(100)
    ),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([])
  );
}
