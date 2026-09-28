'use client';

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Flag,
  Lightbulb,
  ListChecks,
  Rocket,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';

const SOURCE_LABEL = { ai: 'AI generated', template: 'Template analysis' };

function Badge({ children, tone }) {
  const tones = {
    gold: 'border-[rgba(217,172,61,0.4)] bg-[rgba(217,172,61,0.12)] text-gold-hi',
    blue: 'border-[rgba(91,141,255,0.4)] bg-[rgba(91,141,255,0.12)] text-brandblue',
    green: 'border-[rgba(46,204,113,0.4)] bg-[rgba(46,204,113,0.12)] text-brandgreen',
    red: 'border-[rgba(255,99,99,0.35)] bg-[rgba(255,99,99,0.10)] text-brandred',
    quiet: 'border-line bg-white/5 text-text3',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${tones[tone] || tones.quiet}`}>
      {children}
    </span>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-gold">
        {Icon ? <Icon size={13} /> : null}
        {title}
      </div>
      <div className="text-[12.5px] leading-relaxed text-text2">{children}</div>
    </div>
  );
}

function StringList({ items, tone }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-text2">
          <span className={tone === 'red' ? 'text-brandred' : tone === 'green' ? 'text-brandgreen' : 'text-gold'}>
            {tone === 'red' ? '✕' : tone === 'green' ? '✓' : '▸'}
          </span>
          <span>{String(item)}</span>
        </li>
      ))}
    </ul>
  );
}

function CardShell({ icon: Icon, label, source, busy, children }) {
  return (
    <div className="gold-card w-full overflow-hidden p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-grad text-[#171100]">
          <Icon size={15} />
        </span>
        <span className="text-[12.5px] font-extrabold">{label}</span>
        {source ? <Badge tone={source === 'ai' ? 'gold' : 'quiet'}>{SOURCE_LABEL[source] || source}</Badge> : null}
        {busy ? <span className="ml-auto text-[10.5px] font-bold text-gold">working…</span> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ActionRow({ actions, onAction, busy }) {
  if (!actions || !actions.length) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {actions.map((action) => (
        <button
          key={action.key}
          disabled={busy || action.disabled}
          onClick={() => onAction(action.key)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11.5px] font-extrabold transition-all disabled:opacity-50 ${
            action.primary
              ? 'bg-gold-grad text-[#171100] active:scale-[0.98]'
              : 'border border-line text-text2 active:bg-white/5'
          }`}
        >
          {action.icon ? <action.icon size={13} /> : null}
          {action.label}
        </button>
      ))}
    </div>
  );
}

function AnalysisCard({ card, onAction, busy }) {
  const actions = [
    { key: 'goto-validate', label: 'Build validation plan', icon: ClipboardList, primary: true },
    { key: 'goto-mvp', label: 'Plan the MVP', icon: ListChecks },
  ];
  return (
    <CardShell icon={Sparkles} label="Idea Analysis" source={card.source} busy={busy}>
      <div className="text-[13px] font-semibold leading-relaxed text-text1">{card.summary}</div>
      <Section icon={Target} title="Problem">{card.problem}</Section>
      <Section icon={Lightbulb} title="Solution">{card.solution}</Section>
      <Section icon={Users} title="Target users"><StringList items={card.users} /></Section>
      <Section icon={Flag} title="Competitors & alternatives"><StringList items={card.competitors} /></Section>
      <Section icon={AlertTriangle} title="Risks"><StringList items={card.risks} tone="red" /></Section>
      <Section icon={Rocket} title="Opportunities"><StringList items={card.opportunities} tone="green" /></Section>
      <div className="rounded-xl border border-[rgba(217,172,61,0.4)] bg-[rgba(217,172,61,0.10)] p-3 text-[12.5px] font-semibold text-gold-hi">
        Next step: {card.nextStep}
      </div>
      <ActionRow actions={actions} onAction={onAction} busy={busy} />
    </CardShell>
  );
}

function ValidationCard({ card, onAction, busy }) {
  const actions = [
    { key: 'goto-mvp', label: 'Plan the MVP now', icon: ListChecks, primary: true },
    { key: 'goto-chat', label: 'Ask a follow-up', icon: ArrowRight },
  ];
  const steps = Array.isArray(card.steps) ? card.steps : [];
  return (
    <CardShell icon={ClipboardList} label="Validation Plan" source={card.source} busy={busy}>
      <div className="text-[13px] font-semibold leading-relaxed text-text1">{card.summary}</div>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="rounded-xl border border-line bg-white/[0.03] p-3">
            <div className="flex items-center gap-2 text-[12.5px] font-extrabold text-text1">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-grad text-[10px] font-black text-[#171100]">
                {i + 1}
              </span>
              {step.title}
            </div>
            <div className="mt-1.5 pl-7 text-[12px] leading-relaxed text-text2">{step.how}</div>
            <div className="mt-1.5 pl-7 text-[11.5px] font-semibold text-gold-hi">Signal: {step.signal}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Section icon={AlertTriangle} title="Kill criteria"><StringList items={card.killCriteria} tone="red" /></Section>
        <Section icon={CheckCircle2} title="Success signals"><StringList items={card.successSignals} tone="green" /></Section>
      </div>
      <ActionRow actions={actions} onAction={onAction} busy={busy} />
    </CardShell>
  );
}

function MvpCard({ card, onAction, busy, hasProject }) {
  const actions = [
    { key: 'create-project', label: 'Create project + tasks', icon: Rocket, primary: true },
    { key: 'add-tasks', label: 'Add tasks to selected project', icon: ListChecks, disabled: !hasProject },
    { key: 'goto-launch', label: 'Plan the launch', icon: Flag },
  ];
  const phases = Array.isArray(card.phases) ? card.phases : [];
  const features = Array.isArray(card.features) ? card.features : [];
  const tech = Array.isArray(card.tech) ? card.tech : [];
  const taskCount = Array.isArray(card.tasks) ? card.tasks.length : 0;
  return (
    <CardShell icon={ListChecks} label="MVP Roadmap" source={card.source} busy={busy}>
      <div className="text-[13px] font-semibold leading-relaxed text-text1">{card.summary}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Section icon={Target} title="Problem">{card.problem}</Section>
        <Section icon={Lightbulb} title="Solution">{card.solution}</Section>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {features.map((f, i) => (
          <span
            key={i}
            className={`rounded-full border px-2.5 py-1 text-[10.5px] font-bold ${
              f.priority === 'core'
                ? 'border-[rgba(217,172,61,0.4)] bg-[rgba(217,172,61,0.12)] text-gold-hi'
                : 'border-line bg-white/5 text-text3'
            }`}
          >
            {f.name}
          </span>
        ))}
      </div>
      {tech.length ? (
        <div className="text-[11.5px] text-text3">Suggested stack: {tech.join(' · ')}</div>
      ) : null}
      <div className="space-y-2">
        {phases.map((phase, i) => (
          <div key={i} className="rounded-xl border border-line bg-white/[0.03] p-3">
            <div className="text-[12.5px] font-extrabold text-text1">{phase.title}</div>
            <div className="mt-0.5 text-[11.5px] text-text3">{phase.goal}</div>
            <ul className="mt-2 space-y-1">
              {(phase.tasks || []).map((task, ti) => (
                <li key={ti} className="flex items-start gap-2 text-[12px] text-text2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {task}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="text-[11.5px] font-semibold text-gold-hi">{taskCount} tasks ready to track</div>
      <ActionRow actions={actions} onAction={onAction} busy={busy} />
    </CardShell>
  );
}

function LaunchCard({ card, onAction, busy }) {
  const actions = [
    { key: 'goto-chat', label: 'Work the launch with me', icon: ArrowRight, primary: true },
    { key: 'goto-mvp', label: 'Back to MVP plan', icon: ListChecks },
  ];
  const checklist = Array.isArray(card.checklist) ? card.checklist : [];
  const categories = [...new Set(checklist.map((c) => c.category))];
  return (
    <CardShell icon={Rocket} label="Launch Checklist" source={card.source} busy={busy}>
      <div className="text-[13px] font-semibold leading-relaxed text-text1">{card.summary}</div>
      {categories.map((category) => (
        <Section key={category} icon={CheckCircle2} title={category}>
          <ul className="space-y-1.5">
            {checklist
              .filter((c) => c.category === category)
              .map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-[12.5px] text-text2">
                  <span className="mt-0.5 h-3 w-3 shrink-0 rounded border border-gold/60" />
                  {c.label}
                </li>
              ))}
          </ul>
        </Section>
      ))}
      <div className="rounded-xl border border-[rgba(217,172,61,0.4)] bg-[rgba(217,172,61,0.10)] p-3 text-[12.5px] text-gold-hi">
        <div className="font-extrabold">One metric: {card.metric}</div>
        <div className="mt-1">{card.timeline}</div>
      </div>
      <ActionRow actions={actions} onAction={onAction} busy={busy} />
    </CardShell>
  );
}

function BwmDraftCard({ card, onAction, busy }) {
  const actions = [
    { key: 'publish-bwm', label: 'Review & publish', icon: Rocket, primary: true },
    { key: 'regenerate', label: 'Regenerate draft', icon: Sparkles },
  ];
  return (
    <CardShell icon={Users} label="Build With Me Draft" source={card.source} busy={busy}>
      <div className="text-[12.5px] text-text2">{card.summary}</div>
      <div className="rounded-xl border border-line bg-white/[0.04] p-3">
        <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-text1">{card.text}</div>
      </div>
      <ActionRow actions={actions} onAction={onAction} busy={busy} />
    </CardShell>
  );
}

export default function CardView({ cardType, card, source, busy, onAction, hasProject }) {
  if (!card) return null;
  const payload = { ...card, source: card.source || source };
  if (cardType === 'analysis') return <AnalysisCard card={payload} onAction={onAction} busy={busy} />;
  if (cardType === 'validation') return <ValidationCard card={payload} onAction={onAction} busy={busy} />;
  if (cardType === 'mvp') return <MvpCard card={payload} onAction={onAction} busy={busy} hasProject={hasProject} />;
  if (cardType === 'launch') return <LaunchCard card={payload} onAction={onAction} busy={busy} />;
  if (cardType === 'bwm_draft') return <BwmDraftCard card={payload} onAction={onAction} busy={busy} />;
  return null;
}
