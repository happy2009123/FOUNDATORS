'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, Users, Code2, BriefcaseBusiness, Globe2, ShieldCheck, Zap } from 'lucide-react';
import Logo, { Wordmark } from '@/components/Logo';
import { useStore } from '@/lib/store';
import Intro from '@/components/Intro';

const pillars = [
  { icon: Users, title: 'Founders', text: 'Turn ideas into teams.' },
  { icon: Code2, title: 'Programmers', text: 'Build real products.' },
  { icon: BriefcaseBusiness, title: 'Opportunities', text: 'Find work, funding & partners.' },
];

export default function LandingPage() {
  const router = useRouter();
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const go = () => router.push(isLoggedIn ? '/home' : '/login');

  return (
    <Intro>
    <main className="app-shell overflow-y-auto">
      <div className="page-enter relative min-h-full overflow-hidden px-5 pb-10 pt-5">
        <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-[rgba(217,172,61,0.10)] blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-72 h-72 w-72 rounded-full bg-[rgba(217,172,61,0.08)] blur-3xl" />

        <header className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5"><Logo size={34} /><Wordmark size="text-[18px]" /></div>
          <button onClick={() => router.push('/login')} className="rounded-full border border-linesoft px-4 py-2 text-[11px] font-bold text-text2">Log in</button>
        </header>

        <section className="relative flex min-h-[68vh] flex-col items-center justify-center text-center">
          <div className="mb-5 flex items-center gap-2 rounded-full border border-line bg-[rgba(217,172,61,0.06)] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gold-hi">
            <Sparkles size={13} /> The builder network
          </div>
          <div className="relative mb-7 flex h-32 w-32 items-center justify-center rounded-full border border-[rgba(217,172,61,0.28)] bg-[radial-gradient(circle,rgba(247,221,143,0.18),rgba(0,0,0,0.2)_62%,transparent_70%)] shadow-[0_0_70px_rgba(217,172,61,0.12)]">
            <div className="absolute inset-3 rounded-full border border-[rgba(217,172,61,0.18)] animate-spin-slow" />
            <Logo size={82} />
          </div>
          <h1 className="font-display text-[40px] font-black leading-[0.98] tracking-[-0.04em]">Turn Ideas<br /><span className="text-gold-gradient">Into Impact.</span></h1>
          <p className="mt-5 max-w-[330px] text-[13.5px] leading-6 text-text2">Meet the people, skills and opportunities that can turn your next idea into something real.</p>
          <button onClick={go} className="mt-7 flex items-center gap-2 rounded-full bg-gold-grad px-7 py-3.5 text-[13px] font-black text-[#171100] shadow-[0_10px_35px_rgba(217,172,61,0.22)] transition-transform active:scale-95">Get Started Free <ArrowRight size={16} /></button>
          <div className="mt-4 flex items-center gap-2 text-[10.5px] text-text3"><ShieldCheck size={13} className="text-gold" /> Built around proof of work, trust and collaboration</div>
        </section>

        <section className="stagger-children relative space-y-3">
          {pillars.map(({ icon: Icon, title, text }) => <div key={title} className="glass-card flex items-center gap-3.5 p-4"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-[rgba(217,172,61,0.08)] text-gold"><Icon size={20} /></div><div className="flex-1"><div className="text-[14px] font-extrabold">{title}</div><div className="mt-0.5 text-[11.5px] text-text2">{text}</div></div><ArrowRight size={16} className="text-text3" /></div>)}
        </section>

        <section className="relative mt-7 rounded-3xl border border-line bg-gradient-to-br from-[rgba(217,172,61,0.12)] to-transparent p-5 text-center">
          <Globe2 className="mx-auto mb-2 text-gold" size={25} />
          <div className="text-[18px] font-extrabold">One network. Infinite possibilities.</div>
          <p className="mt-2 text-[11.5px] leading-5 text-text2">Match → Build → Launch → Grow</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center"><Metric n="12K+" l="Builders" /><Metric n="3.4K" l="Projects" /><Metric n="48" l="Countries" /></div>
        </section>

        <button onClick={go} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-gold bg-[rgba(217,172,61,0.08)] py-4 text-[13px] font-extrabold text-gold-hi"><Zap size={16} /> Start building today</button>
      </div>
    </main>
    </Intro>
  );
}

function Metric({ n, l }) { return <div><div className="font-display text-[18px] font-black text-gold-hi">{n}</div><div className="text-[9.5px] text-text3">{l}</div></div>; }
