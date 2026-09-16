'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, ArrowLeft, Eye, Heart, Share2 } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import ScrollToTop from '@/components/ScrollToTop';
import { useStore } from '@/lib/store';
import { TEMPLATES, THEMES } from '@/components/gestures/GestureTemplates';

const TIME_TABS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'all', label: 'All Time' },
];

const BADGE_STYLES = [
  'border-[#D9AC3D] bg-[rgba(217,172,61,0.12)] shadow-[0_0_12px_rgba(217,172,61,0.2)]',
  'border-[#C0C0C0] bg-[rgba(192,192,192,0.1)] shadow-[0_0_10px_rgba(192,192,192,0.15)]',
  'border-[#CD7F32] bg-[rgba(205,127,50,0.1)] shadow-[0_0_10px_rgba(205,127,50,0.15)]',
];

export default function TrendingPage() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const [timeTab, setTimeTab] = useState('week');
  const gestures = useStore((s) => s.gestures);

  const sorted = useMemo(() => {
    const now = Date.now();
    const filtered = gestures.filter((g) => {
      if (timeTab === 'today') {
        return now - new Date(g.createdAt).getTime() < 86400000;
      }
      if (timeTab === 'week') {
        return now - new Date(g.createdAt).getTime() < 604800000;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const aTotal = Object.values(a.reactions || {}).reduce((s, v) => s + v, 0);
      const bTotal = Object.values(b.reactions || {}).reduce((s, v) => s + v, 0);
      if (bTotal !== aTotal) return bTotal - aTotal;
      return b.views - a.views;
    });
  }, [gestures, timeTab]);

  function totalReactions(g) {
    return Object.values(g.reactions || {}).reduce((s, v) => s + v, 0);
  }

  return (
    <MainScreenShell>
      <div ref={scrollRef} className="no-scrollbar overflow-y-auto pb-6">
        {/* Header */}
        <div className="page-enter px-[18px] pt-3">
          <div className="gold-card relative overflow-hidden p-5">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[rgba(217,172,61,.1)] opacity-40" />
            <div className="relative">
              <button
                onClick={() => router.back()}
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-gold">
                <TrendingUp size={13} /> 🔥 Trending
              </div>
              <h1 className="mt-2 text-[22px] font-black leading-tight">
                Trending Gestures
              </h1>
              <p className="mt-2 max-w-[280px] text-[11px] leading-5 text-text2">
                Most loved gestures this week
              </p>
            </div>
          </div>
        </div>

        {/* Time filter tabs */}
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-[18px] pb-2">
          {TIME_TABS.map((tab) => {
            const active = timeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setTimeTab(tab.key)}
                className={`flex-none whitespace-nowrap rounded-full border px-4 py-2 text-[11.5px] font-bold transition-all ${
                  active
                    ? 'border-gold bg-[rgba(217,172,61,0.15)] text-gold'
                    : 'border-linesoft bg-transparent text-text3'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Trending list */}
        <div className="mt-3 px-[18px]">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="text-5xl">🔥</div>
              <div className="mt-4 text-[14px] font-extrabold">No trending gestures yet.</div>
              <div className="mt-1 text-[11px] text-text2">Create the first one!</div>
              <button
                onClick={() => router.push('/gestures/create')}
                className="mt-5 rounded-full bg-gold-grad px-6 py-2.5 text-[11px] font-black text-[#1a1300]"
              >
                Create a Gesture
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {sorted.map((g, idx) => {
                const tpl = TEMPLATES.find((t) => t.key === g.templateKey);
                if (!tpl) return null;
                const total = totalReactions(g);
                const isTop3 = idx < 3;

                return (
                  <button
                    key={g.id}
                    onClick={() => router.push(`/gestures/view?id=${g.id}`)}
                    className={`glass-card flex items-center gap-3 p-3 text-left transition-all active:scale-[0.98] ${
                      isTop3 ? `border ${BADGE_STYLES[idx]}` : 'border border-linesoft/50'
                    }`}
                  >
                    {/* Rank */}
                    <div
                      className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-[13px] font-black ${
                        idx === 0
                          ? 'bg-[rgba(217,172,61,0.2)] text-[#D9AC3D]'
                          : idx === 1
                            ? 'bg-[rgba(192,192,192,0.15)] text-[#C0C0C0]'
                            : idx === 2
                              ? 'bg-[rgba(205,127,50,0.15)] text-[#CD7F32]'
                              : 'bg-white/5 text-text3'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    {/* Emoji */}
                    <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-white/5 text-2xl">
                      {tpl.emoji}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-extrabold">{tpl.name}</div>
                      <div className="mt-0.5 truncate text-[10px] text-text3">
                        For {g.customizations?.name || 'Someone'}
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <span className="flex items-center gap-1 text-[10px] text-text3">
                          ❤️ {total}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-text3">
                          <Eye size={10} /> {g.views}
                        </span>
                      </div>
                    </div>

                    {/* Gold shimmer for #1 */}
                    {idx === 0 && (
                      <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-[rgba(217,172,61,0.08)]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <ScrollToTop scrollRef={scrollRef} />
    </MainScreenShell>
  );
}
