'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { isSupabaseConfigured, getSupabase } from '@/lib/supabase/client';
import { mapRow, mapRows, toMillis } from '@/lib/supabase/db';
import { subscribeQuery } from '@/lib/supabase/realtime';
import { initialsAvatar } from '@/lib/avatar';
import { startPresenceHeartbeat, stopPresenceHeartbeat } from '@/lib/presence';

// Live store hydration: replaces the seven Firestore onSnapshot listeners
// that used to drive the feed, profile, notifications, chats, bookmarks
// and blocks. Each subscription = initial select + debounced re-query on
// realtime events (see lib/supabase/realtime.js).

export default function FirestoreProvider({ children }) {
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const set = useStore.setState;
  const unsubRef = useRef([]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !getSupabase() || !isLoggedIn) return;

    // profile.id is set in the same atomic set() that flips isLoggedIn.
    const userId = useStore.getState().profile?.id;
    if (!userId) return;

    // Heartbeat my own lastSeen so others can show "Online"/"Last seen".
    startPresenceHeartbeat(userId);

    const unsubs = [];

    // ── Own profile: subscribe to updates ────────
    const unsubProfile = subscribeQuery({
      key: `provider:profile:${userId}`,
      table: 'profiles',
      filter: `id=eq.${userId}`,
      queryFn: async () => {
        const { data } = await getSupabase()
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        return data ? mapRow(data) : null;
      },
      onData: (row) => {
        const data = Array.isArray(row) ? row[0] : row;
        if (!data) return;
        set((s) => {
          const profile = {
            ...s.profile,
            name: data.name || s.profile.name,
            handle: data.handle || s.profile.handle,
            bio: data.bio || '',
            avatar: data.avatar || s.profile.avatar,
            role: data.role || '',
            location: data.location || '',
            website: data.website || '',
            skills: Array.isArray(data.skills) ? data.skills : [],
            followers: data.followers || 0,
            following: data.following || 0,
          };
          // The presence heartbeat writes `last_seen` every ~30s, firing this
          // subscription too. Returning `s` (identity) makes zustand skip the
          // update entirely so the whole app doesn't re-render on each beat.
          const unchanged = Object.keys(profile).every(
            (k) => JSON.stringify(profile[k]) === JSON.stringify(s.profile[k])
          );
          return unchanged ? s : { profile };
        });
      },
    });
    unsubs.push(unsubProfile);

    // ── Following: hydrate followedUsers + recompute the feed ─────────
    let feedUnsub = null;
    const loadFeed = async (followedIds) => {
      const allAuthorIds = [userId, ...followedIds];
      try {
        const { data, error } = await getSupabase()
          .from('posts')
          .select('*')
          .in('author_key', allAuthorIds)
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        const posts = mapRows(data).sort(
          (a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)
        );
        const blocked = useStore.getState().blockedUsers || {};
        const filtered = posts.filter((p) => !blocked[p.authorKey]);
        set({ posts: filtered.slice(0, 100) });
        // Hydrate liked state from post docs (likedBy UID arrays), merging to
        // preserve local toggles for posts that are not in this feed batch
        const likedMap = {};
        filtered.forEach((p) => {
          if (Array.isArray(p.likedBy)) likedMap[p.id] = p.likedBy.includes(userId);
          else likedMap[p.id] = false;
        });
        set((s) => ({ likedPosts: { ...s.likedPosts, ...likedMap } }));
      } catch {
        // keep previous posts on transient failures
      }
    };

    const unsubFollows = subscribeQuery({
      key: `provider:follows:${userId}`,
      table: 'follows',
      filter: `follower_id=eq.${userId}`,
      queryFn: async () => {
        const { data, error } = await getSupabase()
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId);
        if (error) throw error;
        return (data || []).map((r) => r.following_id);
      },
      onData: (followedIds) => {
        const ids = Array.isArray(followedIds) ? followedIds : [];

        // Hydrate the followedUsers map so follow buttons reflect real state
        const followedMap = {};
        ids.forEach((id) => { followedMap[id] = true; });
        set({ followedUsers: followedMap });

        // Clean up old feed subscription, then re-query with the new set
        if (feedUnsub) {
          try { feedUnsub(); } catch {}
        }
        loadFeed(ids);
        // Realtime events on `posts` also refresh the feed
        feedUnsub = subscribeQuery({
          key: `provider:feed:${userId}`,
          table: 'posts',
          queryFn: async () => loadFeed(ids),
          onData: () => {},
        });
      },
    });
    unsubs.push(unsubFollows);

    // ── Notifications: ONLY this user's ────────────────────────────────
    const unsubNotifs = subscribeQuery({
      key: `provider:notifications:${userId}`,
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
      queryFn: async () => {
        const { data, error } = await getSupabase()
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30);
        if (error) throw error;
        return mapRows(data);
      },
      onData: (rows) => set({ notifications: rows }),
    });
    unsubs.push(unsubNotifs);

    // ── Chats: ONLY chats this user is in ──────────────────────────────
    const unsubChats = subscribeQuery({
      key: `provider:chats:${userId}`,
      table: 'chats',
      queryFn: async () => {
        const { data, error } = await getSupabase()
          .from('chats')
          .select('*')
          .contains('participants', [userId]);
        if (error) throw error;
        return mapRows(data);
      },
      onData: (rows) => {
        const chats = rows || [];
        const chatContacts = {};
        chats.forEach((chat) => {
          const otherId = chat.participants?.find((p) => p !== userId);
          if (otherId) {
            chatContacts[otherId] = {
              name: chat.participantNames?.[otherId] || 'User',
              avatar: chat.participantAvatars?.[otherId] || initialsAvatar(chat.participantNames?.[otherId] || 'User'),
              online: false,
              status: '',
              lastActive: '',
              messages: [],
              chatId: chat.id,
            };
          }
        });
        set((s) => ({
          contacts: {
            ...s.contacts,
            ...chatContacts,
          },
        }));
      },
    });
    unsubs.push(unsubChats);

    // ── Bookmarks: posts where I appear in bookmarkedBy ────────────────
    const unsubBookmarks = subscribeQuery({
      key: `provider:bookmarks:${userId}`,
      table: 'posts',
      queryFn: async () => {
        const { data, error } = await getSupabase()
          .from('posts')
          .select('id')
          .contains('bookmarked_by', [userId])
          .limit(100);
        if (error) throw error;
        return data || [];
      },
      onData: (rows) => {
        const bookmarked = {};
        (rows || []).forEach((r) => { bookmarked[r.id] = true; });
        set({ bookmarkedPosts: bookmarked });
      },
    });
    unsubs.push(unsubBookmarks);

    // ── Blocked users: this user's blocked list ────────────────────────
    const unsubBlocked = subscribeQuery({
      key: `provider:blocked:${userId}`,
      table: 'blocks',
      filter: `user_id=eq.${userId}`,
      queryFn: async () => {
        const { data, error } = await getSupabase()
          .from('blocks')
          .select('blocked_id')
          .eq('user_id', userId);
        if (error) throw error;
        return data || [];
      },
      onData: (rows) => {
        const blocked = {};
        (rows || []).forEach((r) => { blocked[r.blocked_id] = true; });
        set({ blockedUsers: blocked });
      },
    });
    unsubs.push(unsubBlocked);

    unsubRef.current = unsubs;
    return () => {
      stopPresenceHeartbeat();
      if (feedUnsub) {
        try { feedUnsub(); } catch {}
      }
      unsubs.forEach((u) => {
        try { u(); } catch {}
      });
      unsubRef.current = [];
    };
  }, [isLoggedIn, set]);

  return children || null;
}
