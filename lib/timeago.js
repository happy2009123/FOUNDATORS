// Relative-time labels for feed post timestamps.
// Handles every shape a post.createdAt can take:
//  - Firestore serverTimestamp / Timestamp (toDate / toMillis)
//  - { seconds, nanoseconds } plain object (server data as JSON)
//  - epoch milliseconds or epoch seconds
//  - ISO / date strings
// Returns null when the timestamp is missing or unparseable so callers can
// fall back to their static meta string (e.g. right after publish, while the
// serverTimestamp is still null).
export function formatPostTime(ts) {
  if (ts == null) return null;
  let d = null;
  if (ts instanceof Date) {
    d = ts;
  } else if (typeof ts.toDate === 'function') {
    d = ts.toDate();
  } else if (typeof ts.toMillis === 'function') {
    d = new Date(ts.toMillis());
  } else if (typeof ts.seconds === 'number') {
    d = new Date(ts.seconds * 1000);
  } else if (typeof ts === 'number') {
    d = new Date(ts > 1e12 ? ts : ts * 1000);
  } else if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    if (!Number.isNaN(parsed)) d = new Date(parsed);
  }
  if (!d || Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
