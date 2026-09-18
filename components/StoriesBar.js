'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import StoryViewer from './StoryViewer';

export default function StoriesBar() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const profile = useStore((s) => s.profile);
  const stories = useStore((s) => s.stories);
  const [viewingStory, setViewingStory] = useState(null);

  const hasStories = stories && stories.length > 0;

  return (
    <>
      <div className="border-b border-linesoft pb-3">
        <div ref={scrollRef} className="no-scrollbar flex gap-3 overflow-x-auto px-4 pt-3">
          <button
            onClick={() => router.push('/stories/create')}
            aria-label="Add to your story"
            className="flex flex-none flex-col items-center gap-1"
          >
            <div className="relative">
              <div className="h-[62px] w-[62px] rounded-full border-2 border-dashed border-text3 p-[2px]">
                <img
                  src={profile?.avatar || 'https://i.pravatar.cc/160?img=1'}
                  alt="Your story"
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-[#1a1300]">
                <Plus size={12} strokeWidth={3} />
              </div>
            </div>
            <span className="text-[10px] text-text3">Your story</span>
          </button>

          {!hasStories && (
            <div className="flex flex-1 items-center justify-center py-4">
              <div className="text-center">
                <div className="text-[24px]">📸</div>
                <div className="mt-1 text-[10px] text-text3">No stories yet</div>
                <div className="text-[9px] text-text3">Be the first to post!</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {viewingStory && (
        <StoryViewer initialUser={viewingStory} onClose={() => setViewingStory(null)} />
      )}
    </>
  );
}
