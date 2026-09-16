'use client';

import { useCallback } from 'react';
import { useStore } from '@/lib/store';
import {
  createPost,
  addComment,
  sendMessage,
  toggleFollowUser,
} from '@/lib/firestore';

export function useFirestoreSync() {
  const profile = useStore((s) => s.profile);

  const syncPost = useCallback(
    async (postData) => {
      try {
        const result = await createPost({
          text: postData.text,
          authorKey: profile?.key || 'kabir',
          authorName: profile?.name || 'Kabir',
          authorAvatar: profile?.avatar || '',
          tagType: postData.tagType || 'update',
          imageUrl: postData.imageUrl || null,
        });
        return result?.data || null;
      } catch (err) {
        console.error('[syncPost]', err);
        return null;
      }
    },
    [profile]
  );

  const syncComment = useCallback(
    async (postId, commentData) => {
      try {
        const result = await addComment(postId, {
          text: commentData.text,
          authorKey: profile?.key || 'kabir',
          authorName: profile?.name || 'Kabir',
          authorAvatar: profile?.avatar || '',
          replyTo: commentData.replyTo || null,
        });
        return result?.data || null;
      } catch (err) {
        console.error('[syncComment]', err);
        return null;
      }
    },
    [profile]
  );

  const syncMessage = useCallback(
    async (chatId, messageData) => {
      try {
        const result = await sendMessage(chatId, {
          text: messageData.text,
          senderKey: profile?.key || 'kabir',
          senderName: profile?.name || 'Kabir',
          senderAvatar: profile?.avatar || '',
        });
        return result?.data || null;
      } catch (err) {
        console.error('[syncMessage]', err);
        return null;
      }
    },
    [profile]
  );

  const syncFollow = useCallback(
    async (targetUserId) => {
      try {
        const userId = profile?.key || profile?.id || 'kabir';
        const result = await toggleFollowUser(userId, targetUserId);
        return result?.data ?? null;
      } catch (err) {
        console.error('[syncFollow]', err);
        return null;
      }
    },
    [profile]
  );

  return { syncPost, syncComment, syncMessage, syncFollow };
}
