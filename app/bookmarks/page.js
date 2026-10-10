'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import SubpageHeader from '@/components/SubpageHeader';
import PostCard from '@/components/PostCard';
import EmptyState from '@/components/EmptyState';
import { useStore } from '@/lib/store';
import { getSupabase } from '@/lib/supabase/client';
import { mapRows } from '@/lib/supabase/db';
import { subscribeQuery } from '@/lib/supabase/realtime';

export default function BookmarksPage() {
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const [bookmarkedDocs, setBookmarkedDocs] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!profile?.id) return undefined;
    const unsub = subscribeQuery({
      key: `bookmarks:${profile.id}`,
      table: 'posts',
      queryFn: async () => {
        const { data, error } = await getSupabase()
          .from('posts')
          .select('*')
          .contains('bookmarked_by', [profile.id])
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        return mapRows(data);
      },
      onData: (rows) => {
        setLoadError(null);
        setBookmarkedDocs(rows);
      },
      onError: (err) => {
        // Without this callback a failed listener (missing composite index,
        // permission denial) left the page EMPTY with no signal at all —
        // users were told "No saved posts" when the query had actually
        // failed. Surface it honestly with a retry.
        console.error('Bookmarks listener failed:', err);
        setLoadError(err?.message || 'Could not load saved posts');
        setBookmarkedDocs([]);
      },
    });
    return () => unsub();
  }, [profile?.id, retryTick]);

  // Live content: prefer the fresh docs to reflect real-time like/comment counts
  const saved = bookmarkedDocs;

  return (
    <MainScreenShell>
      <SubpageHeader title="Saved Posts" onBack={() => router.back()} />
      <div className="no-scrollbar px-[18px] pb-6">
        {loadError && saved.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-[14px] font-bold text-text2">Couldn&rsquo;t load saved posts</div>
            <div className="mx-auto mt-2 max-w-[280px] break-words text-[12px] text-text3">{loadError}</div>
            <button
              onClick={() => setRetryTick((t) => t + 1)}
              className="mt-4 rounded-full border border-gold px-5 py-2 text-[12px] font-bold text-gold"
            >
              Try again
            </button>
          </div>
        ) : saved.length === 0 ? (
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