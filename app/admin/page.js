'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN → DASHBOARD
// Platform health first: real counts, real growth curve, real
// activity stream. Every number comes from Firestore aggregates
// or documents — nothing is hardcoded. Missing data renders an
// honest empty state, never an invented statistic.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import {
  Users, FileText, ShieldAlert, Activity, UserPlus, MessageSquare,
  Flag, ArrowRight, Crown, Radio, TrendingUp,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import {
  fetchPlatformCounts, fetchGrowthSeries, fetchPeriodMetrics,
  fetchRecentActivity, fetchReports, fetchUsersPage,
} from '@/lib/adminData';
import { timeAgo, formatDate, formatNum } from '@/lib/admin';
import {
  Card, StatCard, SectionTitle, EmptyState, ErrorState,
  TableSkeleton, Badge, LineChart, FilterChips, AvatarDot, StatusBadge,
} from '@/components/admin/ui';

const PERIODS = [
  { value: '7D', label: '7D' },
  { value: '30D', label: '30D' },
  { value: '90D', label: '90D' },
  { value: '1Y', label: '1Y' },
];

const ACTIVITY_META = {
  user: { color: 'text-brandgreen', bg: 'bg-brandgreen/10 border-brandgreen/30', icon: UserPlus },
  post: { color: 'text-gold', bg: 'bg-gold/10 border-gold/30', icon: FileText },
  report: { color: 'text-brandred', bg: 'bg-brandred/10 border-brandred/30', icon: Flag },
};

export default function AdminDashboard() {
  const router = useRouter();
  const profile = useStore((s) => s.profile);

  const [counts, setCounts] = useState(null);
  const [countsErr, setCountsErr] = useState(null);
  const [period, setPeriod] = useState('7D');
  const [metrics, setMetrics] = useState(null);
  const [growth, setGrowth] = useState(null);
  const [growthErr, setGrowthErr] = useState(null);
  const [activity, setActivity] = useState(null);
  const [activityErr, setActivityErr] = useState(null);
  const [pending, setPending] = useState([]);
  const [recentUsers, setRecentUsers] = useState(null);
  const [usersErr, setUsersErr] = useState(null);
  const [clock, setClock] = useState('');

  const loadCounts = useCallback(() => {
    setCountsErr(null);
    fetchPlatformCounts().then((r) => (r.ok ? setCounts(r.data) : setCountsErr(r.error)));
  }, []);
  const loadGrowth = useCallback((p) => {
    setGrowthErr(null);
    fetchGrowthSeries(p).then((r) => (r.ok ? setGrowth(r.data) : setGrowthErr(r.error)));
    fetchPeriodMetrics(p).then((r) => { if (r.ok) setMetrics(r.data); });
  }, []);
  const loadActivity = useCallback(() => {
    setActivityErr(null);
    fetchRecentActivity(8).then((r) => (r.ok ? setActivity(r.data) : setActivityErr(r.error)));
  }, []);
  const loadReports = useCallback(() => {
    fetchReports(100).then((r) => {
      if (r.ok) setPending(r.data.filter((x) => (x.status || 'pending') === 'pending').slice(0, 4));
    });
  }, []);
  const loadUsers = useCallback(() => {
    setUsersErr(null);
    fetchUsersPage({ pageSize: 6 }).then((r) => (r.ok ? setRecentUsers(r.data.rows) : setUsersErr(r.error)));
  }, []);

  useEffect(() => {
    loadCounts();
    loadActivity();
    loadReports();
    loadUsers();
  }, [loadCounts, loadActivity, loadReports, loadUsers]);

  useEffect(() => { loadGrowth(period); }, [period, loadGrowth]);

  // Honor the admin's saved default period (Settings → Console Preferences).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!db || !auth?.currentUser?.uid || cancelled) return;
        const snap = await getDoc(doc(db, 'users', auth.currentUser.uid, 'settings', 'admin'));
        const p = snap.exists() ? snap.data().defaultPeriod : null;
        if (p && ['7D', '30D', '90D', '1Y'].includes(p)) setPeriod(p);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const loading = !counts && !countsErr;

  return (
    <div className="animate-screen-in">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-[22px] font-extrabold leading-tight sm:text-[26px]">
            Welcome back, {profile?.name?.split(' ')[0] || 'Admin'}
            <Crown size={20} className="text-gold" aria-hidden />
          </h1>
          <p className="mt-1 text-[13px] text-text2">Monitor your FOUNDATORS community.</p>
        </div>
        <div className="text-right text-[12.5px] text-text3">
          <div>{today}</div>
          <div className="mt-0.5 font-bold text-text2">{clock}</div>
        </div>
      </div>

      {/* ─── Overview cards ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Users"
          loading={loading}
          value={counts ? formatNum(counts.totalUsers) : '—'}
          delta={counts?.usersDelta}
          caption="vs last 7 days"
        />
        <StatCard
          icon={Radio}
          label="Active Users"
          loading={loading}
          value={counts ? formatNum(counts.activeUsers7d) : '—'}
          caption="active in the last 7 days"
        />
        <StatCard
          icon={FileText}
          label="Total Posts"
          loading={loading}
          value={counts ? formatNum(counts.totalPosts) : '—'}
          delta={counts?.postsDelta}
          caption="vs last 7 days"
        />
        <StatCard
          icon={ShieldAlert}
          label="Open Reports"
          loading={loading}
          value={counts ? formatNum(counts.pendingReports) : '—'}
          caption={counts?.pendingReports ? 'awaiting moderation' : 'queue is clear'}
        />
      </div>
      {countsErr && (
        <div className="mt-3">
          <ErrorState message={countsErr} onRetry={loadCounts} />
        </div>
      )}

      {/* ─── Growth + period metrics ─── */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
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
            <div className="skeleton h-[190px] w-full" />
          ) : growth.newInPeriod === 0 && growth.totalUsers === 0 ? (
            <EmptyState title="No data available yet" body="Sign-ups will chart here as soon as founders join the platform." />
          ) : (
            <>
              <LineChart series={growth.series} valueLabel="cumulative users" />
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-white/5 pt-3 text-[11.5px] text-text3">
                <span>New this period: <b className="text-gold-hi">{growth.newInPeriod}</b></span>
                <span>All-time users: <b className="text-gold-hi">{growth.totalUsers}</b></span>
              </div>
            </>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle title={`Last ${period}`} />
          {!metrics ? (
            <div className="space-y-3">
              <div className="skeleton h-14 w-full" />
              <div className="skeleton h-14 w-full" />
              <div className="skeleton h-14 w-full" />
            </div>
          ) : (
            <div className="space-y-2.5">
              <MetricRow icon={Radio} label="Active Users" value={metrics.activeNow} hint="seen in period" />
              <MetricRow icon={Activity} label="Post Activity" value={metrics.postsCreated} hint="posts created" />
              <MetricRow icon={UserPlus} label="New Signups" value={metrics.signups} hint="accounts created" />
            </div>
          )}
          <p className="mt-4 border-t border-white/5 pt-3 text-[11px] leading-relaxed text-text3">
            Counted live from Firestore — “active” means a heartbeat (last seen) inside the selected window.
          </p>
        </Card>
      </div>

      {/* ─── Activity + moderation queue ─── */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-gold" />
              <h2 className="font-display text-[14px] font-extrabold uppercase tracking-[0.14em]">Recent Activity</h2>
            </div>
            <button onClick={() => router.push('/admin/analytics')} className="inline-flex items-center gap-1 text-[12px] font-bold text-gold-hi hover:underline">
              View all <ArrowRight size={13} />
            </button>
          </div>
          {!activity ? (
            <TableSkeleton rows={5} cols={2} />
          ) : activityErr ? (
            <ErrorState message={activityErr} onRetry={loadActivity} />
          ) : activity.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No activity yet" body="Joins, posts, and reports will stream in here in real time." />
          ) : (
            <ul className="space-y-1">
              {activity.map((a) => {
                const meta = ACTIVITY_META[a.kind];
                const Icon = meta.icon;
                return (
                  <li key={a.key}>
                    <button
                      onClick={() => router.push(a.href)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-white/5"
                    >
                      <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl border ${meta.bg} ${meta.color}`}>
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold">{a.title}</span>
                        <span className="block truncate text-[12px] text-text3">{a.subtitle}</span>
                      </span>
                      <span className="flex-none text-[11px] text-text3">{timeAgo(a.at)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-gold" />
              <h2 className="font-display text-[14px] font-extrabold uppercase tracking-[0.14em]">Moderation Queue</h2>
            </div>
            <button onClick={() => router.push('/admin/moderation')} className="inline-flex items-center gap-1 text-[12px] font-bold text-gold-hi hover:underline">
              Review <ArrowRight size={13} />
            </button>
          </div>
          {pending.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="Queue is clear" body="No pending reports. Filed reports will appear here for review." />
          ) : (
            <ul className="space-y-2">
              {pending.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
                  <Flag size={14} className="flex-none text-brandred" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-bold">{r.reason || 'Reported content'}</div>
                    <div className="truncate text-[11px] text-text3">{r.details || 'No details provided'}</div>
                  </div>
                  <Badge tone="gold">{r.status || 'pending'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ─── Recent users ─── */}
      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-gold" />
            <h2 className="font-display text-[14px] font-extrabold uppercase tracking-[0.14em]">Recent Users</h2>
          </div>
          <button onClick={() => router.push('/admin/users')} className="inline-flex items-center gap-1 text-[12px] font-bold text-gold-hi hover:underline">
            View all <ArrowRight size={13} />
          </button>
        </div>
        <div className="mt-3">
          {!recentUsers ? (
            <TableSkeleton rows={4} cols={4} />
          ) : usersErr ? (
            <ErrorState message={usersErr} onRetry={loadUsers} />
          ) : recentUsers.length === 0 ? (
            <EmptyState title="No users yet" body="New founders will appear here right after they sign up." />
          ) : (
            <div className="divide-y divide-white/5">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <AvatarDot src={u.avatar} name={u.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-bold">{u.name || 'User'}</span>
                      {u.verified && <Badge tone="gold">verified</Badge>}
                    </div>
                    <div className="truncate text-[11.5px] text-text3">{u.handle}{u.role ? ` · ${u.role}` : ''}</div>
                  </div>
                  <div className="hidden text-right text-[11.5px] text-text3 sm:block">
                    Joined {formatDate(u.createdAt)}
                  </div>
                  <StatusBadge status={u.status} />
                  <button
                    onClick={() => router.push(`/profile/${u.id}`)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-[11.5px] font-bold text-text2 transition-colors hover:border-gold/40 hover:text-gold-hi"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-5 py-4">
          <button
            onClick={() => router.push('/admin/analytics')}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/5 py-2.5 text-[13px] font-extrabold text-gold-hi transition-colors hover:bg-gold/10"
          >
            View Platform Stats <ArrowRight size={15} />
          </button>
        </div>
      </Card>
    </div>
  );
}

function MetricRow({ icon: Icon, label, value, hint }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-3">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-text3">{label}</div>
        <div className="text-[11.5px] text-text3">{hint}</div>
      </div>
      <div className="font-display text-[20px] font-extrabold">{formatNum(value ?? 0)}</div>
    </div>
  );
}
