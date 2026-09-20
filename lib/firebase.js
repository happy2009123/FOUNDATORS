'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyB2hONQjrQRjKlXGTarAW-brYMZlXXyrE',
  authDomain: 'foundators-66eb7.firebaseapp.com',
  projectId: 'foundators-66eb7',
  storageBucket: 'foundators-66eb7.firebasestorage.app',
  messagingSenderId: '895663747948',
  appId: '1:895663747948:web:4f67c151bc7d8351ec3949',
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
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
}

if (typeof window !== 'undefined') initFirebase();

export { authInstance as auth, dbInstance as db, storageInstance as storage };
export default app;
