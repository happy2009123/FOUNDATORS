'use client';

import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import VerifiedBadge from './VerifiedBadge';

export default function StartupRow({ startup }) {
  const router = useRouter();
  const { vibrate } = useHaptics();
  const following = useStore((s) => !!s.followedStartups[startup.key]);
  const toggleFollowStartup = useStore((s) => s.toggleFollowStartup);

  return (
    <div
      onClick={() => { vibrate('light'); router.push(`/startup/${startup.key}`); }}
      className="flex cursor-pointer gap-3 border-b border-linesoft py-3.5"
    >
      <div
        className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-xl font-display text-base font-extrabold text-white"
        style={{ background: startup.logoBg, border: startup.logoBorder }}
      >
        {startup.logoText}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
          {startup.name}
          <VerifiedBadge />
          <span
            className="rounded-full px-[7px] py-0.5 text-[10px] font-bold"
            style={{ background: startup.tagBg, color: startup.tagColor }}
          >
            {startup.tag}
          </span>
        </div>
        <div className="my-1 text-xs leading-snug text-text2">{startup.desc}</div>
        <div className="mb-1.5 text-[11px] text-text3">
          {startup.stage} · {startup.category} · {startup.location}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-[10.5px] text-text3">{startup.followers} followers</div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              vibrate('light');
              toggleFollowStartup(startup.key);
            }}
            aria-label={following ? `Unfollow ${startup.name}` : `Follow ${startup.name}`}
            aria-pressed={following}
            className={`flex-none rounded-full border-[1.3px] px-3.5 py-2 text-[11.5px] font-bold ${
              following ? 'border-transparent bg-gold-grad text-[#1a1300]' : 'border-gold text-gold-hi'
            }`}
          >
            {following ? 'Following' : 'Follow'}
          </button>
        </div>
      </div>
    </div>
  );
}
