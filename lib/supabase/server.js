import { createClient } from '@supabase/supabase-js';

let admin = null;
let verifier = null;

export function isSupabaseAdminConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
  );
}

// Token verification works with EITHER key: the admin client validates the
// JWT locally, the anon client asks GoTrue over the network - both return
// the same user for a valid token. Falls back to the anon key so routes
// keep authenticating even when SUPABASE_SECRET_KEY is absent from the
// server env (that env is optional, not required for getUser).
export function getTokenVerifier() {
  if (typeof window !== 'undefined') {
    throw new Error('getTokenVerifier() must never run in the browser');
  }
  if (isSupabaseAdminConfigured()) return getSupabaseAdmin();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  if (!verifier) {
    verifier = createClient(url, anon, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
  return verifier;
}

export function isAuthVerifierConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && (process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
}

export function getSupabaseAdmin() {
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseAdmin() must never run in the browser');
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  if (!admin) {
    admin = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return admin;
}
