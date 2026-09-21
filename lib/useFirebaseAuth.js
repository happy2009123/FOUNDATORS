'use client';

import { useState, useCallback } from 'react';
import { useStore } from './store';
import { auth, db, isFirebaseConfigured } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile as firebaseUpdateProfile,
  signOut as firebaseSignOut,
  sendEmailVerification as fbSendEmailVerification,
  sendPasswordResetEmail,
  reload,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const googleProvider = new GoogleAuthProvider();

export function useFirebaseAuth() {
  const [loading, setLoading] = useState(false);

  const signUpWithEmail = useCallback(async (email, password, name) => {
    setLoading(true);
    try {
      const a = auth;
      if (!a) throw new Error('Firebase not initialized');
      const cred = await createUserWithEmailAndPassword(a, email, password);
      if (name) {
        await firebaseUpdateProfile(cred.user, { displayName: name });
      }
      const uid = cred.user.uid;
      const avatar = cred.user.photoURL || `https://i.pravatar.cc/160?u=${uid}`;
      await setDoc(doc(db, 'users', uid), {
        uid,
        name,
        handle: '@' + name.toLowerCase().replace(/\s+/g, ''),
        email,
        avatar,
        bio: '',
        role: '',
        location: '',
        profileCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return cred.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const a = auth;
      if (!a) throw new Error('Firebase not initialized');
      const cred = await signInWithEmailAndPassword(a, email, password);
      return cred.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      const a = auth;
      if (!a) throw new Error('Firebase not initialized');
      const cred = await signInWithPopup(a, googleProvider);
      const uid = cred.user.uid;
      const existingDoc = await import('firebase/firestore').then(m =>
        m.getDoc(m.doc(db, 'users', uid))
      );
      if (!existingDoc.exists()) {
        const name = cred.user.displayName || 'User';
        const avatar = cred.user.photoURL || `https://i.pravatar.cc/160?u=${uid}`;
        await setDoc(doc(db, 'users', uid), {
          uid,
          name,
          handle: '@' + name.toLowerCase().replace(/\s+/g, ''),
          email: cred.user.email || '',
          avatar,
          bio: '',
          role: '',
          location: '',
          profileCompleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      return cred.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    const a = auth;
    if (a) {
      await firebaseSignOut(a);
    }
    useStore.getState().logout();
  }, []);

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
