'use client';

import { useState, useCallback } from 'react';
import { Repeat2, MessageSquare, Send } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import Avatar from './Avatar';

export default function RepostModal({ post, onClose }) {
  const { vibrate, notification } = useHaptics();
  const showToast = useStore((s) => s.showToast);
  const profile = useStore((s) => s.profile);
  const [mode, setMode] = useState('repost');
  const [comment, setComment] = useState('');

  const handleRepost = useCallback(() => {
    vibrate('medium');
    notification('success');
    if (mode === 'quote') {
      showToast('Quote post published!');
    } else {
      showToast('Reposted!');
    }
    onClose();
  }, [mode, vibrate, notification, showToast, onClose]);

  return (
    <div className="fixed inset-0 z-[400] flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div className="rounded-t-3xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[16px] font-bold">Share post</span>
          <button onClick={onClose} className="text-text2" aria-label="Close">
            ✕
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('repost')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12px] font-bold transition-all ${
              mode === 'repost' ? 'bg-gold text-[#1a1300]' : 'bg-white/5 text-text2'
            }`}
          >
            <Repeat2 size={14} />
            Repost
          </button>
          <button
            onClick={() => setMode('quote')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12px] font-bold transition-all ${
              mode === 'quote' ? 'bg-gold text-[#1a1300]' : 'bg-white/5 text-text2'
            }`}
          >
            <MessageSquare size={14} />
            Quote
          </button>
        </div>

        {/* Quote comment */}
        {mode === 'quote' && (
          <div className="mb-4 flex items-start gap-3">
            <Avatar src={profile?.avatar} name={profile?.name} size={36} />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 rounded-2xl border border-linesoft bg-white/[0.03] px-4 py-3 text-[13px] text-white placeholder:text-text3 focus:border-gold focus:outline-none min-h-[80px]"
              aria-label="Quote comment"
            />
          </div>
        )}

        {/* Original post preview */}
        <div className="rounded-2xl border border-linesoft bg-white/[0.03] p-3 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Avatar src={post.author?.avatar} name={post.author?.name} size={24} />
            <span className="text-[11px] font-bold">{post.author?.name}</span>
          </div>
          <p className="text-[12px] text-text2 line-clamp-2">{post.text}</p>
        </div>

        <button
          onClick={handleRepost}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gold-grad py-3.5 text-[14px] font-extrabold text-[#1a1300]"
        >
          <Send size={16} />
          {mode === 'quote' ? 'Post quote' : 'Repost'}
        </button>
      </div>
    </div>
  );
}
