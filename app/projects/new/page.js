'use client';

// ─────────────────────────────────────────────────────────────
// NEW PROJECT — Build With Me 2.0 standalone creator.
// Captures problem, solution, stage, category, skills needed,
// team requirements and goals. Never publishes anything else —
// the project lands on its own detail page after creation.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Rocket, X, Bot, ChevronRight } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import SubpageHeader from '@/components/SubpageHeader';
import { useStore } from '@/lib/store';
import { checkRateLimit } from '@/lib/rateLimit';
import {
  createStandaloneProject,
  PROJECT_CATEGORIES,
  PROJECT_STAGES,
} from '@/lib/projects';

export default function NewProjectPage() {
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);
  const profile = useStore((s) => s.profile);
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const authReady = useStore((s) => s.authReady);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [stage, setStage] = useState('Idea');
  const [category, setCategory] = useState('AI');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [teamRequirements, setTeamRequirements] = useState('');
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authReady && !isLoggedIn) router.replace('/login');
  }, [authReady, isLoggedIn, router]);

  function addSkill() {
    const s = skillInput.trim().slice(0, 40);
    if (!s) return;
    if (skills.length >= 10) {
      showToast('Max 10 skills');
      return;
    }
    if (!skills.includes(s)) setSkills([...skills, s]);
    setSkillInput('');
  }

  async function submit() {
    if (!name.trim() || !description.trim()) {
      showToast('Name and short description are required');
      return;
    }
    const { allowed, retryMs } = checkRateLimit('newproject', 3, 300000);
    if (!allowed) {
      showToast(`Too many projects too fast — try again in ${Math.ceil(retryMs / 1000)}s`);
      return;
    }
    setLoading(true);
    try {
      const id = await createStandaloneProject(profile, {
        name,
        description,
        problem,
        solution,
        stage,
        category,
        skillsNeeded: skills,
        teamRequirements,
        goals,
      });
      showToast('Project created');
      router.replace(`/projects/${id}`);
    } catch (e) {
      showToast('Could not create the project — try again');
      setLoading(false);
    }
  }

  return (
    <MainScreenShell>
      <SubpageHeader title="New project" />
      <div className="no-scrollbar px-[18px] pb-8">
        <p className="mt-3 text-[11.5px] leading-relaxed text-text2">
          Spell out what you are building so the right founders can find you.
          You can edit details later — nothing is published automatically.
        </p>

        <div className="mt-4 space-y-4 rounded-2xl border border-linesoft bg-card p-4">
          <Label title="Project name" required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AgriFlow"
              maxLength={120}
              className="w-full bg-transparent text-[14px] font-bold text-white placeholder:text-text3 focus:outline-none"
            />
          </Label>

          <Label title="What are you building?" required>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One paragraph that a founder skimming the list would understand."
              rows={3}
              maxLength={4000}
              className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-white placeholder:text-text3 focus:outline-none"
            />
          </Label>

          <Label title="Problem">
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="What pain exists today, and for whom?"
              rows={2}
              maxLength={2000}
              className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-text2 placeholder:text-text3 focus:outline-none"
            />
          </Label>

          <Label title="Solution">
            <textarea
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="How does your product solve it?"
              rows={2}
              maxLength={2000}
              className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-text2 placeholder:text-text3 focus:outline-none"
            />
          </Label>

          <Label title="Stage">
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PROJECT_STAGES.map((s) => (
                <Chip key={s} active={stage === s} onClick={() => setStage(s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </Label>

          <Label title="Category">
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PROJECT_CATEGORIES.map((c) => (
                <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </Label>

          <Label title="Skills needed">
            <div className="flex flex-wrap gap-1.5 pt-1">
              {skills.map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-1 text-[11px] font-bold text-gold-hi"
                >
                  {s}
                  <button
                    onClick={() => setSkills(skills.filter((x) => x !== s))}
                    aria-label={`Remove ${s}`}
                    className="text-text3 hover:text-brandred"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="React, ML, growth… press Enter"
                maxLength={40}
                className="flex-1 rounded-xl border border-linesoft bg-white/[0.03] px-3 py-2 text-[12.5px] text-white placeholder:text-text3 focus:border-gold/50 focus:outline-none"
              />
              <button
                onClick={addSkill}
                className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-xl border border-gold/40 text-gold"
                aria-label="Add skill"
              >
                <Plus size={15} />
              </button>
            </div>
          </Label>

          <Label title="Team requirements">
            <textarea
              value={teamRequirements}
              onChange={(e) => setTeamRequirements(e.target.value)}
              placeholder="e.g. 1 full-stack developer, 1 designer, 5-10 hrs/week"
              rows={2}
              maxLength={1000}
              className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-text2 placeholder:text-text3 focus:outline-none"
            />
          </Label>

          <Label title="Goals">
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g. Launch MVP in 8 weeks, first 100 users"
              rows={2}
              maxLength={2000}
              className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-text2 placeholder:text-text3 focus:outline-none"
            />
          </Label>
        </div>

        <button
          onClick={submit}
          disabled={loading || !name.trim() || !description.trim()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-grad py-3.5 text-[14px] font-extrabold text-[#171100] active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? <Loader2 size={17} className="animate-spin" /> : <Rocket size={16} />}
          Create project
        </button>

        <button
          onClick={() => router.push('/copilot')}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-line py-3 text-[12.5px] font-bold text-gold-hi active:bg-white/5"
        >
          <Bot size={15} /> Or plan it with AI Copilot <ChevronRight size={14} />
        </button>
      </div>
    </MainScreenShell>
  );
}

function Label({ title, required, children }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-text3">
        {title}
        {required ? <span className="text-gold"> *</span> : null}
      </div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-colors ${
        active
          ? 'border-gold bg-gold/15 text-gold-hi'
          : 'border-linesoft text-text2 hover:border-gold/40'
      }`}
    >
      {children}
    </button>
  );
}
