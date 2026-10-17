'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, ChevronLeft, ChevronRight, Pause, Play, Eye, Bookmark, Trash2, Plus } from 'lucide-react';
import { useHaptics } from '@/lib/useHaptics';
import Avatar from './Avatar';
import { useStore } from '@/lib/store';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { addHighlight, listHighlights, deleteHighlightsByTitle } from '@/lib/highlights';

const STORY_DURATION = 5000;

export default function StoryViewer({ authors, initialAuthorKey, onClose, isHighlight = false, onDeleteHighlight = null }) {
  const { vibrate } = useHaptics();
  const profile = useStore((s) => s.profile);
  const showToast = useStore((s) => s.showToast);
  const router = useRouter();

  const authorKeys = authors.map((a) => a.authorKey);
  const [currentAuthorKey, setCurrentAuthorKey] = useState(initialAuthorKey || authorKeys[0]);
  const [currentItem, setCurrentItem] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const progressRef = useRef(null);

  const currentAuthor = authors.find((a) => a.authorKey === currentAuthorKey);
  const items = currentAuthor?.stories || [];
  const totalItems = items.length;

  // ── Record one view per (story, user) — only once ──────────────
  // Highlights are copies, not stories rows — a story_views insert would
  // FK-fail, so view tracking is skipped entirely in highlight mode.
  useEffect(() => {
    if (isHighlight || !currentAuthorKey || !profile?.id || !items[currentItem]?.id) return;
    const storyId = items[currentItem].id;
    (async () => {
      const { data: existing } = await getSupabase()
        .from('story_views')
        .select('*')
        .eq('story_id', storyId)
        .eq('viewer_id', profile.id)
        .maybeSingle();
      if (!existing) {
        const { error } = await getSupabase().from('story_views').insert({
          story_id: storyId,
          viewer_id: profile.id,
        });
        if (error) console.warn('Story view record error:', error);
      }
    })();
  }, [isHighlight, currentAuthorKey, currentItem, profile?.id, items]);

  // ── Viewed by (author only): live count + full viewer list ────────
  const [showViews, setShowViews] = useState(false);
  const [viewers, setViewers] = useState(null);
  const [viewCount, setViewCount] = useState(0);
  const isOwnStory = !!profile?.id && currentAuthorKey === profile.id;
  const currentStoryId = items[currentItem]?.id || null;

  useEffect(() => {
    if (isHighlight || !isOwnStory || !currentStoryId || !getSupabase()) {
      setViewCount(0);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const { count } = await getSupabase()
          .from('story_views')
          .select('viewer_id', { count: 'exact', head: true })
          .eq('story_id', currentStoryId)
          .neq('viewer_id', profile.id);
        if (!cancelled && typeof count === 'number') setViewCount(count);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [isOwnStory, currentStoryId, profile?.id]);

  useEffect(() => {
    if (isHighlight || !showViews || !currentStoryId) return undefined;
    let cancelled = false;
    setViewers(null);
    (async () => {
      try {
        const { data: rows } = await getSupabase()
          .from('story_views')
          .select('viewer_id')
          .eq('story_id', currentStoryId)
          .neq('viewer_id', profile.id)
          .limit(50);
        const ids = [...new Set((rows || []).map((r) => r.viewer_id))];
        if (!ids.length) {
          if (!cancelled) setViewers([]);
          return;
        }
        const { data: profs } = await getSupabase()
          .from('profiles')
          .select('id, name, handle, avatar')
          .in('id', ids);
        if (cancelled) return;
        const byId = Object.fromEntries((profs || []).map((p) => [p.id, p]));
        setViewers(ids.map((id) => byId[id] || { id, name: 'Someone' }));
      } catch {
        if (!cancelled) setViewers([]);
      }
    })();
    return () => { cancelled = true; };
  }, [showViews, currentStoryId, profile?.id]);

  // ── Save to highlight (own live stories) ───────────────────────
  const [showSave, setShowSave] = useState(false);
  const [hlTitles, setHlTitles] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [savingHl, setSavingHl] = useState(false);
  const [deletingHl, setDeletingHl] = useState(false);

  useEffect(() => {
    if (!showSave || !profile?.id) return;
    setHlTitles(null);
    listHighlights(profile.id).then((rows) => {
      setHlTitles([...new Set(rows.map((r) => r.title))]);
    });
  }, [showSave, profile?.id]);

  const handleSaveToHighlight = async (title) => {
    const story = items[currentItem];
    if (!story?.mediaUrl || savingHl || !profile?.id) return;
    setSavingHl(true);
    const res = await addHighlight({
      userId: profile.id,
      title,
      mediaUrl: story.mediaUrl,
      mediaType: story.mediaType || 'image',
      caption: story.caption || null,
    });
    setSavingHl(false);
    if (res.success) {
      setShowSave(false);
      setNewTitle('');
      showToast(`Saved to "${(title || 'Highlight').trim()}"`);
    } else {
      showToast(res.error || 'Could not save highlight');
    }
  };

  const handleDeleteHighlight = async () => {
    if (!onDeleteHighlight || deletingHl || !profile?.id) return;
    const title = currentAuthor?.highlightTitle || 'Highlight';
    setDeletingHl(true);
    const res = await deleteHighlightsByTitle(profile.id, title);
    setDeletingHl(false);
    if (res.success) {
      onClose();
      onDeleteHighlight(title);
    } else {
      showToast(res.error || 'Could not delete highlight');
    }
  };

  const goNext = useCallback(() => {
    if (currentItem < totalItems - 1) {
      setCurrentItem((p) => p + 1);
      setProgress(0);
    } else {
      const idx = authorKeys.indexOf(currentAuthorKey);
      if (idx < authorKeys.length - 1) {
        setCurrentAuthorKey(authorKeys[idx + 1]);
        setCurrentItem(0);
        setProgress(0);
      } else {
        onClose();
      }
    }
  }, [currentItem, totalItems, authorKeys, currentAuthorKey, onClose]);

  const goPrev = useCallback(() => {
    if (currentItem > 0) {
      setCurrentItem((p) => p - 1);
      setProgress(0);
    } else {
      const idx = authorKeys.indexOf(currentAuthorKey);
      if (idx > 0) {
        setCurrentAuthorKey(authorKeys[idx - 1]);
        const prevAuthor = authors[idx - 1];
        setCurrentItem((prevAuthor?.stories?.length || 1) - 1);
        setProgress(0);
      }
    }
  }, [currentItem, authorKeys, currentAuthorKey, authors]);

  useEffect(() => {
    if (paused || totalItems === 0) return;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        goNext();
        return;
      }
      progressRef.current = requestAnimationFrame(tick);
    };
    progressRef.current = requestAnimationFrame(tick);
    return () => {
      if (progressRef.current) cancelAnimationFrame(progressRef.current);
    };
  }, [currentAuthorKey, currentItem, paused, goNext, totalItems]);

  const handleTap = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) goPrev();
    else goNext();
  }, [goNext, goPrev]);

  if (!currentAuthor || !items[currentItem]) return null;
  const story = items[currentItem];
  // Supabase rows use mediaUrl/caption; legacy Firestore-era rows used
  // imageUrl/text — accept both so photo stories actually render.
  const mediaUrl = story.mediaUrl || story.imageUrl || null;
  const storyText = story.caption || story.text || null;

  return (
    <div className="fixed inset-0 z-[500] bg-black" onClick={handleTap}>
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 px-3 pt-3">
        {items.map((_, i) => (
          <div key={i} className="h-[3px] flex-1 rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{
                width: i < currentItem ? '100%' : i === currentItem ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-4 pt-5">
        <Avatar src={currentAuthor.authorAvatar} name={currentAuthor.authorName} size={36} />
        <div className="flex-1">
          <div className="text-[13px] font-bold text-white">{currentAuthor.authorName}</div>
          <div className="text-[10px] text-white/60">{currentItem + 1} of {totalItems}</div>
        </div>
        {isHighlight && isOwnStory && onDeleteHighlight && (
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteHighlight(); }}
            disabled={deletingHl}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white/90 disabled:opacity-50"
            aria-label="Delete highlight"
          >
            <Trash2 size={15} />
          </button>
        )}
        {!isHighlight && isOwnStory && story?.mediaUrl && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowSave(true); }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white/90"
            aria-label="Save to highlight"
          >
            <Bookmark size={15} />
          </button>
        )}
        {isOwnStory && !isHighlight && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowViews(true); }}
            className="flex h-8 items-center gap-1 rounded-full bg-white/15 px-2.5 text-white/90"
            aria-label="See who viewed this story"
          >
            <Eye size={15} />
            <span className="text-[11px] font-bold">{viewCount}</span>
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); setPaused(!paused); }} className="h-8 w-8 flex items-center justify-center text-white/80" aria-label={paused ? 'Play' : 'Pause'}>
          {paused ? <Play size={18} /> : <Pause size={18} />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="h-8 w-8 flex items-center justify-center text-white/80" aria-label="Close story">
          <X size={20} />
        </button>
      </div>

      {/* Story content: photo story → image; text story → styled text */}
      {mediaUrl ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <img src={mediaUrl} alt="" className="h-full w-full object-contain" />
          {storyText && (
            <div className="absolute bottom-24 left-0 right-0 px-8 text-center">
              <div className="text-[20px] font-black text-white leading-tight drop-shadow-lg">{storyText}</div>
            </div>
          )}
        </div>
      ) : (
        <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${story.bg || 'from-[#1a1505] to-[#3a2e12]'}`}>
          <div className="text-center px-8">
            <div className="text-[24px] font-black text-white leading-tight drop-shadow-lg" style={{ fontFamily: story.font || undefined, fontSize: story.fontSize || undefined }}>
              {storyText}
            </div>
          </div>
        </div>
      )}

      {/* Navigation arrows (desktop) */}
      <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/80" aria-label="Previous story">
        <ChevronLeft size={22} />
      </button>
      <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/80" aria-label="Next story">
        <ChevronRight size={22} />
      </button>

      {/* Viewed-by sheet (author only) */}
      {showViews && (
        <div
          className="absolute inset-0 z-20 flex flex-col justify-end bg-black/60"
          onClick={(e) => { e.stopPropagation(); setShowViews(false); }}
        >
          <div
            className="rounded-t-3xl bg-card px-5 pb-8 pt-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[15px] font-bold text-white">
                Viewed by {viewers ? viewers.length : '…'}
              </span>
              <button
                onClick={() => setShowViews(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80"
                aria-label="Close viewers"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[45vh] overflow-y-auto no-scrollbar">
              {viewers === null ? (
                <div className="py-6 text-center">
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
                </div>
              ) : viewers.length === 0 ? (
                <div className="py-6 text-center text-[13px] text-text3">
                  No views yet — share your story!
                </div>
              ) : (
                viewers.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => { setShowViews(false); onClose(); router.push(`/profile/${v.id}`); }}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/5"
                  >
                    <Avatar src={v.avatar || null} name={v.name} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-bold text-white">{v.name}</div>
                      <div className="truncate text-[11px] text-text3">{v.handle || ''}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save-to-highlight sheet (own live stories) */}
      {showSave && (
        <div
          className="absolute inset-0 z-20 flex flex-col justify-end bg-black/60"
          onClick={(e) => { e.stopPropagation(); setShowSave(false); }}
        >
          <div
            className="rounded-t-3xl bg-card px-5 pb-8 pt-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[15px] font-bold text-white">Save to highlight</span>
              <button
                onClick={() => setShowSave(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80"
                aria-label="Close save sheet"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mb-4 flex gap-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="New highlight name…"
                maxLength={40}
                className="flex-1 rounded-xl border border-linesoft bg-white/[0.04] px-3 py-2.5 text-[13px] text-white outline-none placeholder:text-text3 focus:border-gold"
              />
              <button
                onClick={() => handleSaveToHighlight(newTitle || 'Highlight')}
                disabled={savingHl}
                className="flex items-center gap-1 rounded-xl bg-gold-grad px-3.5 text-[12px] font-extrabold text-[#1a1300] disabled:opacity-50"
              >
                <Plus size={14} /> New
              </button>
            </div>
            <div className="max-h-[40vh] overflow-y-auto no-scrollbar">
              {hlTitles === null ? (
                <div className="py-5 text-center">
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
                </div>
              ) : hlTitles.length === 0 ? (
                <div className="py-4 text-center text-[12.5px] text-text3">
                  No highlights yet — create one above.
                </div>
              ) : (
                hlTitles.map((title) => (
                  <button
                    key={title}
                    onClick={() => handleSaveToHighlight(title)}
                    disabled={savingHl}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-white/5 disabled:opacity-50"
                  >
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-[10px] font-extrabold text-gold-hi">
                      {title.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="flex-1 truncate text-[13.5px] font-bold text-white">{title}</span>
                    <span className="text-[11px] font-bold text-gold">Add</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}