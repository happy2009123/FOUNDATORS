'use client';

import { getSupabase } from './client';

export function isSupabaseAuthConfigured() {
  return getSupabase() !== null;
}

export async function getSession() {
  const s = getSupabase();
  if (!s) return null;
  const { data } = await s.auth.getSession();
  return data?.session || null;
}

export async function getCurrentUser() {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

export function onAuthStateChange(cb) {
  const s = getSupabase();
  if (!s) return () => {};
  const { data } = s.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null, session);
  });
  return () => data?.subscription?.unsubscribe?.();
}

export async function signUpWithEmail(email, password, metadata = {}) {
  const s = getSupabase();
  if (!s) return { error: 'Supabase not configured' };
  const { data, error } = await s.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${window.location.origin}/auth/callback?next=/home`,
    },
  });
  if (error) return { error: error.message };
  return {
    user: data.user,
    session: data.session,
    needsConfirm: !data.session,
  };
}

export async function signInWithEmail(email, password) {
  const s = getSupabase();
  if (!s) return { error: 'Supabase not configured' };
  const { data, error } = await s.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { user: data.user, session: data.session };
}

export async function sendPasswordReset(email, redirectTo) {
  const s = getSupabase();
  if (!s) return { error: 'Supabase not configured' };
  const { error } = await s.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || `${window.location.origin}/reset-password`,
  });
  return { error: error?.message || null };
}

export async function signOut() {
  const s = getSupabase();
  if (!s) return { error: 'Supabase not configured' };
  const { error } = await s.auth.signOut();
  return { error: error?.message || null };
}

export async function refreshSession() {
  const s = getSupabase();
  if (!s) return null;
  const { data } = await s.auth.refreshSession();
  return data?.session || null;
}

export function isEmailVerified(user) {
  return Boolean(user?.email_confirmed_at);
}

export function uidOf(user) {
  return user?.id || null;
}

// Google sign-in via a popup. The popup lands on /auth/callback, exchanges
// the PKCE code in its own window (same-origin storage shares the verifier
// with the opener), postMessages the session back, then closes itself.
export async function signInWithGooglePopup() {
  const s = getSupabase();
  if (!s) return { error: 'Supabase not configured' };
  const origin = window.location.origin;
  const redirectTo = `${origin}/auth/callback?next=/home&popup=1`;
  const { data, error } = await s.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      flowType: 'pkce',
    },
  });
  if (error) return { error: error.message };
  if (!data?.url) return { error: 'Could not start Google sign-in' };

  const popup = window.open(
    data.url,
    'foundators-oauth',
    'width=520,height=680,menubar=no,toolbar=no,resizable=yes'
  );
  if (!popup) return { error: 'Popup was blocked by the browser' };

  return await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      window.removeEventListener('message', onMsg);
      resolve({ error: 'Sign-in timed out' });
    }, 180000);

    function onMsg(event) {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (!msg || msg.type !== 'foundators:supabase-oauth') return;
      clearTimeout(timeout);
      window.removeEventListener('message', onMsg);
      if (msg.session) {
        s.auth
          .setSession(msg.session)
          .then(({ error: setErr }) => {
            if (setErr) resolve({ error: setErr.message });
            else resolve({ user: msg.session.user, session: msg.session });
          })
          .catch((e) => resolve({ error: e?.message || 'Sign-in failed' }));
      } else {
        resolve({ error: msg.error || 'Sign-in failed' });
      }
    }

    window.addEventListener('message', onMsg);
  });
}

// Password update while a recovery session is active (after landing on
// /reset-password with a valid session from the emailed link).
export async function updatePassword(newPassword) {
  const s = getSupabase();
  if (!s) return { error: 'Supabase not configured' };
  const { error } = await s.auth.updateUser({ password: newPassword });
  return { error: error?.message || null };
}
