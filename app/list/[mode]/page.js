'use client';

import { useParams } from 'next/navigation';
import SubpageHeader from '@/components/SubpageHeader';
import MainScreenShell from '@/components/MainScreenShell';
import PersonCard from '@/components/PersonCard';
import StartupRow from '@/components/StartupRow';
import DiscussionCard from '@/components/DiscussionCard';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { USERS, STARTUPS } from '@/lib/data';
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

  if (!ready) return <AuthSkeleton />;

  return (
    <MainScreenShell>
      <SubpageHeader title={TITLES[mode] || 'List'} />
      <div className="no-scrollbar px-[18px] py-3.5">
        {mode === 'people' &&
          Object.values(USERS).map((u) => <PersonCard key={u.key} user={u} variant="row" />)}

        {mode === 'startups' &&
          Object.values(STARTUPS).map((s) => <StartupRow key={s.key} startup={s} />)}

        {mode === 'discussions' &&
          Object.values(discussions).map((d) => <DiscussionCard key={d.id} discussion={d} />)}

        {!TITLES[mode] && <p className="text-sm text-text2">Nothing to show.</p>}
      </div>
    </MainScreenShell>
  );
}
