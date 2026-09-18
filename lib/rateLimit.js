const limits = {};

export function checkRateLimit(key, max, windowMs) {
  const now = Date.now();
  if (!limits[key]) limits[key] = [];
  limits[key] = limits[key].filter(t => now - t < windowMs);
  if (limits[key].length >= max) return false;
  limits[key].push(now);
  return true;
}
