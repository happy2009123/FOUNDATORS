'use client';

import { useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from './supabase/client';
import { subscribeQuery } from './supabase/realtime';
import { toMillis, mapRow } from './supabase/db';

// ─── Presence system ─────────────────────────────────────────────────────────
// Each client heartbeats `last_seen` on its OWN profile row every 30s while
// the tab is visible, honouring Settings → Privacy → "Show online status".
// A user counts as online while their newest heartbeat is fresher than 90s
// (3 missed beats). Everyone else's `last_seen` is read through a shared,
// app-lifetime subscription cache so the chat list, side pane and
// conversation header always agree.

const HEARTBEAT_MS = 30_000;
const ONLINE_WINDOW_MS = 90_000;

// uid -> epoch ms | null (null = never seen / presence cleared)
const presenceValues = {};
// uid -> unsubscribe (bounded by chat partners, kept for app lifetime)
const presenceUnsubs = new Map();
// live-value subscribers: (snapshot) => void
const presenceSubscribers = new Set();

function tsToMs(ts) {
  if (!ts) return null;
  if (typeof ts === 'number') return ts;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  if (typeof ts === 'string') return toMillis(ts) || null;
  return null;
}

function emitPresence() {
  const snapshot = { ...presenceValues };
  presenceSubscribers.forEach((cb) => {
    try { cb(snapshot); } catch {}
  });
}

function ensurePresenceWatch(uid) {
  if (!uid || presenceUnsubs.has(uid) || !isSupabaseConfigured()) return;
  const unsub = subscribeQuery({
    key: `presence:${uid}`,
    table: 'profiles',
    filter: `id=eq.${uid}`,
    queryFn: async () => {
      const { data } = await getSupabase()
        .from('profiles')
        .select('id, last_seen')
        .eq('id', uid)
        .maybeSingle();
      return data ? mapRow(data) : null;
    },
    onData: (row) => {
      const data = Array.isArray(row) ? row[0] : row;
      presenceValues[uid] = data ? tsToMs(data.lastSeen) : null;
      emitPresence();
    },
    onError: () => {
      // Permission/network hiccup: keep the previous value rather than
      // flashing everyone offline.
    },
  });
  presenceUnsubs.set(uid, unsub);
}

/** Subscribe to presence for the given ids (idempotent; cached). */
export function watchPresence(uids) {
  (uids || []).forEach((uid) => ensurePresenceWatch(uid));
}

/** Drop all presence listeners/values — call on logout. */
export function resetPresenceWatchers() {
  presenceUnsubs.forEach((unsub) => {
    try { unsub(); } catch {}
  });
  presenceUnsubs.clear();
  Object.keys(presenceValues).forEach((k) => { delete presenceValues[k]; });
  emitPresence();
}

/**
 * React hook returning a live `uid -> lastSeenMs` map for `uids`. Re-emits
 * every 30s so relative labels ("5m ago") stay fresh without extra reads.
 */
export function usePresence(uids) {
  const key = Array.from(new Set((uids || []).filter(Boolean))).sort().join('|');
  const [values, setValues] = useState(presenceValues);

  useEffect(() => {
    const ids = key ? key.split('|') : [];
    ids.forEach((uid) => ensurePresenceWatch(uid));
    const cb = (next) => setValues(next);
    presenceSubscribers.add(cb);
    setValues({ ...presenceValues });
    const timer = setInterval(() => setValues({ ...presenceValues }), HEARTBEAT_MS);
    return () => {
      presenceSubscribers.delete(cb);
      clearInterval(timer);
    };
  }, [key]);

  return values;
}

// ─── My own heartbeat ────────────────────────────────────────────────────────

let heartbeatCleanup = [];
let heartbeatUserId = null;

export function startPresenceHeartbeat(userId) {
  if (!userId || heartbeatUserId === userId) return;
  stopPresenceHeartbeat();
  if (!isSupabaseConfigured()) return;
  heartbeatUserId = userId;
  const supabase = getSupabase();

  // Fail closed until the privacy setting answers: if the user keeps the
  // toggle off we must not write a heartbeat before we know.
  let allowed = false;

  const beat = () => {
    if (!allowed) return;
    supabase
      .from('profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', userId)
      .then(() => {})
      .catch(() => {});
  };

  const clearPresence = () => {
    allowed = false;
    supabase
      .from('profiles')
      .update({ last_seen: null })
      .eq('id', userId)
      .then(() => {})
      .catch(() => {});
  };

  // Live-respect the "Show online status" privacy toggle (stored in
  // user_settings.settings JSONB). When it is off we null out last_seen so
  // everyone sees "Offline" instead of a stale time.
  const unsubPrivacy = subscribeQuery({
    key: `presence-privacy:${userId}`,
    table: 'user_settings',
    filter: `user_id=eq.${userId}`,
    queryFn: async () => {
      const { data } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .maybeSingle();
      return data || null;
    },
    onData: (row) => {
      const data = Array.isArray(row) ? row[0] : row;
      const show = data?.settings?.showOnlineStatus !== false;
      if (!show) {
        if (allowed) clearPresence();
        return;
      }
      allowed = true;
      beat();
    },
    onError: () => {
      // Can't read the toggle (missing row is fine, this is a hard error):
      // fail open so presence still works.
      allowed = true;
      beat();
    },
  });

  const timer = setInterval(beat, HEARTBEAT_MS);
  const onVisibility = () => {
    if (document.visibilityState === 'visible') beat();
  };
  document.addEventListener('visibilitychange', onVisibility);

  heartbeatCleanup = [
    unsubPrivacy,
    () => clearInterval(timer),
    () => document.removeEventListener('visibilitychange', onVisibility),
  ];
}

export function stopPresenceHeartbeat() {
  heartbeatCleanup.forEach((fn) => {
    try { fn(); } catch {}
  });
  heartbeatCleanup = [];
  heartbeatUserId = null;
}

/**
 * Null out this user's presence IMMEDIATELY, before the session is torn
 * down. Without this the last heartbeat lingers for the full 90s window and
 * everyone still sees "Online now" after the user logged out. Must be
 * awaited while the auth token is still valid — a post-signOut write would
 * be rejected by the security policies.
 */
export async function endPresenceFor(userId) {
  if (!userId || !isSupabaseConfigured()) return;
  stopPresenceHeartbeat();
  try {
    await getSupabase()
      .from('profiles')
      .update({ last_seen: null })
      .eq('id', userId);
  } catch {
    // best-effort: even if the write fails the heartbeat expires on its own
  }
}

// ─── Formatters ──────────────────────────────────────────────────────────────

export function isOnline(lastSeenMs) {
  return typeof lastSeenMs === 'number' && Date.now() - lastSeenMs < ONLINE_WINDOW_MS;
}

function relativePast(ms) {
  const diff = Math.max(0, Date.now() - ms);
  const d = new Date(ms);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'yesterday';
  return `on ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

/** Compact label for chat-list rows: "Online" / "5m ago" / "Yesterday" / "Offline". */
export function formatPresenceShort(lastSeenMs) {
  if (!lastSeenMs) return 'Offline';
  if (isOnline(lastSeenMs)) return 'Online';
  const r = relativePast(lastSeenMs);
  if (r === 'just now') return 'Just now';
  if (r === 'yesterday') return 'Yesterday';
  if (r.startsWith('on ')) return r.slice(3);
  return r;
}

/** Header label: "Online now" / "Last seen 5m ago" / "Offline". */
export function formatLastSeen(lastSeenMs) {
  if (!lastSeenMs) return 'Offline';
  if (isOnline(lastSeenMs)) return 'Online now';
  return `Last seen ${relativePast(lastSeenMs)}`;
}

/** Chat-list top-right time for groups: message time ("5m", "Yesterday"). */
export function formatChatTime(lastMessageAt, hasMessage) {
  const ms = tsToMs(lastMessageAt);
  if (ms == null) return hasMessage ? 'Now' : '';
  if (isOnline(ms)) return 'Now';
  const r = relativePast(ms);
  if (r === 'just now') return 'Now';
  if (r === 'yesterday') return 'Yesterday';
  if (r.startsWith('on ')) return r.slice(3);
  return r.replace(' ago', '');
}
