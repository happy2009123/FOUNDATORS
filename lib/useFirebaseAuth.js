'use client';

import { useState, useCallback } from 'react';
import { useStore } from './store';
import { getSupabase, isSupabaseConfigured } from './supabase/client';
import {
  signUpWithEmail as sbSignUp,
  signInWithEmail as sbSignIn,
  signInWithGooglePopup,
  sendPasswordReset as sbPasswordReset,
  signOut as sbSignOut,
  refreshSession,
  getCurrentUser,
} from './supabase/auth';
import { initialsAvatar } from './avatar';
import { recordInviteIfAny } from './referrals';
import { endPresenceFor } from './presence';
import { toRow } from './supabase/db';

export async function ensureProfileRow(user, name) {
  const supabase = getSupabase();
  if (!supabase || !user?.id) return;
  const displayName = name || user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || initialsAvatar(displayName);
  // Never wipe an existing profile — only fill in the row when missing.
  const { error } = await supabase
    .from('profiles')
    .upsert(
      toRow({
        id: user.id,
        email: user.email || '',
        name: displayName,
        handle: '@' + String(displayName).toLowerCase().replace(/\s+/g, ''),
        avatar,
        profileCompleted: false,
      }),
      { onConflict: 'id', ignoreDuplicates: true }
    );
  // 23505 (duplicate) is fine — the row already exists.
  if (error && error.code !== '23505') {
    console.warn('ensureProfileRow failed:', error.message);
  }
}

export function useFirebaseAuth() {
  const [loading, setLoading] = useState(false);

  const signUpWithEmail = useCallback(async (email, password, name) => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) throw new Error('Supabase not initialized');
      const { user, error, needsConfirm } = await sbSignUp(email, password, name ? { name } : {});
      if (error) throw new Error(error);
      if (user) {
        await ensureProfileRow(user, name);
        recordInviteIfAny(user.id, name || user.email?.split('@')[0] || 'User').catch(() => {});
      }
      return { user, needsConfirm };
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) throw new Error('Supabase not initialized');
      const { user, error } = await sbSignIn(email, password);
      if (error) throw new Error(error);
      if (user) {
        // Self-heal: account rows created before 0003 (or by any failed
        // signup path) get their profile row here, while the session is
        // live and RLS allows the insert. Idempotent (ON CONFLICT DO NOTHING).
        await ensureProfileRow(user);
      }
      return user;
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) throw new Error('Supabase not initialized');
      const { user, error } = await signInWithGooglePopup();
      if (error) throw new Error(error);
      if (user) {
        await ensureProfileRow(user, user.user_metadata?.name || user.user_metadata?.full_name);
        recordInviteIfAny(user.id, user.user_metadata?.name || user.email?.split('@')[0] || 'User').catch(() => {});
      }
      return user;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Null out presence while still authenticated — after signOut the
      // rules reject the write and the user would appear "Online" for 90s.
      await endPresenceFor(useStore.getState().profile?.id);
    } catch (e) {
      // best-effort
    }
    try {
      await sbSignOut();
    } catch (e) {
      // a network hiccup must not trap the user in a half-logged-in UI
    }
    useStore.getState().logout();
  }, []);

  const sendEmailVerificationAction = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    // Supabase: resend the signup confirmation email.
    const { data } = await supabase.auth.getSession();
    const email = data?.session?.user?.email;
    if (email) {
      await supabase.auth.resend({ type: 'signup', email });
    }
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase not initialized');
    const { error } = await sbPasswordReset(email);
    if (error) throw new Error(error);
  }, []);

  const reloadUser = useCallback(async () => {
    await refreshSession();
  }, []);

  const checkEmailVerified = useCallback(async () => {
    const user = await getCurrentUser();
    return Boolean(user?.email_confirmed_at);
  }, []);

  return {
    loading,
    isFirebase: isSupabaseConfigured,
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
