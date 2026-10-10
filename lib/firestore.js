'use client';

// Supabase-backed service layer. Export names, signatures and return
// envelopes ({ success, data, error }) match the old Firestore version so
// every existing caller keeps working unchanged.

import { getSupabase, isSupabaseConfigured } from './supabase/client';
import { subscribeQuery } from './supabase/realtime';
import {
  mapRow,
  mapRows,
  toRow,
  ok,
  fail,
  randomId,
  toMillis,
} from './supabase/db';
import { isCloudinaryConfigured, uploadToCloudinary } from './cloudinary';

function checkDb() {
  if (!isSupabaseConfigured() || !getSupabase()) {
    console.warn('Supabase not configured — operation skipped.');
    return false;
  }
  return true;
}

// ─── POSTS ───────────────────────────────────────────────────────────────────

export async function createPost({ id, text, authorKey, authorName, authorAvatar, tagType, imageUrl }) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const postId = id || randomId();
    const payload = toRow({
      id: postId,
      text: text || '',
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
    });
    const { error } = await getSupabase().from('posts').insert(payload);
    if (error) return fail(error);
    return ok(postId);
  } catch (error) {
    return fail(error);
  }
}

export async function updatePost(postId, data) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { id, ...rest } = data || {};
    const { error } = await getSupabase()
      .from('posts')
      .update(toRow(rest))
      .eq('id', postId);
    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

export async function deletePost(postId) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    // Comments cascade via the FK (comments.post_id → posts ON DELETE CASCADE).
    const { error } = await getSupabase().from('posts').delete().eq('id', postId);
    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

export async function toggleLikePost(postId, userId) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { data, error } = await getSupabase().rpc('toggle_like', { p_post_id: postId });
    if (error) return fail(error);
    return ok(Boolean(data));
  } catch (error) {
    return fail(error);
  }
}

export async function bookmarkPost(postId, userId, shouldBookmark) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { data, error } = await getSupabase().rpc('toggle_bookmark', {
      p_post_id: postId,
      p_bookmark: typeof shouldBookmark === 'boolean' ? shouldBookmark : null,
    });
    if (error) return fail(error);
    return ok(Boolean(data));
  } catch (error) {
    return fail(error);
  }
}

export async function repostPost(postId, userData) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const newId = randomId();
    const payload = toRow({
      id: newId,
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
    });
    const { error } = await getSupabase().from('posts').insert(payload);
    if (error) return fail(error);
    return ok(newId);
  } catch (error) {
    return fail(error);
  }
}

// ─── COMMENTS ────────────────────────────────────────────────────────────────

export async function addComment(postId, { text, authorKey, authorName, authorAvatar, replyTo }) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const commentId = randomId();
    const payload = toRow({
      id: commentId,
      postId,
      text,
      authorKey,
      authorName,
      authorAvatar,
      replyTo: replyTo || null,
      likedBy: [],
      likes: 0,
      edited: false,
    });
    const { error } = await getSupabase().from('comments').insert(payload);
    if (error) return fail(error);
    // posts.comments_count is maintained by the comments_count_trigger.
    return ok(commentId);
  } catch (error) {
    return fail(error);
  }
}

export async function updateComment(postId, commentId, text) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { error } = await getSupabase()
      .from('comments')
      .update({ text, edited: true })
      .eq('id', commentId)
      .eq('post_id', postId);
    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteComment(postId, commentId) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    // Removes the comment plus its replies (best-effort per-reply, matching
    // the old Firestore fallback) and lets the counter trigger fix the count.
    const { error } = await getSupabase().rpc('delete_comment', {
      p_post_id: postId,
      p_comment_id: commentId,
    });
    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

export async function toggleCommentLike(postId, commentId, userId) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { data, error } = await getSupabase().rpc('toggle_comment_like', {
      p_comment_id: commentId,
    });
    if (error) return fail(error);
    return ok(Boolean(data));
  } catch (error) {
    return fail(error);
  }
}

export function subscribeToComments(postId, callback) {
  if (!checkDb()) return () => {};
  return subscribeQuery({
    key: `comments:${postId}`,
    table: 'comments',
    filter: `post_id=eq.${postId}`,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return mapRows(data);
    },
    onData: callback,
  });
}

// ─── MESSAGES ────────────────────────────────────────────────────────────────

// Deterministic conversation ID for a pair of users (same as before).
export function conversationIdFor(uidA, uidB) {
  return [uidA, uidB].filter(Boolean).sort().join('__');
}

export async function getChat(chatId) {
  if (!checkDb()) return null;
  try {
    const { data, error } = await getSupabase()
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .maybeSingle();
    if (error || !data) return null;
    return mapRow(data);
  } catch {
    return null;
  }
}

export async function findExistingConversation(userId, otherUid) {
  if (!checkDb()) return null;
  try {
    const { data, error } = await getSupabase()
      .from('chats')
      .select('*')
      .contains('participants', [userId])
      .limit(200);
    if (error || !data) return null;
    for (const row of data) {
      const chat = mapRow(row);
      const parts = chat.participants || [];
      if (!chat.isGroup && parts.length === 2 && parts.includes(otherUid)) {
        return chat;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function createChat(chatData) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  if (!chatData || !Array.isArray(chatData.participants) || chatData.participants.length < 2) {
    return { success: false, error: 'Participants required' };
  }
  try {
    const supabase = getSupabase();
    const chatId = [...chatData.participants].sort().join('__');
    const { data: existing } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .maybeSingle();
    if (existing) {
      // Merge so an existing conversation (messages, lastMessage) is never wiped.
      const { error } = await supabase
        .from('chats')
        .update(
          toRow({
            participants: chatData.participants,
            participantNames: chatData.participantNames || {},
            participantAvatars: chatData.participantAvatars || {},
            isGroup: chatData.isGroup || false,
            groupName: chatData.groupName || '',
          })
        )
        .eq('id', chatId);
      if (error) return fail(error);
      return ok(chatId);
    }
    const { error } = await supabase
      .from('chats')
      .upsert(
        toRow({
          id: chatId,
          participants: chatData.participants,
          participantNames: chatData.participantNames || {},
          participantAvatars: chatData.participantAvatars || {},
          isGroup: chatData.isGroup || false,
          groupName: chatData.groupName || '',
          lastMessage: chatData.lastMessage || '',
        }),
        { onConflict: 'id', ignoreDuplicates: false }
      );
    if (error) return fail(error);
    return ok(chatId);
  } catch (error) {
    return fail(error);
  }
}

export async function sendMessage(chatId, { text, senderKey, senderName, senderAvatar, participants, participantNames, participantAvatars }) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { data, error } = await getSupabase().rpc('send_message', {
      p_chat_id: chatId,
      p_sender: senderKey,
      p_text: text,
      p_sender_name: senderName || 'User',
      p_sender_avatar: senderAvatar || null,
      p_participants: Array.isArray(participants) ? participants : null,
      p_participant_names: participantNames || null,
      p_participant_avatars: participantAvatars || null,
    });
    if (error) return fail(error);
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}

function sortChatsByLastMessage(chats) {
  return [...chats].sort((a, b) => toMillis(b.lastMessageAt) - toMillis(a.lastMessageAt));
}

export function subscribeToMessages(chatId, callback) {
  if (!checkDb()) return () => {};
  return subscribeQuery({
    key: `messages:${chatId}`,
    table: 'chat_messages',
    filter: `chat_id=eq.${chatId}`,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return mapRows(data);
    },
    onData: callback,
  });
}

export function subscribeToChats(userId, callback) {
  if (!checkDb()) return () => {};
  return subscribeQuery({
    key: `chats:${userId}`,
    table: 'chats',
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('chats')
        .select('*')
        .contains('participants', [userId]);
      if (error) throw error;
      return sortChatsByLastMessage(mapRows(data));
    },
    onData: callback,
  });
}

export async function deleteMessage(chatId, messageId) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { error } = await getSupabase()
      .from('chat_messages')
      .delete()
      .eq('id', messageId)
      .eq('chat_id', chatId);
    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

export async function editMessage(chatId, messageId, newText) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  if (!newText || !String(newText).trim()) return { success: false, error: 'Message cannot be empty' };
  try {
    const { error } = await getSupabase()
      .from('chat_messages')
      .update({ text: String(newText).trim(), edited: true })
      .eq('id', messageId)
      .eq('chat_id', chatId);
    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteChat(chatId) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    // Messages cascade via the FK (chat_messages.chat_id → chats ON DELETE CASCADE).
    const { error } = await getSupabase().from('chats').delete().eq('id', chatId);
    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

export function getChatsForUser(userId, callback) {
  return subscribeToChats(userId, callback);
}

// ─── FOLLOWS ─────────────────────────────────────────────────────────────────

export async function toggleFollowUser(followerId, followingId) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  if (!followerId || !followingId || followerId === followingId) {
    return { success: false, error: 'Cannot follow yourself' };
  }
  try {
    const { data, error } = await getSupabase().rpc('toggle_follow', {
      p_target_id: followingId,
    });
    if (error) return fail(error);
    return ok(Boolean(data));
  } catch (error) {
    return fail(error);
  }
}

export async function getFollowers(userId) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { data, error } = await getSupabase()
      .from('follows')
      .select('follower_id')
      .eq('following_id', userId);
    if (error) return fail(error);
    return ok((data || []).map((r) => r.follower_id));
  } catch (error) {
    return fail(error);
  }
}

export async function getFollowing(userId) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { data, error } = await getSupabase()
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);
    if (error) return fail(error);
    return ok((data || []).map((r) => r.following_id));
  } catch (error) {
    return fail(error);
  }
}

export async function isFollowing(followerId, followingId) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { data, error } = await getSupabase()
      .from('follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();
    if (error) return fail(error);
    return ok(Boolean(data));
  } catch (error) {
    return fail(error);
  }
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

export async function createNotification(userId, { type, actorKey, actorName, text, linkType, linkId }) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const notificationId = randomId();
    const payload = toRow({
      id: notificationId,
      userId,
      type,
      actorKey,
      actorName,
      text,
      linkType: linkType || null,
      linkId: linkId || null,
      read: false,
    });
    const { error } = await getSupabase().from('notifications').insert(payload);
    if (error) return fail(error);
    return ok(notificationId);
  } catch (error) {
    return fail(error);
  }
}

export async function markNotificationRead(userId, notificationId) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { error } = await getSupabase()
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);
    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

export async function markAllNotificationsRead(userId) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { error } = await getSupabase()
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

export function subscribeToNotifications(userId, callback) {
  if (!checkDb()) return () => {};
  return subscribeQuery({
    key: `notifications:${userId}`,
    table: 'notifications',
    filter: `user_id=eq.${userId}`,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return mapRows(data);
    },
    onData: callback,
  });
}

// ─── BOOKMARKS ───────────────────────────────────────────────────────────────

export async function addBookmark(userId, postId) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { data, error } = await getSupabase().rpc('toggle_bookmark', {
      p_post_id: postId,
      p_bookmark: true,
    });
    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

export async function removeBookmark(userId, postId) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { data, error } = await getSupabase().rpc('toggle_bookmark', {
      p_post_id: postId,
      p_bookmark: false,
    });
    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

export async function getBookmarks(userId) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { data, error } = await getSupabase()
      .from('posts')
      .select('id, created_at')
      .contains('bookmarked_by', [userId])
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return fail(error);
    // Same shape as the old bookmark subcollection docs: { postId, createdAt }.
    return ok(mapRows(data).map((r) => ({ postId: r.id, createdAt: r.createdAt })));
  } catch (error) {
    return fail(error);
  }
}

// ─── USER PROFILES ───────────────────────────────────────────────────────────

export async function getUserProfile(userId) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { data, error } = await getSupabase()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) return fail(error);
    if (!data) return { success: false, error: 'User not found' };
    return ok(mapRow(data));
  } catch (error) {
    return fail(error);
  }
}

export async function updateUserProfile(userId, data) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { uid, id, ...cleanData } = data || {};
    const supabase = getSupabase();
    const { data: updated, error } = await supabase
      .from('profiles')
      .update(toRow(cleanData))
      .eq('id', userId)
      .select('id');
    if (error) return fail(error);
    // Row missing (legacy account / failed signup) — an UPDATE would hit
    // 0 rows, silently succeed and leave the app stuck in onboarding.
    // Create it instead so the write always lands.
    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...toRow(cleanData) }, { onConflict: 'id', ignoreDuplicates: false });
      if (insertError) return fail(insertError);
    }
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

export async function searchUsers(queryText) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { data, error } = await getSupabase()
      .from('profiles')
      .select('*')
      .ilike('name', `${queryText}%`)
      .limit(20);
    if (error) return fail(error);
    return ok(mapRows(data));
  } catch (error) {
    return fail(error);
  }
}

export function subscribeToUserProfile(userId, callback) {
  if (!checkDb()) return () => {};
  return subscribeQuery({
    key: `profile:${userId}`,
    table: 'profiles',
    filter: `id=eq.${userId}`,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapRow(data) : null;
    },
    onData: (rows) => callback(Array.isArray(rows) ? rows[0] || null : rows),
  });
}

// ─── FILE UPLOAD ─────────────────────────────────────────────────────────────

export async function uploadImage(file, path) {
  const resourceType = file?.type?.startsWith('video/') ? 'video' : 'image';
  // Cloudinary is the active primary media path — keep it first.
  if (isCloudinaryConfigured()) {
    try {
      const folder = path.split('/').slice(0, -1).join('/') || 'foundators';
      const publicId =
        (path.split('/').pop() || `upload_${Date.now()}`).replace(/\.(jpe?g|png|webp|gif|mp4|mov|webm)$/i, '') ||
        `upload_${Date.now()}`;
      const url = await uploadToCloudinary(file, resourceType, folder, publicId);
      return { success: true, data: url };
    } catch (error) {
      console.error('Cloudinary upload failed, falling back to Supabase Storage:', error);
    }
  }
  if (!checkDb()) return { success: false, error: 'Storage not configured' };
  try {
    const supabase = getSupabase();
    const { error } = await supabase.storage
      .from('uploads')
      .upload(path, file, { upsert: true, cacheControl: '3600' });
    if (error) return fail(error);
    const { data } = supabase.storage.from('uploads').getPublicUrl(path);
    return ok(data?.publicUrl);
  } catch (error) {
    return fail(error);
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
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { error } = await getSupabase()
      .from('analytics_events')
      .insert(
        toRow({
          id: randomId(),
          eventType,
          userId: data?.userId || null,
          payload: data || {},
        })
      );
    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

// ─── FEED ────────────────────────────────────────────────────────────────────

export async function verifyUser(userId) {
  if (!checkDb()) return { success: false, error: 'Supabase not configured' };
  try {
    const { error } = await getSupabase()
      .from('profiles')
      .update({ verified: true })
      .eq('id', userId);
    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

export function subscribeToFeed(callback) {
  if (!checkDb()) return () => {};
  return subscribeQuery({
    key: 'feed:all',
    table: 'posts',
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return mapRows(data);
    },
    onData: callback,
  });
}
