'use client';

import { useEffect } from 'react';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export function initErrorTracking() {
  if (!SENTRY_DSN || typeof window === 'undefined') return;

  window.onerror = function (message, source, lineno, colno, error) {
    reportError({
      message: String(message),
      source,
      lineno,
      colno,
      stack: error?.stack,
      url: window.location.href,
      timestamp: Date.now(),
    });
  };

  window.addEventListener('unhandledrejection', (event) => {
    reportError({
      message: String(event.reason?.message || event.reason),
      stack: event.reason?.stack,
      url: window.location.href,
      timestamp: Date.now(),
      type: 'unhandledrejection',
    });
  });
}

function reportError(data) {
  try {
    const errors = JSON.parse(localStorage.getItem('foundators_errors') || '[]');
    errors.push(data);
    if (errors.length > 50) errors.splice(0, errors.length - 50);
    localStorage.setItem('foundators_errors', JSON.stringify(errors));
  } catch (e) {}

  if (process.env.NODE_ENV === 'development') {
    console.error('[ErrorTracker]', data);
  }
}

export function getStoredErrors() {
  try {
    return JSON.parse(localStorage.getItem('foundators_errors') || '[]');
  } catch {
    return [];
  }
}

export function clearStoredErrors() {
  localStorage.removeItem('foundators_errors');
}
