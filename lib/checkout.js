'use client';

import { getSupabase } from './supabase/client';

async function accessToken() {
  try {
    const { data } = (getSupabase() || { auth: null })?.auth
      ? await getSupabase().auth.getSession()
      : { data: null };
    return data?.session?.access_token || '';
  } catch {
    return '';
  }
}

async function postJson(path, body) {
  let token = await accessToken();
  const call = (t) =>
    fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(body),
    });
  let res = await call(token);
  // Stale on-disk session → 401: refresh once and retry (same as uploads).
  if (res.status === 401) {
    try {
      const { data } = await getSupabase().auth.refreshSession();
      const fresh = data?.session?.access_token;
      if (fresh) res = await call(fresh);
    } catch {}
  }
  return res;
}

// Opens Stripe Checkout for a paid challenge entry.
// Returns { url } on success, { notConfigured: true } when the server has
// no Stripe key yet (caller keeps the manual pending-approval flow), or
// { error } on failure.
export async function startStripeCheckout(challengeId) {
  try {
    const res = await postJson('/api/stripe/checkout', { challengeId });
    if (res.status === 503) {
      const data = await res.json().catch(() => ({}));
      if (data.reason === 'stripe-not-configured') return { notConfigured: true };
      return { notConfigured: true };
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data.error || 'Checkout failed' };
    }
    const data = await res.json();
    return { url: data.url };
  } catch {
    return { error: 'Network error' };
  }
}

// After the success redirect: asks the server to verify the session against
// Stripe and approve the entry. Returns { approved, amount, challengeId },
// { notConfigured: true }, or { error }.
export async function confirmStripeCheckout(sessionId) {
  try {
    const res = await postJson('/api/stripe/complete', { sessionId });
    if (res.status === 503) return { notConfigured: true };
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data.error || 'Confirmation failed' };
    }
    return await res.json();
  } catch {
    return { error: 'Network error' };
  }
}
