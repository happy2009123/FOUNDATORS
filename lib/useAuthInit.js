'use client';

import { useEffect } from 'react';
import { useStore } from './store';
import { auth, db, isFirebaseConfigured } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export function useAuthInit() {
  const set = useStore.setState;

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      set({ authReady: true, isLoggedIn: false });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const d = snap.data();
            const completed = d.profileCompleted === true || d.createdAt != null;
            set({
              isLoggedIn: true,
              authReady: true,
              profileCompleted: completed,
              profile: {
                id: user.uid,
                name: d.name || user.displayName || user.email?.split('@')[0] || 'User',
                handle: d.handle || '@' + (d.name || 'user').toLowerCase().replace(/\s+/g, ''),
                email: d.email || user.email || '',
                avatar: d.avatar || user.photoURL || `https://i.pravatar.cc/160?u=${user.uid}`,
                bio: d.bio || '',
                role: d.role || '',
                location: d.location || '',
              },
            });
          } else {
            set({
              isLoggedIn: true,
              authReady: true,
              profileCompleted: false,
              profile: {
                id: user.uid,
                name: user.displayName || user.email?.split('@')[0] || 'User',
                handle: '@' + (user.displayName || 'user').toLowerCase().replace(/\s+/g, ''),
                email: user.email || '',
                avatar: user.photoURL || `https://i.pravatar.cc/160?u=${user.uid}`,
                bio: '',
                role: '',
                location: '',
              },
            });
          }
        } catch {
          set({
            isLoggedIn: true,
            authReady: true,
            profileCompleted: true,
            profile: {
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'User',
              handle: '@' + (user.displayName || 'user').toLowerCase().replace(/\s+/g, ''),
              email: user.email || '',
              avatar: user.photoURL || `https://i.pravatar.cc/160?u=${user.uid}`,
              bio: '',
              role: '',
              location: '',
            },
          });
        }
      } else {
        set({
          isLoggedIn: false,
          authReady: true,
          profileCompleted: true,
          profile: { id: null, name: '', handle: '', email: '', avatar: '', bio: '', role: '', location: '' },
        });
      }
    });

    return () => unsubscribe();
  }, [set]);
}
