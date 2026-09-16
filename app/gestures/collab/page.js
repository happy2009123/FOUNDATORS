'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Send, Calendar, Gift, Plus, X, Share2 } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import AuthSkeleton from '@/components/AuthSkeleton';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useHaptics } from '@/lib/useHaptics';
import { useStore } from '@/lib/store';
import { TEMPLATES, THEMES } from '@/components/gestures/GestureTemplates';

const CATEGORIES = [
  { key: 'birthday', label: 'Birthday', emoji: '🎂' },
  { key: 'thank_you', label: 'Thank You', emoji: '🙏' },
  { key: 'congratulations', label: 'Congratulations', emoji: '🎉' },
  { key: 'wedding', label: 'Wedding', emoji: '💒' },
  { key: 'farewell', label: 'Farewell', emoji: '👋' },
  { key: 'just_because', label: 'Just Because', emoji: '💛' },
];

const THEME_OPTIONS = [
  { key: 'gold', label: 'Gold', bg: '#D9AC3D', text: '#020202' },
  { key: 'rose', label: 'Rose', bg: '#E8739A', text: '#ffffff' },
  { key: 'ocean', label: 'Ocean', bg: '#5B9BD5', text: '#ffffff' },
  { key: 'sunset', label: 'Sunset', bg: '#F08A5D', text: '#ffffff' },
  { key: 'forest', label: 'Forest', bg: '#6AAF73', text: '#ffffff' },
];

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              i + 1 === current
                ? 'bg-[#D9AC3D] text-[#020202] scale-110'
                : i + 1 < current
                  ? 'bg-[#D9AC3D]/30 text-[#D9AC3D]'
                  : 'bg-[#1a1a1a] text-[#555] border border-[#2a2a2a]'
            }`}
          >
            {i + 1 < current ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={`w-8 h-0.5 rounded transition-all duration-300 ${
                i + 1 < current ? 'bg-[#D9AC3D]/50' : 'bg-[#2a2a2a]'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Step1({ onSelect }) {
  return (
    <div className="animate-fadeIn">
      <h2 className="text-xl font-bold text-white mb-1">Start a Group Card</h2>
      <p className="text-[#888] text-sm mb-6">Get friends to sign a greeting together.</p>

      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onSelect(cat)}
            className="glass-card p-4 rounded-xl flex flex-col items-center gap-2 hover:border-[#D9AC3D]/50 hover:bg-[#D9AC3D]/5 transition-all duration-200 active:scale-95"
          >
            <span className="text-3xl">{cat.emoji}</span>
            <span className="text-sm text-white font-medium">{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step2({ data, onUpdate, onBack }) {
  const { title, recipients, deadline, themeKey } = data;
  const selectedTheme = THEME_OPTIONS.find((t) => t.key === themeKey) || THEME_OPTIONS[0];
  const recipientList = recipients
    ? recipients.split(',').map((r) => r.trim()).filter(Boolean)
    : [];

  return (
    <div className="animate-fadeIn">
      <h2 className="text-xl font-bold text-white mb-1">Card Details</h2>
      <p className="text-[#888] text-sm mb-5">Personalize your group card.</p>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="text-xs text-[#666] mb-1 block">Card Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="e.g. Rohan's Birthday Card"
            className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white placeholder-[#555] text-sm focus:outline-none focus:border-[#D9AC3D]/60 transition-colors"
          />
        </div>

        {/* Recipients */}
        <div>
          <label className="text-xs text-[#666] mb-1 block">Recipients (comma-separated)</label>
          <input
            type="text"
            value={recipients}
            onChange={(e) => onUpdate({ recipients: e.target.value })}
            placeholder="e.g. Ananya, Meera, Arjun"
            className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white placeholder-[#555] text-sm focus:outline-none focus:border-[#D9AC3D]/60 transition-colors"
          />
          {recipientList.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {recipientList.map((name, i) => (
                <span
                  key={i}
                  className="bg-[#D9AC3D]/15 text-[#D9AC3D] text-xs px-2.5 py-1 rounded-full"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Deadline */}
        <div>
          <label className="text-xs text-[#666] mb-1 block">Signing Deadline</label>
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input
              type="date"
              value={deadline}
              onChange={(e) => onUpdate({ deadline: e.target.value })}
              className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-[#D9AC3D]/60 transition-colors [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Theme Picker */}
        <div>
          <label className="text-xs text-[#666] mb-2 block">Card Theme</label>
          <div className="flex gap-3">
            {THEME_OPTIONS.map((t) => (
              <button
                key={t.key}
                onClick={() => onUpdate({ themeKey: t.key })}
                className={`w-10 h-10 rounded-full transition-all duration-200 border-2 ${
                  themeKey === t.key
                    ? 'border-white scale-110 ring-2 ring-white/20'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ background: t.bg }}
                title={t.label}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Phone Preview */}
      <div className="mt-6">
        <label className="text-xs text-[#666] mb-2 block">Preview</label>
        <div className="mx-auto w-48 h-72 rounded-2xl border-2 border-[#2a2a2a] bg-[#111111] overflow-hidden flex flex-col items-center justify-center relative">
          <div className="absolute top-0 inset-x-0 h-4 bg-[#020202] rounded-b-lg" />
          <div className="px-4 text-center mt-4">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-xl"
              style={{ background: selectedTheme.bg }}
            >
              🎁
            </div>
            <p className="text-white text-xs font-bold mb-1 truncate">
              {title || 'Your Card Title'}
            </p>
            <p className="text-[#888] text-[10px]">
              {recipientList.length > 0
                ? `To: ${recipientList.join(', ')}`
                : 'Recipients will appear here'}
            </p>
            <div
              className="mt-3 w-full h-6 rounded-md text-[8px] flex items-center justify-center text-white/80 font-medium"
              style={{ background: `${selectedTheme.bg}44` }}
            >
              Tap to sign ✍️
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step3({ data, collabId, onDone }) {
  const { title, recipients, themeKey, category } = data;
  const selectedTheme = THEME_OPTIONS.find((t) => t.key === themeKey) || THEME_OPTIONS[0];
  const categoryMeta = CATEGORIES.find((c) => c.key === category) || CATEGORIES[0];
  const inviteLink = collabId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/gestures/collab/sign?id=${collabId}`
    : '';

  const recipientList = recipients
    ? recipients.split(',').map((r) => r.trim()).filter(Boolean)
    : [];

  const handleCopyLink = useCallback(() => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
    }
  }, [inviteLink]);

  const handleWhatsApp = useCallback(() => {
    const text = encodeURIComponent(
      `You're invited to sign a ${categoryMeta.label} card! 🎉\n\n"${title}"\n\nSign it here: ${inviteLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }, [title, inviteLink, categoryMeta]);

  const handleSMS = useCallback(() => {
    const text = encodeURIComponent(
      `You're invited to sign a ${categoryMeta.label} card! "${title}" → ${inviteLink}`
    );
    window.open(`sms:?body=${text}`, '_blank');
  }, [title, inviteLink, categoryMeta]);

  return (
    <div className="animate-fadeIn">
      <h2 className="text-xl font-bold text-white mb-1">Share & Invite</h2>
      <p className="text-[#888] text-sm mb-5">Send the link to your friends.</p>

      {/* Summary Card */}
      <div
        className="glass-card rounded-xl p-4 mb-5 border border-[#2a2a2a]"
        style={{ borderColor: `${selectedTheme.bg}33` }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ background: `${selectedTheme.bg}33` }}
          >
            {categoryMeta.emoji}
          </div>
          <div>
            <p className="text-white font-bold text-sm">{title || 'Untitled Card'}</p>
            <p className="text-[#888] text-xs">{categoryMeta.label}</p>
          </div>
        </div>
        {recipientList.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recipientList.map((name, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: `${selectedTheme.bg}22`, color: selectedTheme.bg }}
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Share Actions */}
      <div className="space-y-3">
        <button
          onClick={handleCopyLink}
          className="w-full glass-card rounded-xl py-3.5 flex items-center justify-center gap-2 text-white text-sm font-semibold hover:bg-[#D9AC3D]/10 hover:border-[#D9AC3D]/40 transition-all active:scale-[0.98]"
        >
          <Share2 size={16} />
          Copy Invite Link
        </button>

        <button
          onClick={handleWhatsApp}
          className="w-full rounded-xl py-3.5 flex items-center justify-center gap-2 text-white text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: '#25D366' }}
        >
          <Send size={16} />
          Share via WhatsApp
        </button>

        <button
          onClick={handleSMS}
          className="w-full glass-card rounded-xl py-3.5 flex items-center justify-center gap-2 text-white text-sm font-semibold hover:bg-[#D9AC3D]/10 hover:border-[#D9AC3D]/40 transition-all active:scale-[0.98]"
        >
          <Send size={16} />
          Share via SMS
        </button>

        <button
          onClick={onDone}
          className="w-full bg-[#D9AC3D] rounded-xl py-3.5 flex items-center justify-center gap-2 text-[#020202] text-sm font-bold hover:bg-[#D9AC3D]/90 transition-all active:scale-[0.98]"
        >
          Done — View Card
        </button>
      </div>
    </div>
  );
}

export default function CreateCollabPage() {
  const router = useRouter();
  const ready = useRequireAuth();
  const createCollab = useStore((s) => s.createCollab);
  const showToast = useStore((s) => s.showToast);
  const { vibrate } = useHaptics();

  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    category: '',
    title: '',
    recipients: '',
    deadline: '',
    themeKey: 'gold',
    templateKey: '',
  });
  const [collabId, setCollabId] = useState(null);
  const [creating, setCreating] = useState(false);

  const updateData = useCallback((patch) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSelectCategory = useCallback(
    (cat) => {
      vibrate('light');
      const templateKeys = (TEMPLATES || []).map((t) => t.key);
      const defaultTemplate = templateKeys.length > 0 ? templateKeys[0] : '';
      setData((prev) => ({
        ...prev,
        category: cat.key,
        templateKey: prev.templateKey || defaultTemplate,
      }));
      setStep(2);
    },
    [TEMPLATES, vibrate]
  );

  const handleNextFromStep2 = useCallback(async () => {
    if (!data.title.trim()) {
      showToast('Please enter a card title');
      return;
    }
    vibrate('light');
    setCreating(true);
    try {
      const id = await createCollab({
        title: data.title.trim(),
        templateKey: data.templateKey,
        category: data.category,
        recipients: data.recipients
          ? data.recipients.split(',').map((r) => r.trim()).filter(Boolean)
          : [],
        themeKey: data.themeKey,
        deadline: data.deadline || null,
      });
      setCollabId(id);
      setStep(3);
    } catch (err) {
      showToast('Failed to create card. Try again.');
    } finally {
      setCreating(false);
    }
  }, [data, createCollab, showToast, vibrate]);

  const handleBack = useCallback(() => {
    vibrate('light');
    if (step > 1) setStep(step - 1);
  }, [step, vibrate]);

  const handleDone = useCallback(() => {
    vibrate('light');
    if (collabId) {
      router.push(`/gestures/collab/view?id=${collabId}`);
    } else {
      router.push('/gestures/collab');
    }
  }, [collabId, router, vibrate]);

  if (!ready) {
    return <AuthSkeleton />;
  }

  return (
    <MainScreenShell>
      <div className="min-h-screen bg-[#020202] px-4 pt-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="w-9 h-9 rounded-full bg-[#111111] border border-[#2a2a2a] flex items-center justify-center text-white hover:bg-[#1a1a1a] transition-colors active:scale-95"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-[#111111] border border-[#2a2a2a] flex items-center justify-center text-white hover:bg-[#1a1a1a] transition-colors active:scale-95"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Create Group Card</h1>
            <p className="text-[#888] text-xs">
              {step === 1 && 'Choose an occasion'}
              {step === 2 && 'Customize the details'}
              {step === 3 && 'Share with friends'}
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator current={step} total={3} />

        {/* Steps */}
        {step === 1 && <Step1 onSelect={handleSelectCategory} />}
        {step === 2 && (
          <Step2 data={data} onUpdate={updateData} onBack={handleBack} />
        )}
        {step === 3 && (
          <Step3 data={data} collabId={collabId} onDone={handleDone} />
        )}

        {/* Step 2 Continue Button */}
        {step === 2 && (
          <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#020202] via-[#020202] to-transparent pointer-events-none">
            <button
              onClick={handleNextFromStep2}
              disabled={creating || !data.title.trim()}
              className="w-full max-w-sm mx-auto block bg-[#D9AC3D] rounded-xl py-3.5 flex items-center justify-center gap-2 text-[#020202] text-sm font-bold hover:bg-[#D9AC3D]/90 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed pointer-events-auto"
            >
              {creating ? (
                <span className="animate-pulse">Creating...</span>
              ) : (
                <>
                  <Users size={16} />
                  Create & Get Link
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .glass-card {
          background: rgba(17, 17, 17, 0.7);
          border: 1px solid #2a2a2a;
          backdrop-filter: blur(12px);
        }
        .gold-card {
          background: linear-gradient(135deg, rgba(217, 172, 61, 0.08), rgba(217, 172, 61, 0.02));
          border: 1px solid rgba(217, 172, 61, 0.15);
        }
      `}</style>
    </MainScreenShell>
  );
}
