'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ClipboardList, Flag, ListChecks, MessageSquare, Mic, Rocket, Sparkles, Users } from 'lucide-react';
import { MODES } from '@/lib/copilot';

export const MODE_ICONS = {
  analyze: Sparkles,
  validate: ClipboardList,
  mvp: ListChecks,
  launch: Rocket,
  draft: Users,
  chat: MessageSquare,
};

const STEPS = [
  { n: '1', label: 'Idea', hint: 'Describe it' },
  { n: '2', label: 'Validate', hint: 'Prove demand' },
  { n: '3', label: 'MVP', hint: 'Ship tasks' },
  { n: '4', label: 'Launch', hint: 'Go live + recruit' },
];

export default function CopilotHome({ conversations, busy, onStart, onOpen }) {
  const router = useRouter();
  const [mode, setMode] = useState('analyze');
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const active = MODES.find((m) => m.key === mode) || MODES[0];

  const pickMode = (key) => {
    setMode(key);
    inputRef.current?.focus();
  };

  const start = () => {
    if (!text.trim() || busy) return;
    onStart(mode, text.trim());
  };

  return (
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[720px] px-4 py-6">
        <div className="animate-fade-up text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-grad text-[#171100] shadow-[0_6px_24px_-6px_rgba(217,172,61,0.55)]">
            <Sparkles size={22} />
          </span>
          <h1 className="text-[20px] font-black">AI Founder Copilot</h1>
          <p className="mx-auto mt-1.5 max-w-[440px] text-[12.5px] leading-relaxed text-text2">
            Take an idea from first sketch to validated MVP — with structured analysis, tasks you can track,
            and a Build With Me post to recruit your team.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
          {MODES.map((m) => {
            const Icon = MODE_ICONS[m.key];
            const on = m.key === mode;
            return (
              <button
                key={m.key}
                onClick={() => pickMode(m.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-extrabold transition-all ${
                  on
                    ? 'border-gold/70 bg-[rgba(217,172,61,0.14)] text-gold-hi'
                    : 'border-line text-text2 active:bg-white/5'
                }`}
              >
                <Icon size={12} />
                {m.label}
              </button>
            );
          })}
        </div>

        <div className="gold-card mt-4 p-3">
          <textarea
            ref={inputRef}
            rows={4}
            value={text}
            placeholder={active.placeholder}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) start();
            }}
            className="no-scrollbar w-full resize-none bg-transparent text-[13.5px] leading-relaxed text-text1 outline-none placeholder:text-text3"
          />
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-2.5">
            <span className="text-[10.5px] text-text3">
              {mode === 'chat' ? 'Free-form advice' : `${active.blurb}`} · ⌘↵ to start
            </span>
            <button
              onClick={start}
              disabled={busy || !text.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gold-grad px-4 py-2 text-[12px] font-black text-[#171100] transition-all disabled:opacity-40 active:scale-[0.97]"
            >
              Start
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {MODES.map((m) => {
            const Icon = MODE_ICONS[m.key];
            const on = m.key === mode;
            return (
              <button
                key={m.key}
                onClick={() => pickMode(m.key)}
                className={`rounded-2xl border p-3 text-left transition-all ${
                  on ? 'border-gold/60 bg-[rgba(217,172,61,0.07)]' : 'border-line bg-card active:bg-white/5'
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-white/5 text-gold">
                  <Icon size={16} />
                </span>
                <div className="mt-2 text-[12.5px] font-extrabold text-text1">{m.label}</div>
                <div className="mt-0.5 text-[10.5px] leading-snug text-text3">{m.blurb}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-line bg-card px-3 py-2.5">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold/15 text-[10px] font-black text-gold-hi">
                {s.n}
              </span>
              <div className="leading-tight">
                <div className="text-[11px] font-extrabold text-text1">{s.label}</div>
                <div className="text-[9.5px] text-text3">{s.hint}</div>
              </div>
              {i < STEPS.length - 1 ? <Flag size={11} className="ml-1 text-text3" /> : null}
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-3.5 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-xl border border-line bg-white/5 text-gold">
              <Mic size={16} />
            </span>
            <div className="min-w-0 leading-tight">
              <div className="text-[12.5px] font-extrabold text-text1">Foundators Voice</div>
              <div className="text-[10.5px] text-text3">Talk it out live with other founders</div>
            </div>
          </div>
          <button
            onClick={() => router.push('/voice')}
            className="inline-flex flex-none items-center gap-1.5 rounded-xl border border-gold/60 bg-gold/10 px-3 py-2 text-[11.5px] font-black text-gold-hi active:scale-95"
          >
            Open <ArrowRight size={13} />
          </button>
        </div>

        {conversations.length ? (
          <div className="mt-6">
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-text3">Recent conversations</div>
            <div className="space-y-1.5">
              {conversations.slice(0, 6).map((c) => (
                <button
                  key={c.id}
                  onClick={() => onOpen(c)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-card px-3 py-2.5 text-left active:bg-white/5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-bold text-text1">{c.title}</span>
                    <span className="text-[10px] uppercase tracking-wide text-text3">
                      {MODES.find((m) => m.key === c.mode)?.label || c.mode}
                    </span>
                  </span>
                  <ArrowRight size={14} className="shrink-0 text-text3" />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
