'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Code2, Star, GitFork, ArrowLeft, Search } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import ScrollToTop from '@/components/ScrollToTop';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'hi', label: 'Hi' },
  { key: 'propose', label: 'Propose' },
  { key: 'sorry', label: 'Sorry' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'thankyou', label: 'Thank You' },
  { key: 'missyou', label: 'Miss You' },
  { key: 'congrats', label: 'Congrats' },
];

const CATEGORY_BADGE = {
  hi: 'bg-[rgba(0,200,83,0.12)] text-[#00c853]',
  propose: 'bg-[rgba(233,30,99,0.12)] text-[#e91e63]',
  sorry: 'bg-[rgba(33,150,243,0.12)] text-[#2196f3]',
  birthday: 'bg-[rgba(217,172,61,0.12)] text-[#D9AC3D]',
  thankyou: 'bg-[rgba(156,39,176,0.12)] text-[#9c27b0]',
  missyou: 'bg-[rgba(255,87,34,0.12)] text-[#ff5722]',
  congrats: 'bg-[rgba(76,175,80,0.12)] text-[#4caf50]',
};

async function fetchUser(key) {
  try {
    const snap = await getDoc(doc(db, 'users', key));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch {
    return null;
  }
}

export default function CommunityTemplatesPage() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('stars');
  const [authors, setAuthors] = useState({});

  const communityTemplates = useStore((s) => s.communityTemplates);
  const starTemplate = useStore((s) => s.starTemplate);
  const userKey = useStore((s) => s.profile?.id);
  const featuredTemplates = useStore((s) => s.featuredTemplates);
  const { vibrate } = useHaptics();

  useEffect(() => {
    const keys = [...new Set(communityTemplates.map((t) => t.authorKey).filter(Boolean))];
    keys.forEach((key) => {
      if (!authors[key]) {
        fetchUser(key).then((u) => { if (u) setAuthors((prev) => ({ ...prev, [key]: u })); });
      }
    });
  }, [communityTemplates]);

  const filtered = useMemo(() => {
    let templates = [...communityTemplates];

    if (activeCategory !== 'all') {
      templates = templates.filter((t) => t.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }

    templates.sort((a, b) => {
      if (sortBy === 'stars') return b.stars - a.stars;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return templates;
  }, [communityTemplates, activeCategory, search, sortBy]);

  function handleStar(e, templateId) {
    e.stopPropagation();
    vibrate('light');
    starTemplate(templateId, userKey);
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
                onClick={() => router.push('/gestures')}
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-gold">
                <Code2 size={13} /> 🧩 Community Templates
              </div>
              <h1 className="mt-2 text-[22px] font-black leading-tight">
                Community Templates
              </h1>
              <p className="mt-2 max-w-[280px] text-[11px] leading-5 text-text2">
                Created by the community. See the code. Fork it. Make it yours.
              </p>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-[18px] mt-4">
          <div className="flex items-center gap-2 rounded-2xl border border-linesoft bg-card px-3.5 py-2.5">
            <Search size={16} className="text-text3 flex-none" />
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-[12px] text-white placeholder:text-text3 outline-none"
            />
          </div>
        </div>

        {/* Sort toggle */}
        <div className="px-[18px] mt-3 flex gap-2">
          {[
            { key: 'stars', label: 'Most Stars' },
            { key: 'newest', label: 'Newest' },
          ].map((opt) => {
            const active = sortBy === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => { setSortBy(opt.key); vibrate('light'); }}
                className={`flex-none whitespace-nowrap rounded-full border px-4 py-2 text-[11.5px] font-bold transition-all ${
                  active
                    ? 'border-gold bg-[rgba(217,172,61,0.15)] text-gold'
                    : 'border-linesoft bg-transparent text-text3'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Category tabs */}
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-[18px] pb-2">
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
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Template grid */}
        <div className="mt-3 px-[18px]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="text-5xl">🧩</div>
              <div className="mt-4 text-[14px] font-extrabold">No templates yet.</div>
              <div className="mt-1 text-[11px] text-text2">Be the first to publish!</div>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => router.push('/gestures/editor')}
                  className="rounded-full bg-gold-grad px-6 py-2.5 text-[11px] font-black text-[#1a1300]"
                >
                  Create from Scratch
                </button>
                <button
                  onClick={() => router.push('/gestures/create')}
                  className="rounded-full border border-linesoft bg-card px-6 py-2.5 text-[11px] font-bold text-text2"
                >
                  Use a Template
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {filtered.map((t) => {
                const author = authors[t.authorKey];
                const isStarred = t.starredBy?.[userKey];
                return (
                  <button
                    key={t.id}
                    onClick={() => { vibrate('light'); router.push(`/gestures/community/detail?id=${t.id}`); }}
                    className="glass-card overflow-hidden text-left"
                  >
                    <div className="px-3 pt-3 pb-2">
                      {featuredTemplates?.includes(t.id) && (
                        <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-[rgba(217,172,61,0.15)] px-2 py-0.5 text-[9px] font-bold text-gold">
                          ⭐ Featured
                        </div>
                      )}
                      <div className="text-[12px] font-extrabold leading-tight">{t.name}</div>
                      <div className="mt-1 text-[10px] leading-4 text-text2 line-clamp-2">{t.description}</div>
                    </div>

                    <div className="border-t border-linesoft px-3 py-2.5">
                      <div className="text-[9px] text-text3">
                        by {author?.name || 'Unknown'}
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={(e) => handleStar(e, t.id)}
                            className="flex items-center gap-1"
                          >
                            <Star
                              size={12}
                              className={isStarred ? 'fill-[#D9AC3D] text-[#D9AC3D]' : 'text-text3'}
                            />
                            <span className={`text-[10px] font-bold ${isStarred ? 'text-[#D9AC3D]' : 'text-text3'}`}>
                              {t.stars}
                            </span>
                          </button>
                          <span className="flex items-center gap-1 text-[10px] text-text3">
                            <GitFork size={11} /> {t.forks}
                          </span>
                        </div>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[8px] font-bold ${CATEGORY_BADGE[t.category] || 'bg-white/5 text-text3'}`}
                        >
                          {t.category}
                        </span>
                      </div>
                    </div>

                    {/* View Code label */}
                    <div className="flex items-center justify-center border-t border-linesoft py-2 text-[10px] font-bold text-gold">
                      <Code2 size={11} className="mr-1" /> View Code
                    </div>
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
