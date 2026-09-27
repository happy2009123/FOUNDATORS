'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN → MODERATION QUEUE
// Action-oriented view of open reports grouped by target type
// (users / posts / comments / messages / spam). Same Firestore
// reports collection — decisions write admin-only fields and are
// audited. Every destructive action passes a confirmation dialog.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, Eye, CheckCircle2, ShieldOff, Flag,
  MessageSquare, FileText, Users as UsersIcon, AlertOctagon, RotateCw,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { fetchReports, updateReport, resolveUsers, setUserStatus } from '@/lib/adminData';
import { timeAgo } from '@/lib/admin';
import {
  Card, PageHeader, SectionTitle, EmptyState, ErrorState, Badge,
  ConfirmDialog, FilterChips,
} from '@/components/admin/ui';

const GROUPS = [
  { key: 'user', label: 'Reported Users', icon: UsersIcon, match: (r) => cat(r) === 'user' },
  { key: 'post', label: 'Reported Posts', icon: FileText, match: (r) => cat(r) === 'post' },
  { key: 'comment', label: 'Reported Comments', icon: MessageSquare, match: (r) => cat(r) === 'comment' },
  { key: 'spam', label: 'Spam Reports', icon: AlertOctagon, match: (r) => isSpam(r) },
  { key: 'other', label: 'Other', icon: Flag, match: (r) => cat(r) === 'other' || cat(r) === 'message' || cat(r) === 'project' },
];

function cat(r) {
  if (r.targetType) return r.targetType;
  return r.reportedId ? 'user' : 'other';
}
function isSpam(r) {
  return /spam/i.test(r.reason || '') || /spam/i.test(r.details || '');
}

export default function AdminModerationPage() {
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);

  const [open, setOpen] = useState(null); // open (unresolved) reports
  const [error, setError] = useState(null);
  const [people, setPeople] = useState({});
  const [filter, setFilter] = useState('all');
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetchReports(100);
    if (!res.ok) { setError(res.error); setOpen([]); return; }
    const rows = res.data.filter((r) => (r.status || 'pending') !== 'resolved');
    setOpen(rows);
    const ids = rows.flatMap((r) => [r.reporterId, r.reportedId]).filter(Boolean);
    resolveUsers(ids).then(setPeople);
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    if (!open) return [];
    // Spam reports also appear under Spam; exclude them from "other".
    return open.filter((r) => {
      if (filter === 'spam') return isSpam(r);
      if (filter !== 'all' && cat(r) !== filter) return false;
      if (filter === 'all') return true;
      return true;
    });
  }, [open, filter]);

  const counts = useMemo(() => {
    const c = { all: open?.length || 0, spam: 0, user: 0, post: 0, comment: 0 };
    (open || []).forEach((r) => {
      if (isSpam(r)) c.spam += 1;
      const k = cat(r);
      if (k in c) c[k] += 1;
    });
    return c;
  }, [open]);

  async function runAction() {
    if (!dialog) return;
    const { kind, report } = dialog;
    setBusy(true);
    let res;
    if (kind === 'review') res = await updateReport(report.id, { status: 'reviewing' }, 'Moderation: review started');
    else if (kind === 'resolve') res = await updateReport(report.id, { status: 'resolved', resolution: 'dismissed' }, 'Moderation: dismissed');
    else if (kind === 'restrict') res = await setUserStatus(report.reportedId, 'restricted', `report ${report.id}`);
    setBusy(false);
    setDialog(null);
    if (res?.ok) {
      showToast(kind === 'review' ? 'Review started' : kind === 'resolve' ? 'Report dismissed' : 'User restricted');
      load();
    } else {
      showToast(`Failed: ${res?.error || 'permission denied'}`);
    }
  }

  const chips = [
    { value: 'all', label: 'All open', count: counts.all },
    { value: 'user', label: 'Users', count: counts.user },
    { value: 'post', label: 'Posts', count: counts.post },
    { value: 'comment', label: 'Comments', count: counts.comment },
    { value: 'spam', label: 'Spam', count: counts.spam },
  ];

  return (
    <div className="animate-screen-in">
      <PageHeader
        title="Moderation Queue"
        subtitle="Open reports waiting on a decision."
        actions={
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[12px] font-bold text-text2 transition-colors hover:border-gold/40 hover:text-gold-hi">
            <RotateCw size={13} /> Refresh
          </button>
        }
      />

      <Card className="p-4">
        <FilterChips options={chips} value={filter} onChange={setFilter} />
      </Card>

      <div className="mt-4">
        {!open ? (
          <Card className="p-6"><ErrorState onRetry={load} /></Card>
        ) : error ? (
          <Card className="p-6"><ErrorState message={error} onRetry={load} /></Card>
        ) : visible.length === 0 ? (
          <Card>
            <EmptyState
              icon={ShieldCheck}
              title={counts.all === 0 ? 'Queue is clear' : 'Nothing in this group'}
              body={counts.all === 0
                ? 'No open reports. Everything has been handled — new reports will appear here instantly.'
                : 'Switch filters to see other open reports.'}
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {GROUPS.filter((g) => g.key !== 'spam').map((g) => {
              const items = visible.filter(g.match);
              if (!items.length) return null;
              const Icon = g.icon;
              return (
                <div key={g.key}>
                  <SectionTitle title={`${g.label} (${items.length})`} />
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {items.map((r) => (
                      <ReportCard
                        key={r.id}
                        report={r}
                        people={people}
                        onReview={() => setDialog({ kind: 'review', report: r })}
                        onDismiss={() => setDialog({ kind: 'resolve', report: r })}
                        onRestrict={r.reportedId ? () => setDialog({ kind: 'restrict', report: r }) : null}
                        onView={() => r.reportedId && router.push(`/profile/${r.reportedId}`)}
                        icon={Icon}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!dialog}
        title={dialog?.kind === 'review' ? 'Start review' : dialog?.kind === 'resolve' ? 'Dismiss report' : 'Restrict user'}
        body={
          dialog?.kind === 'review'
            ? 'This report moves to Reviewing so other admins know it is being handled.'
            : dialog?.kind === 'resolve'
            ? 'Dismiss this report and close it as resolved. This cannot be undone, but a new report can always be filed.'
            : `Restrict ${people[dialog?.report?.reportedId]?.name || 'this user'}? Reversible from the Users page.`
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

function ReportCard({ report: r, people, onReview, onDismiss, onRestrict, onView, icon: Icon }) {
  const reporter = people[r.reporterId];
  const reported = people[r.reportedId];
  const st = r.status || 'pending';
  const btn = 'inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[11.5px] font-bold transition-colors';
  return (
    <Card className="p-4 transition-colors hover:border-[rgba(212,175,55,0.25)]">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-brandred/30 bg-brandred/10 text-brandred">
          <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-bold">{r.reason || 'No reason given'}</span>
            <Badge tone={st === 'pending' ? 'red' : 'blue'}>{st}</Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-text2">
            {r.details || 'No additional details provided.'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-text3">
            <span>By <b className="font-semibold text-text2">{reporter?.name || '—'}</b></span>
            {reported && <span>About <b className="font-semibold text-text2">{reported.name}</b></span>}
            <span>{timeAgo(r.createdAt)}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {onView && (
          <button onClick={onView} className={`${btn} border-white/10 text-text2 hover:border-gold/40 hover:text-gold-hi`}>
            <Eye size={13} /> View
          </button>
        )}
        {st === 'pending' && (
          <button onClick={onReview} className={`${btn} border-brandblue/40 text-brandblue hover:bg-brandblue/10`}>
            <ShieldCheck size={13} /> Review
          </button>
        )}
        <button onClick={onDismiss} className={`${btn} border-brandgreen/40 text-brandgreen hover:bg-brandgreen/10`}>
          <CheckCircle2 size={13} /> Dismiss
        </button>
        {onRestrict && (
          <button onClick={onRestrict} className={`${btn} border-brandred/30 text-brandred hover:bg-brandred/10`}>
            <ShieldOff size={13} /> Restrict
          </button>
        )}
      </div>
    </Card>
  );
}
