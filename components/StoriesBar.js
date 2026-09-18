'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import StoryViewer from './StoryViewer';

const STORIES = [
  { key: 'sophia', name: 'Sophia', avatar: 'https://i.pravatar.cc/160?img=47', hasStory: true, viewed: false },
  { key: 'arjun', name: 'Arjun', avatar: 'https://i.pravatar.cc/160?img=12', hasStory: true, viewed: false },
  { key: 'meera', name: 'Meera', avatar: 'https://i.pravatar.cc/160?img=44', hasStory: true, viewed: true },
  { key: 'rohan', name: 'Rohan', avatar: 'https://i.pravatar.cc/160?img=15', hasStory: true, viewed: false },
  { key: 'daniel', name: 'Daniel', avatar: 'https://i.pravatar.cc/160?img=52', hasStory: false },
  { key: 'emily', name: 'Emily', avatar: 'https://i.pravatar.cc/160?img=45', hasStory: true, viewed: true },
  { key: 'james', name: 'James', avatar: 'https://i.pravatar.cc/160?img=14', hasStory: false },
  { key: 'ishita', name: 'Ishita', avatar: 'https://i.pravatar.cc/160?img=48', hasStory: true, viewed: false },
];

export default function StoriesBar() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const profile = useStore((s) => s.profile);
  const [viewingStory, setViewingStory] = useState(null);

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

          {STORIES.filter((s) => s.key !== profile?.id).map((story) => (
            <button
              key={story.key}
              onClick={() => story.hasStory && setViewingStory(story.key)}
              aria-label={`${story.name}'s story${story.viewed ? ' (viewed)' : ''}`}
              className="flex flex-none flex-col items-center gap-1"
            >
              <div
                className={`rounded-full p-[2px] ${
                  story.hasStory && !story.viewed
                    ? 'bg-gradient-to-br from-yellow-400 via-red-500 to-purple-500'
                    : story.hasStory && story.viewed
                    ? 'bg-text3'
                    : 'bg-transparent'
                }`}
              >
                <div className="rounded-full bg-[#020202] p-[2px]">
                  <img
                    src={story.avatar}
                    alt={story.name}
                    className="h-[56px] w-[56px] rounded-full object-cover"
                  />
                </div>
              </div>
              <span className="text-[10px] text-text2">{story.name}</span>
            </button>
          ))}
        </div>
      </div>

      {viewingStory && (
        <StoryViewer initialUser={viewingStory} onClose={() => setViewingStory(null)} />
      )}
    </>
  );
}
