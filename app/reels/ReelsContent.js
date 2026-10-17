'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music,
  ArrowLeft,
  Plus,
  X,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import MainScreenShell from '@/components/MainScreenShell';
import ReelComments from '@/components/ReelComments';
import { useHaptics } from '@/lib/useHaptics';
import { getSupabase } from '@/lib/supabase/client';
import { subscribeQuery } from '@/lib/supabase/realtime';
import { mapRow, mapRows } from '@/lib/supabase/db';
import { initialsAvatar } from '@/lib/avatar';

async function fetchUser(key) {
  try {
    const { data } = await getSupabase()
      .from('profiles')
      .select('*')
      .eq('id', key)
      .maybeSingle();
    return data ? mapRow(data) : null;
  } catch {
    return null;
  }
}

function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export default function ReelsContent() {
  const router = useRouter();
  const { vibrate, notification } = useHaptics();
  const followedUsers = useStore((s) => s.followedUsers);
  const toggleFollowUser = useStore((s) => s.toggleFollowUser);
  const showToast = useStore((s) => s.showToast);
  const profile = useStore((s) => s.profile);
  const blockUser = useStore((s) => s.blockUser);
  const hidePost = useStore((s) => s.hidePost);
  const reportItem = useStore((s) => s.reportItem);
  const blockedUsers = useStore((s) => s.blockedUsers);
  const mutedUsers = useStore((s) => s.mutedUsers);
  const hiddenPosts = useStore((s) => s.hiddenPosts);

  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedReels, setLikedReels] = useState({});
  const [bookmarkedReels, setBookmarkedReels] = useState({});
  const [pausedReels, setPausedReels] = useState({});
  const [mutedReels, setMutedReels] = useState({});
  const [doubleTapHearts, setDoubleTapHearts] = useState([]);
  const [likeAnimations, setLikeAnimations] = useState({});
  const [progress, setProgress] = useState({});
  const [showPlayOverlay, setShowPlayOverlay] = useState({});
  const [reelUsers, setReelUsers] = useState({});

  const containerRef = useRef(null);
  const lastTapRef = useRef(0);
  const videoRefs = useRef({});
  const touchStartRef = useRef(null);

  // Optimistic reel toggle shared by double-tap and the heart button.
  const applyReelLike = useCallback((reelId, nextLiked) => {
    setLikedReels((prev) => ({ ...prev, [reelId]: nextLiked }));
    setReels((prev) =>
      prev.map((r) =>
        r.id === reelId ? { ...r, likes: Math.max(0, (r.likes || 0) + (nextLiked ? 1 : -1)) } : r
      )
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    if (!getSupabase()) {
      setReels([]);
      setLoading(false);
      return undefined;
    }
    const unsub = subscribeQuery({
      key: 'reels:feed',
      table: 'reels',
      queryFn: async () => {
        const { data, error } = await getSupabase()
          .from('reels')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        if (error) throw error;
        return mapRows(data || []);
      },
      onData: (rows) => {
        const fetched = rows.map((data) => ({
          id: data.id,
          authorKey: data.userId || '',
          text: data.caption || '',
          details: data.caption || '',
          videoUrl: data.videoUrl || null,
          type: data.effect || 'update',
          audio: data.audioName || 'Original Audio',
          likes: data.likes || 0,
          comments: data.commentsCount || 0,
          shares: data.shares || 0,
          likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
          bookmarkedBy: Array.isArray(data.bookmarkedBy) ? data.bookmarkedBy : [],
          gradient: 'from-purple-900 to-blue-900',
        }));
        setReels(fetched);
        setLoading(false);
      },
      onError: (err) => {
        console.warn('Reels listener error:', err);
        setReels([]);
        setLoading(false);
      },
    });
    return () => unsub();
  }, []);

  // Moderation filter: blocked/muted authors and hidden ("not interested")
  // reels never render. All indexing below runs on this visible list.
  const visibleReels = reels.filter(
    (r) => !hiddenPosts[r.id] && !blockedUsers[r.authorKey] && !mutedUsers[r.authorKey]
  );

  const currentReel = visibleReels[currentIndex];

  // Clamp the index when the visible list shrinks (hide/block mid-swipe).
  useEffect(() => {
    if (visibleReels.length === 0 && currentIndex !== 0) setCurrentIndex(0);
    else if (currentIndex >= visibleReels.length && visibleReels.length > 0) {
      setCurrentIndex(visibleReels.length - 1);
    }
  }, [visibleReels.length, currentIndex]);

  useEffect(() => {
    if (!currentReel) return;
    const userKey = currentReel.authorKey;
    if (userKey && !reelUsers[userKey]) {
      fetchUser(userKey).then((u) => {
        if (u) setReelUsers((prev) => ({ ...prev, [userKey]: u }));
      });
    }
  }, [currentReel, reelUsers]);

  const activeVideoId = currentReel?.id;

  // ── Real playback: play the active reel's <video>, pause the rest ──
  useEffect(() => {
    if (!activeVideoId) return;
    Object.entries(videoRefs.current).forEach(([id, el]) => {
      if (el && id !== activeVideoId) {
        try { el.pause(); } catch {}
      }
    });
    const el = videoRefs.current[activeVideoId];
    if (!el) return; // text-only reel: fallback timer below handles progress
    el.muted = !!mutedReels[activeVideoId];
    if (pausedReels[activeVideoId]) {
      try { el.pause(); } catch {}
      return;
    }
    const p = el.play();
    if (p && p.catch) {
      p.catch(() => {
        // Autoplay with sound was blocked (mobile policy): retry muted and
        // reflect that in the UI so the mute icon tells the truth.
        el.muted = true;
        setMutedReels((prev) => ({ ...prev, [activeVideoId]: true }));
        const p2 = el.play();
        if (p2 && p2.catch) p2.catch(() => {});
      });
    }
  }, [activeVideoId, pausedReels, mutedReels]);

  // Progress bar driven by the real video's timeupdate.
  useEffect(() => {
    const el = activeVideoId ? videoRefs.current[activeVideoId] : null;
    if (!el) return undefined;
    const onTime = () => {
      if (el.duration && Number.isFinite(el.duration)) {
        setProgress((prev) => ({ ...prev, [activeVideoId]: (el.currentTime / el.duration) * 100 }));
      }
    };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onTime);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onTime);
    };
  }, [activeVideoId, reels]);

  // Fallback only: reels WITHOUT a videoUrl (legacy/broken rows) get a
  // timed progress bar so the screen still auto-advances like before.
  useEffect(() => {
    if (!currentReel || currentReel.videoUrl) return undefined;
    if (pausedReels[currentReel.id]) return undefined;
    let pct = progress[currentReel.id] || 0;
    const id = currentReel.id;
    const timer = setInterval(() => {
      pct += 1;
      if (pct >= 100) {
        clearInterval(timer);
        setProgress((prev) => ({ ...prev, [id]: 0 }));
        setCurrentIndex((i) => (i < visibleReels.length - 1 ? i + 1 : i));
        return;
      }
      setProgress((prev) => ({ ...prev, [id]: pct }));
    }, 60);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentReel?.id, currentReel?.videoUrl, pausedReels, visibleReels.length]);

  // Effective like/bookmark: local toggle wins, else fall back to the
  // persisted arrays so state is right on first paint after refresh.
  const isReelLiked = useCallback((reelId) => {
    if (likedReels[reelId] !== undefined) return likedReels[reelId];
    const r = reels.find((x) => x.id === reelId);
    return !!(r && profile?.id && r.likedBy?.includes(profile.id));
  }, [likedReels, reels, profile?.id]);

  const isReelBookmarked = useCallback((reelId) => {
    if (bookmarkedReels[reelId] !== undefined) return bookmarkedReels[reelId];
    const r = reels.find((x) => x.id === reelId);
    return !!(r && profile?.id && r.bookmarkedBy?.includes(profile.id));
  }, [bookmarkedReels, reels, profile?.id]);

  const toggleLike = useCallback((reelId) => {
    vibrate('light');
    const next = !isReelLiked(reelId);
    const prevLikes = reels.find((x) => x.id === reelId)?.likes || 0;
    applyReelLike(reelId, next);
    if (next) {
      setLikeAnimations((prev) => ({ ...prev, [reelId]: true }));
      setTimeout(() => setLikeAnimations((prev) => ({ ...prev, [reelId]: false })), 600);
    }
    try {
      const sb = getSupabase();
      const req = sb && sb.rpc('toggle_reel_like', { p_reel_id: reelId });
      if (req && req.then) {
        req.then(() => {}).catch(() => revertLike());
      }
    } catch {}
    function revertLike() {
      setLikedReels((prev) => {
        const n = { ...prev };
        delete n[reelId];
        return n;
      });
      setReels((prev) => prev.map((r) => (r.id === reelId ? { ...r, likes: prevLikes } : r)));
    }
  }, [vibrate, isReelLiked, reels, applyReelLike]);

  const toggleBookmark = useCallback((reelId) => {
    vibrate('light');
    const next = !isReelBookmarked(reelId);
    setBookmarkedReels((prev) => ({ ...prev, [reelId]: next }));
    try {
      const sb = getSupabase();
      const req = sb && sb.rpc('toggle_reel_bookmark', { p_reel_id: reelId, p_bookmark: next });
      if (req && req.then) {
        req.then(() => {}).catch(() => {
          setBookmarkedReels((prev) => {
            const n = { ...prev };
            delete n[reelId];
            return n;
          });
          showToast('Could not save bookmark');
        });
      }
    } catch {}
  }, [vibrate, isReelBookmarked, showToast]);

  // Share counter bump (persisted via RPC once migration 0013 is run).
  const bumpShare = useCallback((reelId) => {
    setReels((prev) =>
      prev.map((r) => (r.id === reelId ? { ...r, shares: (r.shares || 0) + 1 } : r))
    );
    try {
      const sb = getSupabase();
      sb && sb.rpc('increment_reel_share', { p_reel_id: reelId })?.catch?.(() => {});
    } catch {}
  }, []);

  const togglePause = useCallback((reelId) => {
    setPausedReels((prev) => ({ ...prev, [reelId]: !prev[reelId] }));
    setShowPlayOverlay((prev) => ({ ...prev, [reelId]: true }));
    setTimeout(() => setShowPlayOverlay((prev) => ({ ...prev, [reelId]: false })), 800);
  }, []);

  const toggleMute = useCallback((reelId) => {
    vibrate('light');
    setMutedReels((prev) => ({ ...prev, [reelId]: !prev[reelId] }));
  }, [vibrate]);

  const handleDoubleTap = useCallback((reelId) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      vibrate('medium');
      if (!isReelLiked(reelId)) toggleLike(reelId);
      const id = `heart_${Date.now()}_${Math.random()}`;
      setDoubleTapHearts((prev) => [...prev, { id, reelId }]);
      setTimeout(() => {
        setDoubleTapHearts((prev) => prev.filter((h) => h.id !== id));
      }, 1000);
    }
    lastTapRef.current = now;
  }, [vibrate, isReelLiked, toggleLike]);

  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartRef.current === null) return;
    const diff = touchStartRef.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 80) {
      if (diff > 0 && currentIndex < visibleReels.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      }
    }
    touchStartRef.current = null;
  }, [currentIndex, visibleReels.length]);

  const handleWheel = useCallback((e) => {
    if (e.deltaY > 50 && currentIndex < visibleReels.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (e.deltaY < -50 && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex, visibleReels.length]);

  const [showComments, setShowComments] = useState(null);
  const [showShare, setShowShare] = useState(null);
  const [showMore, setShowMore] = useState(null);
  const [reelReactions, setReelReactions] = useState({});

  const toggleReaction = useCallback((reelId, emoji) => {
    vibrate('medium');
    setReelReactions((prev) => ({
      ...prev,
      [reelId]: prev[reelId] === emoji ? null : emoji,
    }));
  }, [vibrate]);

  const handleShare = useCallback((reelId) => {
    vibrate('light');
    setShowShare(reelId);
  }, [vibrate]);

  const handleFollow = useCallback((userKey) => {
    vibrate('medium');
    toggleFollowUser(userKey);
  }, [vibrate, toggleFollowUser]);

  return (
    <MainScreenShell>
      <div
        ref={containerRef}
        className="fill-stage relative w-full overflow-hidden bg-ink"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {/* Progress Bar */}
        <div className="absolute left-0 right-0 top-0 z-30 flex gap-1 px-2 pt-2">
          {visibleReels.map((reel, i) => (
            <div key={reel.id} className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white transition-all duration-100"
                style={{
                  width: i < currentIndex ? '100%' : i === currentIndex ? `${progress[reel.id] || 0}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="absolute left-4 top-6 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>

        {/* Reel Content */}
        {visibleReels.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center absolute inset-0 z-10">
            <p className="text-[14px] font-bold text-text2">No reels yet</p>
            <p className="text-[12px] text-text3 mt-1">Be the first to create one!</p>
            <button onClick={() => router.push('/reels/create')} className="mt-4 rounded-full bg-gold-grad px-5 py-2.5 text-[12px] font-bold text-[#1a1300]">
              Create Reel
            </button>
          </div>
        )}
        {visibleReels.map((reel, index) => {
          const reelUser = reelUsers[reel.authorKey];
          const isLiked = isReelLiked(reel.id);
          const isBookmarked = isReelBookmarked(reel.id);
          const isMuted = !!mutedReels[reel.id];
          const isPaused = !!pausedReels[reel.id];
          const isFollowed = !!followedUsers[reel.authorKey];
          const isAnimating = !!likeAnimations[reel.id];
          const isActive = index === currentIndex;
          const reelProgress = progress[reel.id] || 0;

          return (
            <div
              key={reel.id}
              className={`absolute inset-0 flex flex-col transition-transform duration-500 ease-out ${
                index < currentIndex ? '-translate-y-full' :
                index > currentIndex ? 'translate-y-full' :
                'translate-y-0'
              }`}
            >
              {/* Gradient Background (shown until the video paints) */}
              <div className={`absolute inset-0 bg-gradient-to-b ${reel.gradient}`}>
                <div className="absolute inset-0 bg-black/30" />
              </div>

              {/* Real video element — plays when active, pauses when not */}
              {reel.videoUrl && (
                <video
                  ref={(el) => {
                    if (el) videoRefs.current[reel.id] = el;
                    else delete videoRefs.current[reel.id];
                  }}
                  src={reel.videoUrl}
                  className="absolute inset-0 h-full w-full bg-black object-cover"
                  playsInline
                  loop
                  preload={isActive ? 'auto' : 'metadata'}
                  muted={isMuted}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePause(reel.id);
                  }}
                />
              )}

              {/* Clickable Area */}
              <div
                className="relative z-10 flex flex-1 flex-col"
                onClick={() => handleDoubleTap(reel.id)}
              >
                {/* Top User Info */}
                <div className="flex items-center gap-3 px-4 pt-14">
                  <img
                    src={reelUser?.avatar || initialsAvatar(reelUser?.name)}
                    alt={reelUser?.name}
                    className="h-10 w-10 rounded-full border-2 border-white object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-white">{reelUser?.name}</span>
                      <span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        {reel.type}
                      </span>
                    </div>
                    <span className="text-[11px] text-white/70">{reelUser?.handle}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollow(reel.authorKey);
                    }}
                    className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all ${
                      isFollowed
                        ? 'border border-white/30 bg-white/10 text-white'
                        : 'bg-white text-black'
                    }`}
                  >
                    {isFollowed ? 'Following' : 'Follow'}
                  </button>
                </div>

                {/* Center Content */}
                <div className="flex flex-1 flex-col items-start justify-end px-4 pb-24">
                  {/* Double Tap Heart Animation */}
                  {doubleTapHearts
                    .filter((h) => h.reelId === reel.id)
                    .map((h) => (
                      <div
                        key={h.id}
                        className="pointer-events-none fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2"
                      >
                        <Heart
                          size={80}
                          className="animate-[scaleUp_0.6s_ease-out_forwards] fill-brandred text-brandred"
                        />
                      </div>
                    ))}

                  {/* Reel Text Content */}
                  <div className="max-w-[80%]">
                    <h2 className="text-[20px] font-black leading-tight text-white drop-shadow-lg">
                      {reel.text}
                    </h2>
                    <div className="mt-3 whitespace-pre-line text-[13px] leading-5 text-white/80 drop-shadow">
                      {reel.details}
                    </div>
                  </div>
                </div>

                {/* Right Action Bar */}
                <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-5">
                  {/* Like */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(reel.id);
                    }}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition-transform ${
                        isAnimating ? 'scale-125' : 'scale-100'
                      }`}
                    >
                      <Heart
                        size={24}
                        className={`transition-colors ${isLiked ? 'fill-[#D9AC3D] text-[#D9AC3D]' : 'text-white'}`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-white">
                      {formatCount(reel.likes)}
                    </span>
                  </button>

                  {/* Comment */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowComments(reel.id);
                    }}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
                      <MessageCircle size={24} className="text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-white">{formatCount(reel.comments)}</span>
                  </button>

                  {/* Share */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(reel.id);
                    }}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
                      <Send size={24} className="text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-white">{formatCount(reel.shares)}</span>
                  </button>

                  {/* Bookmark */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(reel.id);
                    }}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
                      <Bookmark
                        size={24}
                        className={`transition-colors ${isBookmarked ? 'fill-[#D9AC3D] text-[#D9AC3D]' : 'text-white'}`}
                      />
                    </div>
                  </button>

                  {/* More */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMore(showMore === reel.id ? null : reel.id);
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm"
                  >
                    <MoreHorizontal size={24} className="text-white" />
                  </button>

                  {/* More Menu */}
                  {showMore === reel.id && (
                    <div className="absolute right-14 bottom-28 z-30 w-52 rounded-2xl border border-linesoft bg-card p-2 shadow-xl">
                      <button
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-text2 hover:bg-white/5"
                        onClick={(e) => {
                          e.stopPropagation();
                          reportItem({
                            type: 'reel',
                            targetUserId: reel.authorKey,
                            reason: 'reported',
                            details: `Reel ${reel.id}: ${(reel.text || '').slice(0, 120)}`,
                          });
                          showToast('Report submitted — thanks for flagging');
                          setShowMore(null);
                        }}
                      >
                        Report
                      </button>
                      <button
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-text2 hover:bg-white/5"
                        onClick={(e) => {
                          e.stopPropagation();
                          hidePost(reel.id, {
                            text: (reel.text || '').slice(0, 90),
                            authorName: reelUser?.name || '',
                          });
                          showToast('Reel hidden — you\'ll see fewer like this');
                          setShowMore(null);
                        }}
                      >
                        Not interested
                      </button>
                      <button
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-text2 hover:bg-white/5"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard?.writeText(`${window.location.origin}/reels/${reel.id}`);
                          showToast('Link copied');
                          setShowMore(null);
                        }}
                      >
                        Copy link
                      </button>
                      <button
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-brandred hover:bg-white/5"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (reel.authorKey && reel.authorKey !== profile?.id) {
                            blockUser(reel.authorKey);
                            showToast(`Blocked ${reelUser?.name || 'user'}`);
                          }
                          setShowMore(null);
                        }}
                      >
                        Block {reelUser?.name}
                      </button>
                    </div>
                  )}

                  {/* Avatar */}
                  <div className="mt-1">
                    <div className="relative">
                      <img
                        src={reelUser?.avatar || initialsAvatar(reelUser?.name)}
                        alt={reelUser?.name}
                        className="h-10 w-10 rounded-full border-2 border-white object-cover"
                      />
                      <div className="absolute -bottom-1.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-[#D9AC3D]">
                        <Plus size={12} className="text-black" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Bar */}
                <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-16 pb-20">
                  <div className="flex items-center gap-3 px-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                      <Music size={14} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="overflow-hidden">
                        <div className="animate-marquee whitespace-nowrap text-[12px] font-medium text-white">
                          {reel.audio} · {reelUser?.name}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Play/Pause Overlay */}
              {showPlayOverlay[reel.id] && (
                <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm animate-[fadeInOut_0.8s_ease-out_forwards]">
                    {isPaused ? (
                      <Play size={32} className="ml-1 text-white" />
                    ) : (
                      <Pause size={32} className="text-white" />
                    )}
                  </div>
                </div>
              )}

              {/* Mute/Unmute + Pause Controls */}
              <div className="absolute right-3 top-16 z-20 flex flex-col gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePause(reel.id);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"
                >
                  {isPaused ? (
                    <Play size={16} className="ml-0.5 text-white" />
                  ) : (
                    <Pause size={16} className="text-white" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute(reel.id);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"
                >
                  {isMuted ? (
                    <VolumeX size={16} className="text-white" />
                  ) : (
                    <Volume2 size={16} className="text-white" />
                  )}
                </button>
              </div>

              {/* Reel Index Indicator */}
              <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
                <span className="rounded-full bg-black/50 px-3 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                  {index + 1} / {visibleReels.length}
                </span>
              </div>
            </div>
          );
        })}

        {/* Navigation Arrows (Desktop) */}
        {currentIndex > 0 && (
          <button
            onClick={() => setCurrentIndex((prev) => prev - 1)}
            className="absolute left-4 top-1/2 z-30 hidden -translate-y-1/2 rounded-full bg-black/50 p-3 backdrop-blur-sm transition-transform hover:scale-110 md:flex"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        )}
        {currentIndex < visibleReels.length - 1 && (
          <button
            onClick={() => setCurrentIndex((prev) => prev + 1)}
            className="absolute right-16 top-1/2 z-30 hidden -translate-y-1/2 rounded-full bg-black/50 p-3 backdrop-blur-sm transition-transform hover:scale-110 md:flex"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}

        {/* Scroll Hint */}
        {currentIndex === 0 && (
          <div className="pointer-events-none absolute bottom-10 left-1/2 z-20 -translate-x-1/2 animate-bounce">
            <div className="flex flex-col items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="opacity-60">
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span className="text-[9px] font-bold text-white/50">Swipe up</span>
            </div>
          </div>
        )}
      </div>

      {/* Reactions overlay */}
      {Object.entries(reelReactions).filter(([_, v]) => v).map(([reelId, emoji]) => (
        <div key={reelId} className="pointer-events-none fixed bottom-32 left-1/2 z-50 -translate-x-1/2">
          <span className="text-4xl animate-[scaleUp_0.6s_ease-out_forwards]">{emoji}</span>
        </div>
      ))}

      {/* Comment panel */}
      {showComments && (
        <ReelComments reelId={showComments} onClose={() => setShowComments(null)} />
      )}

      {/* Share panel */}
      {showShare && (
        <div className="fixed inset-0 z-[400] flex flex-col justify-end bg-black/60" onClick={() => setShowShare(null)}>
          <div className="rounded-t-3xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <span className="text-[16px] font-bold">Share reel</span>
              <button onClick={() => setShowShare(null)} className="text-text2" aria-label="Close share">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Copy Link', icon: '🔗', action: () => { navigator.clipboard?.writeText(`https://foundators.app/reels/${showShare}`); showToast('Link copied!'); } },
                { label: 'Message', icon: '💬', action: () => router.push('/messages') },
                { label: 'Story', icon: '📱', action: () => showToast('Added to story!') },
                { label: 'Twitter', icon: '🐦', action: () => window.open(`https://twitter.com/intent/tweet?text=Check+this+out&url=https://foundators.app/reels/${showShare}`, '_blank') },
                { label: 'LinkedIn', icon: '💼', action: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=https://foundators.app/reels/${showShare}`, '_blank') },
                { label: 'WhatsApp', icon: '📱', action: () => window.open(`https://wa.me/?text=Check+this+out%20https://foundators.app/reels/${showShare}`, '_blank') },
                { label: 'Email', icon: '📧', action: () => window.open(`mailto:?subject=Check+this+out&body=https://foundators.app/reels/${showShare}`) },
                {
                  label: 'Report',
                  icon: '⚠️',
                  noCount: true,
                  action: () => {
                    const reel = visibleReels.find((r) => r.id === showShare);
                    if (reel) {
                      reportItem({
                        type: 'reel',
                        targetUserId: reel.authorKey,
                        reason: 'reported',
                        details: `Reel ${reel.id}: ${(reel.text || '').slice(0, 120)}`,
                      });
                    }
                    showToast('Report submitted — thanks for flagging');
                  },
                },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    vibrate('light');
                    if (!item.noCount && showShare) bumpShare(showShare);
                    item.action();
                    setShowShare(null);
                  }}
                  className="flex flex-col items-center gap-2"
                  aria-label={`Share via ${item.label}`}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-2xl">
                    {item.icon}
                  </div>
                  <span className="text-[10px] text-text2">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes scaleUp {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1); }
          70% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.8); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 8s linear infinite;
        }
      `}</style>
    </MainScreenShell>
  );
}
