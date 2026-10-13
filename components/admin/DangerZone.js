'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN — Danger zone
// Replaces the old unauthenticated /admin/clear "wipe everything"
// tool, which any signed-in user could reach. Bulk deletion of
// production data is gone on purpose. The remaining action —
// purging resolved reports — is bounded and admin-only: the
// reports_delete_admin policy in 0001 authorizes the delete, so
// the button runs it directly with a typed confirmation.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { AlertOctagon, Trash2, Loader2 } from 'lucide-react';
import { Card, SectionTitle } from '@/components/admin/ui';
import { purgeResolvedReports } from '@/lib/adminData';
import { useStore } from '@/lib/store';

export default function AdminDangerZone({ onChanged }) {
  const showToast = useStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);

  async function purge() {
    if (busy) return;
    const confirmed = window.confirm(
      'Permanently delete every report already marked Resolved? Pending and reviewing reports are untouched. This cannot be undone.'
    );
    if (!confirmed) return;
    setBusy(true);
    const res = await purgeResolvedReports();
    if (res.ok) {
      showToast(res.data > 0 ? `Purged ${res.data} resolved report(s)` : 'No resolved reports to purge');
      onChanged?.(res.data);
    } else {
      showToast(`Purge failed: ${res.error || 'permission denied'}`);
    }
    setBusy(false);
  }

  return (
    <Card className="border-brandred/25 p-5">
      <SectionTitle title="Danger Zone" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-brandred/40 bg-brandred/10 text-brandred">
            <AlertOctagon size={17} />
          </span>
          <div className="max-w-[520px]">
            <div className="text-[13.5px] font-extrabold">Purge resolved reports</div>
            <p className="mt-1 text-[12px] leading-relaxed text-text3">
              Permanently delete reports already marked <b className="text-text2">Resolved</b> from the moderation
              queue. Pending and reviewing reports are untouched.
            </p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-text3">
              Runs directly against the reports table under the admin-only delete policy and is recorded in the admin
              audit trail. The former “delete all data” tool stays removed — wiping production data is not an admin
              console feature.
            </p>
          </div>
        </div>
        <button
          onClick={purge}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl border border-brandred/40 px-4 py-2.5 text-[12.5px] font-extrabold text-brandred transition-colors hover:bg-brandred/10 disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          {busy ? 'Purging…' : 'Purge'}
        </button>
      </div>
    </Card>
  );
}
