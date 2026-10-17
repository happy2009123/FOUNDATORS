import { getSupabase } from './supabase/client';
import { mapRows, randomId, toRow } from './supabase/db';

// Story highlights: copies of a story's media pinned to a profile ring.
// Each row is one media item; the UI groups rows sharing a title into a
// single ring (Instagram-style). Schema + RLS ship in migration 0013.

export async function listHighlights(userId) {
  const supabase = getSupabase();
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('story_highlights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return mapRows(data || []);
  } catch {
    return [];
  }
}

export async function addHighlight({ userId, title, mediaUrl, mediaType = 'image', caption = null }) {
  const supabase = getSupabase();
  if (!supabase || !userId) return { success: false, error: 'Not signed in' };
  if (!mediaUrl) return { success: false, error: 'Nothing to save' };
  try {
    const { error } = await supabase.from('story_highlights').insert(
      toRow({
        id: randomId(),
        userId,
        title: (title || 'Highlight').trim().slice(0, 40) || 'Highlight',
        mediaUrl,
        mediaType,
        caption,
      })
    );
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error?.message || 'Could not save highlight' };
  }
}

export async function deleteHighlightsByTitle(userId, title) {
  const supabase = getSupabase();
  if (!supabase || !userId || !title) return { success: false, error: 'Missing params' };
  try {
    const { error } = await supabase
      .from('story_highlights')
      .delete()
      .eq('user_id', userId)
      .eq('title', title);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error?.message || 'Could not delete highlight' };
  }
}
