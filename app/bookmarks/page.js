'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import SubpageHeader from '@/components/SubpageHeader';
import PostCard from '@/components/PostCard';
import EmptyState from '@/components/EmptyState';
import { useStore } from '@/lib/store';

export default function BookmarksPage() {
  const router = useRouter();
  const posts = useStore((s) => s.posts);
  const bookmarkedPosts = useStore((s) => s.bookmarkedPosts);

  const saved = useMemo(
    () => posts.filter((p) => bookmarkedPosts[p.id]),
    [posts, bookmarkedPosts]
  );

  return (
    <MainScreenShell>
      <SubpageHeader title="Saved Posts" onBack={() => router.back()} />
      <div className="no-scrollbar px-[18px] pb-6">
        {saved.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="No saved posts"
            description="Posts you save will appear here."
          />
        ) : (
          <div className="space-y-3 pt-3 stagger-children">
            {saved.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </MainScreenShell>
  );
}
