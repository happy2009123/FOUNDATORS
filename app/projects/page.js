'use client';

// ─────────────────────────────────────────────────────────────
// PROJECTS LIST — real projects only (no demo rows). Category
// chips filter, "My projects" toggle, cards open the project
// detail page where people apply, follow and ask questions.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bot, CheckCircle2, Filter, FolderKanban, Mic, Plus, Rocket, Users } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import SubpageHeader from '@/components/SubpageHeader';
import { listRecentProjects } from '@/lib/copilot';
import { useStore } from '@/lib/store';

export default function Projects() {
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const [real, setReal] = useState([]);
  const [mineOnly, setMineOnly] = useState(false);
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    listRecentProjects()
      .then((list) => {
        if (on) setReal(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => { if (on) setLoading(false); });
    return () => {
      on = false;
    };
  }, []);

  const rows = useMemo(
    () =>
      real.map((p) => ({
        id: p.id,
        name: p.name,
        desc: p.description || 'Founder-built project on FOUNDATORS',
        tech:
          Array.isArray(p.skillsNeeded) && p.skillsNeeded.length
            ? p.skillsNeeded.join(' · ')
            : Array.isArray(p.tech) && p.tech.length
              ? p.tech.join(' · ')
              : p.category || 'MVP build',
        stage: p.stage || 'Building',
        category: p.category || 'Other',
        progress: `${Math.max(0, Math.min(100, Number(p.progress) || 0))}%`,
        team: `${p.membersCount || (Array.isArray(p.members) ? p.members.length : 1)}`,
        mine: Boolean(profile && p.ownerUid === profile.id),
      })),
    [real, profile?.id]
  );

  const categories = useMemo(() => {
    const set = new Set(rows.map((r) => r.category).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [rows]);

  const visibleRows = rows.filter(
    (r) => (!mineOnly || r.mine) && (category === 'All' || r.category === category)
  );

  return (
    <MainScreenShell>
      <SubpageHeader title="Projects" />
      <div className="no-scrollbar px-[18px] pb-6">
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => router.push('/projects/new')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold-grad py-3 text-[11px] font-black text-[#171100]"
          >
            <Plus size={15} /> Create project
          </button>
          <button
            onClick={() => router.push('/copilot')}
            className="flex h-11 items-center gap-1.5 rounded-xl border border-line px-3 text-[11px] font-black text-gold"
          >
            <Bot size={15} /> Copilot
          </button>
          <button
            onClick={() => setMineOnly((v) => !v)}
            aria-pressed={mineOnly}
            aria-label="Filter: my projects only"
            className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${mineOnly ? 'border-gold bg-gold/15 text-gold' : 'border-line text-gold'}`}
          >
            <Filter size={16} />
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-extrabold">Projects looking for builders</h2>
            <p className="text-[10px] text-text3">Idea → Team → Build → Launch</p>
          </div>
          <FolderKanban size={18} className="text-gold" />
        </div>

        {categories.length > 1 ? (
          <div className="no-scrollbar -mx-[18px] mt-3 flex gap-1.5 overflow-x-auto px-[18px]">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex-none rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  category === c
                    ? 'border-gold bg-gold/15 text-gold-hi'
                    : 'border-linesoft text-text2'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-3 space-y-3">
          {loading && real.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-text3">Loading projects…</p>
          ) : visibleRows.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[12.5px] text-text2">
                {mineOnly
                  ? 'You have no projects yet — create one and it will show up here.'
                  : category !== 'All'
                    ? `No projects in ${category} yet.`
                    : 'No projects yet — be the first to post what you are building.'}
              </p>
              <button
                onClick={() => router.push('/projects/new')}
                className="mt-4 rounded-full bg-gold-grad px-5 py-2.5 text-[12px] font-black text-[#171100]"
              >
                <Plus size={13} className="mr-1 inline" /> Create the first project
              </button>
            </div>
          ) : (
            visibleRows.map((p) => (
              <div
                key={p.id}
                className="gold-card cursor-pointer p-4"
                onClick={() => router.push(`/projects/${p.id}`)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-[rgba(217,172,61,.06)] text-gold">
                    <Rocket size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <div>
                        <div className="text-[14px] font-extrabold">{p.name}</div>
                        <div className="mt-0.5 text-[10.5px] text-text2">{p.desc}</div>
                      </div>
                      <span className="flex-none rounded-full border border-line px-2 py-1 text-[9px] font-bold text-gold">
                        {p.stage}
                      </span>
                    </div>
                    <div className="mt-2 text-[10px] text-gold-hi">
                      {p.tech}
                      {p.mine ? ' · yours' : ''}
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                  <div style={{ width: p.progress }} className="h-full rounded-full bg-gold-grad" />
                </div>
                <div className="mt-2 flex items-center justify-between text-[9.5px] text-text3">
                  <span>{p.progress} complete</span>
                  <span className="flex items-center gap-1">
                    <Users size={11} /> {p.team}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/projects/${p.id}`);
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2.5 text-[10.5px] font-bold text-gold-hi"
                  >
                    Open project <ArrowRight size={13} />
                  </button>
                  {p.mine ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/copilot?project=${p.id}`);
                      }}
                      className="rounded-xl border border-line px-3 py-2.5 text-[10.5px] font-bold text-gold-hi"
                    >
                      Board
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-linesoft bg-card p-4">
          <div className="flex items-center gap-2 text-[12px] font-extrabold">
            <CheckCircle2 size={16} className="text-brandgreen" /> Project workspace ready
          </div>
          <p className="mt-1 text-[10.5px] leading-5 text-text2">
            Tasks, milestones, files, team chat and AI assistance can live inside every project.
          </p>
        </div>
        <button
          onClick={() => {
            const first = rows[0];
            router.push(first ? `/voice/create?project=${first.id}` : '/voice/create');
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line py-3 text-[11.5px] font-black text-gold-hi active:bg-white/5"
        >
          <Mic size={15} /> Discuss in a Voice room
        </button>
      </div>
    </MainScreenShell>
  );
}
