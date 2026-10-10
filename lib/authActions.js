'use client';

import { signOut as sbSignOut } from './supabase/auth';
import { useStore } from './store';
import { endPresenceFor, resetPresenceWatchers } from './presence';
import { teardownAllSubscriptions } from './supabase/realtime';

// Ends the REAL Supabase session and clears the local store.
// Every "log out" entry point must use this helper: the old
// store-only logout left the session alive, so the next
// page load signed the user straight back in — the login
// screen could never stick and sessions appeared impossible to end.
export async function signOutFully() {
  try {
    // Clear presence first, while the auth token is still valid — otherwise
    // the user keeps showing "Online" for up to 90s after logging out.
    await endPresenceFor(useStore.getState().profile?.id);
  } catch (e) {
    // presence clear is best-effort
  }
  try {
    await sbSignOut();
  } catch (e) {
    // A network hiccup must not trap the user in a half-logged-in UI;
    // the store is still cleared below so the UI ends up consistent.
  }
  try {
    resetPresenceWatchers();
    teardownAllSubscriptions();
  } catch (e) {
    // channel cleanup is best-effort
  }
  useStore.getState().logout();
}
