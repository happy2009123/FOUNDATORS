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
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

async function fetchUser(key) {
  try {
    const snap = await getDoc(doc(db, 'users', key));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
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
  const progressIntervals = useRef({});
  const touchStartRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'reels'), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const fetched = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            authorKey: data.authorKey || '',
            text: data.text || '',
            details: data.text || '',
            videoUrl: data.videoUrl || null,
            type: data.effect || 'update',
            audio: data.sound || 'Original Audio',
            likes: data.likes || 0,
            comments: data.comments || 0,
            shares: data.shares || 0,
            gradient: 'from-purple-900 to-blue-900',
          };
        });
        setReels(fetched);
        setLoading(false);
      },
      (err) => {
        console.warn('Reels listener error:', err);
        setReels([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const currentReel = reels[currentIndex];

  useEffect(() => {
    if (!currentReel) return;
    const userKey = currentReel.authorKey;
    if (userKey && !reelUsers[userKey]) {
      fetchUser(userKey).then((u) => {
        if (u) setReelUsers((prev) => ({ ...prev, [userKey]: u }));
      });
    }
  }, [currentReel, reelUsers]);

  useEffect(() => {
    if (!currentReel) return;
    if (pausedReels[currentReel.id]) return;
    if (progressIntervals.current[currentReel.id]) {
      clearInterval(progressIntervals.current[currentReel.id]);
    }
    progressIntervals.current[currentReel.id] = setInterval(() => {
      setProgress((prev) => {
        const current = prev[currentReel.id] || 0;
        if (current >= 100) return { ...prev, [currentReel.id]: 0 };
        return { ...prev, [currentReel.id]: current + 0.5 };
      });
    }, 100);
    return () => {
      if (progressIntervals.current[currentReel.id]) {
        clearInterval(progressIntervals.current[currentReel.id]);
      }
    };
  }, [currentIndex, pausedReels, currentReel?.id]);

  const toggleLike = useCallback((reelId) => {
    vibrate('light');
    setLikedReels((prev) => ({ ...prev, [reelId]: !prev[reelId] }));
    if (!likedReels[reelId]) {
      setLikeAnimations((prev) => ({ ...prev, [reelId]: true }));
      setTimeout(() => setLikeAnimations((prev) => ({ ...prev, [reelId]: false })), 600);
    }
  }, [likedReels, vibrate]);

  const toggleBookmark = useCallback((reelId) => {
    vibrate('light');
    setBookmarkedReels((prev) => ({ ...prev, [reelId]: !prev[reelId] }));
  }, [vibrate]);

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
      setLikedReels((prev) => ({ ...prev, [reelId]: true }));
      const id = `heart_${Date.now()}_${Math.random()}`;
      setDoubleTapHearts((prev) => [...prev, { id, reelId }]);
      setTimeout(() => {
        setDoubleTapHearts((prev) => prev.filter((h) => h.id !== id));
      }, 1000);
    }
    lastTapRef.current = now;
  }, [vibrate]);

  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartRef.current === null) return;
    const diff = touchStartRef.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 80) {
      if (diff > 0 && currentIndex < reels.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      }
    }
    touchStartRef.current = null;
  }, [currentIndex, reels.length]);

  const handleWheel = useCallback((e) => {
    if (e.deltaY > 50 && currentIndex < reels.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (e.deltaY < -50 && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex, reels.length]);

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
        className="relative h-dvh w-full overflow-hidden bg-ink"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {/* Progress Bar */}
        <div className="absolute left-0 right-0 top-0 z-30 flex gap-1 px-2 pt-2">
          {reels.map((reel, i) => (
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
        {reels.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center absolute inset-0 z-10">
            <p className="text-[14px] font-bold text-text2">No reels yet</p>
            <p className="text-[12px] text-text3 mt-1">Be the first to create one!</p>
            <button onClick={() => router.push('/reels/create')} className="mt-4 rounded-full bg-gold-grad px-5 py-2.5 text-[12px] font-bold text-[#1a1300]">
              Create Reel
            </button>
          </div>
        )}
        {reels.map((reel, index) => {
          const reelUser = reelUsers[reel.authorKey];
          const isLiked = !!likedReels[reel.id];
          const isBookmarked = !!bookmarkedReels[reel.id];
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
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-b ${reel.gradient}`}>
                <div className="absolute inset-0 bg-black/30" />
              </div>

              {/* Clickable Area */}
              <div
                className="relative z-10 flex flex-1 flex-col"
                onClick={() => handleDoubleTap(reel.id)}
              >
                {/* Top User Info */}
                <div className="flex items-center gap-3 px-4 pt-14">
                  <img
                    src={reelUser?.avatar}
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
                          className="animate-[scaleUp_0.6s_ease-out_forwards] fill-red-500 text-red-500"
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
                      {formatCount(reel.likes + (isLiked ? 1 : 0))}
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
                    <div className="absolute right-14 bottom-28 z-30 w-48 rounded-2xl border border-linesoft bg-card p-2 shadow-xl">
                      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-text2 hover:bg-white/5" onClick={(e) => { e.stopPropagation(); setShowMore(null); }}>Report</button>
                      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-text2 hover:bg-white/5" onClick={(e) => { e.stopPropagation(); setShowMore(null); }}>Not interested</button>
                      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-text2 hover:bg-white/5" onClick={(e) => { e.stopPropagation(); setShowMore(null); }}>Copy link</button>
                      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-red hover:bg-white/5" onClick={(e) => { e.stopPropagation(); setShowMore(null); }}>Block {reelUser?.name}</button>
                    </div>
                  )}

                  {/* Avatar */}
                  <div className="mt-1">
                    <div className="relative">
                      <img
                        src={reelUser?.avatar}
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
                  {index + 1} / {reels.length}
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
        {currentIndex < reels.length - 1 && (
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
                { label: 'Report', icon: '⚠️', action: () => { showToast('Reported'); setShowShare(null); } },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => { vibrate('light'); item.action(); setShowShare(null); }}
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
