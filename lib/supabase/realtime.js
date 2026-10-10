'use client';

import { getSupabase } from './client';

// Shared registry of live queries. One channel per `key`; subscribers
// refcount the channel; ANY postgres_changes event on the table triggers a
// debounced re-query for every subscriber listening under that key. This
// replaces Firestore onSnapshot semantics: the re-query (not the raw event)
// is the source of truth, so RLS, filters and ordering all stay server-side.

const registry = new Map();
const DEFAULT_DEBOUNCE_MS = 300;

export function subscribeQuery({
  key,
  table,
  filter,
  queryFn,
  onData,
  onError,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}) {
  const supabase = getSupabase();
  if (!supabase || !table || typeof queryFn !== 'function') return () => {};

  let cancelled = false;
  let seq = 0;

  const deliver = async () => {
    if (cancelled) return;
    const mySeq = ++seq;
    try {
      const data = await queryFn();
      if (!cancelled && mySeq === seq) onData(data);
    } catch (err) {
      if (!cancelled && typeof onError === 'function') onError(err);
      else if (!cancelled) console.warn(`subscribeQuery(${key}) re-query failed:`, err?.message);
    }
  };

  // Initial fetch — mirrors the first onSnapshot callback.
  deliver();

  let entry = registry.get(key);
  if (entry) {
    entry.refcount += 1;
    entry.subs.push(deliver);
  } else {
    const subs = [deliver];
    const channel = supabase
      .channel(`sq:${key}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        () => {
          const e = registry.get(key);
          if (!e || e.timer) return;
          e.timer = setTimeout(() => {
            e.timer = null;
            // Copy the list: a subscriber may unsubscribe during the await.
            [...e.subs].forEach((fn) => fn());
          }, debounceMs);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`subscribeQuery(${key}) channel status:`, status);
        }
      });
    entry = { refcount: 1, channel, timer: null, subs };
    registry.set(key, entry);
  }

  return () => {
    cancelled = true;
    const e = registry.get(key);
    if (!e) return;
    e.refcount -= 1;
    e.subs = e.subs.filter((fn) => fn !== deliver);
    if (e.refcount <= 0) {
      if (e.timer) clearTimeout(e.timer);
      try {
        supabase.removeChannel(e.channel);
      } catch {
        // channel already torn down
      }
      registry.delete(key);
    }
  };
}

// Single-doc live subscription (profiles): same registry, filter eq on the
// primary key.
export function subscribeRow({ key, table, idColumn, id, queryFn, onData, onError }) {
  return subscribeQuery({
    key,
    table,
    filter: `${idColumn}=eq.${id}`,
    queryFn,
    onData,
    onError,
  });
}

// Utility for callers that need to force-teardown all live channels
// (used on logout).
export function teardownAllSubscriptions() {
  const supabase = getSupabase();
  for (const [, entry] of registry) {
    if (entry.timer) clearTimeout(entry.timer);
    try {
      supabase?.removeChannel(entry.channel);
    } catch {
      // ignore
    }
  }
  registry.clear();
}
