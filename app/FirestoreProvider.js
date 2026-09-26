'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { isFirebaseConfigured, auth, db } from '@/lib/firebase';
import { initialsAvatar } from '@/lib/avatar';
import { startPresenceHeartbeat, stopPresenceHeartbeat } from '@/lib/presence';
import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  getDocs,
} from 'firebase/firestore';

export default function FirestoreProvider({ children }) {
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const set = useStore.setState;
  const unsubRef = useRef([]);

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !isLoggedIn) return;

    const userId = auth?.currentUser?.uid;
    if (!userId) return;

    // Heartbeat my own lastSeen so others can show "Online"/"Last seen".
    startPresenceHeartbeat(userId);

    const unsubs = [];

    // ── Own profile: subscribe to updates ────────
    const ownProfileRef = doc(db, 'users', userId);
    const unsubProfile = onSnapshot(ownProfileRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
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
          // The presence heartbeat writes `lastSeen` every ~30s, firing this
          // snapshot too. Returning `s` (identity) makes zustand skip the
          // update entirely so the whole app doesn't re-render on each beat.
          const unchanged = Object.keys(profile).every(
            (k) => JSON.stringify(profile[k]) === JSON.stringify(s.profile[k])
          );
          return unchanged ? s : { profile };
        });
      }
    });
    unsubs.push(unsubProfile);

    // ── Posts: ONLY from users this person follows + own posts ─────────
    const followsQ = query(collection(db, 'users', userId, 'following'));
    const unsubFollows = onSnapshot(followsQ, (followSnap) => {
      const followedIds = followSnap.docs.map((d) => d.id);

      // Hydrate the followedUsers map so follow buttons reflect real state
      const followedMap = {};
      followSnap.docs.forEach((d) => { followedMap[d.id] = true; });
      set({ followedUsers: followedMap });

      // Clean up old post listener
      const oldPostUnsub = unsubRef.current._posts;
      if (oldPostUnsub) {
        try { oldPostUnsub(); } catch (e) {}
      }

      // Always include own posts + followed users' posts
      const allAuthorIds = [userId, ...followedIds];

      if (allAuthorIds.length === 0) {
        set({ posts: [] });
        return;
      }

      // Firestore `in` query max 10 items — batch if needed
      const batches = [];
      for (let i = 0; i < allAuthorIds.length; i += 10) {
        batches.push(allAuthorIds.slice(i, i + 10));
      }

      const allPosts = [];
      let loadedBatches = 0;

      batches.forEach((batch) => {
        const postsQ = query(
          collection(db, 'posts'),
          where('authorKey', 'in', batch),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const unsubPosts = onSnapshot(postsQ, (snap) => {
          const batchPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          // Merge: remove old posts from this batch, add new ones
          const otherBatchesPosts = allPosts.filter((p) => !batch.some((b) => b === p.authorKey));
          allPosts.length = 0;
          allPosts.push(...otherBatchesPosts, ...batchPosts);
          allPosts.sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || 0;
            const bTime = b.createdAt?.toDate?.() || 0;
            return bTime - aTime;
          });
          const blocked = useStore.getState().blockedUsers || {};
          const filtered = allPosts.filter((p) => !blocked[p.authorKey]);
          set({ posts: filtered.slice(0, 100) });
          // Hydrate liked state from post docs (likedBy UID arrays), merging to
          // preserve local toggles for posts that are not in this feed batch
          const likedMap = {};
          filtered.forEach((p) => {
            if (Array.isArray(p.likedBy)) likedMap[p.id] = p.likedBy.includes(userId);
            else likedMap[p.id] = false;
          });
          set((s) => ({ likedPosts: { ...s.likedPosts, ...likedMap } }));
        });
        unsubs.push(unsubPosts);
      });

      unsubRef.current._posts = { unsubscribe: () => unsubs.forEach((u) => { try { u(); } catch (e) {} }) };
    });
    unsubs.push(unsubFollows);

    // ── Notifications: ONLY this user's ────────────────────────────────
    const notifQ = query(
      collection(db, 'users', userId, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const unsubNotifs = onSnapshot(notifQ, (snap) => {
      const firestoreNotifs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      set({ notifications: firestoreNotifs });
    });
    unsubs.push(unsubNotifs);

    // ── Chats: ONLY chats this user is in ──────────────────────────────
    // NOTE: no orderBy here — `array-contains` + `orderBy` on a different
    // field would require a composite index. Client sorts chat lists.
    const chatsQ = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId)
    );
    const unsubChats = onSnapshot(chatsQ, (snap) => {
      const firestoreChats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const chatContacts = {};
      firestoreChats.forEach((chat) => {
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
    });
    unsubs.push(unsubChats);

    // ── Bookmarks: hydrated from post docs (bookmarkedBy ~= same as likes write path) ──
    const bookmarkPostsQ = query(
      collection(db, 'posts'),
      where('bookmarkedBy', 'array-contains', userId),
      limit(100)
    );
    const unsubBookmarks = onSnapshot(bookmarkPostsQ, (snap) => {
      const bookmarked = {};
      snap.docs.forEach((d) => { bookmarked[d.id] = true; });
      set({ bookmarkedPosts: bookmarked });
    });
    unsubs.push(unsubBookmarks);

    // ── Blocked users: this user's blocked list ────────────────────────
    const blockedQ = query(collection(db, 'users', userId, 'blocked'));
    const unsubBlocked = onSnapshot(blockedQ, (snap) => {
      const blocked = {};
      snap.docs.forEach((d) => { blocked[d.id] = true; });
      set({ blockedUsers: blocked });
    });
    unsubs.push(unsubBlocked);

    unsubRef.current = unsubs;
    return () => {
      stopPresenceHeartbeat();
      unsubs.forEach((u) => {
        try { u(); } catch (e) {}
      });
      unsubRef.current = [];
    };
  }, [isLoggedIn, set]);

  return children || null;
}
