'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bot, CheckCircle2, Filter, FolderKanban, Plus, Rocket, Users } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import SubpageHeader from '@/components/SubpageHeader';
import { listRecentProjects } from '@/lib/copilot';
import { useStore } from '@/lib/store';

const demoProjects = [
  ['AgriFlow', 'Build a farmer-to-machinery rental platform', 'React · Python · Mobile', 'MVP', '76%', '4/5'],
  ['Learnova AI', 'Adaptive AI tutor for students', 'Python · AI · Product', 'Beta', '58%', '3/5'],
  ['FitTrack', 'Personalized fitness platform', 'Next.js · AI · Growth', 'Prototype', '34%', '2/4'],
];

export default function Projects() {
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const [real, setReal] = useState([]);

  useEffect(() => {
    let on = true;
    listRecentProjects()
      .then((list) => {
        if (on) setReal(list);
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);

  const rows = [
    ...real.map((p) => ({
      id: p.id,
      real: true,
      name: p.name,
      desc: p.description || 'Founder-built project on FOUNDATORS',
      tech: Array.isArray(p.tech) && p.tech.length ? p.tech.join(' · ') : 'MVP build',
      stage: p.stage || 'Building',
      progress: `${p.progress || 0}%`,
      team: `${p.membersCount || 1}/5`,
      mine: p.ownerUid === profile.id,
    })),
    ...demoProjects.map((d) => ({
      id: null,
      real: false,
      name: d[0],
      desc: d[1],
      tech: d[2],
      stage: d[3],
      progress: d[4],
      team: d[5],
      mine: false,
    })),
  ];

  return (
    <MainScreenShell>
      <SubpageHeader title="Projects" />
      <div className="no-scrollbar px-[18px] pb-6">
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => router.push('/create')}
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
          <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-gold">
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
        <div className="mt-3 space-y-3">
          {rows.map((p) => (
            <div
              key={`${p.real ? 'real' : 'demo'}-${p.name}`}
              className="gold-card cursor-pointer p-4"
              onClick={() => router.push(p.real ? `/copilot?project=${p.id}` : '/match/find_programmer')}
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
                    <span className="rounded-full border border-line px-2 py-1 text-[9px] font-bold text-gold">
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(p.real ? `/copilot?project=${p.id}` : '/match/find_programmer');
                }}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-line py-2.5 text-[10.5px] font-bold text-gold-hi"
              >
                {p.real ? 'Open in Copilot' : 'Find builders'} <ArrowRight size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-linesoft bg-card p-4">
          <div className="flex items-center gap-2 text-[12px] font-extrabold">
            <CheckCircle2 size={16} className="text-brandgreen" /> Project workspace ready
          </div>
          <p className="mt-1 text-[10.5px] leading-5 text-text2">
            Tasks, milestones, files, team chat and AI assistance can live inside every project.
          </p>
        </div>
      </div>
    </MainScreenShell>
  );
}
