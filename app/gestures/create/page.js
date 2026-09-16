'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Sparkles, Send, Calendar, Clock, Globe } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import AuthSkeleton from '@/components/AuthSkeleton';
import { TEMPLATES, THEMES } from '@/components/gestures/GestureTemplates';

export default function CreateGesturePageWrapper() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <CreateGesturePage />
    </Suspense>
  );
}

function CreateGesturePage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const params = useSearchParams();
  const initialTemplate = params.get('template');
  const createGesture = useStore((s) => s.createGesture);
  const publishTemplate = useStore((s) => s.publishTemplate);
  const showToast = useStore((s) => s.showToast);
  const { vibrate, notification } = useHaptics();

  const [selectedKey, setSelectedKey] = useState(initialTemplate);
  const [toName, setToName] = useState('');
  const [message, setMessage] = useState('');
  const [themeKey, setThemeKey] = useState('gold');
  const [generating, setGenerating] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [publishToCommunity, setPublishToCommunity] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');

  const template = useMemo(() => TEMPLATES.find((t) => t.key === selectedKey), [selectedKey]);
  const theme = THEMES[themeKey];
  const Preview = template?.component;

  async function handleGenerate() {
    if (!toName.trim()) { showToast('Enter a name for the recipient'); return; }
    if (scheduleEnabled && (!scheduledDate || !scheduledTime)) { showToast('Pick a date and time for delivery'); return; }
    setGenerating(true);
    vibrate('light');
    await new Promise((r) => setTimeout(r, 600));
    const customizations = { name: toName.trim(), message: message.trim(), themeKey };
    if (scheduleEnabled && scheduledDate && scheduledTime) {
      customizations.scheduledDate = scheduledDate;
      customizations.scheduledTime = scheduledTime;
    }
    const id = createGesture({ templateKey: selectedKey, customizations });
    notification('success');
    if (publishToCommunity) {
      publishTemplate({
        name: templateName || template.name,
        description: templateDesc,
        category: template.category,
        code: template?.component?.toString?.() || '/* Template code */',
      });
      showToast('Published to community!');
    }
    if (scheduleEnabled && scheduledDate && scheduledTime) {
      showToast(`Gesture scheduled for ${scheduledDate} at ${scheduledTime}`);
    }
    router.push(`/gestures/view?id=${id}`);
  }

  if (!ready) return <AuthSkeleton />;

  /* Step 1: Template picker */
  if (!selectedKey) {
    return (
      <MainScreenShell>
        <div className="no-scrollbar px-[18px] pb-6">
          <div className="page-enter pt-2">
            <button onClick={() => router.push('/gestures')} className="mb-3 flex items-center gap-1.5 text-[11px] font-bold text-text2">
              <ArrowLeft size={14} /> Back to Gestures
            </button>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-gold">
              <Sparkles size={13} /> Step 1
            </div>
            <h1 className="mt-2 text-[22px] font-black">Choose a Template</h1>
            <p className="mt-1 text-[11px] text-text2">Pick the perfect greeting for your moment.</p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {TEMPLATES.map((t) => {
              const T = t.component;
              return (
                <button
                  key={t.key}
                  onClick={() => { setSelectedKey(t.key); vibrate('light'); }}
                  className="glass-card overflow-hidden text-left"
                >
                  <div className="h-[120px] overflow-hidden">
                    <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%', height: '200%' }}>
                      <T name="Priya" message="You are amazing!" theme={THEMES.gold} />
                    </div>
                  </div>
                  <div className="border-t border-linesoft px-3 py-2">
                    <div className="text-[11px] font-extrabold">{t.emoji} {t.name}</div>
                    <div className="mt-0.5 text-[9.5px] text-text3">{t.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </MainScreenShell>
    );
  }

  /* Step 2: Customize */
  return (
    <MainScreenShell>
      <div className="no-scrollbar px-[18px] pb-6">
        <div className="page-enter pt-2">
          <button onClick={() => setSelectedKey(null)} className="mb-3 flex items-center gap-1.5 text-[11px] font-bold text-text2">
            <ArrowLeft size={14} /> Change template
          </button>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-gold">
            <Sparkles size={13} /> Step 2
          </div>
          <h1 className="mt-2 text-[22px] font-black">Customize</h1>
          <p className="mt-1 text-[11px] text-text2">Make it personal. Add names and a message.</p>
        </div>

        {/* Phone preview */}
        <div className="mt-5 flex justify-center">
          <div className="relative w-[280px] overflow-hidden rounded-[28px] border-[3px] border-white/10 bg-black" style={{ height: '420px' }}>
            <div className="absolute left-1/2 top-2 z-10 h-[22px] w-[80px] -translate-x-1/2 rounded-full bg-black" />
            <div className="h-full overflow-hidden">
              {Preview && <Preview name={toName || 'Name'} message={message || 'Your message here'} theme={theme} />}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="mt-6 space-y-4">
          {/* To */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-text3">To</label>
            <input
              type="text"
              value={toName}
              onChange={(e) => setToName(e.target.value.slice(0, 40))}
              placeholder="Recipient's name"
              className="w-full rounded-2xl border border-linesoft bg-card px-4 py-3 text-[13.5px] text-white placeholder:text-text3 focus:border-gold focus:outline-none"
            />
          </div>

          {/* Message */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-text3">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 200))}
              placeholder="Write something heartfelt..."
              rows={3}
              className="w-full resize-none rounded-2xl border border-linesoft bg-card px-4 py-3 text-[13.5px] text-white placeholder:text-text3 focus:border-gold focus:outline-none"
            />
            <div className="mt-1 text-right text-[10px] text-text3">{message.length}/200</div>
          </div>

          {/* Theme picker */}
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text3">Theme</label>
            <div className="flex gap-3">
              {Object.entries(THEMES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => { setThemeKey(key); vibrate('light'); }}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                    themeKey === key ? 'border-gold scale-110' : 'border-transparent'
                  }`}
                  style={{ background: t.accent }}
                >
                  {themeKey === key && <Check size={14} className="text-black" />}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Delivery */}
          <div>
            <button
              type="button"
              onClick={() => { setScheduleEnabled(!scheduleEnabled); vibrate('light'); }}
              className="flex w-full items-center gap-2 rounded-2xl border border-linesoft bg-card px-4 py-3 text-[12px] font-bold text-text2 transition-all hover:border-gold/50"
            >
              <Clock size={14} className={scheduleEnabled ? 'text-gold' : ''} />
              {scheduleEnabled ? 'Scheduled Delivery' : 'Schedule for later'}
              <span className={`ml-auto h-5 w-9 rounded-full transition-all ${scheduleEnabled ? 'bg-gold' : 'bg-white/10'}`}>
                <span className={`block h-4 w-4 rounded-full bg-white transition-transform mt-0.5 ${scheduleEnabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </span>
            </button>
            {scheduleEnabled && (
              <div className="mt-3 flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text3">Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-2xl border border-linesoft bg-card px-4 py-3 text-[13.5px] text-white focus:border-gold focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text3">Time</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full rounded-2xl border border-linesoft bg-card px-4 py-3 text-[13.5px] text-white focus:border-gold focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Share with Community */}
          <div>
            <button
              type="button"
              onClick={() => { setPublishToCommunity(!publishToCommunity); vibrate('light'); }}
              className="flex w-full items-center gap-2 rounded-2xl border border-linesoft bg-card px-4 py-3 text-[12px] font-bold text-text2 transition-all hover:border-gold/50"
            >
              <Globe size={14} className={publishToCommunity ? 'text-gold' : ''} />
              {publishToCommunity ? 'Publish to Community' : 'Share with Community'}
              <span className={`ml-auto h-5 w-9 rounded-full transition-all ${publishToCommunity ? 'bg-gold' : 'bg-white/10'}`}>
                <span className={`block h-4 w-4 rounded-full bg-white transition-transform mt-0.5 ${publishToCommunity ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </span>
            </button>
            {publishToCommunity && (
              <div className="mt-3 space-y-3">
                <p className="text-[10px] text-text3">Let others see your code and fork it</p>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text3">Template Name</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value.slice(0, 40))}
                    placeholder={template?.name || 'Give your template a name'}
                    className="w-full rounded-2xl border border-linesoft bg-card px-4 py-3 text-[13.5px] text-white placeholder:text-text3 focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text3">Description (optional)</label>
                  <input
                    type="text"
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value.slice(0, 100))}
                    placeholder="What makes this template special?"
                    className="w-full rounded-2xl border border-linesoft bg-card px-4 py-3 text-[13.5px] text-white placeholder:text-text3 focus:border-gold focus:outline-none"
                  />
                  <div className="mt-1 text-right text-[10px] text-text3">{templateDesc.length}/100</div>
                </div>
              </div>
            )}
          </div>

          {/* Generate */}
          <button
            onClick={handleGenerate}
            disabled={!toName.trim() || generating}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[12px] font-black transition-all ${
              toName.trim() && !generating
                ? 'bg-gold-grad text-[#1a1300]'
                : 'bg-white/10 text-text3'
            }`}
          >
            {generating ? (
              <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1a1300] border-t-transparent" /> Generating...</span>
            ) : (
              <><Send size={14} /> {scheduleEnabled && scheduledDate ? `Schedule for ${scheduledDate}` : 'Generate & Share'}</>
            )}
          </button>
        </div>
      </div>
    </MainScreenShell>
  );
}
