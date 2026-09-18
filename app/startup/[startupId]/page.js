'use client';

import { useParams } from 'next/navigation';
import { Share2 } from 'lucide-react';
import SubpageHeader from '@/components/SubpageHeader';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import AuthSkeleton from '@/components/AuthSkeleton';

export default function StartupProfilePage() {
  const ready = useRequireAuth();
  const { startupId } = useParams();

  const following = useStore((s) => !!s.followedStartups[startupId]);
  const toggleFollowStartup = useStore((s) => s.toggleFollowStartup);
  const showToast = useStore((s) => s.showToast);

  if (!ready) return <AuthSkeleton />;

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <SubpageHeader title="Startup" />
      <div className="no-scrollbar flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-[18px] font-extrabold">Startup profiles coming soon</h2>
          <p className="mt-2 text-[12px] text-text2 max-w-[260px]">
            Startup profiles are being built. Check back soon to explore innovative companies and follow their journey.
          </p>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href).catch(() => {});
              showToast('Link copied');
            }}
            className="mt-6 flex items-center gap-2 rounded-full border border-gold/20 bg-[rgba(217,172,61,0.06)] px-5 py-2.5 text-[12px] font-bold text-gold"
          >
            <Share2 size={14} />
            Share this page
          </button>
        </div>
      </div>
    </div>
  );
}
