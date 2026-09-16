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

    // ── Feed/Posts ──────────────────────────────────────────────────────
    const postsQ = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubPosts = onSnapshot(postsQ, (snap) => {
      const firestorePosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (firestorePosts.length === 0) return;
      set((s) => {
        const existingIds = new Set(s.posts.map((p) => p.id));
        const newPosts = firestorePosts.filter((p) => !existingIds.has(p.id));
        if (newPosts.length === 0) return {};
        return { posts: [...newPosts, ...s.posts].slice(0, 100) };
      });
    });
    unsubs.push(unsubPosts);

    // ── Notifications ───────────────────────────────────────────────────
    const notifQ = query(
      collection(db, 'users', userId, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const unsubNotifs = onSnapshot(notifQ, (snap) => {
      const firestoreNotifs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (firestoreNotifs.length === 0) return;
      set((s) => {
        const existingIds = new Set(s.notifications.map((n) => n.id));
        const newNotifs = firestoreNotifs.filter((n) => !existingIds.has(n.id));
        if (newNotifs.length === 0) return {};
        return { notifications: [...newNotifs, ...s.notifications].slice(0, 50) };
      });
    });
    unsubs.push(unsubNotifs);

    // ── Chats / Contacts ────────────────────────────────────────────────
    const chatsQ = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc')
    );
    const unsubChats = onSnapshot(chatsQ, (snap) => {
      const firestoreChats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (firestoreChats.length === 0) return;
      set((s) => {
        const merged = { ...s.contacts };
        firestoreChats.forEach((chat) => {
          const otherParticipant = chat.participants?.find((p) => p !== userId);
          const key = otherParticipant || chat.id;
          if (!merged[key]) {
            merged[key] = {
              name: chat.lastMessage || 'Chat',
              avatar: `https://i.pravatar.cc/160?img=${Math.floor(Math.random() * 70)}`,
              online: true,
              status: 'Online',
              lastActive: 'Now',
              messages: [],
              firestoreChatId: chat.id,
            };
          } else {
            merged[key] = { ...merged[key], firestoreChatId: chat.id };
          }
        });
        return { contacts: merged };
      });
    });
    unsubs.push(unsubChats);

    unsubRef.current = unsubs;
    return () => {
      unsubs.forEach((u) => {
        try { u(); } catch (e) { /* already unsubscribed */ }
      });
      unsubRef.current = [];
    };
  }, [isLoggedIn, set]);

  return children || null;
}
