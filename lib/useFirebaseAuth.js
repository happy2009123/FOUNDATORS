'use client';

import { useState, useCallback, useEffect } from 'react';
import { useStore } from './store';
import { auth, isFirebaseConfigured } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  signOut as firebaseSignOut,
  sendEmailVerification as fbSendEmailVerification,
  sendPasswordResetEmail,
  reload,
} from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();

export function useFirebaseAuth() {
  const [loading, setLoading] = useState(false);
  const login = useStore((s) => s.login);
  const logout = useStore((s) => s.logout);
  const updateProfileFields = useStore((s) => s.updateProfile);

  useEffect(() => {
    const a = auth;
    if (!a) return;
    const unsubscribe = onAuthStateChanged(a, (user) => {
      if (user) {
        login();
        updateProfileFields({
          name: user.displayName || user.email?.split('@')[0] || 'User',
          handle: '@' + (user.displayName || user.email?.split('@')[0] || 'user').toLowerCase().replace(/\s+/g, ''),
          email: user.email,
          avatar: user.photoURL || `https://i.pravatar.cc/160?u=${user.uid}`,
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const signUpWithEmail = useCallback(async (email, password, name) => {
    setLoading(true);
    try {
      const a = auth;
      if (a) {
        const cred = await createUserWithEmailAndPassword(a, email, password);
        if (name) {
          await firebaseUpdateProfile(cred.user, { displayName: name });
        }
        login();
        updateProfileFields({
          name,
          handle: '@' + name.toLowerCase().replace(/\s+/g, ''),
          email,
          avatar: `https://i.pravatar.cc/160?u=${cred.user.uid}`,
        });
        return cred.user;
      } else {
        const stored = JSON.parse(localStorage.getItem('foundators-users') || '[]');
        if (stored.find((u) => u.email === email)) throw { code: 'auth/email-already-in-use', message: 'An account with this email already exists' };
        const newUser = { email, password, name, createdAt: Date.now() };
        stored.push(newUser);
        localStorage.setItem('foundators-users', JSON.stringify(stored));
        login();
        updateProfileFields({
          name,
          handle: '@' + name.toLowerCase().replace(/\s+/g, ''),
          email,
          avatar: `https://i.pravatar.cc/160?u=${email}`,
        });
        return newUser;
      }
    } finally {
      setLoading(false);
    }
  }, [login, updateProfileFields]);

  const signInWithEmail = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const a = auth;
      if (a) {
        const cred = await signInWithEmailAndPassword(a, email, password);
        login();
        const u = cred.user;
        updateProfileFields({
          name: u.displayName || email.split('@')[0],
          handle: '@' + (u.displayName || email.split('@')[0]).toLowerCase().replace(/\s+/g, ''),
          email,
          avatar: u.photoURL || `https://i.pravatar.cc/160?u=${u.uid}`,
        });
        return u;
      } else {
        const stored = JSON.parse(localStorage.getItem('foundators-users') || '[]');
        const user = stored.find((u) => u.email === email && u.password === password);
        if (!user) throw { code: 'auth/user-not-found', message: 'No account found with this email' };
        login();
        updateProfileFields({
          name: user.name,
          handle: '@' + user.name.toLowerCase().replace(/\s+/g, ''),
          email: user.email,
          avatar: `https://i.pravatar.cc/160?u=${user.email}`,
        });
        return user;
      }
    } finally {
      setLoading(false);
    }
  }, [login, updateProfileFields]);

  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      const a = auth;
      if (a) {
        const cred = await signInWithPopup(a, googleProvider);
        login();
        const u = cred.user;
        updateProfileFields({
          name: u.displayName || 'Google User',
          handle: '@' + (u.displayName || 'googleuser').toLowerCase().replace(/\s+/g, ''),
          email: u.email,
          avatar: u.photoURL || `https://i.pravatar.cc/160?u=${u.uid}`,
        });
        return u;
      } else {
        const fakeUser = { email: 'user@gmail.com', name: 'Google User', password: 'google-auth', createdAt: Date.now() };
        const stored = JSON.parse(localStorage.getItem('foundators-users') || '[]');
        if (!stored.find((u) => u.email === fakeUser.email)) {
          stored.push(fakeUser);
          localStorage.setItem('foundators-users', JSON.stringify(stored));
        }
        login();
        updateProfileFields({
          name: fakeUser.name,
          handle: '@googleuser',
          email: fakeUser.email,
          avatar: 'https://i.pravatar.cc/160?u=google',
        });
        return fakeUser;
      }
    } finally {
      setLoading(false);
    }
  }, [login, updateProfileFields]);

  const signOut = useCallback(async () => {
    const a = auth;
    if (a) {
      await firebaseSignOut(a);
    }
    logout();
  }, [logout]);

  const sendEmailVerificationAction = useCallback(async () => {
    const a = auth;
    if (a && a.currentUser) {
      await fbSendEmailVerification(a.currentUser);
    }
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    const a = auth;
    if (a) {
      await sendPasswordResetEmail(a, email);
    }
  }, []);

  const reloadUser = useCallback(async () => {
    const a = auth;
    if (a && a.currentUser) {
      await reload(a.currentUser);
    }
  }, []);

  const isEmailVerified = auth?.currentUser?.emailVerified || false;

  return {
    loading,
    isFirebase: isFirebaseConfigured,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    sendEmailVerification: sendEmailVerificationAction,
    sendPasswordReset,
    reloadUser,
    isEmailVerified,
  };
}
