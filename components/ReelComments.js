'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Heart, Send, MoreHorizontal } from 'lucide-react';
import Avatar from './Avatar';
import { useStore } from '@/lib/store';
import { USERS } from '@/lib/data';
import { useHaptics } from '@/lib/useHaptics';

const MOCK_COMMENTS = [
  { id: 'c1', user: 'arjun', text: 'This is fire 🔥', time: '2h', likes: 12, replies: [] },
  { id: 'c2', user: 'meera', text: 'Great insight!', time: '1h', likes: 5, replies: [
    { id: 'c2r1', user: 'rohan', text: 'Totally agree', time: '45m', likes: 2 },
  ]},
  { id: 'c3', user: 'daniel', text: 'Bookmarked this', time: '30m', likes: 3, replies: [] },
];

export default function ReelComments({ reelId, onClose }) {
  const { vibrate } = useHaptics();
  const [comments, setComments] = useState(MOCK_COMMENTS);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [likedComments, setLikedComments] = useState({});
  const profile = useStore((s) => s.profile);
  const inputRef = useRef(null);

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  const send = () => {
    if (!text.trim()) return;
    vibrate('light');
    const newComment = {
      id: `c${Date.now()}`,
      user: profile?.id,
      text: text.trim(),
      time: 'now',
      likes: 0,
      replies: [],
    };
    if (replyTo) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === replyTo
            ? { ...c, replies: [...c.replies, { ...newComment, replies: undefined }] }
            : c
        )
      );
    } else {
      setComments((prev) => [newComment, ...prev]);
    }
    setText('');
    setReplyTo(null);
  };

  const toggleLike = (commentId) => {
    vibrate('light');
    setLikedComments((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
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
            onClick={() => { vibrate('light'); }}
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
          const commentUser = USERS[comment.user];
          return (
            <div key={comment.id} className="space-y-3">
              <div className="flex gap-3">
                <Avatar src={commentUser?.avatar} name={commentUser?.name} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold">{commentUser?.name || 'You'}</span>
                    <span className="text-[10px] text-text3">{comment.time}</span>
                  </div>
                  <p className="text-[13px] text-text mt-0.5">{comment.text}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <button
                      onClick={() => toggleLike(comment.id)}
                      className="flex items-center gap-1 text-[11px] text-text3"
                      aria-label="Like comment"
                    >
                      <Heart size={12} className={likedComments[comment.id] ? 'fill-gold text-gold' : ''} />
                      <span>{comment.likes + (likedComments[comment.id] ? 1 : 0)}</span>
                    </button>
                    <button
                      onClick={() => { setReplyTo(comment.id); setText(`@${commentUser?.name} `); }}
                      className="text-[11px] text-text3 font-medium"
                      aria-label="Reply to comment"
                    >
                      Reply
                    </button>
                    <button className="text-text3" aria-label="More options">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Replies */}
              {comment.replies?.length > 0 && (
                <div className="ml-10 space-y-3 border-l-2 border-linesoft pl-3">
                  {comment.replies.map((reply) => {
                    const replyUser = USERS[reply.user];
                    return (
                      <div key={reply.id} className="flex gap-2.5">
                        <Avatar src={replyUser?.avatar} name={replyUser?.name} size={24} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold">{replyUser?.name || 'You'}</span>
                            <span className="text-[10px] text-text3">{reply.time}</span>
                          </div>
                          <p className="text-[12px] text-text mt-0.5">{reply.text}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <button
                              onClick={() => toggleLike(reply.id)}
                              className="flex items-center gap-1 text-[10px] text-text3"
                              aria-label="Like reply"
                            >
                              <Heart size={10} className={likedComments[reply.id] ? 'fill-gold text-gold' : ''} />
                              <span>{reply.likes + (likedComments[reply.id] ? 1 : 0)}</span>
                            </button>
                            <button
                              onClick={() => { setReplyTo(comment.id); setText(`@${replyUser?.name} `); }}
                              className="text-[10px] text-text3 font-medium"
                              aria-label="Reply to reply"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
