'use client';

import dynamic from 'next/dynamic';

const ChallengesContent = dynamic(() => import('./ChallengesContent'), {
  loading: () => (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ink px-[18px] pb-6">
      <div className="gold-card mt-3 w-full p-5 text-center">
        <div className="mx-auto h-6 w-40 animate-pulse rounded-xl bg-surface" />
        <div className="mt-3 flex justify-center gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-7 w-7 animate-pulse rounded-full bg-surface" />
          ))}
        </div>
      </div>
      <div className="mt-5 grid w-full grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-3 text-center">
            <div className="mx-auto h-3.5 w-3.5 animate-pulse rounded bg-surface" />
            <div className="mx-auto mt-1 h-4 w-12 animate-pulse rounded bg-surface" />
            <div className="mx-auto mt-1 h-2.5 w-8 animate-pulse rounded bg-surface" />
          </div>
        ))}
      </div>
      <div className="mt-5 w-full space-y-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card flex items-center gap-3 p-4">
            <div className="h-11 w-11 shrink-0 animate-pulse rounded-2xl bg-surface" />
            <div className="flex-1">
              <div className="h-3.5 w-24 animate-pulse rounded bg-surface" />
              <div className="mt-1.5 h-2.5 w-40 animate-pulse rounded bg-surface" />
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
});

export default function ChallengesPage() {
  return <ChallengesContent />;
}
