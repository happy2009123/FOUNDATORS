'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN AUTHORIZATION
// ─────────────────────────────────────────────────────────────
// Real enforcement lives in Postgres RLS: every admin-only table
// (reports, analytics_events, admin_actions) checks is_admin() on
// the server, and the admins table itself is only readable by
// admins. The helpers here only decide what the UI renders — a
// user who forges state in the browser still receives empty
// results or permission errors for every admin operation.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { subscribeQuery } from '@/lib/supabase/realtime';
import { useStore } from '@/lib/store';
import { useHydration } from '@/lib/useHydration';

async function isAdminRow(uid) {
  const supabase = getSupabase();
  if (!supabase || !uid) return false;
  const { data, error } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', uid)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

// Subscribes to the caller's row in admins. Missing row → 'denied';
// query error or no Supabase config → 'denied'; row present → 'admin'.
// RLS hides the row from non-admins, so the probe is safe either way.
export function subscribeAdminStatus(uid, callback) {
  if (!getSupabase() || !uid) {
    callback('denied');
    return () => {};
  }
  return subscribeQuery({
    key: `admin-status:${uid}`,
    table: 'admins',
    filter: `user_id=eq.${uid}`,
    queryFn: () => isAdminRow(uid),
    onData: (isAdmin) => callback(isAdmin ? 'admin' : 'denied'),
    onError: () => callback('denied'),
  });
}

// state: 'loading' | 'admin' | 'denied' | 'unauthed'
export function useAdminAuth() {
  const hydrated = useHydration();
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const authReady = useStore((s) => s.authReady);
  const profile = useStore((s) => s.profile);
  const [state, setState] = useState('loading');

  useEffect(() => {
    if (!hydrated || !authReady) return;
    if (!isLoggedIn) {
      setState('unauthed');
      return;
    }
    let cancelled = false;
    let unsub = () => {};
    (async () => {
      const supabase = getSupabase();
      const { data } = supabase ? await supabase.auth.getSession() : {};
      const uid = data?.session?.user?.id || profile?.id;
      if (cancelled) return;
      if (!uid) {
        setState('loading');
        return;
      }
      setState('loading');
      const stop = subscribeAdminStatus(uid, setState);
      if (cancelled) stop();
      else unsub = stop;
    })();
    return () => {
      cancelled = true;
      unsub();
    };
  }, [hydrated, authReady, isLoggedIn, profile?.id]);

  return state;
}

// Full-screen guard used by the admin layout. Denied users get an
// honest explanation (never a fake dashboard), unauthenticated
// visitors are sent to /login.
export default function AdminGuard({ children }) {
  const router = useRouter();
  const state = useAdminAuth();
  const [copied, setCopied] = useState(false);
  const profileId = useStore((s) => s.profile?.id);
  const [uid, setUid] = useState(profileId || null);

  useEffect(() => {
    let on = true;
    const supabase = getSupabase();
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (on) setUid(data?.session?.user?.id || profileId || null);
      });
    }
    return () => { on = false; };
  }, [profileId]);

  useEffect(() => {
    if (state === 'unauthed') router.replace('/login');
  }, [state, router]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-6">
        <div className="h-9 w-9 animate-spin-slow rounded-full border-2 border-linesoft border-t-gold" />
        <p className="mt-4 text-[13px] text-text2">Verifying admin access…</p>
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink px-5 py-10">
        <div className="w-full max-w-[420px] rounded-[22px] border border-linesoft bg-card p-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10">
            <span className="text-[22px]" aria-hidden>🔒</span>
          </div>
          <h1 className="mt-4 font-display text-[19px] font-extrabold">Access denied</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-text2">
            This account is not provisioned as a FOUNDATORS administrator.
            Admin access is granted server-side — navigating here or changing
            the client has no effect.
          </p>
          {process.env.NODE_ENV !== 'production' && uid && (
            <button
              onClick={() => {
                navigator.clipboard?.writeText(uid).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
              className="mt-4 w-full rounded-xl border border-linesoft px-3 py-2.5 text-[12px] text-text2 transition-colors hover:border-gold/40 hover:text-gold"
            >
              {copied ? 'UID copied' : 'Copy my UID (to seed admins with it in the dashboard)'}
            </button>
          )}
          <button
            onClick={() => router.replace('/home')}
            className="mt-3 w-full rounded-xl bg-gold py-2.5 text-[13px] font-extrabold text-[#1a1300] active:scale-[0.98]"
          >
            Back to Foundators
          </button>
        </div>
      </div>
    );
  }

  return children;
}

// ─── Formatting helpers shared by admin pages ─────────────────

export function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') { const d = new Date(value); return isNaN(d) ? null : d; }
  return null;
}

export function timeAgo(value) {
  const d = toDate(value);
  if (!d) return '—';
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 45) return 'just now';
  if (s < 90) return '1 min ago';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export function formatDate(value) {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatNum(n) {
  if (typeof n !== 'number' || isNaN(n)) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toLocaleString('en-US');
}
