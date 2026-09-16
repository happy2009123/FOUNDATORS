'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { useHaptics } from '@/lib/useHaptics';

export default memo(function DiscussionCard({ discussion }) {
  const router = useRouter();
  const { vibrate } = useHaptics();
  return (
    <button
      onClick={() => { vibrate('light'); router.push(`/discussion/${discussion.id}`); }}
      aria-label={`${discussion.title}, ${discussion.views} views, ${discussion.comments.length} replies`}
      className="mb-3.5 flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-linesoft bg-card p-3.5 text-left"
    >
      <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[9px] border border-line bg-[rgba(217,172,61,0.1)] text-gold">
        <MessageCircle size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-[13.5px] font-bold leading-snug">{discussion.title}</div>
        <div className="text-[11.5px] text-text2">
          {discussion.views} views · {discussion.comments.length} replies
        </div>
      </div>
    </button>
  );
})
