'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN → COMMUNITIES
// The platform has no communities collection yet. Instead of
// faking "total communities" numbers, this page shows real
// community-adjacent content counts (ideas, events, challenges,
// reels) and an honest empty state for community management.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Lightbulb, CalendarDays, Swords, Film, ArrowRight } from 'lucide-react';
import { fetchContentCounts } from '@/lib/adminData';
import { formatNum } from '@/lib/admin';
import { Card, PageHeader, EmptyState, ErrorState, StatCard } from '@/components/admin/ui';

export default function AdminCommunitiesPage() {
  const router = useRouter();
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    fetchContentCounts().then((r) => (r.ok ? setCounts(r.data) : setError(r.error)));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="animate-screen-in">
      <PageHeader title="Communities" subtitle="Community health and shared spaces." />

      {error ? (
        <Card className="p-4"><ErrorState message={error} onRetry={load} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Globe} label="Total Communities" loading={!counts && !error} value={counts ? '—' : '—'} caption="no data available yet" />
          <StatCard icon={Lightbulb} label="Ideas Shared" loading={!counts && !error} value={counts ? formatNum(counts.ideas) : '—'} caption="community submissions" />
          <StatCard icon={CalendarDays} label="Events Hosted" loading={!counts && !error} value={counts ? formatNum(counts.events) : '—'} caption="community events" />
          <StatCard icon={Swords} label="Challenges" loading={!counts && !error} value={counts ? formatNum(counts.challenges) : '—'} caption="active challenges" />
        </div>
      )}

      <Card className="mt-4">
        <EmptyState
          icon={Globe}
          title="No data available yet"
          body="Communities don't exist as a backend feature yet — this table will populate with a real management surface (create, review, restrict) once they ship. Nothing is invented here in the meantime."
        />
      </Card>

      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
              <Film size={17} />
            </span>
            <div>
              <div className="text-[13.5px] font-extrabold">Community content that exists today</div>
              <div className="text-[12px] text-text3">Ideas, events, challenges, and reels are live — moderate them from the app routes.</div>
            </div>
          </div>
          <button
            onClick={() => router.push('/admin/posts')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 px-4 py-2 text-[12.5px] font-bold text-gold-hi transition-colors hover:bg-gold/10"
          >
            Moderate posts <ArrowRight size={14} />
          </button>
        </div>
      </Card>
    </div>
  );
}
