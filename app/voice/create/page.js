'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ImagePlus, Loader2, Mic, X } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadImage } from '@/lib/firestore';
import {
  VOICE_CATEGORIES,
  VOICE_ROOM_TYPES,
  VOICE_TEMPLATES,
  VOICE_MAX_SPEAKERS_DEFAULT,
  VOICE_MAX_SPEAKERS_LIMIT,
  createVoiceRoom,
} from '@/lib/voice';

function Field({ label, hint, children, error }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12.5px] font-extrabold text-text1">{label}</span>
        {hint ? <span className="text-[10.5px] text-text3">{hint}</span> : null}
      </div>
      {children}
      {error ? <div className="mt-1 text-[11px] font-bold text-brandred">{error}</div> : null}
    </label>
  );
}

const inputCls =
  'w-full rounded-xl border border-line bg-white/[0.04] px-3.5 py-2.5 text-[13.5px] text-text1 outline-none placeholder:text-text3 focus:border-gold/50';

export default function CreateVoiceRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[760px] px-4 py-6">
          <div className="skeleton h-9 w-40 rounded-xl" />
          <div className="skeleton mt-4 h-[560px] w-full rounded-2xl" />
        </div>
      }
    >
      <CreateRoomInner />
    </Suspense>
  );
}

function CreateRoomInner() {
  const ready = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const profile = useStore((s) => s.profile);
  const showToast = useStore((s) => s.showToast);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Startup');
  const [template, setTemplate] = useState('standard');
  const [type, setType] = useState('public');
  const [mode, setMode] = useState('now');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [maxSpeakers, setMaxSpeakers] = useState(String(VOICE_MAX_SPEAKERS_DEFAULT));
  const [allowRaiseHand, setAllowRaiseHand] = useState(true);
  const [allowReactions, setAllowReactions] = useState(true);
  const [allowQuestions, setAllowQuestions] = useState(true);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [pitch, setPitch] = useState({ startupName: '', problem: '', solution: '', targetUsers: '', stage: '' });
  const [cofounder, setCofounder] = useState({ roleNeeded: '', skills: '', project: '', stage: '' });

  const projectId = searchParams ? searchParams.get('project') : null;
  const templateParam = searchParams ? searchParams.get('template') : null;

  useEffect(() => {
    if (templateParam && VOICE_TEMPLATES.some((t) => t.key === templateParam)) setTemplate(templateParam);
  }, [templateParam]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    getDoc(doc(db, 'projects', projectId))
      .then((snap) => {
        if (cancelled || !snap.exists()) return;
        const p = snap.data();
        setTitle((t) => t || `Discuss: ${p.name || 'our project'}`);
        setDescription(
          (d) =>
            d ||
            [p.problem ? `Problem: ${p.problem}` : '', p.solution ? `Solution: ${p.solution}` : '']
              .filter(Boolean)
              .join('\n')
        );
        setTagsText((t) => t || 'project,collaboration');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const onCover = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Cover must be an image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB');
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    const cleanTitle = title.trim();
    if (cleanTitle.length < 4) return setError('Room title must be at least 4 characters');
    let scheduledAt = null;
    if (mode === 'schedule') {
      if (!date || !time) return setError('Pick a date and time');
      scheduledAt = new Date(`${date}T${time}`);
      if (Number.isNaN(scheduledAt.getTime())) return setError('Invalid date or time');
      if (scheduledAt.getTime() < Date.now() + 60000) return setError('Schedule at least a minute ahead');
    }
    setBusy(true);
    try {
      let coverImageUrl = '';
      if (coverFile) {
        const res = await uploadImage(coverFile, `voice/covers/${Date.now()}_cover`);
        if (res && res.success) coverImageUrl = res.data;
      }
      const templateData =
        template === 'pitch'
          ? { ...pitch }
          : template === 'cofounder'
          ? { ...cofounder }
          : null;
      const roomId = await createVoiceRoom(profile, {
        title: cleanTitle,
        description,
        category,
        type,
        mode,
        scheduledAt,
        tags: tagsText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        maxSpeakers: parseInt(maxSpeakers, 10),
        allowRaiseHand,
        allowReactions,
        allowQuestions,
        coverImageUrl,
        template,
        templateData,
      });
      showToast(mode === 'schedule' ? 'Room scheduled' : 'Room is live!');
      router.push(`/voice/room/${roomId}`);
    } catch (err) {
      setError(err.message || 'Could not create the room');
      setBusy(false);
      return;
    }
    setBusy(false);
  };

  const timezone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';

  return (
    <MainScreenShell className="wide-desktop no-rail">
      {ready ? (
        <div className="mx-auto w-full max-w-[760px] px-4 pb-14 pt-4">
          <button
            onClick={() => router.push('/voice')}
            className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-text2 active:text-gold"
          >
            <ArrowLeft size={15} /> Voice home
          </button>

          <div className="rounded-2xl border border-line bg-card">
            <div className="flex items-center gap-3 border-b border-linesoft px-5 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-grad text-[#171100]">
                <Mic size={19} />
              </span>
              <div>
                <h1 className="text-[16.5px] font-black">Create a Founder Voice room</h1>
                <p className="text-[11.5px] text-text3">Go live now or schedule it for later.</p>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-5 px-5 py-5">
              <Field label="Room title" hint={`${title.trim().length}/120`}>
                <input
                  className={inputCls}
                  value={title}
                  maxLength={120}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Building an AI Startup in 2026"
                />
              </Field>

              <Field label="Description" hint="optional">
                <textarea
                  className={`${inputCls} no-scrollbar min-h-[84px] resize-none`}
                  value={description}
                  maxLength={1000}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will you talk about?"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category">
                  <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                    {VOICE_CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-[#111]">
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Room template">
                  <select className={inputCls} value={template} onChange={(e) => setTemplate(e.target.value)}>
                    {VOICE_TEMPLATES.map((t) => (
                      <option key={t.key} value={t.key} className="bg-[#111]">
                        {t.label} — {t.hint}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {template === 'pitch' ? (
                <div className="grid gap-3 rounded-2xl border border-line bg-white/[0.03] p-4 sm:grid-cols-2">
                  <Field label="Startup name">
                    <input className={inputCls} value={pitch.startupName} onChange={(e) => setPitch({ ...pitch, startupName: e.target.value })} />
                  </Field>
                  <Field label="Current stage">
                    <input className={inputCls} value={pitch.stage} onChange={(e) => setPitch({ ...pitch, stage: e.target.value })} placeholder="Idea / MVP / Live" />
                  </Field>
                  <Field label="Problem">
                    <textarea className={`${inputCls} resize-none`} rows={2} value={pitch.problem} onChange={(e) => setPitch({ ...pitch, problem: e.target.value })} />
                  </Field>
                  <Field label="Solution">
                    <textarea className={`${inputCls} resize-none`} rows={2} value={pitch.solution} onChange={(e) => setPitch({ ...pitch, solution: e.target.value })} />
                  </Field>
                  <Field label="Target users">
                    <input className={inputCls} value={pitch.targetUsers} onChange={(e) => setPitch({ ...pitch, targetUsers: e.target.value })} />
                  </Field>
                </div>
              ) : null}

              {template === 'cofounder' ? (
                <div className="grid gap-3 rounded-2xl border border-line bg-white/[0.03] p-4 sm:grid-cols-2">
                  <Field label="Role needed">
                    <input className={inputCls} value={cofounder.roleNeeded} onChange={(e) => setCofounder({ ...cofounder, roleNeeded: e.target.value })} placeholder="e.g. Technical co-founder" />
                  </Field>
                  <Field label="Startup stage">
                    <input className={inputCls} value={cofounder.stage} onChange={(e) => setCofounder({ ...cofounder, stage: e.target.value })} placeholder="Idea / Building / Launched" />
                  </Field>
                  <Field label="Skills">
                    <input className={inputCls} value={cofounder.skills} onChange={(e) => setCofounder({ ...cofounder, skills: e.target.value })} placeholder="React, Firebase, Growth" />
                  </Field>
                  <Field label="Project">
                    <input className={inputCls} value={cofounder.project} onChange={(e) => setCofounder({ ...cofounder, project: e.target.value })} />
                  </Field>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Room type">
                  <div className="space-y-1.5">
                    {VOICE_ROOM_TYPES.map((t) => (
                      <button
                        type="button"
                        key={t.key}
                        onClick={() => setType(t.key)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all ${
                          type === t.key ? 'border-gold/70 bg-gold/10' : 'border-line bg-white/[0.03] active:bg-white/5'
                        }`}
                      >
                        <span className="text-[12.5px] font-bold text-text1">{t.label}</span>
                        <span className="text-[10.5px] text-text3">{t.hint}</span>
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="When">
                  <div className="space-y-1.5">
                    {[
                      { key: 'now', label: 'Start now', hint: 'Go live instantly' },
                      { key: 'schedule', label: 'Schedule', hint: 'Pick date & time' },
                    ].map((m) => (
                      <button
                        type="button"
                        key={m.key}
                        onClick={() => setMode(m.key)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all ${
                          mode === m.key ? 'border-gold/70 bg-gold/10' : 'border-line bg-white/[0.03] active:bg-white/5'
                        }`}
                      >
                        <span className="text-[12.5px] font-bold text-text1">{m.label}</span>
                        <span className="text-[10.5px] text-text3">{m.hint}</span>
                      </button>
                    ))}
                    {mode === 'schedule' ? (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
                        <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
                        <div className="col-span-2 text-[10.5px] text-text3">Timezone: {timezone}</div>
                      </div>
                    ) : null}
                  </div>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Topic tags" hint="comma separated">
                  <input
                    className={inputCls}
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    placeholder="AI, SaaS, Fundraising"
                  />
                </Field>
                <Field label="Maximum speakers" hint={`2-${VOICE_MAX_SPEAKERS_LIMIT}`}>
                  <input
                    type="number"
                    min={2}
                    max={VOICE_MAX_SPEAKERS_LIMIT}
                    className={inputCls}
                    value={maxSpeakers}
                    onChange={(e) => setMaxSpeakers(e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Cover image" hint="optional, max 5MB">
                {coverPreview ? (
                  <div className="relative overflow-hidden rounded-xl border border-line">
                    <img src={coverPreview} alt="Cover" className="h-36 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setCoverFile(null);
                        setCoverPreview('');
                      }}
                      aria-label="Remove cover"
                      className="absolute right-2 top-2 rounded-lg bg-black/70 p-1.5 text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-white/[0.03] py-6 text-[12.5px] font-bold text-text2 active:bg-white/5">
                    <ImagePlus size={16} className="text-gold" />
                    Add cover image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onCover(e.target.files && e.target.files[0])}
                    />
                  </label>
                )}
              </Field>

              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { key: 'raise', label: 'Allow speakers requests', value: allowRaiseHand, set: setAllowRaiseHand },
                  { key: 'react', label: 'Allow reactions', value: allowReactions, set: setAllowReactions },
                  { key: 'quest', label: 'Allow text questions', value: allowQuestions, set: setAllowQuestions },
                ].map((opt) => (
                  <button
                    type="button"
                    key={opt.key}
                    onClick={() => opt.set(!opt.value)}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition-all ${
                      opt.value ? 'border-gold/60 bg-gold/10' : 'border-line bg-white/[0.03]'
                    }`}
                  >
                    <span
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border text-[10px] font-black ${
                        opt.value ? 'border-gold bg-gold text-[#171100]' : 'border-line text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span className="text-[12px] font-bold text-text1">{opt.label}</span>
                  </button>
                ))}
              </div>

              {error ? (
                <div className="rounded-xl border border-brandred/40 bg-brandred/10 px-3.5 py-2.5 text-[12px] font-bold text-brandred">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-grad py-3.5 text-[14.5px] font-black text-[#171100] transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {busy ? <Loader2 size={17} className="animate-spin" /> : <Mic size={17} />}
                {busy ? 'Creating…' : mode === 'schedule' ? 'Schedule Room' : 'Create Room & Go Live'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[760px] px-4 py-6">
          <div className="skeleton h-9 w-40 rounded-xl" />
          <div className="skeleton mt-4 h-[560px] w-full rounded-2xl" />
        </div>
      )}
    </MainScreenShell>
  );
}
