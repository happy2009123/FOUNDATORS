'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Send, Heart, Reply, MoreHorizontal, Pencil, Trash2, ArrowUpDown, Check, X } from 'lucide-react';
import SubpageHeader from '@/components/SubpageHeader';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { getPerson, USERS } from '@/lib/data';
import { useHaptics } from '@/lib/useHaptics';
import AuthSkeleton from '@/components/AuthSkeleton';
import Avatar from '@/components/Avatar';

export default function PostCommentsPage() {
  const ready = useRequireAuth();
  const { postId } = useParams();
  const router = useRouter();
  const posts = useStore((s) => s.posts);
  const comments = useStore((s) => s.commentsByPost[postId] || []);
  const addComment = useStore((s) => s.addComment);
  const editComment = useStore((s) => s.editComment);
  const deleteComment = useStore((s) => s.deleteComment);
  const toggleCommentLike = useStore((s) => s.toggleCommentLike);
  const sortComments = useStore((s) => s.sortComments);
  const { vibrate, notification } = useHaptics();

  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showSort, setShowSort] = useState(false);
  const [showMenu, setShowMenu] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const post = posts.find((p) => p.id === postId);
  const author = post ? getPerson(post.authorKey) : null;

  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [postId]);

  useEffect(() => { if (sortBy) sortComments(postId, sortBy); }, [sortBy, postId, comments.length]);

  const handleReply = useCallback((comment) => {
    vibrate('light');
    setReplyTo(comment);
    inputRef.current?.focus();
  }, [vibrate]);

  const handleEdit = useCallback((comment) => {
    vibrate('light');
    setEditingId(comment.id);
    setEditText(comment.text);
    setShowMenu(null);
  }, [vibrate]);

  const saveEdit = useCallback(() => {
    if (!editText.trim()) return;
    editComment(postId, editingId, editText.trim());
    setEditingId(null);
    setEditText('');
    notification('success');
  }, [editText, postId, editingId, editComment, notification]);

  const handleDelete = useCallback((commentId) => {
    vibrate('medium');
    deleteComment(postId, commentId);
    setDeleteConfirm(null);
    notification('success');
  }, [vibrate, postId, deleteComment, notification]);

  function handleSend() {
    const val = input.trim();
    if (!val) return;
    if (replyTo) {
      addComment(postId, val, replyTo.id);
    } else {
      addComment(postId, val);
    }
    setInput('');
    setReplyTo(null);
  }

  if (!ready) return <AuthSkeleton />;
  if (!post || !author) {
    return (
      <div className="app-shell flex min-h-0 flex-1 flex-col">
        <SubpageHeader title="Comments" />
        <div className="flex flex-1 items-center justify-center text-sm text-text2">Post not found.</div>
      </div>
    );
  }

  const rootComments = comments.filter((c) => !c.replyTo);
  const getReplies = (parentId) => comments.filter((c) => c.replyTo === parentId);

  function CommentItem({ comment, isReply = false }) {
    const commenter = comment.who === 'me'
      ? { name: 'Kabir Anand', avatar: 'https://i.pravatar.cc/100?img=13', key: 'kabir' }
      : getPerson(comment.who);
    const replies = getReplies(comment.id);
    const isEditing = editingId === comment.id;
    const isOwn = comment.who === 'me';

    return (
      <div className={`${isReply ? 'ml-8 border-l-2 border-linesoft pl-3' : ''}`}>
        <div className="mb-3 flex items-start gap-2.5">
          <Avatar src={commenter?.avatar} name={commenter?.name} size={isReply ? 24 : 30} className="flex-none mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] font-bold text-gold-hi">{commenter?.name}</span>
              <span className="text-[10px] text-text3">{comment.time || 'now'}</span>
              {comment.edited && <span className="text-[9px] text-text3 italic">(edited)</span>}
            </div>

            {isEditing ? (
              <div className="mt-1">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  className="w-full rounded-xl border border-gold bg-white/[0.03] px-3 py-2 text-[13px] text-white focus:outline-none"
                  autoFocus
                  aria-label="Edit comment"
                />
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setEditingId(null)} className="text-[10px] text-text3">Cancel</button>
                  <button onClick={saveEdit} className="text-[10px] font-bold text-gold">Save</button>
                </div>
              </div>
            ) : (
              <div className="mt-0.5 text-[13.5px] leading-snug">{comment.text}</div>
            )}

            <div className="mt-1.5 flex items-center gap-3">
              <button
                onClick={() => toggleCommentLike(postId, comment.id)}
                className="flex items-center gap-1 text-[11px] text-text3"
                aria-label={comment.likedByMe ? 'Unlike' : 'Like'}
              >
                <Heart size={12} className={comment.likedByMe ? 'fill-gold text-gold' : ''} />
                {comment.likes || 0}
              </button>
              {!isReply && (
                <button onClick={() => handleReply(comment)} className="flex items-center gap-1 text-[11px] text-text3 font-medium" aria-label="Reply">
                  <Reply size={12} /> Reply
                </button>
              )}
              {isOwn && (
                <div className="relative">
                  <button onClick={() => setShowMenu(showMenu === comment.id ? null : comment.id)} className="text-text3" aria-label="More">
                    <MoreHorizontal size={14} />
                  </button>
                  {showMenu === comment.id && (
                    <div className="absolute left-0 top-6 z-40 w-36 rounded-xl border border-linesoft bg-card p-1.5 shadow-xl">
                      <button onClick={() => handleEdit(comment)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-text2 hover:bg-white/5">
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => { setDeleteConfirm(comment.id); setShowMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-red hover:bg-white/5">
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {!isReply && replies.length > 0 && (
          <div className="mb-3">
            {replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} isReply />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <SubpageHeader title={`${comments.length} Comments`} />
      <div ref={scrollRef} className="no-scrollbar flex-1 overflow-y-auto p-4">
        <div className="mb-4 rounded-[20px] border border-linesoft bg-card p-4">
          <div className="mb-2 flex items-center gap-2.5">
            <Avatar src={author.avatar} name={author.name} size={36} />
            <div>
              <div className="text-sm font-bold">{author.name}</div>
              <div className="text-[11px] text-text2">{post.meta}</div>
            </div>
          </div>
          <div className="text-sm">{post.text}</div>
        </div>

        {/* Sort */}
        <div className="relative mb-3 flex items-center justify-between">
          <span className="text-[12px] font-bold text-text3">{rootComments.length} comments</span>
          <button onClick={() => setShowSort(!showSort)} className="flex items-center gap-1 text-[11px] font-bold text-gold" aria-label="Sort comments">
            <ArrowUpDown size={12} /> {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : 'Popular'}
          </button>
          {showSort && (
            <div className="absolute right-0 top-6 z-40 w-36 rounded-xl border border-linesoft bg-card p-1.5 shadow-xl">
              {[['newest', 'Newest'], ['oldest', 'Oldest'], ['popular', 'Most liked']].map(([key, label]) => (
                <button key={key} onClick={() => { setSortBy(key); setShowSort(false); }} className={`flex w-full rounded-lg px-3 py-2 text-[11px] text-left ${sortBy === key ? 'bg-gold/10 text-gold font-bold' : 'text-text2 hover:bg-white/5'}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {rootComments.length === 0 && (
          <p className="py-8 text-center text-[12.5px] text-text2">No comments yet — be the first to reply.</p>
        )}

        {rootComments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 border-t border-linesoft bg-card px-4 py-2">
          <Reply size={14} className="flex-none text-gold" />
          <div className="min-w-0 flex-1 truncate text-[11.5px] text-text2">
            Replying to <span className="text-white font-bold">{getPerson(replyTo.who)?.name || 'someone'}</span>: {replyTo.text?.slice(0, 50)}
          </div>
          <button onClick={() => setReplyTo(null)} className="flex-none text-text3" aria-label="Cancel reply">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="safe-bottom flex flex-none items-center gap-2.5 border-t border-linesoft px-3.5 py-2.5">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-linesoft bg-card px-3.5 py-2.5">
          <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={replyTo ? `Reply to ${getPerson(replyTo.who)?.name || 'someone'}...` : 'Add a comment...'} aria-label="Add a comment" className="flex-1 bg-transparent text-[13.5px] text-white placeholder:text-text3 focus:outline-none" />
        </div>
        <button onClick={handleSend} disabled={!input.trim()} className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gold-grad text-[#1a1300] disabled:opacity-40" aria-label="Send"><Send size={17} /></button>
      </div>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-6" onClick={() => setDeleteConfirm(null)}>
          <div className="w-full max-w-[280px] rounded-3xl bg-card p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <Trash2 size={24} className="text-red mx-auto mb-3" />
            <h3 className="text-[15px] font-bold">Delete comment?</h3>
            <p className="mt-1 text-[12px] text-text2">This cannot be undone.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-full border border-linesoft py-2.5 text-[12px] font-bold text-text2">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 rounded-full bg-red py-2.5 text-[12px] font-bold text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
