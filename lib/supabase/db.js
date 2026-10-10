// Row/timestamp helpers shared by every Supabase-backed service module.
//
// Timestamps: Supabase returns timestamptz as ISO strings. Existing app code
// everywhere calls `createdAt?.toDate?.()` (the Firestore Timestamp API).
// We therefore map timestamp columns to a small Timestamp-like shim so the
// dozens of consumer call sites keep working without modification.

const TS_KEY_SUFFIX = '_at';
const TS_KEYS_EXTRA = new Set(['last_seen', 'lastSeen', 'seen_at', 'seenAt']);

export function camelizeKey(key) {
  return String(key).replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

export function snakeizeKey(key) {
  return String(key).replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
}

function isTimestampKey(camelKey) {
  const snake = snakeizeKey(camelKey);
  return snake.endsWith(TS_KEY_SUFFIX) || TS_KEYS_EXTRA.has(snake) || TS_KEYS_EXTRA.has(camelKey);
}

export function toMillis(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

export function toDateLike(value) {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  const ms = toMillis(value);
  return ms ? new Date(ms) : null;
}

// Firestore-Timestamp-compatible shim backed by a fixed instant.
export function ts(value) {
  const ms = toMillis(value);
  if (!ms) return null;
  const date = new Date(ms);
  return {
    seconds: Math.floor(ms / 1000),
    nanoseconds: 0,
    toDate: () => new Date(ms),
    toMillis: () => ms,
    valueOf: () => ms,
    toString: () => date.toISOString(),
    toJSON: () => date.toISOString(),
    [Symbol.toPrimitive]: (hint) =>
      hint === 'string' ? date.toISOString() : ms,
  };
}

function convertTsValue(value) {
  if (value == null) return null;
  return ts(value);
}

// Map one DB row (snake_case columns) to the app's camelCase shape,
// converting timestamp columns to Timestamp-like shims. Top-level only —
// jsonb values (e.g. unreadBy maps keyed by uid) pass through untouched.
export function mapRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = camelizeKey(k);
    if (isTimestampKey(camel)) out[camel] = convertTsValue(v);
    else out[camel] = v;
  }
  return out;
}

export function mapRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(mapRow);
}

// Convert an app-shaped payload (camelCase, Dates/Timestamps) into a
// DB-shaped row (snake_case columns, ISO timestamp strings).
export function toRow(payload) {
  const out = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined) continue;
    const snake = snakeizeKey(k);
    if (v === null) {
      out[snake] = null;
    } else if (v instanceof Date) {
      out[snake] = v.toISOString();
    } else if (typeof v === 'object' && typeof v.toISOString === 'function' && typeof v.toDate === 'function') {
      out[snake] = v.toISOString();
    } else {
      out[snake] = v;
    }
  }
  return out;
}

export function ok(data) {
  return { success: true, data };
}

export function fail(error) {
  return { success: false, error: error?.message || String(error) };
}

export function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
