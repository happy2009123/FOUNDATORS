'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Sparkles, Eye, TrendingUp, Code2, Users } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import ScrollToTop from '@/components/ScrollToTop';
import { useStore } from '@/lib/store';
import { TEMPLATES, CATEGORIES, THEMES } from '@/components/gestures/GestureTemplates';
import { useHaptics } from '@/lib/useHaptics';

export default function GesturesContent() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const gestures = useStore((s) => s.gestures);
  const { vibrate } = useHaptics();

  const filtered = useMemo(
    () => activeCategory === 'all' ? TEMPLATES : TEMPLATES.filter((t) => t.category === activeCategory),
    [activeCategory]
  );

  return (
    <MainScreenShell>
      <div ref={scrollRef} className="no-scrollbar overflow-y-auto pb-6">
        {/* Header */}
        <div className="page-enter px-[18px] pt-3">
          <div className="gold-card relative overflow-hidden p-5">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[rgba(217,172,61,.1)] opacity-40" />
            <div className="relative">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-gold">
                <Sparkles size={13} /> Gestures
              </div>
              <h1 className="mt-2 text-[22px] font-black leading-tight">
                Animated greetings<br />
                <span className="text-gold-gradient">for the people you love.</span>
              </h1>
              <p className="mt-2 max-w-[280px] text-[11px] leading-5 text-text2">
                Pick a template, add your message, share it. Proposals, apologies, birthdays and more.
              </p>
            </div>
          </div>
        </div>

        {/* Create button */}
        <div className="px-[18px] mt-4 flex gap-2.5">
          <button
            onClick={() => { vibrate('light'); router.push('/gestures/create'); }}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gold-grad py-3.5 text-[12px] font-black text-[#1a1300]"
          >
            <Plus size={16} /> Create a Gesture
          </button>
          <button
            onClick={() => { vibrate('light'); router.push('/gestures/trending'); }}
            className="flex items-center gap-2 rounded-2xl border border-linesoft bg-card px-4 py-3.5 text-[12px] font-bold text-gold"
          >
            <TrendingUp size={16} /> Trending
          </button>
          <button
            onClick={() => { vibrate('light'); router.push('/gestures/community'); }}
            className="flex items-center gap-2 rounded-2xl border border-linesoft bg-card px-4 py-3.5 text-[12px] font-bold text-gold"
          >
            <Code2 size={16} /> Community
          </button>
          <button
            onClick={() => { vibrate('light'); router.push('/gestures/collab'); }}
            className="flex items-center gap-2 rounded-2xl border border-linesoft bg-card px-4 py-3.5 text-[12px] font-bold text-gold"
          >
            <Users size={16} /> Group Card
          </button>
        </div>

        {/* Category tabs */}
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-[18px] pb-2">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => { setActiveCategory(cat.key); vibrate('light'); }}
                className={`flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-[11.5px] font-bold transition-all ${
                  active
                    ? 'border-gold bg-[rgba(217,172,61,0.15)] text-gold'
                    : 'border-linesoft bg-transparent text-text3'
                }`}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Template grid */}
        <div className="mt-3 grid grid-cols-2 gap-2.5 px-[18px]">
          {filtered.map((t) => {
            const Preview = t.component;
            return (
              <button
                key={t.key}
                onClick={() => { vibrate('light'); router.push(`/gestures/create?template=${t.key}`); }}
                className="glass-card overflow-hidden text-left"
              >
                <div className="h-[140px] overflow-hidden">
                  <div style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: '182%', height: '182%' }}>
                    <Preview name="Priya" message="You are amazing!" theme={THEMES.gold} />
                  </div>
                </div>
                <div className="border-t border-linesoft px-3 py-2.5">
                  <div className="text-[12px] font-extrabold">{t.emoji} {t.name}</div>
                  <div className="mt-0.5 text-[10px] text-text3">{t.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* My Gestures */}
        {gestures.length > 0 && (
          <div className="mt-6 px-[18px]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold">My Gestures</h2>
              <span className="text-[11px] text-text3">{gestures.length} created</span>
            </div>
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
              {gestures.map((g) => {
                const tpl = TEMPLATES.find((t) => t.key === g.templateKey);
                if (!tpl) return null;
                const totalReactions = Object.values(g.reactions || {}).reduce((a, b) => a + b, 0);
                return (
                  <button
                    key={g.id}
                    onClick={() => router.push(`/gestures/view?id=${g.id}`)}
                    className="glass-card min-w-[140px] p-3 text-left"
                  >
                    <div className="text-xl">{tpl.emoji}</div>
                    <div className="mt-2 text-[11px] font-bold">{tpl.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-text3">
                      <span className="flex items-center gap-0.5"><Eye size={10} /> {g.views}</span>
                      <span>❤️ {totalReactions}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <ScrollToTop scrollRef={scrollRef} />
    </MainScreenShell>
  );
}
