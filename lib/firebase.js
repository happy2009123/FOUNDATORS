'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { firebaseConfig } from '@/lib/firebaseConfig';

export const isFirebaseConfigured = true;
export const isMessagingConfigured = true;

// QA ONLY: when NEXT_PUBLIC_USE_EMULATORS=1 the SDKs talk to the local
// Firebase emulators instead of production. The variable is unset in
// production builds, so this changes nothing outside local testing.
const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === '1';

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
  if (useEmulators) {
    connectAuthEmulator(authInstance, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(dbInstance, 'localhost', 8080);
    connectStorageEmulator(storageInstance, 'localhost', 9199);
  }
}

if (typeof window !== 'undefined') initFirebase();

export { authInstance as auth, dbInstance as db, storageInstance as storage };
export default app;
