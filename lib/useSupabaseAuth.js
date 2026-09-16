'use client';

import { useState, useCallback, useEffect } from 'react';
import { useStore } from './store';
import { supabase, isSupabaseConfigured } from './supabase';

export function useSupabaseAuth() {
  const [loading, setLoading] = useState(false);
  const login = useStore((s) => s.login);
  const logout = useStore((s) => s.logout);
  const updateProfileFields = useStore((s) => s.updateProfile);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        login();
        const u = session.user;
        updateProfileFields({
          name: u.user_metadata?.name || u.email?.split('@')[0] || 'User',
          handle: '@' + (u.user_metadata?.name || u.email?.split('@')[0] || 'user').toLowerCase().replace(/\s+/g, ''),
          email: u.email,
          avatar: u.user_metadata?.avatar || u.photoURL || `https://i.pravatar.cc/160?u=${u.id}`,
        });
      } else if (event === 'SIGNED_OUT') {
        logout();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const signUpWithEmail = useCallback(async (email, password, name) => {
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) throw error;
        if (data.user) {
          login();
          updateProfileFields({
            name,
            handle: '@' + name.toLowerCase().replace(/\s+/g, ''),
            email,
            avatar: `https://i.pravatar.cc/160?u=${data.user.id}`,
          });
        }
        return data.user;
      } else {
        const stored = JSON.parse(localStorage.getItem('foundators-users') || '[]');
        if (stored.find((u) => u.email === email)) throw { code: 'auth/email-already-in-use' };
        const newUser = { email, password, name, createdAt: Date.now() };
        stored.push(newUser);
        localStorage.setItem('foundators-users', JSON.stringify(stored));
        login();
        updateProfileFields({
          name,
          handle: '@' + name.toLowerCase().replace(/\s+/g, ''),
          email,
          avatar: `https://i.pravatar.cc/160?u=${email}`,
        });
        return newUser;
      }
    } finally {
      setLoading(false);
    }
  }, [login, updateProfileFields]);

  const signInWithEmail = useCallback(async (email, password) => {
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          login();
          const u = data.user;
          updateProfileFields({
            name: u.user_metadata?.name || email.split('@')[0],
            handle: '@' + (u.user_metadata?.name || email.split('@')[0]).toLowerCase().replace(/\s+/g, ''),
            email,
            avatar: u.user_metadata?.avatar || `https://i.pravatar.cc/160?u=${u.id}`,
          });
        }
        return data.user;
      } else {
        const stored = JSON.parse(localStorage.getItem('foundators-users') || '[]');
        const user = stored.find((u) => u.email === email && u.password === password);
        if (!user) throw { code: 'auth/user-not-found' };
        login();
        updateProfileFields({
          name: user.name,
          handle: '@' + user.name.toLowerCase().replace(/\s+/g, ''),
          email: user.email,
          avatar: `https://i.pravatar.cc/160?u=${user.email}`,
        });
        return user;
      }
    } finally {
      setLoading(false);
    }
  }, [login, updateProfileFields]);

  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) throw error;
      } else {
        login();
        updateProfileFields({
          name: 'Demo User',
          handle: '@demouser',
          email: 'demo@foundators.app',
          avatar: 'https://i.pravatar.cc/160?u=demo',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [login, updateProfileFields]);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    logout();
  }, [logout]);

  return { loading, isSupabase: isSupabaseConfigured, signUpWithEmail, signInWithEmail, signInWithGoogle, signOut };
}
