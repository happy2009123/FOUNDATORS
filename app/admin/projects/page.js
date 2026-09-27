'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN → PROJECTS
// There is no projects collection in the backend yet — the app's
// Projects tab is still an empty state. Per the data policy this
// page reports that honestly instead of inventing statistics,
// and routes admins to the collaboration listings that DO exist.
// ─────────────────────────────────────────────────────────────

import { useRouter } from 'next/navigation';
import { FolderKanban, ArrowRight, Hammer } from 'lucide-react';
import { Card, PageHeader, EmptyState } from '@/components/admin/ui';

export default function AdminProjectsPage() {
  const router = useRouter();
  return (
    <div className="animate-screen-in">
      <PageHeader title="Projects" subtitle="Monitor platform projects and builds." />
      <Card>
        <EmptyState
          icon={FolderKanban}
          title="No data available yet"
          body="Projects don't have a backend collection yet — nothing exists to monitor, and no numbers are shown until real project data does."
          actionLabel="Open collaboration listings"
          onAction={() => router.push('/admin/build-with-me')}
        />
      </Card>
      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
              <Hammer size={17} />
            </span>
            <div>
              <div className="text-[13.5px] font-extrabold">Build With Me listings exist today</div>
              <div className="text-[12px] text-text3">Co-founder &amp; collaboration posts are live content you can moderate now.</div>
            </div>
          </div>
          <button
            onClick={() => router.push('/admin/build-with-me')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 px-4 py-2 text-[12.5px] font-bold text-gold-hi transition-colors hover:bg-gold/10"
          >
            Review listings <ArrowRight size={14} />
          </button>
        </div>
      </Card>
    </div>
  );
}
