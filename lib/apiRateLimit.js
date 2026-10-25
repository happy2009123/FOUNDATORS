// Sliding-window rate limiter for API routes.
// Primary path: shared Postgres counters via the rate_limit_hit RPC
// (migration 0020) so limits hold ACROSS serverless instances — an
// in-memory map alone is reset on every cold start and trivially spread
// around. Falls back to a per-process map when SUPABASE_SECRET_KEY is
// absent or the RPC errors, so routes never fail open.
// (lib/rateLimit.js is the client-side checkRateLimit used by the store -
//  do not merge the two.)
import { createClient } from '@supabase/supabase-js';

const buckets = new Map();
const MAX_KEYS = 20000;

let adminClient = null;
let adminResolved = false;
function getAdmin() {
  if (adminResolved) return adminClient;
  adminResolved = true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    adminClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  } catch {
    adminClient = null;
  }
  return adminClient;
}

function prune(now, windowMs) {
  if (buckets.size <= MAX_KEYS) return;
  for (const [k, b] of buckets) {
    if (now - b.start > windowMs * 2) buckets.delete(k);
  }
}

export function clientIp(request) {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

function memoryResult(key, { limit, windowMs }) {
  const now = Date.now();
  prune(now, windowMs);
  const b = buckets.get(key);
  if (!b || now - b.start > windowMs) {
    buckets.set(key, { count: 1, start: now });
    return { ok: true, remaining: limit - 1 };
  }
  b.count += 1;
  if (b.count > limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((b.start + windowMs - now) / 1000)),
    };
  }
  return { ok: true, remaining: limit - b.count };
}

export async function rateLimit(key, { limit, windowMs }) {
  const admin = getAdmin();
  if (admin) {
    try {
      const { data, error } = await admin.rpc('rate_limit_hit', {
        p_key: String(key || '').slice(0, 200),
        p_limit: limit,
        p_window_ms: windowMs,
      });
      if (!error && data && typeof data.ok === 'boolean') {
        return data.ok
          ? { ok: true, remaining: Number(data.remaining) || 0 }
          : { ok: false, retryAfterSec: Number(data.retry_after) || 1 };
      }
      // RPC missing/errored → fall through to the local map (fail closed
      // on this instance rather than failing open).
    } catch {
      // fall through
    }
  }
  return memoryResult(key, { limit, windowMs });
}

export function retryAfterHeaders(rl) {
  return { 'Retry-After': String(rl.retryAfterSec) };
}
