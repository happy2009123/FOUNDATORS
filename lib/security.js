import DOMPurify from 'isomorphic-dompurify';

const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'span'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
};

export function sanitize(dirty) {
  if (typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, PURIFY_CONFIG);
}

export function sanitizeText(dirty) {
  if (typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export function sanitizeUrl(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
    return '';
  }
  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:' && parsed.protocol !== 'mailto:') {
      return '';
    }
    return parsed.href;
  } catch {
    return '';
  }
}

export function validateEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

export function validatePassword(password) {
  if (typeof password !== 'string') return { valid: false, errors: ['Invalid password'] };
  const errors = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('One number');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('One special character');
  return { valid: errors.length === 0, errors };
}

export function sanitizeFilename(filename) {
  if (typeof filename !== 'string') return '';
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .slice(0, 255);
}

const RATE_LIMIT_STORE = {};
export function clientRateLimit(key, max = 5, windowMs = 60000) {
  const now = Date.now();
  if (!RATE_LIMIT_STORE[key]) RATE_LIMIT_STORE[key] = [];
  RATE_LIMIT_STORE[key] = RATE_LIMIT_STORE[key].filter(t => now - t < windowMs);
  if (RATE_LIMIT_STORE[key].length >= max) return false;
  RATE_LIMIT_STORE[key].push(now);
  return true;
}
