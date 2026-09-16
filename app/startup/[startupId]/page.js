'use client';

import { useParams } from 'next/navigation';
import { Share2 } from 'lucide-react';
import SubpageHeader from '@/components/SubpageHeader';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { STARTUPS } from '@/lib/data';
import AuthSkeleton from '@/components/AuthSkeleton';

export default function StartupProfilePage() {
  const ready = useRequireAuth();
  const { startupId } = useParams();
  const startup = STARTUPS[startupId];

  const following = useStore((s) => !!s.followedStartups[startupId]);
  const toggleFollowStartup = useStore((s) => s.toggleFollowStartup);
  const showToast = useStore((s) => s.showToast);

  if (!ready) return <AuthSkeleton />;
  if (!startup) {
    return (
      <div className="app-shell flex min-h-0 flex-1 flex-col">
        <SubpageHeader title="Startup" />
        <div className="flex flex-1 items-center justify-center text-sm text-text2">Startup not found.</div>
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <SubpageHeader title="Startup" />
      <div className="no-scrollbar flex-1 overflow-y-auto">
        <div className="h-[104px] flex-none bg-[radial-gradient(circle_at_85%_15%,rgba(247,221,143,0.35),transparent_55%),linear-gradient(120deg,rgba(184,134,11,0.35),rgba(0,0,0,0.95)_75%)]" />
        <div className="-mt-[42px] px-5">
          <div className="flex justify-end gap-2.5 pt-3.5">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href).catch(() => {});
                showToast('Startup link copied');
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-gold"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={() => toggleFollowStartup(startupId)}
              className={`rounded-full border-[1.3px] px-[18px] py-2 text-[12.5px] font-bold ${
                following ? 'border-transparent bg-gold-grad text-[#1a1300]' : 'border-gold text-gold-hi'
              }`}
            >
              {following ? 'Following' : 'Follow'}
            </button>
          </div>

          <div
            className="-mt-10 flex h-[82px] w-[82px] items-center justify-center rounded-[22px] text-[34px] font-extrabold text-white"
            style={{ background: startup.logoBg, border: startup.logoBorder }}
          >
            {startup.logoText}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[19px] font-extrabold">
            {startup.name}
            <VerifiedBadge size={18} />
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={{ background: startup.tagBg, color: startup.tagColor }}
            >
              {startup.tag}
            </span>
          </div>
          <p className="mt-2.5 text-[13px] leading-relaxed text-text2">{startup.desc}</p>

          <div className="mt-4 flex border-y border-linesoft">
            <Stat n={startup.stage} l="Stage" />
            <Stat n={startup.category} l="Category" border />
            <Stat n={startup.followers} l="Followers" border />
          </div>
          <div className="mt-3 text-center text-xs text-text2">{startup.location}</div>
        </div>
      </div>
    </div>
  );
}

function Stat({ n, l, border }) {
  return (
    <div className={`flex-1 py-3.5 text-center ${border ? 'border-l border-linesoft' : ''}`}>
      <div className="text-base font-extrabold">{n}</div>
      <div className="mt-0.5 text-[10.5px] text-text2">{l}</div>
    </div>
  );
}
