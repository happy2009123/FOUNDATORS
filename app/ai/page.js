'use client';

import dynamic from 'next/dynamic';

const AIContent = dynamic(() => import('./AIContent'), {
  loading: () => (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ink px-[18px] pb-6">
      <div className="gold-card mt-3 w-full p-5">
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-surface" />
        <div className="mt-3 h-6 w-36 animate-pulse rounded-xl bg-surface" />
        <div className="mt-1 h-2.5 w-48 animate-pulse rounded bg-surface" />
      </div>
      <div className="mt-4 w-full">
        <div className="h-3.5 w-28 animate-pulse rounded bg-surface" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      </div>
      <div className="mt-5 w-full space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-surface" />
            <div className="h-16 flex-1 animate-pulse rounded-2xl bg-surface" />
          </div>
        ))}
      </div>
    </div>
  ),
});

export default function AIPage() {
  return <AIContent />;
}
