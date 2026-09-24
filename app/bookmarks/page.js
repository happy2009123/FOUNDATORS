'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import SubpageHeader from '@/components/SubpageHeader';
import PostCard from '@/components/PostCard';
import EmptyState from '@/components/EmptyState';
import { useStore } from '@/lib/store';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default function BookmarksPage() {
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const [bookmarkedDocs, setBookmarkedDocs] = useState([]);

  useEffect(() => {
    if (!profile?.id) return;
    const q = query(
      collection(db, 'posts'),
      where('bookmarkedBy', 'array-contains', profile.id),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      setBookmarkedDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [profile?.id]);

  // Live content: prefer the fresh docs to reflect real-time like/comment counts
  const saved = bookmarkedDocs;

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