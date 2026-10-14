'use client';

import { getSupabase } from '@/lib/supabase/client';
import { randomId } from '@/lib/supabase/db';
import { useStore } from '@/lib/store';

export async function submitFeedback({ category = 'general', message }) {
  const text = (message || '').trim();
  if (!text) return { success: false, error: 'Message required' };
  if (text.length > 2000) return { success: false, error: 'Keep feedback under 2000 characters' };
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase not configured' };
  const uid = useStore.getState().profile?.id;
  if (!uid) return { success: false, error: 'Sign in required' };
  try {
    const { error } = await supabase
      .from('feedback')
      .insert({ id: randomId(), user_id: uid, category, message: text });
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Feedback submit failed:', err);
    return { success: false, error: err.message || 'Could not send feedback' };
  }
}
