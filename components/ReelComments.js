'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Heart, Send } from 'lucide-react';
import Avatar from './Avatar';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { timeAgo } from '@/lib/admin';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { subscribeQuery } from '@/lib/supabase/realtime';
import { mapRows } from '@/lib/supabase/db';

async function fetchUser(key) {
  try {
    const { data } = await getSupabase()
      .from('profiles')
      .select('name, avatar')
      .eq('id', key)
      .maybeSingle();
    if (!data) return null;
    return { id: key, name: data.name, avatar: data.avatar };
  } catch {
    return null;
  }
}

export default function ReelComments({ reelId, onClose }) {
  const { vibrate } = useHaptics();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const profile = useStore((s) => s.profile);
  const inputRef = useRef(null);
  const [users, setUsers] = useState({});

  useEffect(() => {
    if (!reelId) return;
    const unsub = subscribeQuery({
      key: `reelComments:${reelId}`,
      table: 'reel_comments',
      filter: `reel_id=eq.${reelId}`,
      queryFn: async () => {
        const { data, error } = await getSupabase()
          .from('reel_comments')
          .select('*')
          .eq('reel_id', reelId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        const rows = mapRows(data);
        const userIds = [...new Set(rows.map((c) => c.userId))];
        const fetched = await Promise.all(userIds.map((uid) => fetchUser(uid)));
        const userMap = {};
        fetched.forEach((u) => { if (u) userMap[u.id] = u; });
        setUsers(userMap);
        return rows;
      },
      onData: (rows) => {
        setComments(rows);
      },
      onError: (err) => {
        console.warn('Comments listener error:', err);
      },
    });
    return unsub;
  }, [reelId]);

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  const send = async () => {
    if (!text.trim() || !profile) return;
    vibrate('light');
    const { error } = await getSupabase().from('reel_comments').insert({
      reel_id: reelId,
      user_id: profile.id,
      text: text.trim(),
      liked_by: [],
      likes: 0,
    });
    if (error) console.warn('Comment add error:', error);
    setText('');
    setReplyTo(null);
  };

  const toggleLikeComment = async (commentId) => {
    vibrate('light');
    const { data: comment } = await getSupabase()
      .from('reel_comments')
      .select('likes, liked_by')
      .eq('id', commentId)
      .maybeSingle();
    if (!comment) return;

    const alreadyLiked = comment.liked_by && comment.liked_by.includes(profile.id);
    let newLikes, newLikedBy;

    if (alreadyLiked) {
      newLikes = Math.max(0, comment.likes - 1);
      newLikedBy = (comment.liked_by || []).filter((id) => id !== profile.id);
    } else {
      newLikes = comment.likes + 1;
      newLikedBy = [...(comment.liked_by || []), profile.id];
    }

    await getSupabase()
      .from('reel_comments')
      .update({ likes: newLikes, liked_by: newLikedBy })
      .eq('id', commentId);
  };

  const REACTIONS = ['❤️', '🔥', '👏', '😂', '😮', '😢'];

  return (
    <div className="fixed inset-0 z-[400] flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-linesoft px-4 py-3">
        <span className="text-[15px] font-bold">{comments.length} comments</span>
        <button onClick={onClose} className="h-8 w-8 flex items-center justify-center text-text2" aria-label="Close comments">
          <X size={20} />
        </button>
      </div>

      {/* Quick reactions */}
      <div className="flex gap-2 border-b border-linesoft px-4 py-2">
        {REACTIONS.map((r) => (
          <button
            key={r}
            onClick={() => { vibrate('light'); setText((t) => (t + r).slice(0, 500)); inputRef.current?.focus(); }}
            className="rounded-full bg-white/5 px-3 py-1.5 text-[18px] hover:bg-white/10 transition-colors"
            aria-label={`React with ${r}`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {comments.map((comment) => {
          const commentUser = users[comment.userId];
          return (
            <div key={comment.id} className="space-y-3">
              <div className="flex gap-3">
                <Avatar
                  src={commentUser?.avatar || commentUser?.name ? undefined : undefined}
                  name={commentUser?.name || comment.userId || 'You'}
                  size={32}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold">
                      {commentUser?.name || comment.authorName || comment.userId || 'You'}
                    </span>
                    <span className="text-[10px] text-text3">
                      {comment.created_at ? timeAgo(comment.created_at) : '—'}
                    </span>
                  </div>
                  <p className="text-[13px] text-text mt-0.5">{comment.text}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <button
                      onClick={() => toggleLikeComment(comment.id)}
                      className="flex items-center gap-1 text-[11px] text-text3"
                      aria-label="Like comment"
                    >
                      <Heart size={12} className={comment.likedBy?.includes(profile?.id) ? 'fill-gold text-gold' : ''} />
                      <span>{comment.likes}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="border-t border-linesoft bg-[#0a0a0a] px-4 py-3">
        {replyTo && (
          <div className="flex items-center justify-between mb-2 text-[11px] text-text3">
            <span>Replying to a comment</span>
            <button onClick={() => setReplyTo(null)} className="text-gold" aria-label="Cancel reply">Cancel</button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Avatar src={profile?.avatar} name={profile?.name} size={32} />
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Add a comment..."
            aria-label="Add a comment"
            className="flex-1 rounded-full border border-linesoft bg-white/[0.03] px-4 py-2.5 text-[13px] text-white placeholder:text-text3 focus:border-gold focus:outline-none"
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gold disabled:text-text3 transition-colors"
            aria-label="Send comment"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}