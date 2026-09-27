'use client';

// ─────────────────────────────────────────────────────────────
// /admin/clear — RETIRED
// ─────────────────────────────────────────────────────────────
// This route used to expose a "delete ALL Firestore data" button
// to any signed-in user (no admin check anywhere). It is now an
// admin-only stub that explains the removal and points to the
// bounded Danger Zone in Settings. Authorization happens in two
// places: this layout is wrapped by AdminGuard, and Firestore
// rules independently refuse non-admin deletes.
// ─────────────────────────────────────────────────────────────

import { useRouter } from 'next/navigation';
import { ShieldOff, ArrowRight } from 'lucide-react';
import { Card, PageHeader, EmptyState } from '@/components/admin/ui';

export default function AdminClearPage() {
  const router = useRouter();
  return (
    <div className="animate-screen-in">
      <PageHeader title="Bulk Data Tools" subtitle="Legacy route — destructive bulk deletion was retired." />
      <Card>
        <EmptyState
          icon={ShieldOff}
          title="Bulk wipe removed"
          body="The old tool let any signed-in account delete every user, post, and chat. Production data is no longer wipeable from the app. Bounded admin cleanup (purging resolved reports) lives in Settings → Danger Zone."
          actionLabel="Go to Danger Zone"
          onAction={() => router.push('/admin/settings')}
        />
      </Card>
    </div>
  );
}
