'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN DATA LAYER
// ─────────────────────────────────────────────────────────────
// Every fetch here runs as the signed-in admin and is enforced by
// Firestore rules (admins-only collections return permission-denied
// to anyone else). No numbers are fabricated: when a metric has no
// backing data, the caller receives an empty result and renders an
// empty state instead of a fake statistic.
// ─────────────────────────────────────────────────────────────

import {
  collection, query, where, orderBy, limit, getDocs, getDoc, doc,
  getCountFromServer, startAfter, updateDoc, addDoc, deleteDoc,
  serverTimestamp, writeBatch, deleteField,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

function ready() {
  return !!db;
}

async function guard(fn) {
  if (!ready()) return { ok: false, error: 'Firestore not configured' };
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e?.message || 'Request failed' };
  }
}

function adminUid() {
  return auth?.currentUser?.uid || null;
}

// ─── Audit trail ──────────────────────────────────────────────

export async function recordAdminAction(action, targetId, summary) {
  if (!ready()) return;
  try {
    await addDoc(collection(db, 'adminActions'), {
      action,
      targetId: targetId || null,
      summary: summary || '',
      actorKey: adminUid(),
      createdAt: serverTimestamp(),
    });
  } catch {
    // Audit write must never break the operation it is logging.
  }
}

// ─── Counts (server-side aggregates — never scan full collections) ──

async function countOf(colRef) {
  const snap = await getCountFromServer(colRef);
  return snap.data().count;
}

export function fetchPlatformCounts() {
  return guard(async () => {
    const now = Date.now();
    const d7 = new Date(now - 7 * 864e5);
    const d14 = new Date(now - 14 * 864e5);
    const usersCol = collection(db, 'users');
    const postsCol = collection(db, 'posts');
    const [totalUsers, totalPosts, activeUsers7d, pendingReports] = await Promise.all([
      countOf(usersCol),
      countOf(postsCol),
      countOf(query(usersCol, where('lastSeen', '>=', d7))),
      countOf(query(collection(db, 'reports'), where('status', '==', 'pending'))),
    ]);
    // Period comparison (last 7 days vs the 7 before) for ↑↓ indicators.
    const [usersThis7, usersPrev7, postsThis7, postsPrev7] = await Promise.all([
      countOf(query(usersCol, where('createdAt', '>=', d7))),
      countOf(query(usersCol, where('createdAt', '>=', d14), where('createdAt', '<', d7))),
      countOf(query(postsCol, where('createdAt', '>=', d7))),
      countOf(query(postsCol, where('createdAt', '>=', d14), where('createdAt', '<', d7))),
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
    const usersCol = collection(db, 'users');
    const postsCol = collection(db, 'posts');
    const [signups, postsCreated, activeNow, firstHalfSignups] = await Promise.all([
      countOf(query(usersCol, where('createdAt', '>=', cutoff))),
      countOf(query(postsCol, where('createdAt', '>=', cutoff))),
      countOf(query(usersCol, where('lastSeen', '>=', cutoff))),
      countOf(query(usersCol, where('createdAt', '>=', half))),
    ]);
    return { signups, postsCreated, activeNow, firstHalfSignups, period, days };
  });
}

// ─── User growth series (cumulative signups from real createdAt) ──

export function fetchGrowthSeries(period = '30D') {
  return guard(async () => {
    const days = PERIOD_DAYS[period] || 30;
    const cutoff = new Date(Date.now() - days * 864e5);
    const snap = await getDocs(
      query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(2000))
    );
    const stamps = snap.docs
      .map((d) => {
        const v = d.data().createdAt;
        if (v && typeof v.toDate === 'function') return v.toDate().getTime();
        if (v && typeof v.seconds === 'number') return v.seconds * 1000;
        return null;
      })
      .filter((t) => t !== null)
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
    const [usersSnap, postsSnap, reportsSnap] = await Promise.all([
      getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(n))),
      getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(n))),
      getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(n))),
    ]);
    const items = [];
    usersSnap.docs.forEach((d) => {
      const u = d.data();
      items.push({
        key: `u-${d.id}`,
        kind: 'user',
        title: 'New founder joined',
        subtitle: u.name || u.handle || 'New user',
        href: `/profile/${d.id}`,
        at: u.createdAt,
      });
    });
    postsSnap.docs.forEach((d) => {
      const p = d.data();
      items.push({
        key: `p-${d.id}`,
        kind: 'post',
        title: 'New post published',
        subtitle: (p.text || '').slice(0, 80) || 'Media post',
        href: `/post/${d.id}`,
        at: p.createdAt,
      });
    });
    reportsSnap.docs.forEach((d) => {
      const r = d.data();
      items.push({
        key: `r-${d.id}`,
        kind: 'report',
        title: 'Report filed',
        subtitle: r.reason || 'Reported content',
        href: '/admin/reports',
        at: r.createdAt,
      });
    });
    const toDate = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : v && typeof v.seconds === 'number' ? new Date(v.seconds * 1000) : null);
    items.sort((a, b) => (toDate(b.at)?.getTime() || 0) - (toDate(a.at)?.getTime() || 0));
    return items.slice(0, n);
  });
}

// ─── Users ───────────────────────────────────────────────────

export async function fetchUsersPage({ cursor = null, pageSize = 12, search = '', status = 'all' } = {}) {
  return guard(async () => {
    let q;
    if (search.trim()) {
      const t = search.trim();
      q = query(
        collection(db, 'users'),
        orderBy('name'),
        where('name', '>=', t),
        where('name', '<=', t + '\uf8ff'),
        limit(40)
      );
    } else {
      q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(pageSize));
      if (cursor) q = query(q, startAfter(cursor));
    }
    const snap = await getDocs(q);
    let rows = snap.docs.map((d) => ({ id: d.id, ...d.data(), _cursor: d }));
    if (status !== 'all') {
      rows = rows.filter((r) => (r.status || 'active') === status);
    } else if (search.trim()) {
      rows = rows.slice(0, pageSize);
    }
    return { rows, last: snap.docs.length ? snap.docs[snap.docs.length - 1] : null, exhausted: snap.docs.length < pageSize };
  });
}

export function setUserStatus(userId, status, reason = '') {
  return guard(async () => {
    await updateDoc(doc(db, 'users', userId), { status });
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
    await updateDoc(doc(db, 'users', userId), { verified });
    await recordAdminAction(verified ? 'user_verified' : 'user_unverified', userId, verified ? 'Badge granted' : 'Badge removed');
    return true;
  });
}

export async function resolveUsers(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = {};
  await Promise.all(
    unique.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, 'users', id));
        map[id] = snap.exists() ? { id: snap.id, ...snap.data() } : null;
      } catch {
        map[id] = null;
      }
    })
  );
  return map;
}

// ─── Posts ───────────────────────────────────────────────────

export async function fetchPostsPage({ cursor = null, pageSize = 12 } = {}) {
  return guard(async () => {
    let q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(pageSize));
    if (cursor) q = query(q, startAfter(cursor));
    const snap = await getDocs(q);
    return {
      rows: snap.docs.map((d) => ({ id: d.id, ...d.data(), _cursor: d })),
      last: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
      exhausted: snap.docs.length < pageSize,
    };
  });
}

export function removePost(postId) {
  return guard(async () => {
    await deleteDoc(doc(db, 'posts', postId));
    await recordAdminAction('post_removed', postId, 'Post removed by moderation');
    return true;
  });
}

// ─── Reports ─────────────────────────────────────────────────

export async function fetchReports(limitN = 100) {
  return guard(async () => {
    const snap = await getDocs(
      query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(limitN))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
}

export function updateReport(reportId, patch, actionLabel) {
  return guard(async () => {
    await updateDoc(doc(db, 'reports', reportId), {
      ...patch,
      reviewedAt: serverTimestamp(),
      reviewedBy: adminUid(),
    });
    await recordAdminAction('report_updated', reportId, actionLabel || `Report → ${patch.status}`);
    return true;
  });
}

// ─── Chats / messages (read-only monitoring) ─────────────────

export async function fetchChatsPage({ cursor = null, pageSize = 12 } = {}) {
  return guard(async () => {
    let q = query(collection(db, 'chats'), orderBy('lastMessageAt', 'desc'), limit(pageSize));
    if (cursor) q = query(q, startAfter(cursor));
    const snap = await getDocs(q);
    return {
      rows: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      last: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
      exhausted: snap.docs.length < pageSize,
    };
  });
}

export async function fetchChatMessages(chatId, n = 25) {
  return guard(async () => {
    const snap = await getDocs(
      query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'desc'), limit(n))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
}

// ─── Analytics event stream ──────────────────────────────────

export async function fetchEventLog(limitN = 200) {
  return guard(async () => {
    const snap = await getDocs(
      query(collection(db, 'analytics'), orderBy('createdAt', 'desc'), limit(limitN))
    );
    const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const byType = {};
    events.forEach((e) => {
      const t = e.eventType || 'unknown';
      byType[t] = (byType[t] || 0) + 1;
    });
    return { events, byType, total: events.length };
  });
}

// ─── Content collections (ideas / events / challenges exist today) ──

export async function fetchContentCounts() {
  return guard(async () => {
    const [ideas, events, challenges, reels] = await Promise.all([
      countOf(collection(db, 'ideas')),
      countOf(collection(db, 'events')),
      countOf(collection(db, 'challenges')),
      countOf(collection(db, 'reels')),
    ]);
    return { ideas, events, challenges, reels };
  });
}

export async function fetchIdeasPage(pageSize = 12) {
  return guard(async () => {
    const snap = await getDocs(
      query(collection(db, 'ideas'), orderBy('createdAt', 'desc'), limit(pageSize))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
}

// ─── Founding 100 (admin-granted only — no self-service path) ──
// Uniqueness is enforced by the marker doc in foundingMembers/{N}:
// only one marker can ever exist per number, so two admins racing
// for #7 both cannot win — the second batch commit is rejected by
// Firestore rules and the grant fails cleanly.

export async function fetchFoundingMembers() {
  return guard(async () => {
    const snap = await getDocs(collection(db, 'foundingMembers'));
    return snap.docs
      .map((d) => ({ id: d.id, number: Number(d.id), ...d.data() }))
      .sort((a, b) => a.number - b.number);
  });
}

export async function grantFoundingMember(user) {
  return guard(async () => {
    const snap = await getDocs(collection(db, 'foundingMembers'));
    const used = new Set(snap.docs.map((d) => Number(d.id)));
    let number = null;
    for (let i = 1; i <= 100; i++) {
      if (!used.has(i)) {
        number = i;
        break;
      }
    }
    if (number == null) throw new Error('All 100 Founding Member numbers are taken');
    const batch = writeBatch(db);
    batch.set(doc(db, 'foundingMembers', String(number)), {
      uid: user.id,
      name: user.name || '',
      handle: user.handle || '',
      avatar: user.avatar || '',
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'users', user.id), {
      foundingNumber: number,
      foundingApprovedAt: serverTimestamp(),
    });
    await batch.commit();
    await recordAdminAction(
      'founding_granted',
      user.id,
      `Founding Member #${number} — ${user.name || user.handle || user.id}`
    );
    return number;
  });
}

export async function revokeFoundingMember(member) {
  return guard(async () => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'foundingMembers', String(member.number)));
    batch.update(doc(db, 'users', member.uid), {
      foundingNumber: deleteField(),
      foundingApprovedAt: deleteField(),
    });
    await batch.commit();
    await recordAdminAction(
      'founding_revoked',
      member.uid,
      `Founding Member #${member.number} revoked`
    );
    return true;
  });
}
