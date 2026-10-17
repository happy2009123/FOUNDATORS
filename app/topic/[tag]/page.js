'use client';

// ─────────────────────────────────────────────────────────────
// TOPIC — hashtag landing page (#tag): recent posts carrying the
// exact tag + follow/unfollow via followed_topics (0013). Reached
// from RichText hashtags, search tag rows and trending tags.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Hash, Loader2, UserPlus, UserCheck, MessageSquare } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import PostCard from '@/components/PostCard';
import { postsWithTag, normalizeTag } from '@/lib/search';

export default function TopicPage() {
  const params = useParams();
  const router = useRouter();
  const { vibrate } = useHaptics();
  const showToast = useStore((s) => s.showToast);
  const profile = useStore((s) => s.profile);

  const rawTag = Array.isArray(params?.tag) ? params.tag[0] : params?.tag || '';
  const tag = normalizeTag(rawTag); // '#ai'

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!tag) return undefined;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const sb = getSupabase();
      if (!sb) { if (!cancelled) { setLoading(false); } return; }
      const [postRows] = await Promise.all([
        postsWithTag(sb, tag),
        sb
          .from('followed_topics')
          .select('tag')
          .eq('tag', tag)
          .maybeSingle()
          .then((res) => {
            if (!cancelled && res?.data) setFollowing(true);
          })
          .catch(() => {}),
      ]);
      if (cancelled) return;
      setPosts(postRows);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tag]);

  const toggleFollow = useCallback(async () => {
    if (!profile?.id || !tag) {
      showToast('Sign in to follow topics');
      return;
    }
    if (busy) return;
    setBusy(true);
    vibrate('light');
    const next = !following;
    setFollowing(next); // optimistic
    try {
      const sb = getSupabase();
      if (!sb) throw new Error('Not configured');
      if (next) {
        const { error } = await sb
          .from('followed_topics')
          .insert({ user_id: profile.id, tag });
        if (error && error.code !== '23505') throw error; // already followed
      } else {
        const { error } = await sb
          .from('followed_topics')
          .delete()
          .eq('user_id', profile.id)
          .eq('tag', tag);
        if (error) throw error;
      }
    } catch (err) {
      setFollowing(!next); // revert
      showToast('Could not update topic follow');
    } finally {
      setBusy(false);
    }
  }, [profile?.id, tag, following, busy, vibrate, showToast]);

  if (!tag) {
    return (
      <div className="app-shell flex flex-col items-center justify-center px-6 text-center">
        <p className="text-[14px] text-text2">Invalid topic.</p>
        <button onClick={() => router.push('/search')} className="mt-3 text-[13px] font-bold text-gold">
          Back to search
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-none items-center gap-3 border-b border-linesoft px-4 py-3">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full" aria-label="Go back">
          <ChevronLeft size={20} />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold">
          <Hash size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[16px] font-black">{tag}</h1>
          <p className="text-[11px] text-text3">
            {loading ? 'Loading posts…' : `${posts.length} recent post${posts.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          onClick={toggleFollow}
          disabled={busy}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold transition-all disabled:opacity-60 ${
            following ? 'bg-gold text-[#1a1300]' : 'border border-gold text-gold'
          }`}
          aria-label={following ? 'Unfollow topic' : 'Follow topic'}
        >
          {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
          {following ? 'Following' : 'Follow'}
        </button>
      </div>

      {/* Posts */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={22} className="animate-spin text-gold" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center px-8 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10 text-gold">
              <MessageSquare size={22} />
            </div>
            <p className="text-[14px] font-bold">No posts with {tag} yet</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-text3">
              Be the first — write a post starting with {tag} and it will show up here.
            </p>
            <button
              onClick={() => router.push('/create')}
              className="mt-5 rounded-full bg-gold px-5 py-2.5 text-[13px] font-bold text-[#1a1300]"
            >
              Create post
            </button>
          </div>
        ) : (
          <div className="px-[18px] pt-3 pb-6">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
