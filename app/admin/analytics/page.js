'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN → ANALYTICS
// Aggregated platform telemetry: growth curve, period metrics,
// and the real event stream (post_created / post_liked /
// comment_created / user_followed …) recorded by the app.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Activity, UserPlus, FileText, Radio, BarChart3, RotateCw, Heart, MessageSquare, UserCheck,
} from 'lucide-react';
import { fetchGrowthSeries, fetchPeriodMetrics, fetchEventLog } from '@/lib/adminData';
import { timeAgo, formatNum } from '@/lib/admin';
import {
  Card, PageHeader, SectionTitle, StatCard, LineChart, FilterChips,
  EmptyState, ErrorState, TableSkeleton, Badge,
} from '@/components/admin/ui';

const PERIODS = [
  { value: '7D', label: '7D' },
  { value: '30D', label: '30D' },
  { value: '90D', label: '90D' },
  { value: '1Y', label: '1Y' },
];

const EVENT_META = {
  post_created: { label: 'Posts created', icon: FileText },
  post_liked: { label: 'Likes', icon: Heart },
  comment_created: { label: 'Comments', icon: MessageSquare },
  user_followed: { label: 'Follows', icon: UserCheck },
};

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState('30D');
  const [growth, setGrowth] = useState(null);
  const [growthErr, setGrowthErr] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [log, setLog] = useState(null);
  const [logErr, setLogErr] = useState(null);

  const loadGrowth = useCallback((p) => {
    setGrowthErr(null);
    setGrowth(null);
    fetchGrowthSeries(p).then((r) => (r.ok ? setGrowth(r.data) : setGrowthErr(r.error)));
    fetchPeriodMetrics(p).then((r) => { if (r.ok) setMetrics(r.data); });
  }, []);

  const loadLog = useCallback(() => {
    setLogErr(null);
    setLog(null);
    fetchEventLog(200).then((r) => (r.ok ? setLog(r.data) : setLogErr(r.error)));
  }, []);

  useEffect(() => { loadGrowth(period); }, [period, loadGrowth]);
  useEffect(() => { loadLog(); }, [loadLog]);

  const typeEntries = log ? Object.entries(log.byType) : [];

  return (
    <div className="animate-screen-in">
      <PageHeader
        title="Analytics"
        subtitle="Platform telemetry from the live event stream."
        actions={
          <button onClick={() => { loadGrowth(period); loadLog(); }} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[12px] font-bold text-text2 transition-colors hover:border-gold/40 hover:text-gold-hi">
            <RotateCw size={13} /> Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Radio} label="Active Users" loading={!metrics} value={metrics ? formatNum(metrics.activeNow) : '—'} caption={`seen in ${period}`} />
        <StatCard icon={FileText} label="Post Activity" loading={!metrics} value={metrics ? formatNum(metrics.postsCreated) : '—'} caption={`posts in ${period}`} />
        <StatCard icon={UserPlus} label="New Signups" loading={!metrics} value={metrics ? formatNum(metrics.signups) : '—'} caption={`accounts in ${period}`} />
        <StatCard icon={Activity} label="Events Logged" loading={!log} value={log ? formatNum(log.total) : '—'} caption="recent tracked actions" />
      </div>

      <Card className="mt-4 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-gold" />
            <h2 className="font-display text-[14px] font-extrabold uppercase tracking-[0.14em]">User Growth</h2>
          </div>
          <FilterChips options={PERIODS} value={period} onChange={setPeriod} />
        </div>
        {growthErr ? (
          <ErrorState message={growthErr} onRetry={() => loadGrowth(period)} />
        ) : !growth ? (
          <div className="skeleton h-[220px] w-full" />
        ) : growth.totalUsers === 0 ? (
          <EmptyState title="No data available yet" body="Once founders sign up, the cumulative growth curve renders here." />
        ) : (
          <>
            <LineChart series={growth.series} height={220} valueLabel="cumulative users" />
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-white/5 pt-3 text-[11.5px] text-text3">
              <span>New this period: <b className="text-gold-hi">{growth.newInPeriod}</b></span>
              <span>All-time: <b className="text-gold-hi">{growth.totalUsers}</b></span>
            </div>
          </>
        )}
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 size={16} className="text-gold" />
            <SectionTitle title="Event Breakdown" className="mb-0" />
          </div>
          {!log ? (
            <TableSkeleton rows={4} cols={2} />
          ) : logErr ? (
            <ErrorState message={logErr} onRetry={loadLog} />
          ) : typeEntries.length === 0 ? (
            <EmptyState icon={BarChart3} title="No events yet" body="Likes, comments, posts, and follows are recorded here as they happen across the platform." />
          ) : (
            <div className="space-y-2">
              {typeEntries.map(([type, count]) => {
                const meta = EVENT_META[type];
                const Icon = meta?.icon || Activity;
                return (
                  <div key={type} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-3">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold">{meta?.label || type}</span>
                      <span className="block text-[11px] text-text3">{type}</span>
                    </span>
                    <span className="font-display text-[17px] font-extrabold">{formatNum(count)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Activity size={16} className="text-gold" />
            <SectionTitle title="Recent Events" className="mb-0" />
          </div>
          {!log ? (
            <TableSkeleton rows={6} cols={2} />
          ) : logErr ? (
            <ErrorState message={logErr} onRetry={loadLog} />
          ) : log.events.length === 0 ? (
            <EmptyState icon={Activity} title="Event stream is empty" body="Tracked actions will stream in here in real time." />
          ) : (
            <ul className="max-h-[340px] space-y-1 overflow-y-auto pr-1">
              {log.events.slice(0, 20).map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5">
                  <Badge tone="gold">{(e.eventType || 'unknown').replace(/_/g, ' ')}</Badge>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-text3">
                    {e.postId || e.followedId || e.userId || e.authorKey || ''}
                  </span>
                  <span className="flex-none text-[11px] text-text3">{timeAgo(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
