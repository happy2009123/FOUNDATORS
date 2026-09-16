'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, where, getDocs, startAfter } from 'firebase/firestore';
import { db } from './firebase';

const POSTS_PER_PAGE = 10;

export function useFirestorePosts(pageSize = POSTS_PER_PAGE) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(pageSize));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPosts(data);
      setHasMore(data.length === pageSize);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [pageSize]);

  const loadMore = useCallback(async () => {
    if (!lastDoc || !hasMore) return;
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(pageSize));
    const snapshot = await getDocs(q);
    const more = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setPosts((prev) => [...prev, ...more]);
    setHasMore(more.length === pageSize);
    setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
  }, [lastDoc, hasMore, pageSize]);

  return { posts, loading, hasMore, loadMore };
}

export function useFirestorePost(postId) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;
    const unsubscribe = onSnapshot(doc(db, 'posts', postId), (snap) => {
      setPost(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [postId]);

  return { post, loading };
}

export function useFirestoreComments(postId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;
    const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [postId]);

  return { comments, loading };
}

export function useFirestoreMessages(chatId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) return;
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [chatId]);

  return { messages, loading };
}

export function useFirestoreNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, 'users', userId, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  return { notifications, loading };
}

export async function createPost({ text, authorKey, authorName, authorAvatar, tagType, imageUrl }) {
  return addDoc(collection(db, 'posts'), {
    text,
    authorKey,
    authorName,
    authorAvatar,
    tagType: tagType || 'update',
    imageUrl: imageUrl || null,
    likes: 0,
    shares: 0,
    commentsCount: 0,
    createdAt: serverTimestamp(),
  });
}

export async function addComment(postId, { text, authorKey, authorName, authorAvatar }) {
  return addDoc(collection(db, 'posts', postId, 'comments'), {
    text,
    authorKey,
    authorName,
    authorAvatar,
    createdAt: serverTimestamp(),
  });
}

export async function likePost(postId) {
  const postRef = doc(db, 'posts', postId);
  return updateDoc(postRef, { likes: increment(1) });
}

export async function unlikePost(postId) {
  const postRef = doc(db, 'posts', postId);
  return updateDoc(postRef, { likes: increment(-1) });
}

export async function sendMessage(chatId, { text, senderKey, senderName }) {
  return addDoc(collection(db, 'chats', chatId, 'messages'), {
    text,
    senderKey,
    senderName,
    createdAt: serverTimestamp(),
  });
}

export async function syncProfileToFirestore(profile) {
  if (!db || !profile?.id) return;
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'users', profile.id), {
    name: profile.name,
    handle: profile.handle,
    bio: profile.bio || '',
    avatar: profile.avatar || '',
    role: profile.role || '',
    location: profile.location || '',
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}
