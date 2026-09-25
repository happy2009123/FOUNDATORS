'use client';

import dynamic from 'next/dynamic';

const ReelsContent = dynamic(() => import('./ReelsContent'), {
  loading: () => (
    <div className="stage-frame flex w-full items-center justify-center bg-ink">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-surface" />
        <div className="h-4 w-32 animate-pulse rounded-xl bg-surface" />
        <div className="h-3 w-24 animate-pulse rounded-xl bg-surface" />
      </div>
    </div>
  ),
});

export default function ReelsPage() {
  return <ReelsContent />;
}
