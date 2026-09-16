'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

export function useSupabaseTable(table, options = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { orderBy = 'created_at', ascending = false, limit = 50, filter } = options;

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    try {
      let query = supabase.from(table).select('*');
      if (filter) query = query.eq(filter.column, filter.value);
      query = query.order(orderBy, { ascending }).limit(limit);
      const { data: rows, error: err } = await query;
      if (err) throw err;
      setData(rows || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [table, orderBy, ascending, limit, JSON.stringify(filter)]);

  useEffect(() => { fetch(); }, [fetch]);

  const insert = useCallback(async (row) => {
    if (!supabase) return null;
    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) throw error;
    setData((prev) => [data, ...prev]);
    return data;
  }, [table]);

  const update = useCallback(async (id, updates) => {
    if (!supabase) return null;
    const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single();
    if (error) throw error;
    setData((prev) => prev.map((r) => r.id === id ? data : r));
    return data;
  }, [table]);

  const remove = useCallback(async (id) => {
    if (!supabase) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    setData((prev) => prev.filter((r) => r.id !== id));
  }, [table]);

  return { data, loading, error, insert, update, remove, refresh: fetch };
}

export async function syncProfileToSupabase(profile) {
  if (!supabase || !profile?.id) return;
  await supabase.from('profiles').upsert({
    id: profile.id,
    name: profile.name,
    handle: profile.handle,
    bio: profile.bio || '',
    avatar: profile.avatar || '',
    role: profile.role || '',
    location: profile.location || '',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
}

export async function createSupabasePost(post) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('posts').insert(post).select().single();
  if (error) throw error;
  return data;
}

export async function createSupabaseMessage(msg) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('messages').insert(msg).select().single();
  if (error) throw error;
  return data;
}
