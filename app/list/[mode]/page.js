'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import SubpageHeader from '@/components/SubpageHeader';
import MainScreenShell from '@/components/MainScreenShell';
import PersonCard from '@/components/PersonCard';
import DiscussionCard from '@/components/DiscussionCard';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import AuthSkeleton from '@/components/AuthSkeleton';

const TITLES = {
  people: 'People to follow',
  startups: 'Trending Startups',
  discussions: 'Trending Discussions',
};

export default function ListPage() {
  const ready = useRequireAuth();
  const { mode } = useParams();
  const discussions = useStore((s) => s.discussions);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchUsers() {
      try {
        const snap = await getDocs(collection(db, 'users'));
        if (!cancelled) {
          setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (mode === 'people') fetchUsers();
    else setLoading(false);
    return () => { cancelled = true; };
  }, [mode]);

  if (!ready) return <AuthSkeleton />;

  return (
    <MainScreenShell>
      <SubpageHeader title={TITLES[mode] || 'List'} />
      <div className="no-scrollbar px-[18px] py-3.5">
        {mode === 'people' && (
          loading ? (
            <div className="py-12 text-center text-[13px] text-text3">Loading people...</div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-text2">No people found</div>
          ) : (
            users.map((u) => <PersonCard key={u.id} user={{ ...u, key: u.id }} variant="row" />)
          )
        )}

        {mode === 'startups' && (
          <div className="py-12 text-center text-[13px] text-text2">No startups yet</div>
        )}

        {mode === 'discussions' &&
          Object.values(discussions).map((d) => <DiscussionCard key={d.id} discussion={d} />)}

        {!TITLES[mode] && <p className="text-sm text-text2">Nothing to show.</p>}
      </div>
    </MainScreenShell>
  );
}
