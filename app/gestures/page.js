'use client';

import dynamic from 'next/dynamic';

const GesturesContent = dynamic(() => import('./GesturesContent'), {
  loading: () => (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ink px-[18px] pb-6">
      <div className="gold-card mt-3 w-full p-5">
        <div className="h-3 w-20 animate-pulse rounded bg-surface" />
        <div className="mt-2 h-6 w-48 animate-pulse rounded-xl bg-surface" />
        <div className="mt-2 h-2.5 w-40 animate-pulse rounded bg-surface" />
      </div>
      <div className="mt-4 flex w-full gap-2.5">
        <div className="h-12 flex-1 animate-pulse rounded-2xl bg-surface" />
        <div className="h-12 w-24 animate-pulse rounded-2xl bg-surface" />
      </div>
      <div className="mt-4 grid w-full grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card overflow-hidden">
            <div className="h-[140px] animate-pulse bg-surface" />
            <div className="border-t border-linesoft px-3 py-2.5">
              <div className="h-3.5 w-24 animate-pulse rounded bg-surface" />
              <div className="mt-1 h-2.5 w-32 animate-pulse rounded bg-surface" />
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
});

export default function GesturesPage() {
  return <GesturesContent />;
}
