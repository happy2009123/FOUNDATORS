'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyB2hONQjrQRjKlXGTarAW-brYMZlXXyrE',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'foundators-66eb7.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'foundators-66eb7',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'foundators-66eb7.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '895663747948',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:895663747948:web:4f67c151bc7d8351ec3949',
};

export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
);

export const isMessagingConfigured = !!(
  isFirebaseConfigured &&
  firebaseConfig.messagingSenderId
);

let app = null;
let authInstance = null;
let dbInstance = null;
let storageInstance = null;

function initFirebase() {
  if (app) return;
  if (typeof window === 'undefined') return;
  if (!isFirebaseConfigured) return;
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
}

if (typeof window !== 'undefined') initFirebase();

export { authInstance as auth, dbInstance as db, storageInstance as storage };
export default app;
