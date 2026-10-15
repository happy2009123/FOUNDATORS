'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN → PROJECTS
// The projects backend is live (0001 tables: projects, tasks,
// applications, members — the app's Projects tab reads/writes
// them via lib/copilot). This page surfaces real platform-wide
// counts and the newest projects for moderation.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FolderKanban, ArrowRight, Hammer, ListChecks, Inbox, UserPlus } from 'lucide-react';
import { Card, PageHeader, EmptyState } from '@/components/admin/ui';
import { fetchProjectStats, fetchRecentProjects } from '@/lib/adminData';
import { timeAgo } from '@/lib/admin';

export default function AdminProjectsPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([fetchProjectStats(), fetchRecentProjects()]).then(([s, r]) => {
      if (s.ok) setStats(s.data);
      else setError(s.error || 'Could not load project stats.');
      if (r.ok) setRows(r.data);
      else setRows([]);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="animate-screen-in">
      <PageHeader title="Projects" subtitle="Platform projects, tasks and applications — live counts." />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-brandred/40 bg-brandred/10 px-4 py-3 text-[12.5px] font-bold text-brandred">
          {error}
          <button onClick={load} className="ml-auto rounded-lg border border-brandred/40 px-2.5 py-1 text-[11px] font-bold">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon={FolderKanban} label="Projects" value={stats?.projects} />
        <StatCard icon={ListChecks} label="Tasks" value={stats?.tasks} />
        <StatCard icon={Inbox} label="Applications" value={stats?.applications} />
        <StatCard icon={UserPlus} label="Members" value={stats?.members} />
      </div>

      <Card className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13.5px] font-extrabold">
            <FolderKanban size={16} className="text-gold" /> Newest projects
          </div>
          <button
            onClick={() => router.push('/projects')}
            className="inline-flex items-center gap-1 text-[11.5px] font-bold text-gold-hi hover:underline"
          >
            Open in app <ArrowRight size={12} />
          </button>
        </div>

        {rows === null && <p className="py-4 text-center text-[12px] text-text3">Loading projects…</p>}
        {rows && rows.length === 0 && (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            body="Once founders create projects from the Projects tab, they appear here for moderation."
          />
        )}
        <div className="space-y-2">
          {(rows || []).map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/projects/${p.id}`)}
              className="flex w-full items-center gap-3 rounded-xl border border-linesoft bg-white/[0.02] px-3.5 py-3 text-left transition-colors hover:bg-white/[0.04]"
            >
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold">
                <FolderKanban size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold">{p.title || 'Untitled project'}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10.5px] text-text3">
                  <span className="rounded-full border border-linesoft px-1.5 py-px capitalize">{p.stage || 'idea'}</span>
                  <span className={`rounded-full px-1.5 py-px ${p.status === 'open' ? 'bg-brandgreen/15 text-brandgreen' : 'bg-white/10 text-text2'}`}>
                    {p.status || 'open'}
                  </span>
                  {p.createdAt ? timeAgo(p.createdAt) : ''}
                </div>
              </div>
              <span className="flex-none text-[10.5px] text-text3">{p.ownerId ? 'View' : ''}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
              <Hammer size={17} />
            </span>
            <div>
              <div className="text-[13.5px] font-extrabold">Build With Me listings</div>
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

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card className="p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
        <Icon size={16} />
      </div>
      <div className="mt-3 font-display text-[26px] font-black leading-none text-white">
        {value === undefined || value === null ? '—' : value.toLocaleString()}
      </div>
      <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-text3">{label}</div>
    </Card>
  );
}
