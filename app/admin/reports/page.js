'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN → REPORTS
// Full triage list with category + status filters. Status
// transitions (Pending → Reviewing → Resolved) and user
// restrictions are admin-only writes verified by Firestore rules.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, Eye, CheckCircle2, ShieldOff, Inbox, RotateCw } from 'lucide-react';
import { useStore } from '@/lib/store';
import { fetchReports, updateReport, resolveUsers, setUserStatus } from '@/lib/adminData';
import { timeAgo } from '@/lib/admin';
import {
  Card, PageHeader, FilterChips, SearchField, TableSkeleton, EmptyState,
  ErrorState, Pagination, ConfirmDialog, Badge,
} from '@/components/admin/ui';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'post', label: 'Posts' },
  { value: 'user', label: 'Users' },
  { value: 'comment', label: 'Comments' },
  { value: 'message', label: 'Messages' },
  { value: 'project', label: 'Projects' },
];

const STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'resolved', label: 'Resolved' },
];

const PAGE_SIZE = 8;

function categoryOf(r) {
  if (r.targetType) return r.targetType;
  return r.reportedId ? 'user' : 'other';
}

export default function AdminReportsPage() {
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);

  const [all, setAll] = useState(null);
  const [error, setError] = useState(null);
  const [people, setPeople] = useState({});
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(null); // { kind, report }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetchReports(100);
    if (!res.ok) {
      setError(res.error);
      setAll([]);
      return;
    }
    setAll(res.data);
    const ids = res.data.flatMap((r) => [r.reporterId, r.reportedId]).filter(Boolean);
    resolveUsers(ids).then(setPeople);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!all) return [];
    const q = search.trim().toLowerCase();
    return all.filter((r) => {
      if (category !== 'all' && categoryOf(r) !== category) return false;
      if (status !== 'all' && (r.status || 'pending') !== status) return false;
      if (q) {
        const hay = [
          r.id, r.reason, r.details,
          people[r.reporterId]?.name, people[r.reporterId]?.handle,
          people[r.reportedId]?.name, people[r.reportedId]?.handle,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, category, status, search, people]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageRows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [category, status, search]);

  async function runAction() {
    if (!dialog) return;
    const { kind, report } = dialog;
    setBusy(true);
    let res;
    if (kind === 'review') res = await updateReport(report.id, { status: 'reviewing' }, 'Report → reviewing');
    else if (kind === 'resolve') res = await updateReport(report.id, { status: 'resolved', resolution: 'dismissed' }, 'Report dismissed');
    else if (kind === 'restrict') res = await setUserStatus(report.reportedId, 'restricted', `report ${report.id}`);
    setBusy(false);
    setDialog(null);
    if (res?.ok) {
      showToast(kind === 'review' ? 'Marked as reviewing' : kind === 'resolve' ? 'Report dismissed' : 'Reported user restricted');
      load();
    } else {
      showToast(`Failed: ${res?.error || 'permission denied'}`);
    }
  }

  const counts = useMemo(() => {
    const base = all || [];
    const byStatus = (s) => base.filter((r) => (r.status || 'pending') === s).length;
    return { pending: byStatus('pending'), reviewing: byStatus('reviewing'), resolved: byStatus('resolved') };
  }, [all]);

  return (
    <div className="animate-screen-in">
      <PageHeader
        title="Reports"
        subtitle="Review user-submitted reports across the platform."
        actions={
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[12px] font-bold text-text2 transition-colors hover:border-gold/40 hover:text-gold-hi">
            <RotateCw size={13} /> Refresh
          </button>
        }
      />

      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <FilterChips options={CATEGORIES} value={category} onChange={setCategory} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <FilterChips
              value={status}
              onChange={setStatus}
              options={STATUSES.map((s) => ({
                ...s,
                count: s.value === 'all' ? all?.length : counts[s.value],
              }))}
            />
            <SearchField value={search} onChange={setSearch} placeholder="Search reports…" className="sm:max-w-[260px]" />
          </div>
        </div>
      </Card>

      <Card className="mt-4 overflow-hidden">
        {!all ? (
          <TableSkeleton rows={5} cols={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : pageRows.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={all.length === 0 ? 'No reports yet' : 'Nothing matches these filters'}
            body={all.length === 0 ? 'Filed reports land here for review. The queue is empty — good sign.' : 'Adjust the category, status, or search.'}
          />
        ) : (
          <>
            {pageRows.map((r) => {
              const reporter = people[r.reporterId];
              const reported = people[r.reportedId];
              const st = r.status || 'pending';
              return (
                <div key={r.id} className="border-b border-white/5 px-5 py-4 last:border-0 hover:bg-white/[0.03]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Flag size={13} className={st === 'pending' ? 'text-brandred' : 'text-text3'} />
                        <span className="text-[11px] font-black uppercase tracking-[0.1em] text-text3">
                          {r.id.slice(0, 14)}…
                        </span>
                        <Badge tone="gold">{categoryOf(r)}</Badge>
                        <Badge tone={st === 'pending' ? 'red' : st === 'reviewing' ? 'blue' : 'green'}>{st}</Badge>
                        <span className="text-[11.5px] text-text3">{timeAgo(r.createdAt)}</span>
                      </div>
                      <div className="mt-2 text-[13.5px] font-bold">{r.reason || 'No reason given'}</div>
                      {r.details && <p className="mt-0.5 text-[12.5px] leading-relaxed text-text2">{r.details}</p>}
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-text3">
                        <span className="inline-flex items-center gap-1.5">
                          Reporter:
                          <b className="font-semibold text-text2">{reporter ? reporter.name : r.reporterId ? 'loading…' : '—'}</b>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          Reported:
                          {reported ? (
                            <b className="font-semibold text-text2">{reported.name} ({reported.handle})</b>
                          ) : r.reportedId ? (
                            <b className="font-semibold text-text2">loading…</b>
                          ) : (
                            <b className="font-semibold text-text2">content only</b>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-none flex-wrap gap-1.5">
                      {reported && (
                        <button
                          onClick={() => router.push(`/profile/${reported.id}`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[11.5px] font-bold text-text2 hover:border-gold/40 hover:text-gold-hi"
                        >
                          <Eye size={13} /> View
                        </button>
                      )}
                      {st === 'pending' && (
                        <button
                          onClick={() => setDialog({ kind: 'review', report: r })}
                          className="inline-flex items-center gap-1 rounded-lg border border-brandblue/40 px-3 py-1.5 text-[11.5px] font-bold text-brandblue hover:bg-brandblue/10"
                        >
                          Review
                        </button>
                      )}
                      {st !== 'resolved' && (
                        <>
                          <button
                            onClick={() => setDialog({ kind: 'resolve', report: r })}
                            className="inline-flex items-center gap-1 rounded-lg border border-brandgreen/40 px-3 py-1.5 text-[11.5px] font-bold text-brandgreen hover:bg-brandgreen/10"
                          >
                            <CheckCircle2 size={13} /> Dismiss
                          </button>
                          {reported && (
                            <button
                              onClick={() => setDialog({ kind: 'restrict', report: r })}
                              className="inline-flex items-center gap-1 rounded-lg border border-brandred/30 px-3 py-1.5 text-[11.5px] font-bold text-brandred hover:bg-brandred/10"
                            >
                              <ShieldOff size={13} /> Restrict
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="px-5 pb-4">
              <Pagination
                hasPrev={current > 1}
                hasNext={current < totalPages}
                onPrev={() => setPage(current - 1)}
                onNext={() => setPage(current + 1)}
                label={`${filtered.length} report${filtered.length === 1 ? '' : 's'} · page ${current} of ${totalPages}`}
              />
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!dialog}
        title={
          dialog?.kind === 'review' ? 'Start review'
          : dialog?.kind === 'resolve' ? 'Dismiss report'
          : 'Restrict user'
        }
        body={
          dialog?.kind === 'review'
            ? 'Move this report into the Reviewing state so other moderators know it is being handled.'
            : dialog?.kind === 'resolve'
            ? 'Mark this report as resolved and dismiss it. The reporter is not notified of outcomes.'
            : dialog?.report?.reportedId
            ? `Restrict ${people[dialog.report.reportedId]?.name || 'this user'}? Their account stays online but is flagged for moderation. Reversible from the Users page.`
            : 'No specific account was reported for this item.'
        }
        confirmLabel={dialog?.kind === 'review' ? 'Start review' : dialog?.kind === 'resolve' ? 'Dismiss' : 'Restrict'}
        danger={dialog?.kind === 'restrict'}
        busy={busy}
        onConfirm={runAction}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
