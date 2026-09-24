'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import StoryViewer from './StoryViewer';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';

export default function StoriesBar() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const profile = useStore((s) => s.profile);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingStory, setViewingStory] = useState(null);

  useEffect(() => {
    const now = new Date();
    const q = query(
      collection(db, 'stories'),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc'),
      limit(20)
    );
    setLoading(true);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setStories(fetched);
        setLoading(false);
      },
      (err) => {
        console.warn('Stories listener error:', err);
        setStories([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.authorKey]) acc[story.authorKey] = [];
    acc[story.authorKey].push(story);
    return acc;
  }, {});

  const storyAuthors = Object.keys(groupedStories).map((authorKey) => {
    const authorStories = groupedStories[authorKey];
    const first = authorStories[0];
    return {
      authorKey,
      authorName: first?.authorName || 'User',
      authorAvatar: first?.authorAvatar || 'https://i.pravatar.cc/160',
      stories: authorStories.sort((a, b) => (a.createdAt?._seconds || 0) - (b.createdAt?._seconds || 0)),
    };
  });

  const hasStories = storyAuthors.length > 0;

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

          {!loading && !hasStories && (
            <div className="flex flex-1 items-center justify-center py-4">
              <div className="text-center">
                <div className="text-[24px]">&#128248;</div>
                <div className="mt-1 text-[10px] text-text3">No stories yet</div>
                <div className="text-[9px] text-text3">Be the first to post!</div>
              </div>
            </div>
          )}

          {storyAuthors.map((author) => {
            const latestStory = author.stories[author.stories.length - 1] || author.stories[0];
            return (
              <button
                key={author.authorKey}
                onClick={() => setViewingStory(author.authorKey)}
                className="flex flex-none flex-col items-center gap-1"
              >
                <div className="h-[62px] w-[62px] rounded-full border-2 border-gold p-[2px]">
                  <img
                    src={author.authorAvatar || 'https://i.pravatar.cc/160'}
                    alt={author.authorName}
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
                <span className="text-[10px] text-text3">{author.authorName?.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {viewingStory && (
        <StoryViewer authors={storyAuthors} initialAuthorKey={viewingStory} onClose={() => setViewingStory(null)} />
      )}
    </>
  );
}
