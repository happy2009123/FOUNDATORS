'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { isFirebaseConfigured, auth, db } from '@/lib/firebase';
import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  setDoc,
  serverTimestamp,
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

    const unsubs = [];

    // ── Own profile: create if not exists, subscribe to updates ────────
    const ownProfileRef = doc(db, 'users', userId);
    const unsubProfile = onSnapshot(ownProfileRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        set((s) => ({
          profile: {
            ...s.profile,
            name: data.name || s.profile.name,
            handle: data.handle || s.profile.handle,
            bio: data.bio || '',
            avatar: data.avatar || s.profile.avatar,
            role: data.role || '',
            location: data.location || '',
            followers: data.followers || 0,
            following: data.following || 0,
          },
        }));
      }
    });
    unsubs.push(unsubProfile);

    // Ensure user doc exists in Firestore
    setDoc(ownProfileRef, {
      name: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User',
      handle: '@' + (auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'user').toLowerCase().replace(/\s+/g, ''),
      email: auth.currentUser?.email || '',
      avatar: auth.currentUser?.photoURL || `https://i.pravatar.cc/160?u=${userId}`,
      bio: '',
      role: '',
      location: '',
      followers: 0,
      following: 0,
      createdAt: serverTimestamp(),
    }, { merge: true }).catch(() => {});

    // ── Posts: ONLY from users this person follows + own posts ─────────
    const followsQ = query(collection(db, 'users', userId, 'following'));
    const unsubFollows = onSnapshot(followsQ, (followSnap) => {
      const followedIds = followSnap.docs.map((d) => d.id);

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

    // ── Bookmarks: ONLY this user's ────────────────────────────────────
    const bookmarksQ = query(collection(db, 'users', userId, 'bookmarks'));
    const unsubBookmarks = onSnapshot(bookmarksQ, (snap) => {
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
      unsubs.forEach((u) => {
        try { u(); } catch (e) {}
      });
      unsubRef.current = [];
    };
  }, [isLoggedIn, set]);

  return children || null;
}
