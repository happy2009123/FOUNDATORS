'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN → FEEDBACK
// User-submitted feedback (settings → Send feedback). Statuses:
// open → reviewing → resolved, mirroring the reports workflow.
// Reads/writes are RLS-guarded by is_admin().
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import { MessageSquare, CheckCircle2, RotateCcw, Clock } from 'lucide-react';
import { Card, PageHeader, EmptyState } from '@/components/admin/ui';
import { fetchFeedbackPage, setFeedbackStatus } from '@/lib/adminData';
import { timeAgo } from '@/lib/admin';

const TABS = [
  { key: null, label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'reviewing', label: 'Reviewing' },
  { key: 'resolved', label: 'Resolved' },
];

const CATEGORY_LABELS = { bug: 'Bug', idea: 'Idea', general: 'General' };

export default function AdminFeedbackPage() {
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const refresh = useCallback(async (status) => {
    const res = await fetchFeedbackPage(status === undefined ? tab : status);
    setRows(res.ok ? res.data : []);
    if (!res.ok) setNotice({ type: 'error', text: res.error || 'Could not load feedback.' });
  }, [tab]);

  useEffect(() => {
    refresh(tab);
  }, [refresh, tab]);

  async function handleStatus(row, status) {
    if (busy) return;
    setBusy(true);
    const res = await setFeedbackStatus(row.id, status);
    if (res.ok) {
      setNotice({ type: 'ok', text: `Marked ${status}.` });
      await refresh();
    } else {
      setNotice({ type: 'error', text: res.error || 'Update failed.' });
    }
    setBusy(false);
  }

  return (
    <div className="animate-screen-in">
      <PageHeader
        title="Feedback"
        subtitle="Bugs, ideas and general notes from the community — reply by resolving what ships."
      />

      {notice && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-[12.5px] font-bold ${
            notice.type === 'ok'
              ? 'border-brandgreen/40 bg-brandgreen/10 text-brandgreen'
              : 'border-brandred/40 bg-brandred/10 text-brandred'
          }`}
        >
          <CheckCircle2 size={15} className="flex-none" />
          {notice.text}
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.label}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3.5 py-1.5 text-[11.5px] font-bold transition-all ${
              tab === t.key
                ? 'bg-gold text-[#1a1300]'
                : 'border border-linesoft text-text3 hover:text-text2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <div className="mb-3 flex items-center gap-2 text-[13.5px] font-extrabold">
          <MessageSquare size={16} className="text-gold" /> Inbox
          {rows && (
            <span className="ml-auto rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[11px] font-extrabold text-gold-hi">
              {rows.length}
            </span>
          )}
        </div>

        {!rows && <p className="py-4 text-center text-[12px] text-text3">Loading feedback…</p>}
        {rows && rows.length === 0 && (
          <EmptyState
            icon={MessageSquare}
            title="No feedback here"
            body="When users send feedback from Settings → Send feedback, it lands in this inbox."
          />
        )}

        <div className="space-y-2">
          {(rows || []).map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-linesoft bg-white/[0.02] px-3.5 py-3"
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-gold-hi">
                  {CATEGORY_LABELS[r.category] || r.category}
                </span>
                <StatusBadge status={r.status} />
                <span className="ml-auto flex items-center gap-1 text-[10.5px] text-text3">
                  <Clock size={11} /> {r.createdAt ? timeAgo(r.createdAt) : ''}
                </span>
              </div>
              <div className="whitespace-pre-wrap text-[12.5px] text-white">{r.message}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="truncate text-[10.5px] text-text3">from {r.userId || 'unknown user'}</span>
                <div className="flex flex-none gap-2">
                  {r.status !== 'reviewing' && r.status !== 'resolved' && (
                    <button
                      onClick={() => handleStatus(r, 'reviewing')}
                      disabled={busy}
                      className="rounded-lg border border-gold/40 px-2.5 py-1 text-[10.5px] font-bold text-gold-hi transition-colors hover:bg-gold/10 disabled:opacity-50"
                    >
                      Reviewing
                    </button>
                  )}
                  {r.status !== 'resolved' ? (
                    <button
                      onClick={() => handleStatus(r, 'resolved')}
                      disabled={busy}
                      className="rounded-lg bg-brandgreen/15 px-2.5 py-1 text-[10.5px] font-bold text-brandgreen transition-colors hover:bg-brandgreen/25 disabled:opacity-50"
                    >
                      Resolve
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatus(r, 'open')}
                      disabled={busy}
                      className="flex items-center gap-1 rounded-lg border border-linesoft px-2.5 py-1 text-[10.5px] font-bold text-text2 transition-colors hover:bg-white/5 disabled:opacity-50"
                    >
                      <RotateCcw size={11} /> Reopen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'resolved') {
    return (
      <span className="rounded-full bg-brandgreen/15 px-2 py-0.5 text-[9.5px] font-extrabold text-brandgreen">
        Resolved
      </span>
    );
  }
  if (status === 'reviewing') {
    return (
      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[9.5px] font-extrabold text-gold-hi">
        Reviewing
      </span>
    );
  }
  return (
    <span className="rounded-full bg-brandred/15 px-2 py-0.5 text-[9.5px] font-extrabold text-brandred">
      Open
    </span>
  );
}
