'use client';

import { useRouter } from 'next/navigation';
import SubpageHeader from '@/components/SubpageHeader';
import { useRequireAuth } from '@/lib/useRequireAuth';
import AuthSkeleton from '@/components/AuthSkeleton';

const INTENTS = [
  { key: 'start_business', label: 'Start a business', emoji: '💡', mode: 'team' },
  { key: 'find_programmer', label: 'Find a programmer', emoji: '👨‍💻', mode: 'people', skills: ['Development', 'AI', 'SaaS'] },
  { key: 'find_cofounder', label: 'Find a co-founder', emoji: '🤝', mode: 'people', skills: ['Startups', 'Product', 'Operations'] },
  { key: 'find_job', label: 'Find a job', emoji: '💼', mode: 'opportunities', oppType: 'job' },
  { key: 'find_funding', label: 'Find funding', emoji: '💰', mode: 'opportunities', oppType: 'funding' },
  { key: 'learn_skill', label: 'Learn a skill', emoji: '🎓', mode: 'people', skills: ['Design', 'Development', 'Marketing', 'AI'] },
  { key: 'find_mentor', label: 'Find a mentor', emoji: '🧑‍🏫', mode: 'people', skills: ['Investing', 'Strategy', 'Operations'] },
  { key: 'join_project', label: 'Join a project', emoji: '🚀', mode: 'opportunities', oppType: 'project' },
  { key: 'hire_someone', label: 'Hire someone', emoji: '🛠️', mode: 'people', skills: ['Development', 'Design', 'Marketing'] },
  { key: 'network_locally', label: 'Network locally', emoji: '🌎', mode: 'local' },
];

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
