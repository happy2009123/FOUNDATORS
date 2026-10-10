'use client';

import { useEffect } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { subscribeQuery } from '@/lib/supabase/realtime';
import { useStore } from './store';

// ─────────────────────────────────────────────────────────────
// Follow-state sync
// ─────────────────────────────────────────────────────────────
// followedUsers was only ever written by the toggle action and is not
// persisted, so it started EMPTY on every page load: after a refresh the
// whole app believed you followed nobody — follow buttons reset to
// "Follow", feed scoring and suggestions ignored your graph — even
// though the writes had succeeded. This listener mirrors the
// follows rows where follower_id = uid into the store and self-heals
// any optimistic toggle (a rejected write never reaches the server, so
// the store rollback + this snapshot both converge to the truth).
// ─────────────────────────────────────────────────────────────

export function useSocialSync() {
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const uid = useStore((s) => s.profile?.id);

  useEffect(() => {
    if (!isLoggedIn || !uid || !getSupabase()) return undefined;
    return subscribeQuery({
      key: `follows:${uid}`,
      table: 'follows',
      filter: `follower_id=eq.${uid}`,
      queryFn: async () => {
        const { data, error } = await getSupabase()
          .from('follows')
          .select('following_id')
          .eq('follower_id', uid);
        if (error) throw error;
        const map = {};
        (data || []).forEach((r) => { map[r.following_id] = true; });
        return map;
      },
      onData: (map) => useStore.setState({ followedUsers: map }),
      onError: () => {}, // permission hiccup: keep whatever state we already have
    });
  }, [isLoggedIn, uid]);
}
