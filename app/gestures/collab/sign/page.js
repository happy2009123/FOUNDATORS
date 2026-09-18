'use client';

import { Suspense, useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Pen,
  Users,
  Clock,
  Check,
  Send,
  Heart,
} from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import AuthSkeleton from '@/components/AuthSkeleton';
import { useStore } from '@/lib/store';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useHaptics } from '@/lib/useHaptics';
import { TEMPLATES, THEMES } from '@/components/gestures/GestureTemplates';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

async function fetchUser(key) {
  try {
    const snap = await getDoc(doc(db, 'users', key));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch {
    return null;
  }
}

function SignCollabInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const ready = useRequireAuth();
  const { vibrate, notification } = useHaptics();

  const collabGestures = useStore((s) => s.collabGestures);
  const signCollab = useStore((s) => s.signCollab);
  const showToast = useStore((s) => s.showToast);

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [hasSigned, setHasSigned] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [owner, setOwner] = useState(null);

  const collab = useMemo(
    () => collabGestures.find((c) => c.id === id) || null,
    [collabGestures, id]
  );

  const template = useMemo(
    () => (collab ? TEMPLATES.find((t) => t.key === collab.templateKey) : null),
    [collab]
  );

  const theme = useMemo(
    () => (collab?.themeKey ? THEMES[collab.themeKey] : THEMES.gold),
    [collab]
  );

  useEffect(() => {
    if (collab?.ownerKey) fetchUser(collab.ownerKey).then(setOwner);
  }, [collab?.ownerKey]);

  const isClosed = collab && (!collab.isOpen || collab.signatures.length >= collab.maxSigners || (collab.deadline && new Date(collab.deadline) < new Date()));

  const handleSign = useCallback(() => {
    if (!name.trim() || !message.trim() || !collab) return;
    vibrate('medium');
    notification('success');
    signCollab(collab.id, { name: name.trim(), message: message.trim() });
    setHasSigned(true);
    setShowSuccess(true);
    showToast('Your signature has been added!');
  }, [name, message, collab, vibrate, notification, signCollab, showToast]);

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/gestures/collab/${collab?.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      vibrate('light');
      showToast('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [collab, vibrate, showToast]);

  if (ready === false || !ready) return <AuthSkeleton />;

  if (!collab) {
    return (
      <MainScreenShell>
        <div className="flex-1 flex flex-col items-center justify-center px-[18px] py-16 text-center">
          <div className="text-5xl mb-4">📭</div>
          <div className="text-[16px] font-extrabold text-white">Card not found</div>
          <div className="text-[11px] text-text2 mt-2 mb-5">This collaborative card may have been removed.</div>
          <button
            onClick={() => { vibrate('light'); router.push('/gestures'); }}
            className="rounded-full bg-gold-grad px-6 py-2.5 text-[11px] font-black text-[#1a1300]"
          >
            Browse Gestures
          </button>
        </div>
      </MainScreenShell>
    );
  }

  const TemplateComponent = template?.component;
  const sigCount = collab.signatures.length;
  const maxSigners = collab.maxSigners;
  const isFull = sigCount >= maxSigners;
  const isPastDeadline = collab.deadline && new Date(collab.deadline) < new Date();
  const cardClosed = !collab.isOpen || isFull || isPastDeadline;

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <MainScreenShell>
      <div className="flex-1 overflow-y-auto pb-8 no-scrollbar">
        {/* Header */}
        <div className="page-enter px-[18px] pt-3">
          <div className="gold-card relative overflow-hidden p-5">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[rgba(217,172,61,.1)] opacity-40" />
            <div className="relative">
              <button
                onClick={() => { vibrate('light'); router.back(); }}
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-gold">
                <Pen size={12} />
                Sign the Card
              </div>
              <h1 className="mt-2 text-[20px] font-black leading-tight text-white">
                {collab.title}
              </h1>
              {owner && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={owner.avatar} alt={owner.name} className="h-5 w-5 rounded-full" />
                  <span className="text-[11px] text-text2">
                    created by <span className="font-bold text-white">{owner.name}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Phone Frame Preview */}
        <div className="px-[18px] mt-4">
          <div className="text-[10px] font-bold uppercase tracking-[.16em] text-text3 mb-2">
            Card Preview
          </div>
          <div className="flex justify-center">
            <div
              className="overflow-hidden rounded-[24px] border-2 border-white/10"
              style={{ width: 280, height: 420 }}
            >
              {TemplateComponent ? (
                <TemplateComponent
                  name={collab.recipients?.[0] || 'Recipient'}
                  message={collab.title}
                  theme={theme}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-[#0a0a02] text-[11px] text-text3">
                  Template not available
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Users size={11} className="text-gold" />
            <span className="text-[10px] text-text3">
              <span className="font-bold text-white">{sigCount}</span> of {maxSigners} people have signed
            </span>
          </div>
          {collab.deadline && (
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Clock size={11} className={isPastDeadline ? 'text-red-400' : 'text-text3'} />
              <span className={`text-[10px] ${isPastDeadline ? 'text-red-400' : 'text-text3'}`}>
                Deadline: {formatDate(collab.deadline)}
              </span>
            </div>
          )}
        </div>

        {/* Card Closed State */}
        {cardClosed && !hasSigned && (
          <div className="px-[18px] mt-5">
            <div className="rounded-2xl border border-red-400/20 bg-[rgba(239,68,68,0.06)] p-5 text-center">
              <div className="text-3xl mb-2">🔒</div>
              <div className="text-[14px] font-extrabold text-white mb-1">This card is closed</div>
              <div className="text-[11px] text-text2">
                {isFull ? 'Maximum signatures reached' : isPastDeadline ? 'The deadline has passed' : 'The card owner has closed this card'}
              </div>
            </div>
          </div>
        )}

        {/* Success Animation */}
        {showSuccess && (
          <div className="px-[18px] mt-5">
            <div className="rounded-2xl border border-[#00c853]/20 bg-[rgba(0,200,83,0.06)] p-5 text-center">
              <div className="flex justify-center mb-3">
                <div className="h-14 w-14 rounded-full bg-[#00c853] flex items-center justify-center">
                  <Check size={28} className="text-black" strokeWidth={3} />
                </div>
              </div>
              <div className="text-[14px] font-extrabold text-white mb-1">You signed the card!</div>
              <div className="text-[11px] text-text2">Your signature has been added to the card.</div>
            </div>
          </div>
        )}

        {/* Signature Form */}
        {!cardClosed && !hasSigned && (
          <div className="px-[18px] mt-5">
            <div className="text-[10px] font-bold uppercase tracking-[.16em] text-text3 mb-3">
              Your Signature
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-text2 mb-1.5">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={50}
                  className="w-full rounded-xl border border-[#2a2a2a] bg-[#111111] px-4 py-3 text-[13px] text-white placeholder:text-text3 outline-none focus:border-gold/40 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text2 mb-1.5">Your Message</label>
                <div className="relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                    placeholder="Write a message for the card..."
                    rows={3}
                    className="w-full rounded-xl border border-[#2a2a2a] bg-[#111111] px-4 py-3 text-[13px] text-white placeholder:text-text3 outline-none focus:border-gold/40 transition-colors resize-none"
                  />
                  <div className="absolute bottom-2 right-3 text-[10px] text-text3">
                    {message.length}/200
                  </div>
                </div>
              </div>

              <button
                onClick={handleSign}
                disabled={!name.trim() || !message.trim()}
                className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[12px] font-black transition-all ${
                  name.trim() && message.trim()
                    ? 'bg-gold-grad text-[#1a1300]'
                    : 'bg-white/10 text-text3 cursor-not-allowed'
                }`}
              >
                <Send size={14} />
                Sign the Card
              </button>
            </div>
          </div>
        )}

        {/* Existing Signatures */}
        {sigCount > 0 && (
          <div className="px-[18px] mt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-[.16em] text-text3">
                Signatures ({sigCount}/{maxSigners})
              </span>
            </div>

            <div className="space-y-2.5">
              {collab.signatures.map((sig, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-3.5"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-gold/20 flex items-center justify-center">
                        <Heart size={10} className="text-gold" />
                      </div>
                      <span className="text-[12px] font-bold text-white">{sig.name}</span>
                    </div>
                    <span className="text-[10px] text-text3">{formatDate(sig.createdAt)}</span>
                  </div>
                  <p className="text-[11px] leading-4 text-text2 pl-8">{sig.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Post-Sign Actions */}
        {hasSigned && (
          <div className="px-[18px] mt-5 space-y-2.5">
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-gold/20 bg-[rgba(217,172,61,0.06)] py-3.5 text-[12px] font-bold text-gold transition-all hover:bg-[rgba(217,172,61,0.12)]"
            >
              {copied ? <Check size={14} className="text-[#00c853]" /> : <Send size={14} />}
              {copied ? 'Link Copied!' : 'Share with more friends'}
            </button>

            <button
              onClick={() => { vibrate('light'); router.push(`/gestures/collab/view?id=${collab.id}`); }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gold-grad py-3.5 text-[12px] font-black text-[#1a1300]"
            >
              View the Full Card
            </button>
          </div>
        )}

        <div className="h-8" />
      </div>
    </MainScreenShell>
  );
}

export default function SignCollabPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <SignCollabInner />
    </Suspense>
  );
}
