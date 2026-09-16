'use client';

import { useRouter } from 'next/navigation';
import SubpageHeader from '@/components/SubpageHeader';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { INTENTS } from '@/lib/data';
import AuthSkeleton from '@/components/AuthSkeleton';

export default function MatchLauncherPage() {
  const ready = useRequireAuth();
  const router = useRouter();

  if (!ready) return <AuthSkeleton />;

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <SubpageHeader title="Foundators Match" />
      <div className="page-enter no-scrollbar flex-1 overflow-y-auto px-5 py-5">
        <h1 className="mb-1.5 text-2xl font-extrabold leading-tight">
          What are you <span className="text-gold-gradient">building</span> today?
        </h1>
        <p className="mb-6 text-[13px] text-text2">
          Tell us what you need — we&apos;ll match you with the right people and opportunities.
        </p>

        <div className="stagger-children grid grid-cols-2 gap-3">
          {INTENTS.map((intent) => (
            <button
              key={intent.key}
              onClick={() => router.push(`/match/${intent.key}`)}
              className="flex flex-col items-start gap-2.5 rounded-2xl border border-linesoft bg-card p-4 text-left transition-colors active:border-gold active:bg-[rgba(217,172,61,0.06)]"
            >
              <span className="text-2xl">{intent.emoji}</span>
              <span className="text-[13px] font-bold leading-snug">{intent.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
