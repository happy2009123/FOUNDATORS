'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyB2hONQjrQRjKlXGTarAW-_brYMZlXXyrE',
  authDomain: 'foundators-66eb7.firebaseapp.com',
  projectId: 'foundators-66eb7',
  storageBucket: 'foundators-66eb7.firebasestorage.app',
  messagingSenderId: '895663747948',
  appId: '1:895663747948:web:e5220d538c676f34ec3949',
};

export const isFirebaseConfigured = true;
export const isMessagingConfigured = true;

let app = null;
let authInstance = null;
let dbInstance = null;
let storageInstance = null;

function initFirebase() {
  if (app) return;
  if (typeof window === 'undefined') return;
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  setPersistence(authInstance, browserLocalPersistence).catch(() => {});
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
}

if (typeof window !== 'undefined') initFirebase();

export { authInstance as auth, dbInstance as db, storageInstance as storage };
export default app;
