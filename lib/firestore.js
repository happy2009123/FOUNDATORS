'use client';

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  where,
  arrayUnion,
  arrayRemove,
  startAfter,
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, isFirebaseConfigured } from './firebase';

function checkDb() {
  if (!isFirebaseConfigured || !db) {
    console.warn('Firestore not configured — operation skipped.');
    return false;
  }
  return true;
}

function checkStorage() {
  if (!isFirebaseConfigured || !storage) {
    console.warn('Firebase Storage not configured — operation skipped.');
    return false;
  }
  return true;
}

// ─── POSTS ───────────────────────────────────────────────────────────────────

export async function createPost({ text, authorKey, authorName, authorAvatar, tagType, imageUrl }) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    const docRef = await addDoc(collection(db, 'posts'), {
      text,
      authorKey,
      authorName,
      authorAvatar,
      tagType: tagType || 'update',
      imageUrl: imageUrl || null,
      likedBy: [],
      bookmarkedBy: [],
      likes: 0,
      shares: 0,
      commentsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, data: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updatePost(postId, data) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    await updateDoc(doc(db, 'posts', postId), { ...data, updatedAt: serverTimestamp() });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deletePost(postId) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'posts', postId));
    const commentsSnap = await getDocs(collection(db, 'posts', postId, 'comments'));
    commentsSnap.forEach((c) => batch.delete(c.ref));
    await batch.commit();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function toggleLikePost(postId, userId) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    const postSnap = await getDoc(doc(db, 'posts', postId));
    if (!postSnap.exists()) return { success: false, error: 'Post not found' };
    const likedBy = postSnap.data().likedBy || [];
    const isLiked = likedBy.includes(userId);
    await updateDoc(doc(db, 'posts', postId), {
      likedBy: isLiked ? arrayRemove(userId) : arrayUnion(userId),
      likes: increment(isLiked ? -1 : 1),
    });
    return { success: true, data: !isLiked };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function bookmarkPost(postId, userId) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    const postSnap = await getDoc(doc(db, 'posts', postId));
    if (!postSnap.exists()) return { success: false, error: 'Post not found' };
    const bookmarkedBy = postSnap.data().bookmarkedBy || [];
    const isBookmarked = bookmarkedBy.includes(userId);
    await updateDoc(doc(db, 'posts', postId), {
      bookmarkedBy: isBookmarked ? arrayRemove(userId) : arrayUnion(userId),
    });
    return { success: true, data: !isBookmarked };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function repostPost(postId, userData) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    const docRef = await addDoc(collection(db, 'posts'), {
      text: '',
      authorKey: userData.authorKey,
      authorName: userData.authorName,
      authorAvatar: userData.authorAvatar,
      tagType: 'repost',
      imageUrl: null,
      repostedFrom: postId,
      likedBy: [],
      bookmarkedBy: [],
      likes: 0,
      shares: 0,
      commentsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, data: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── COMMENTS ────────────────────────────────────────────────────────────────

export async function addComment(postId, { text, authorKey, authorName, authorAvatar, replyTo }) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    const docRef = await addDoc(collection(db, 'posts', postId, 'comments'), {
      text,
      authorKey,
      authorName,
      authorAvatar,
      replyTo: replyTo || null,
      likedBy: [],
      likes: 0,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) });
    return { success: true, data: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateComment(postId, commentId, text) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    await updateDoc(doc(db, 'posts', postId, 'comments', commentId), {
      text,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteComment(postId, commentId) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
    await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(-1) });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function toggleCommentLike(postId, commentId, userId) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    const commentSnap = await getDoc(doc(db, 'posts', postId, 'comments', commentId));
    if (!commentSnap.exists()) return { success: false, error: 'Comment not found' };
    const likedBy = commentSnap.data().likedBy || [];
    const isLiked = likedBy.includes(userId);
    await updateDoc(doc(db, 'posts', postId, 'comments', commentId), {
      likedBy: isLiked ? arrayRemove(userId) : arrayUnion(userId),
      likes: increment(isLiked ? -1 : 1),
    });
    return { success: true, data: !isLiked };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function subscribeToComments(postId, callback) {
  if (!checkDb()) return () => {};
  const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(comments);
  });
}

// ─── MESSAGES ────────────────────────────────────────────────────────────────

export async function createChat(participants) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    const docRef = await addDoc(collection(db, 'chats'), {
      participants,
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      unreadCount: {},
      createdAt: serverTimestamp(),
    });
    return { success: true, data: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function sendMessage(chatId, { text, senderKey, senderName, senderAvatar }) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    const docRef = await addDoc(collection(db, 'chats', chatId, 'messages'), {
      text,
      senderKey,
      senderName,
      senderAvatar: senderAvatar || null,
      read: false,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
    });
    return { success: true, data: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function subscribeToMessages(chatId, callback) {
  if (!checkDb()) return () => {};
  const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(messages);
  });
}

export function subscribeToChats(userId, callback) {
  if (!checkDb()) return () => {};
  const q = query(collection(db, 'chats'), where('participants', 'array-contains', userId), orderBy('lastMessageAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const chats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(chats);
  });
}

export async function deleteMessage(chatId, messageId) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── FOLLOWS ─────────────────────────────────────────────────────────────────

export async function toggleFollowUser(followerId, followingId) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    const followerSnap = await getDoc(doc(db, 'users', followerId, 'following', followingId));
    const isCurrentlyFollowing = followerSnap.exists();
    const batch = writeBatch(db);
    if (isCurrentlyFollowing) {
      batch.delete(doc(db, 'users', followerId, 'following', followingId));
      batch.delete(doc(db, 'users', followingId, 'followers', followerId));
      batch.update(doc(db, 'users', followerId), { following: increment(-1) });
      batch.update(doc(db, 'users', followingId), { followers: increment(-1) });
    } else {
      batch.set(doc(db, 'users', followerId, 'following', followingId), { followedAt: serverTimestamp() });
      batch.set(doc(db, 'users', followingId, 'followers', followerId), { followedAt: serverTimestamp() });
      batch.update(doc(db, 'users', followerId), { following: increment(1) });
      batch.update(doc(db, 'users', followingId), { followers: increment(1) });
    }
    await batch.commit();
    return { success: true, data: !isCurrentlyFollowing };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getFollowers(userId) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'followers'));
    return { success: true, data: snap.docs.map((d) => d.id) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getFollowing(userId) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'following'));
    return { success: true, data: snap.docs.map((d) => d.id) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function isFollowing(followerId, followingId) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    const snap = await getDoc(doc(db, 'users', followerId, 'following', followingId));
    return { success: true, data: snap.exists() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

export async function createNotification(userId, { type, actorKey, actorName, text, linkType, linkId }) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    const docRef = await addDoc(collection(db, 'users', userId, 'notifications'), {
      type,
      actorKey,
      actorName,
      text,
      linkType: linkType || null,
      linkId: linkId || null,
      read: false,
      createdAt: serverTimestamp(),
    });
    return { success: true, data: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function markNotificationRead(userId, notificationId) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    await updateDoc(doc(db, 'users', userId, 'notifications', notificationId), { read: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function markAllNotificationsRead(userId) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    const snap = await getDocs(query(collection(db, 'users', userId, 'notifications'), where('read', '==', false)));
    const batch = writeBatch(db);
    snap.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function subscribeToNotifications(userId, callback) {
  if (!checkDb()) return () => {};
  const q = query(collection(db, 'users', userId, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snap) => {
    const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(notifications);
  });
}

// ─── BOOKMARKS ───────────────────────────────────────────────────────────────

export async function addBookmark(userId, postId) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    await setDoc(doc(db, 'users', userId, 'bookmarks', postId), {
      postId,
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function removeBookmark(userId, postId) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    await deleteDoc(doc(db, 'users', userId, 'bookmarks', postId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getBookmarks(userId) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'bookmarks'));
    return { success: true, data: snap.docs.map((d) => d.data()) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── USER PROFILES ───────────────────────────────────────────────────────────

export async function getUserProfile(userId) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) return { success: false, error: 'User not found' };
    return { success: true, data: { id: snap.id, ...snap.data() } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateUserProfile(userId, data) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    const { uid, id, ...cleanData } = data;
    await updateDoc(doc(db, 'users', userId), { ...cleanData, updatedAt: serverTimestamp() });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function searchUsers(queryText) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    const q = query(
      collection(db, 'users'),
      where('name', '>=', queryText),
      where('name', '<=', queryText + '\uf8ff'),
      limit(20)
    );
    const snap = await getDocs(q);
    return { success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function subscribeToUserProfile(userId, callback) {
  if (!checkDb()) return () => {};
  return onSnapshot(doc(db, 'users', userId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    } else {
      callback(null);
    }
  });
}

// ─── FILE UPLOAD ─────────────────────────────────────────────────────────────

export async function uploadImage(file, path) {
  if (!checkStorage()) return { success: false, error: 'Storage not configured' };
  try {
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    return { success: true, data: url };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function uploadProfilePhoto(userId, file) {
  const ext = file.name.split('.').pop();
  const path = `profile-photos/${userId}.${ext}`;
  return uploadImage(file, path);
}

export async function uploadCoverPhoto(userId, file) {
  const ext = file.name.split('.').pop();
  const path = `cover-photos/${userId}.${ext}`;
  return uploadImage(file, path);
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

export async function recordEvent(eventType, data) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    await addDoc(collection(db, 'analytics'), {
      eventType,
      ...data,
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── FEED ────────────────────────────────────────────────────────────────────

export async function verifyUser(userId) {
  if (!checkDb()) return { success: false, error: 'Firestore not configured' };
  try {
    await updateDoc(doc(db, 'users', userId), { verified: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function subscribeToFeed(callback) {
  if (!checkDb()) return () => {};
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snap) => {
    const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(posts);
  });
}
