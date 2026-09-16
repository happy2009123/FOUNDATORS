'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { isFirebaseConfigured, auth, db } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
} from 'firebase/firestore';

export default function FirestoreProvider({ children }) {
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const set = useStore.setState;
  const unsubRef = useRef([]);

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !isLoggedIn) return;

    const userId = auth?.currentUser?.uid;
    if (!userId) return;

    const unsubs = [];

    // ── Posts: ONLY from users this person follows ──────────────────────
    // For new users with no follows, feed is empty (Instagram-like)
    const followsQ = query(collection(db, 'users', userId, 'following'));
    const unsubFollows = onSnapshot(followsQ, (followSnap) => {
      const followedIds = followSnap.docs.map((d) => d.id);

      // Clean up old post listener
      const oldPostUnsub = unsubRef.current._posts;
      if (oldPostUnsub) {
        try { oldPostUnsub(); } catch (e) {}
      }

      if (followedIds.length === 0) {
        set({ posts: [] });
        return;
      }

      // Listen to posts from followed users (max 10 at a time for Firestore `in` query)
      const batch = followedIds.slice(0, 10);
      const postsQ = query(
        collection(db, 'posts'),
        where('authorKey', 'in', batch),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const unsubPosts = onSnapshot(postsQ, (snap) => {
        const firestorePosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        set({ posts: firestorePosts });
      });
      unsubRef.current._posts = unsubPosts;
      unsubs.push(unsubPosts);
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
    const chatsQ = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc')
    );
    const unsubChats = onSnapshot(chatsQ, (snap) => {
      const firestoreChats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const contacts = {};
      firestoreChats.forEach((chat) => {
        const otherId = chat.participants?.find((p) => p !== userId);
        if (otherId) {
          contacts[otherId] = {
            name: chat.participantNames?.[otherId] || 'User',
            avatar: chat.participantAvatars?.[otherId] || `https://i.pravatar.cc/160?u=${otherId}`,
            online: false,
            status: '',
            lastActive: '',
            messages: [],
            firestoreChatId: chat.id,
          };
        }
      });
      set({ contacts });
    });
    unsubs.push(unsubChats);

    unsubRef.current = unsubs;
    return () => {
      unsubs.forEach((u) => {
        try { u(); } catch (e) {}
      });
      unsubRef.current = [];
    };
  }, [isLoggedIn, set]);

  return children || null;
}
