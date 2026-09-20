const limits = {};

export function checkRateLimit(key, max, windowMs) {
  const now = Date.now();
  if (!limits[key]) limits[key] = [];
  limits[key] = limits[key].filter(t => now - t < windowMs);
  if (limits[key].length >= max) {
    const oldest = limits[key][0];
    return { allowed: false, retryMs: windowMs - (now - oldest) };
  }
  limits[key].push(now);
  return { allowed: true, retryMs: 0 };
}

export function clearRateLimit(key) {
  if (key) delete limits[key];
  else Object.keys(limits).forEach(k => delete limits[k]);
}
