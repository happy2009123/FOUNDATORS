// In-memory sliding-window rate limiter for API routes.
// Serverless caveat: counters live per process, so limits are approximate
// across a fleet - still enough to stop a single client from burning
// OpenAI / Resend / Cloudinary / push quotas.
// (lib/rateLimit.js is the client-side checkRateLimit used by the store -
//  do not merge the two.)

const buckets = new Map();
const MAX_KEYS = 20000;

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

export function rateLimit(key, { limit, windowMs }) {
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

export function retryAfterHeaders(rl) {
  return { 'Retry-After': String(rl.retryAfterSec) };
}
