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

  useEffect(() => {
    const a = auth;
    if (!a) return;
    const unsubscribe = onAuthStateChanged(a, (user) => {
      if (user) {
        login({ uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL });
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
        login({ uid: cred.user.uid, email, displayName: name, photoURL: null });
        return cred.user;
      } else {
        const stored = JSON.parse(localStorage.getItem('foundators-users') || '[]');
        if (stored.find((u) => u.email === email)) throw { code: 'auth/email-already-in-use', message: 'An account with this email already exists' };
        const newUser = { email, password, name, createdAt: Date.now() };
        stored.push(newUser);
        localStorage.setItem('foundators-users', JSON.stringify(stored));
        login({ uid: 'local_' + email.replace(/[^a-z0-9]/gi, '_'), email, displayName: name, photoURL: null });
        return newUser;
      }
    } finally {
      setLoading(false);
    }
  }, [login]);

  const signInWithEmail = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const a = auth;
      if (a) {
        const cred = await signInWithEmailAndPassword(a, email, password);
        login({ uid: cred.user.uid, email, displayName: cred.user.displayName, photoURL: cred.user.photoURL });
        return cred.user;
      } else {
        const stored = JSON.parse(localStorage.getItem('foundators-users') || '[]');
        const user = stored.find((u) => u.email === email && u.password === password);
        if (!user) throw { code: 'auth/user-not-found', message: 'No account found with this email' };
        login({ uid: 'local_' + email.replace(/[^a-z0-9]/gi, '_'), email, displayName: user.name, photoURL: null });
        return user;
      }
    } finally {
      setLoading(false);
    }
  }, [login]);

  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      const a = auth;
      if (a) {
        const cred = await signInWithPopup(a, googleProvider);
        login({ uid: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName, photoURL: cred.user.photoURL });
        return cred.user;
      } else {
        const fakeUser = { email: 'user@gmail.com', name: 'Google User', password: 'google-auth', createdAt: Date.now() };
        const stored = JSON.parse(localStorage.getItem('foundators-users') || '[]');
        if (!stored.find((u) => u.email === fakeUser.email)) {
          stored.push(fakeUser);
          localStorage.setItem('foundators-users', JSON.stringify(stored));
        }
        login({ uid: 'local_user_gmail_com', email: fakeUser.email, displayName: fakeUser.name, photoURL: null });
        return fakeUser;
      }
    } finally {
      setLoading(false);
    }
  }, [login]);

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

  const checkEmailVerified = useCallback(async () => {
    const a = auth;
    if (a && a.currentUser) {
      await reload(a.currentUser);
      return a.currentUser.emailVerified;
    }
    return false;
  }, []);

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
    isEmailVerified: checkEmailVerified,
  };
}
