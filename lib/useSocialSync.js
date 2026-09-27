'use client';

import { useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { useStore } from './store';

// ─────────────────────────────────────────────────────────────
// Follow-state sync
// ─────────────────────────────────────────────────────────────
// followedUsers was only ever written by the toggle action and is not
// persisted, so it started EMPTY on every page load: after a refresh the
// whole app believed you followed nobody — follow buttons reset to
// "Follow", feed scoring and suggestions ignored your graph — even
// though the writes had succeeded. This listener mirrors
// users/{uid}/following into the store and self-heals any optimistic
// toggle (a rejected write never reaches the server, so the store
// rollback + this snapshot both converge to the truth).
// ─────────────────────────────────────────────────────────────

export function useSocialSync() {
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const uid = useStore((s) => s.profile?.id);

  useEffect(() => {
    if (!isLoggedIn || !uid || !db) return;
    const unsub = onSnapshot(
      collection(db, 'users', uid, 'following'),
      (snap) => {
        const map = {};
        snap.docs.forEach((d) => { map[d.id] = true; });
        useStore.setState({ followedUsers: map });
      },
      () => {} // permission hiccup: keep whatever state we already have
    );
    return unsub;
  }, [isLoggedIn, uid]);
}
