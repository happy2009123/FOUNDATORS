'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN — Danger zone
// Replaces the old unauthenticated /admin/clear "wipe everything"
// tool, which any signed-in user could reach. Bulk deletion of
// production data is gone on purpose. The remaining action
// (purging resolved reports) has no client-side permission in
// Supabase — reports are admin-readable but not admin-deletable —
// and no service-role admin API route exists yet, so the button is
// rendered disabled with an honest explanation instead of failing
// silently or pretending to work.
// ─────────────────────────────────────────────────────────────

import { AlertOctagon, Trash2 } from 'lucide-react';
import { Card, SectionTitle } from '@/components/admin/ui';

export default function AdminDangerZone({ onChanged }) {
  void onChanged;

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
              Would permanently delete reports already marked <b className="text-text2">Resolved</b> from the moderation
              queue. Pending and reviewing reports are untouched.
            </p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-text3">
              Unavailable from the browser: Supabase row-level security exposes reports to admins as read-only, and
              destructive admin operations run via the Supabase dashboard (Table editor → reports) until a service-role
              admin API route exists. The former “delete all data” tool stays removed — wiping production data is not an
              admin console feature.
            </p>
          </div>
        </div>
        <button
          disabled
          aria-disabled="true"
          title="Destructive admin operations run via the Supabase dashboard"
          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl border border-brandred/40 px-4 py-2.5 text-[12.5px] font-extrabold text-brandred opacity-50"
        >
          <Trash2 size={14} /> Purge
        </button>
      </div>
    </Card>
  );
}
