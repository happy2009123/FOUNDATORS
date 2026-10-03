'use client';

import { auth } from './firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { useStore } from './store';

// Ends the REAL Firebase session and clears the local store.
// Every "log out" entry point must use this helper: the old
// store-only logout left the Firebase session alive, so the next
// page load signed the user straight back in — the login screen
// could never stick and sessions appeared impossible to end.
export async function signOutFully() {
  try {
    if (auth) await firebaseSignOut(auth);
  } catch (e) {
    // A network hiccup must not trap the user in a half-logged-in UI;
    // the store is still cleared below so the UI ends up consistent.
  }
  useStore.getState().logout();
}
