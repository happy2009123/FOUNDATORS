const attempts = {};

export function checkRateLimit(key, maxAttempts = 5, windowMs = 60000) {
  const now = Date.now();
  if (!attempts[key]) {
    attempts[key] = [];
  }
  attempts[key] = attempts[key].filter((t) => now - t < windowMs);
  if (attempts[key].length >= maxAttempts) {
    const oldest = attempts[key][0];
    const waitMs = windowMs - (now - oldest);
    return { allowed: false, retryMs: waitMs };
  }
  attempts[key].push(now);
  return { allowed: true, remaining: maxAttempts - attempts[key].length };
}

export function resetRateLimit(key) {
  delete attempts[key];
}
