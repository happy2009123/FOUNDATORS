'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN — Danger zone
// Replaces the old unauthenticated /admin/clear "wipe everything"
// tool, which any signed-in user could reach. Bulk deletion of
// production data is gone on purpose; the remaining action is
// bounded (resolved reports only), typed-confirmation gated, and
// written to the audit log. Firestore rules independently require
// admin rights for every delete.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { AlertOctagon, Trash2 } from 'lucide-react';
import { collection, query, where, limit, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useStore } from '@/lib/store';
import { recordAdminAction } from '@/lib/adminData';
import { Card, SectionTitle, ConfirmDialog } from '@/components/admin/ui';

export default function AdminDangerZone({ onChanged }) {
  const showToast = useStore((s) => s.showToast);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function purgeResolved() {
    setBusy(true);
    try {
      let removed = 0;
      for (;;) {
        const q = query(collection(db, 'reports'), where('status', '==', 'resolved'), limit(300));
        const snap = await getDocs(q);
        if (snap.empty) break;
        const batch = writeBatch(db);
        snap.docs.forEach((d) => { batch.delete(d.ref); removed += 1; });
        await batch.commit();
        if (snap.docs.length < 300) break;
      }
      await recordAdminAction('reports_purged', null, `Removed ${removed} resolved reports`);
      showToast(`Purged ${removed} resolved report${removed === 1 ? '' : 's'}`);
      onChanged?.();
    } catch (e) {
      showToast(`Failed: ${e?.message || 'permission denied'}`);
    }
    setBusy(false);
    setOpen(false);
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
              Permanently deletes reports already marked <b className="text-text2">Resolved</b> from the moderation
              queue. Pending and reviewing reports are untouched. Requires typing the confirmation phrase.
            </p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-text3">
              The former “delete all data” tool was removed — wiping production data is not an admin console feature.
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-brandred/40 px-4 py-2.5 text-[12.5px] font-extrabold text-brandred transition-colors hover:bg-brandred/10"
        >
          <Trash2 size={14} /> Purge
        </button>
      </div>

      <ConfirmDialog
        open={open}
        title="Purge resolved reports"
        body="This permanently deletes every report with status “Resolved”. It cannot be undone."
        confirmLabel="Purge"
        danger
        busy={busy}
        requireText="PURGE"
        onConfirm={purgeResolved}
        onCancel={() => setOpen(false)}
      />
    </Card>
  );
}
