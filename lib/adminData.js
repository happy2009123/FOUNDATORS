'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN DATA LAYER
// ─────────────────────────────────────────────────────────────
// Every fetch here runs as the signed-in admin and is enforced by
// Postgres RLS (admin-only tables return empty/denied to anyone
// else — is_admin() is checked server-side). No numbers are
// fabricated: when a metric has no backing data, the caller
// receives an empty result and renders an empty state instead of
// a fake statistic.
// ─────────────────────────────────────────────────────────────

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { mapRows, toRow, randomId, toMillis } from '@/lib/supabase/db';

function ready() {
  return isSupabaseConfigured();
}

// PostgREST returns { data, error } instead of throwing.
function unwrap({ data, error }) {
  if (error) throw new Error(error.message || 'Request failed');
  return data;
}

async function guard(fn) {
  if (!ready()) return { ok: false, error: 'Supabase not configured' };
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e?.message || 'Request failed' };
  }
}

async function adminUid() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id || null;
}

async function countRows(table, build) {
  let q = getSupabase().from(table).select('id', { count: 'exact', head: true });
  if (build) q = build(q);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count || 0;
}

// ─── Audit trail ──────────────────────────────────────────────

export async function recordAdminAction(action, targetId, summary) {
  if (!ready()) return;
  try {
    unwrap(await getSupabase().from('admin_actions').insert(toRow({
      id: randomId(),
      adminId: await adminUid(),
      action,
      targetId: targetId || null,
      payload: { summary: summary || '' },
    })));
  } catch (e) {
    // Audit write must never break the operation it is logging — but it
    // must not be invisible either: surface the failure in the console so
    // a policy misconfiguration or offline state is actually noticed.
    console.error('[admin_actions] audit write failed:', action, e?.message || e);
  }
}

// ─── Counts (server-side aggregates — never scan full tables) ─────

export function fetchPlatformCounts() {
  return guard(async () => {
    const now = Date.now();
    const d7 = new Date(now - 7 * 864e5);
    const d14 = new Date(now - 14 * 864e5);
    const [totalUsers, totalPosts, activeUsers7d, pendingReports] = await Promise.all([
      countRows('profiles'),
      countRows('posts'),
      countRows('profiles', (q) => q.gte('last_seen', d7.toISOString())),
      // Schema default is 'open'; older rows used 'pending' — both mean
      // "awaiting moderation".
      countRows('reports', (q) => q.in('status', ['open', 'pending'])),
    ]);
    // Period comparison (last 7 days vs the 7 before) for ↑↓ indicators.
    const [usersThis7, usersPrev7, postsThis7, postsPrev7] = await Promise.all([
      countRows('profiles', (q) => q.gte('created_at', d7.toISOString())),
      countRows('profiles', (q) => q.gte('created_at', d14.toISOString()).lt('created_at', d7.toISOString())),
      countRows('posts', (q) => q.gte('created_at', d7.toISOString())),
      countRows('posts', (q) => q.gte('created_at', d14.toISOString()).lt('created_at', d7.toISOString())),
    ]);
    return {
      totalUsers,
      totalPosts,
      activeUsers7d,
      pendingReports,
      usersDelta: deltaPct(usersThis7, usersPrev7),
      postsDelta: deltaPct(postsThis7, postsPrev7),
      newSignups7: usersThis7,
      postsActivity7: postsThis7,
    };
  });
}

function deltaPct(cur, prev) {
  if (prev <= 0) return cur > 0 ? null : 0; // no baseline → don't invent %
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

// ─── Period-scoped metrics ───────────────────────────────────

const PERIOD_DAYS = { '7D': 7, '30D': 30, '90D': 90, '1Y': 365 };

export function fetchPeriodMetrics(period = '7D') {
  return guard(async () => {
    const days = PERIOD_DAYS[period] || 7;
    const cutoff = new Date(Date.now() - days * 864e5);
    const now = Date.now();
    const half = new Date(now - (days / 2) * 864e5);
    const [signups, postsCreated, activeNow, firstHalfSignups] = await Promise.all([
      countRows('profiles', (q) => q.gte('created_at', cutoff.toISOString())),
      countRows('posts', (q) => q.gte('created_at', cutoff.toISOString())),
      countRows('profiles', (q) => q.gte('last_seen', cutoff.toISOString())),
      countRows('profiles', (q) => q.gte('created_at', half.toISOString())),
    ]);
    return { signups, postsCreated, activeNow, firstHalfSignups, period, days };
  });
}

// ─── User growth series (cumulative signups from real createdAt) ──

export function fetchGrowthSeries(period = '30D') {
  return guard(async () => {
    const days = PERIOD_DAYS[period] || 30;
    const cutoff = new Date(Date.now() - days * 864e5);
    const rows = unwrap(
      await getSupabase().from('profiles')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(2000)
    );
    const stamps = rows
      .map((r) => toMillis(r.created_at))
      .filter((t) => t > 0)
      .sort((a, b) => a - b);

    const inPeriod = stamps.filter((t) => t >= cutoff.getTime());
    const buckets = buildBuckets(period, cutoff.getTime(), Date.now());
    let idx = 0;
    let cumulative = stamps.filter((t) => t < cutoff.getTime()).length;
    for (const b of buckets) {
      while (idx < inPeriod.length && inPeriod[idx] <= b.end) {
        cumulative += 1;
        idx += 1;
      }
      b.value = cumulative;
    }
    return { series: buckets, totalUsers: stamps.length, newInPeriod: inPeriod.length };
  });
}

function buildBuckets(period, from, to) {
  const DAY = 864e5;
  const out = [];
  if (period === '7D' || period === '30D') {
    const n = period === '7D' ? 7 : 30;
    const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
    const first = startOfDay(to) - (n - 1) * DAY;
    for (let i = 0; i < n; i++) {
      const s = first + i * DAY;
      out.push({
        label: new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        start: s,
        end: s + DAY - 1,
        value: 0,
      });
    }
    return out;
  }
  if (period === '90D') {
    const n = 13; // weekly buckets
    const start = to - 90 * DAY;
    for (let i = 0; i < n; i++) {
      const s = start + i * 7 * DAY;
      out.push({
        label: new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        start: s,
        end: s + 7 * DAY - 1,
        value: 0,
      });
    }
    return out;
  }
  // 1Y → monthly buckets
  const d = new Date(to);
  d.setDate(1);
  for (let i = 11; i >= 0; i--) {
    const s = new Date(d.getFullYear(), d.getMonth() - i, 1).getTime();
    const e = new Date(d.getFullYear(), d.getMonth() - i + 1, 1).getTime() - 1;
    out.push({
      label: new Date(s).toLocaleDateString('en-US', { month: 'short' }),
      start: s,
      end: e,
      value: 0,
    });
  }
  return out;
}

// ─── Recent activity (real merged events) ────────────────────

export async function fetchRecentActivity(n = 8) {
  return guard(async () => {
    const s = getSupabase();
    const [usersSnap, postsSnap, reportsSnap] = await Promise.all([
      s.from('profiles').select('id, name, handle, created_at').order('created_at', { ascending: false }).limit(n),
      s.from('posts').select('id, text, created_at').order('created_at', { ascending: false }).limit(n),
      s.from('reports').select('id, reason, created_at').order('created_at', { ascending: false }).limit(n),
    ]);
    const users = mapRows(unwrap(usersSnap));
    const posts = mapRows(unwrap(postsSnap));
    const reports = mapRows(unwrap(reportsSnap));
    const items = [];
    users.forEach((u) => {
      items.push({
        key: `u-${u.id}`,
        kind: 'user',
        title: 'New founder joined',
        subtitle: u.name || u.handle || 'New user',
        href: `/profile/${u.id}`,
        at: u.createdAt,
      });
    });
    posts.forEach((p) => {
      items.push({
        key: `p-${p.id}`,
        kind: 'post',
        title: 'New post published',
        subtitle: (p.text || '').slice(0, 80) || 'Media post',
        href: `/post/${p.id}`,
        at: p.createdAt,
      });
    });
    reports.forEach((r) => {
      items.push({
        key: `r-${r.id}`,
        kind: 'report',
        title: 'Report filed',
        subtitle: r.reason || 'Reported content',
        href: '/admin/reports',
        at: r.createdAt,
      });
    });
    items.sort((a, b) => toMillis(b.at) - toMillis(a.at));
    return items.slice(0, n);
  });
}

// ─── Users ───────────────────────────────────────────────────

// profiles has no `status` column — banned is the moderation flag,
// surfaced as 'restricted' so the existing filters/badges keep working.
function withStatus(row) {
  return { ...row, status: row.banned ? 'restricted' : 'active' };
}

export async function fetchUsersPage({ cursor = null, pageSize = 12, search = '', status = 'all' } = {}) {
  return guard(async () => {
    const s = getSupabase();
    let rows;
    let last;
    let exhausted;
    if (search.trim()) {
      const t = search.trim().replace(/([\\%_])/g, '\\$1');
      const raw = unwrap(
        await s.from('profiles')
          .select('*')
          .ilike('name', `${t}%`)
          .order('name', { ascending: true })
          .limit(40)
      );
      rows = mapRows(raw);
      last = rows.length ? rows.length : null;
      exhausted = rows.length < pageSize;
    } else {
      // `cursor` is an opaque offset returned as `last` by the previous page.
      const offset = typeof cursor === 'number' && cursor > 0 ? cursor : 0;
      const raw = unwrap(
        await s.from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1)
      );
      rows = mapRows(raw);
      last = rows.length ? offset + rows.length : null;
      exhausted = rows.length < pageSize;
    }
    rows = rows.map(withStatus);
    if (status !== 'all') {
      rows = rows.filter((r) => r.status === status);
    } else if (search.trim()) {
      rows = rows.slice(0, pageSize);
    }
    return { rows, last, exhausted };
  });
}

export function setUserStatus(userId, status, reason = '') {
  return guard(async () => {
    // RLS silently updates 0 rows on denial — surface that as a failure.
    const updated = unwrap(await getSupabase().from('profiles').update({ banned: status !== 'active' }).eq('id', userId).select('id'));
    if (!updated?.length) throw new Error('Permission denied — profile not updated');
    await recordAdminAction(
      status === 'active' ? 'user_activated' : 'user_restricted',
      userId,
      `Status → ${status}${reason ? ` (${reason})` : ''}`
    );
    return true;
  });
}

export function setUserVerified(userId, verified) {
  return guard(async () => {
    const updated = unwrap(await getSupabase().from('profiles').update({ verified }).eq('id', userId).select('id'));
    if (!updated?.length) throw new Error('Permission denied — profile not updated');
    await recordAdminAction(verified ? 'user_verified' : 'user_unverified', userId, verified ? 'Badge granted' : 'Badge removed');
    return true;
  });
}

export async function resolveUsers(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = {};
  if (!unique.length || !ready()) return map;
  try {
    const rows = mapRows(unwrap(await getSupabase().from('profiles').select('*').in('id', unique)));
    unique.forEach((id) => { map[id] = null; });
    rows.forEach((r) => { if (map[r.id] !== undefined) map[r.id] = r; });
  } catch {
    unique.forEach((id) => { map[id] = null; });
  }
  return map;
}

// ─── Posts ───────────────────────────────────────────────────

export async function fetchPostsPage({ cursor = null, pageSize = 12 } = {}) {
  return guard(async () => {
    const offset = typeof cursor === 'number' && cursor > 0 ? cursor : 0;
    const raw = unwrap(
      await getSupabase().from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)
    );
    const rows = mapRows(raw);
    return {
      rows,
      last: rows.length ? offset + rows.length : null,
      exhausted: rows.length < pageSize,
    };
  });
}

export function removePost(postId) {
  return guard(async () => {
    const removed = unwrap(await getSupabase().from('posts').delete().eq('id', postId).select('id'));
    if (!removed?.length) throw new Error('Permission denied — post not removed');
    await recordAdminAction('post_removed', postId, 'Post removed by moderation');
    return true;
  });
}

// ─── Reports ─────────────────────────────────────────────────

export async function fetchReports(limitN = 100) {
  return guard(async () => {
    const rows = unwrap(
      await getSupabase().from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limitN)
    );
    return mapRows(rows);
  });
}

export function updateReport(reportId, patch, actionLabel) {
  return guard(async () => {
    // reports stores no reviewed_at / reviewed_by / resolution columns —
    // only the columns that exist are written; RLS decides the outcome.
    const row = {};
    for (const k of ['status', 'reason', 'details']) {
      if (patch[k] !== undefined) row[k] = patch[k];
    }
    const updated = unwrap(await getSupabase().from('reports').update(row).eq('id', reportId).select('id'));
    if (!updated?.length) throw new Error('Permission denied — report not updated (no client update policy on reports)');
    await recordAdminAction('report_updated', reportId, actionLabel || `Report → ${patch.status}`);
    return true;
  });
}

// ─── Chats / messages (read-only monitoring) ─────────────────

export async function fetchChatsPage({ cursor = null, pageSize = 12 } = {}) {
  return guard(async () => {
    const offset = typeof cursor === 'number' && cursor > 0 ? cursor : 0;
    const raw = unwrap(
      await getSupabase().from('chats')
        .select('*')
        .order('last_message_at', { ascending: false })
        .range(offset, offset + pageSize - 1)
    );
    const rows = mapRows(raw);
    return {
      rows,
      last: rows.length ? offset + rows.length : null,
      exhausted: rows.length < pageSize,
    };
  });
}

export async function fetchChatMessages(chatId, n = 25) {
  return guard(async () => {
    const rows = unwrap(
      await getSupabase().from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(n)
    );
    return mapRows(rows);
  });
}

// ─── Analytics event stream ──────────────────────────────────

export async function fetchEventLog(limitN = 200) {
  return guard(async () => {
    const rows = mapRows(
      unwrap(
        await getSupabase().from('analytics_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limitN)
      )
    );
    const byType = {};
    rows.forEach((e) => {
      const t = e.eventType || 'unknown';
      byType[t] = (byType[t] || 0) + 1;
    });
    return { events: rows, byType, total: rows.length };
  });
}

// ─── Content collections (ideas / events / challenges exist today) ──

export async function fetchContentCounts() {
  return guard(async () => {
    const [ideas, events, challenges, reels] = await Promise.all([
      countRows('ideas'),
      countRows('events'),
      countRows('challenges'),
      countRows('reels'),
    ]);
    return { ideas, events, challenges, reels };
  });
}

export async function fetchIdeasPage(pageSize = 12) {
  return guard(async () => {
    const rows = unwrap(
      await getSupabase().from('ideas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(pageSize)
    );
    return mapRows(rows);
  });
}

// ─── Founding 100 (admin-granted only — no self-service path) ──
// The Supabase schema ships no founding_members table and profiles
// carries no founding number, so the marker-doc uniqueness model has
// no equivalent yet. These fail loudly instead of faking a roster.

const FOUNDING_UNAVAILABLE =
  'Founding 100 has no storage in the Supabase schema yet — grants and revokes must run from the Supabase dashboard until a founding_members table exists.';

export async function fetchFoundingMembers() {
  if (!ready()) return { ok: false, error: 'Supabase not configured' };
  return { ok: false, error: FOUNDING_UNAVAILABLE };
}

export async function grantFoundingMember(user) {
  if (!ready()) return { ok: false, error: 'Supabase not configured' };
  return { ok: false, error: FOUNDING_UNAVAILABLE };
}

export async function revokeFoundingMember(member) {
  if (!ready()) return { ok: false, error: 'Supabase not configured' };
  return { ok: false, error: FOUNDING_UNAVAILABLE };
}
