'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Send, Pause, Play } from 'lucide-react';
import { useHaptics } from '@/lib/useHaptics';
import Avatar from './Avatar';

const STORY_DURATION = 5000;

const STORIES_DATA = {
  sophia: {
    name: 'Sophia Turner',
    avatar: 'https://i.pravatar.cc/160?img=47',
    items: [
      { id: 's1', type: 'gradient', bg: 'from-purple-600 to-pink-500', text: 'Just closed our seed round! 🎉', emoji: '🚀' },
      { id: 's2', type: 'gradient', bg: 'from-amber-500 to-orange-600', text: 'Building the future of investing', emoji: '💰' },
    ],
  },
  arjun: {
    name: 'Arjun Verma',
    avatar: 'https://i.pravatar.cc/160?img=12',
    items: [
      { id: 'a1', type: 'gradient', bg: 'from-blue-600 to-cyan-500', text: 'Learnova just hit 10K users! 📈', emoji: '🎓' },
    ],
  },
  meera: {
    name: 'Meera Kapoor',
    avatar: 'https://i.pravatar.cc/160?img=44',
    items: [
      { id: 'm1', type: 'gradient', bg: 'from-green-500 to-emerald-600', text: 'HealthSync is now live in 3 cities', emoji: '🏥' },
      { id: 'm2', type: 'gradient', bg: 'from-rose-500 to-red-600', text: 'Looking for a Flutter developer', emoji: '👨‍💻' },
    ],
  },
  rohan: {
    name: 'Rohan Singh',
    avatar: 'https://i.pravatar.cc/160?img=15',
    items: [
      { id: 'r1', type: 'gradient', bg: 'from-violet-600 to-purple-700', text: 'FitTrack beta launching next week', emoji: '💪' },
    ],
  },
  daniel: {
    name: 'Daniel Brooks',
    avatar: 'https://i.pravatar.cc/160?img=52',
    items: [
      { id: 'd1', type: 'gradient', bg: 'from-sky-500 to-blue-600', text: 'Open to new projects!', emoji: '💻' },
    ],
  },
  emily: {
    name: 'Emily Carter',
    avatar: 'https://i.pravatar.cc/160?img=45',
    items: [
      { id: 'e1', type: 'gradient', bg: 'from-pink-500 to-rose-500', text: 'Growth tips thread 🧵', emoji: '📊' },
    ],
  },
  ishita: {
    name: 'Ishita Rao',
    avatar: 'https://i.pravatar.cc/160?img=48',
    items: [
      { id: 'i1', type: 'gradient', bg: 'from-teal-500 to-cyan-600', text: 'New design system drop ✨', emoji: '🎨' },
    ],
  },
  james: {
    name: 'James Wilson',
    avatar: 'https://i.pravatar.cc/160?img=14',
    items: [
      { id: 'j1', type: 'gradient', bg: 'from-indigo-500 to-violet-600', text: 'Product roadmap for Q3 is ready', emoji: '📋' },
    ],
  },
};

export default function StoryViewer({ initialUser, onClose }) {
  const { vibrate } = useHaptics();
  const [currentUser, setCurrentUser] = useState(initialUser || 'sophia');
  const [currentItem, setCurrentItem] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reaction, setReaction] = useState(null);
  const timerRef = useRef(null);
  const progressRef = useRef(null);

  const story = STORIES_DATA[currentUser];
  const items = story?.items || [];
  const totalItems = items.length;

  const goNext = useCallback(() => {
    if (currentItem < totalItems - 1) {
      setCurrentItem((p) => p + 1);
      setProgress(0);
      setReaction(null);
    } else {
      const keys = Object.keys(STORIES_DATA);
      const idx = keys.indexOf(currentUser);
      if (idx < keys.length - 1) {
        setCurrentUser(keys[idx + 1]);
        setCurrentItem(0);
        setProgress(0);
        setReaction(null);
      } else {
        onClose();
      }
    }
  }, [currentItem, totalItems, currentUser, onClose]);

  const goPrev = useCallback(() => {
    if (currentItem > 0) {
      setCurrentItem((p) => p - 1);
      setProgress(0);
      setReaction(null);
    } else {
      const keys = Object.keys(STORIES_DATA);
      const idx = keys.indexOf(currentUser);
      if (idx > 0) {
        const prevKey = keys[idx - 1];
        const prevStory = STORIES_DATA[prevKey];
        setCurrentUser(prevKey);
        setCurrentItem(prevStory.items.length - 1);
        setProgress(0);
        setReaction(null);
      }
    }
  }, [currentItem, currentUser]);

  useEffect(() => {
    if (paused) return;
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
  }, [currentUser, currentItem, paused, goNext]);

  const handleTap = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) goPrev();
    else goNext();
  }, [goNext, goPrev]);

  const handleReact = useCallback((emoji) => {
    vibrate('medium');
    setReaction(emoji);
    setTimeout(() => setReaction(null), 2000);
  }, [vibrate]);

  if (!story || !items[currentItem]) return null;
  const item = items[currentItem];

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
        <Avatar src={story.avatar} name={story.name} size={36} />
        <div className="flex-1">
          <div className="text-[13px] font-bold text-white">{story.name}</div>
          <div className="text-[10px] text-white/60">{currentItem + 1} of {totalItems}</div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setPaused(!paused); }} className="h-8 w-8 flex items-center justify-center text-white/80" aria-label={paused ? 'Play' : 'Pause'}>
          {paused ? <Play size={18} /> : <Pause size={18} />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="h-8 w-8 flex items-center justify-center text-white/80" aria-label="Close story">
          <X size={20} />
        </button>
      </div>

      {/* Story content */}
      <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${item.bg}`}>
        <div className="text-center px-8">
          <div className="text-5xl mb-4">{item.emoji}</div>
          <div className="text-[22px] font-black text-white leading-tight drop-shadow-lg">{item.text}</div>
        </div>
      </div>

      {/* Navigation arrows (desktop) */}
      <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/80" aria-label="Previous story">
        <ChevronLeft size={22} />
      </button>
      <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/80" aria-label="Next story">
        <ChevronRight size={22} />
      </button>

      {/* Reaction overlay */}
      {reaction && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <span className="text-7xl animate-[scaleIn_0.3s_ease-out]">{reaction}</span>
        </div>
      )}

      {/* Bottom reactions */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-4 pb-8 pt-16 bg-gradient-to-t from-black/60 to-transparent">
        {['❤️', '🔥', '👏', '😂', '😮', '😢'].map((emoji) => (
          <button
            key={emoji}
            onClick={(e) => { e.stopPropagation(); handleReact(emoji); }}
            className="text-2xl active:scale-125 transition-transform"
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
