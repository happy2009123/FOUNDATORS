'use client';

import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;

function getClient() {
  if (supabaseInstance) return supabaseInstance;
  if (typeof window === 'undefined') return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  supabaseInstance = createClient(url, key);
  return supabaseInstance;
}

export const supabase = typeof window !== 'undefined' ? getClient() : null;
export const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
