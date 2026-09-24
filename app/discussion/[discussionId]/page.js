'use client';

import { useRef, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Send } from 'lucide-react';
import SubpageHeader from '@/components/SubpageHeader';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import AuthSkeleton from '@/components/AuthSkeleton';
import { db } from '@/lib/firebase';
import { initialsAvatar } from '@/lib/avatar';
import { doc, getDoc } from 'firebase/firestore';

async function fetchUser(key) {
  try {
    const snap = await getDoc(doc(db, 'users', key));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch {
    return null;
  }
}

export default function DiscussionPage() {
  const ready = useRequireAuth();
  const { discussionId } = useParams();
  const discussion = useStore((s) => s.discussions[discussionId]);
  const addDiscussionComment = useStore((s) => s.addDiscussionComment);

  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [discussionId]);

  if (!ready) return <AuthSkeleton />;
  if (!discussion) {
    return (
      <div className="app-shell flex min-h-0 flex-1 flex-col">
        <SubpageHeader title="Discussion" />
        <div className="flex flex-1 items-center justify-center text-sm text-text2">Discussion not found.</div>
      </div>
    );
  }

  function handleSend() {
    const val = input.trim();
    if (!val) return;
    addDiscussionComment(discussionId, val);
    setInput('');
  }

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <SubpageHeader title="Discussion" />
      <div ref={scrollRef} className="no-scrollbar flex-1 overflow-y-auto p-4">
        <div className="mb-4 rounded-[20px] border border-linesoft bg-card p-4">
          <div className="mb-1 text-base font-extrabold leading-snug">{discussion.title}</div>
          <div className="text-[11.5px] text-text2">
            {discussion.views} views · {discussion.comments.length} replies
          </div>
        </div>

        {discussion.comments.map((c, i) => (
          <DiscussionComment key={i} comment={c} />
        ))}
      </div>
      <div className="safe-bottom flex flex-none items-center gap-2.5 border-t border-linesoft px-3.5 py-2.5">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-linesoft bg-card px-3.5 py-2.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Add a reply..."
            aria-label="Add a reply"
            className="flex-1 bg-transparent text-[13.5px] text-white placeholder:text-text3 focus:outline-none"
          />
        </div>
        <button onClick={handleSend} className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gold-grad text-[#1a1300]">
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}

function DiscussionComment({ comment }) {
  const [commenter, setCommenter] = useState(null);

  useEffect(() => {
    if (comment.who === 'me') {
      setCommenter({ name: 'Kabir Anand', avatar: initialsAvatar('Kabir Anand') });
    } else {
      fetchUser(comment.who).then(setCommenter);
    }
  }, [comment.who]);

  return (
    <div className="mb-3 flex items-end gap-2">
      <img src={commenter?.avatar || initialsAvatar(commenter?.name)} alt={`${commenter?.name}'s avatar`} className="h-[26px] w-[26px] flex-none rounded-full object-cover" />
      <div className="max-w-[80%] rounded-[18px] rounded-bl-[5px] border border-linesoft bg-card px-3.5 py-[11px] text-[13.8px] leading-snug">
        <b className="mb-0.5 block text-[11.5px] text-gold-hi">{commenter?.name}</b>
        {comment.text}
      </div>
    </div>
  );
}
