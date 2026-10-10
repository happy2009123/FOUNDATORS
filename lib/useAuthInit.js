'use client';

import { useEffect } from 'react';
import { useStore } from './store';
import { isSupabaseConfigured, getSupabase } from './supabase/client';
import { onAuthStateChange } from './supabase/auth';
import { mapRow } from './supabase/db';
import { ensureProfileRow } from './useFirebaseAuth';
import { initialsAvatar } from './avatar';

export function useAuthInit() {
  const set = useStore.setState;

  useEffect(() => {
    if (!isSupabaseConfigured() || !getSupabase()) {
      set({ authReady: true, isLoggedIn: false });
      return;
    }

    const unsubscribe = onAuthStateChange(async (user) => {
      if (user) {
        // Mark the session as signed-in IMMEDIATELY, before the profile
        // row loads. The previous code waited for the fetch round trip, so
        // right after login (or re-login after a logout) the store still
        // said authReady=true / isLoggedIn=false for a few hundred ms —
        // long enough for /home to bounce back to /login and create the
        // login loop. The row then refines the profile and the onboarding
        // flag in a second set().
        const meta = user.user_metadata || {};
        const base = {
          id: user.id,
          name: meta.name || meta.full_name || user.email?.split('@')[0] || 'User',
          handle: '@' + (meta.name || meta.full_name || 'user').toLowerCase().replace(/\s+/g, ''),
          email: user.email || '',
          avatar: meta.avatar_url || meta.picture || initialsAvatar(meta.name || meta.full_name || user.email?.split('@')[0]),
          bio: '',
          role: '',
          location: '',
          website: '',
          skills: [],
        };
        set({ isLoggedIn: true, authReady: true, profileCompleted: true, profile: base });

        try {
          const { data } = await getSupabase()
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          if (data) {
            const d = mapRow(data);
            const completed = d.profileCompleted === true || d.createdAt != null;
            set({
              isLoggedIn: true,
              authReady: true,
              profileCompleted: completed,
              profile: {
                id: user.id,
                name: d.name || base.name,
                handle: d.handle || base.handle,
                email: d.email || base.email,
                avatar: d.avatar || base.avatar,
                bio: d.bio || '',
                role: d.role || '',
                location: d.location || '',
                website: d.website || '',
                skills: Array.isArray(d.skills) ? d.skills : [],
              },
            });
          } else {
            // No profile row (account created before 0003, or a signup whose
            // pre-session insert was rejected by RLS). Create it now — the
            // session is live — instead of sending the user into an
            // onboarding loop that can never persist.
            try {
              await ensureProfileRow(user);
            } catch {
              // non-fatal: the row also gets created on the next sign-in
            }
            set({ isLoggedIn: true, authReady: true, profileCompleted: true, profile: base });
          }
        } catch {
          set({ isLoggedIn: true, authReady: true, profileCompleted: true, profile: base });
        }
      } else {
        set({
          isLoggedIn: false,
          authReady: true,
          profileCompleted: true,
          profile: { id: null, name: '', handle: '', email: '', avatar: '', bio: '', role: '', location: '', website: '', skills: [] },
        });
      }
    });

    return () => unsubscribe();
  }, [set]);
}
