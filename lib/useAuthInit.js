'use client';

import { useEffect } from 'react';
import { useStore } from './store';
import { auth, db, isFirebaseConfigured } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { initialsAvatar } from './avatar';

export function useAuthInit() {
  const set = useStore.setState;

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      set({ authReady: true, isLoggedIn: false });
      return;
    }

    // Guards the profile round-trip against stale responses. Without it a
    // getDoc that was already in flight when the user logged out (or when a
    // different account signed in) would resolve afterwards and write the
    // PREVIOUS account's profile back over the current session.
    let cancelled = false;
    let activeUid = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      cancelled = false;
      activeUid = user ? user.uid : null;
      if (user) {
        // Mark the session as signed-in IMMEDIATELY, before the profile
        // document loads. The previous code waited for the getDoc round
        // trip, so right after login (or re-login after a logout) the
        // store still said authReady=true / isLoggedIn=false for a few
        // hundred ms — long enough for /home to bounce back to /login
        // and create the login loop. The document then refines the
        // profile and the onboarding flag in a second set().
        const base = {
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'User',
          handle: '@' + (user.displayName || 'user').toLowerCase().replace(/\s+/g, ''),
          email: user.email || '',
          avatar: user.photoURL || initialsAvatar(user.displayName || user.email?.split('@')[0]),
          bio: '',
          role: '',
          location: '',
          website: '',
          skills: [],
        };
        set({ isLoggedIn: true, authReady: true, profileCompleted: true, profile: base });

        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (cancelled || activeUid !== user.uid) return;
          if (snap.exists()) {
            const d = snap.data();
            const completed = d.profileCompleted === true || d.createdAt != null;
            set({
              isLoggedIn: true,
              authReady: true,
              profileCompleted: completed,
              profile: {
                id: user.uid,
                name: d.name || base.name,
                handle: d.handle || base.handle,
                email: d.email || base.email,
                avatar: d.avatar || base.avatar,
                bio: d.bio || '',
                role: d.role || '',
                location: d.location || '',
                website: d.website || '',
                skills: Array.isArray(d.skills) ? d.skills : [],
              },
            });
          } else {
            set({ isLoggedIn: true, authReady: true, profileCompleted: false, profile: base });
          }
        } catch {
          if (cancelled || activeUid !== user.uid) return;
          set({ isLoggedIn: true, authReady: true, profileCompleted: true, profile: base });
        }
      } else {
        activeUid = null;
        set({
          isLoggedIn: false,
          authReady: true,
          profileCompleted: true,
          profile: { id: null, name: '', handle: '', email: '', avatar: '', bio: '', role: '', location: '', website: '', skills: [] },
        });
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [set]);
}
