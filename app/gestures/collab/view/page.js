'use client';

import { Suspense, useMemo, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Clock,
  Share2,
  Pen,
  Check,
  Lock,
  Gift,
} from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import AuthSkeleton from '@/components/AuthSkeleton';
import { useStore } from '@/lib/store';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useHaptics } from '@/lib/useHaptics';
import { getPerson } from '@/lib/data';
import { TEMPLATES, THEMES } from '@/components/gestures/GestureTemplates';

function CollabViewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const ready = useRequireAuth();
  const { vibrate, notification } = useHaptics();

  const collabGestures = useStore((s) => s.collabGestures);
  const closeCollab = useStore((s) => s.closeCollab);
  const showToast = useStore((s) => s.showToast);
  const profile = useStore((s) => s.profile);

  const [copied, setCopied] = useState(false);
  const [showSignatures, setShowSignatures] = useState(false);

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

  const owner = useMemo(() => (collab ? getPerson(collab.ownerKey) : null), [collab]);

  const recipientNames = useMemo(() => {
    if (!collab) return '';
    return collab.recipients
      .map((key) => {
        const person = getPerson(key);
        return person?.name || key;
      })
      .join(', ');
  }, [collab]);

  const isOwner = collab && profile?.key === collab.ownerKey;

  const isFull = collab && collab.signatures.length >= collab.maxSigners;
  const isPastDeadline = collab && collab.deadline && new Date(collab.deadline) < new Date();
  const cardClosed = collab && (!collab.isOpen || isFull || isPastDeadline);

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return d;
    }
  };

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/gestures/collab/sign?id=${collab?.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      vibrate('light');
      showToast('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [collab, vibrate, showToast]);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: collab?.title,
        text: `Sign this collaborative card: ${collab?.title}`,
        url: `${window.location.origin}/gestures/collab/sign?id=${collab?.id}`,
      });
    } else {
      handleCopyLink();
    }
  }, [collab, handleCopyLink]);

  const handleCloseCard = useCallback(() => {
    if (!collab) return;
    closeCollab(collab.id);
    vibrate('medium');
    notification('success');
    showToast('Card closed! No more signatures accepted.');
  }, [collab, closeCollab, vibrate, notification, showToast]);

  const handleAddSignature = useCallback(() => {
    if (!collab) return;
    vibrate('light');
    router.push(`/gestures/collab/sign?id=${collab.id}`);
  }, [collab, vibrate, router]);

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

  return (
    <MainScreenShell>
      <div className="flex-1 overflow-y-auto pb-8 no-scrollbar">
        {/* Header */}
        <div className="page-enter px-[18px] pt-3">
          <div className="gold-card relative overflow-hidden p-5">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[rgba(217,172,61,.1)] opacity-40" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => { vibrate('light'); router.push('/gestures'); }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="flex items-center gap-2">
                  {cardClosed ? (
                    <span className="flex items-center gap-1 rounded-full bg-red-400/10 px-2.5 py-1 text-[10px] font-bold text-red-400">
                      <Lock size={10} />
                      Closed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-[rgba(0,200,83,0.1)] px-2.5 py-1 text-[10px] font-bold text-[#00c853]">
                      <Pen size={10} />
                      Open
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-gold mb-2">
                <Gift size={12} />
                {collab.category}
              </div>
              <h1 className="text-[20px] font-black leading-tight text-white">
                {collab.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Phone Frame Preview */}
        <div className="px-[18px] mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[.16em] text-text3">
              Card Preview
            </span>
            <button
              onClick={() => { vibrate('light'); setShowSignatures(!showSignatures); }}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-white/15"
            >
              {showSignatures ? (
                <span>Hide Signatures</span>
              ) : (
                <>
                  <Users size={10} />
                  <span>View Signatures ({sigCount})</span>
                </>
              )}
            </button>
          </div>

          <div className="flex justify-center">
            <div
              className="overflow-hidden rounded-[24px] border-2 border-white/10 relative"
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

              {/* Overlay signature count */}
              <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-black/70 backdrop-blur-sm px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users size={11} className="text-gold" />
                    <span className="text-[10px] text-white font-bold">
                      {sigCount}/{maxSigners}
                    </span>
                  </div>
                  {collab.deadline && (
                    <div className="flex items-center gap-1">
                      <Clock size={10} className={isPastDeadline ? 'text-red-400' : 'text-text3'} />
                      <span className={`text-[9px] ${isPastDeadline ? 'text-red-400' : 'text-text3'}`}>
                        {formatDate(collab.deadline)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="text-[10px] text-text3">
              <span className="font-bold text-white">{sigCount}</span> of {maxSigners} people have signed
            </span>
          </div>
        </div>

        {/* Signatures Section (Toggle) */}
        {showSignatures && sigCount > 0 && (
          <div className="px-[18px] mt-5">
            <div className="text-[10px] font-bold uppercase tracking-[.16em] text-text3 mb-3">
              Signatures ({sigCount}/{maxSigners})
            </div>
            <div className="space-y-2.5">
              {collab.signatures.map((sig, i) => {
                const author = getPerson(sig.authorKey);
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-3.5"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-gold/20 flex items-center justify-center overflow-hidden">
                          {author?.avatar ? (
                            <img src={author.avatar} alt={sig.name} className="h-7 w-7 rounded-full" />
                          ) : (
                            <span className="text-[11px] font-bold text-gold">
                              {sig.name?.[0] || '?'}
                            </span>
                          )}
                        </div>
                        <span className="text-[12px] font-bold text-white">{sig.name}</span>
                      </div>
                      <span className="text-[10px] text-text3">{formatDate(sig.createdAt)}</span>
                    </div>
                    <p className="text-[11px] leading-4 text-text2 pl-9">{sig.message}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Signature Button */}
        {!cardClosed && (
          <div className="px-[18px] mt-5">
            <button
              onClick={handleAddSignature}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gold-grad py-3.5 text-[12px] font-black text-[#1a1300] transition-all hover:brightness-110"
            >
              <Pen size={14} />
              Add Your Signature
            </button>
          </div>
        )}

        {/* Completion Messages */}
        {isFull && (
          <div className="px-[18px] mt-5">
            <div className="rounded-2xl border border-[#D9AC3D]/20 bg-[rgba(217,172,61,0.06)] p-5 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <div className="text-[14px] font-extrabold text-white mb-1">This card is full!</div>
              <div className="text-[11px] text-text2">Maximum number of signatures reached.</div>
            </div>
          </div>
        )}

        {isPastDeadline && !isFull && (
          <div className="px-[18px] mt-5">
            <div className="rounded-2xl border border-red-400/20 bg-[rgba(239,68,68,0.06)] p-5 text-center">
              <div className="text-3xl mb-2">⏰</div>
              <div className="text-[14px] font-extrabold text-white mb-1">Signing period has ended</div>
              <div className="text-[11px] text-text2">This card has passed its deadline.</div>
            </div>
          </div>
        )}

        {/* Card Details */}
        <div className="px-[18px] mt-5">
          <div className="text-[10px] font-bold uppercase tracking-[.16em] text-text3 mb-3">
            Card Details
          </div>
          <div className="space-y-2">
            <div className="rounded-xl border border-[#2a2a2a] bg-[#111111] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gold/20 flex items-center justify-center">
                  <Users size={10} className="text-gold" />
                </div>
                <span className="text-[11px] text-text2">Created by</span>
              </div>
              <div className="flex items-center gap-2">
                {owner?.avatar && (
                  <img src={owner.avatar} alt={owner.name} className="h-5 w-5 rounded-full" />
                )}
                <span className="text-[11px] font-bold text-white">{owner?.name || 'Unknown'}</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#2a2a2a] bg-[#111111] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gold/20 flex items-center justify-center">
                  <Clock size={10} className="text-gold" />
                </div>
                <span className="text-[11px] text-text2">Deadline</span>
              </div>
              <span className={`text-[11px] font-bold ${isPastDeadline ? 'text-red-400' : 'text-white'}`}>
                {collab.deadline ? formatDate(collab.deadline) : 'No deadline'}
              </span>
            </div>

            <div className="rounded-xl border border-[#2a2a2a] bg-[#111111] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gold/20 flex items-center justify-center">
                  <Gift size={10} className="text-gold" />
                </div>
                <span className="text-[11px] text-text2">Recipients</span>
              </div>
              <span className="text-[11px] font-bold text-white text-right max-w-[160px] truncate">
                {recipientNames}
              </span>
            </div>

            <div className="rounded-xl border border-[#2a2a2a] bg-[#111111] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gold/20 flex items-center justify-center">
                  {cardClosed ? <Lock size={10} className="text-red-400" /> : <Pen size={10} className="text-[#00c853]" />}
                </div>
                <span className="text-[11px] text-text2">Status</span>
              </div>
              <span className={`text-[11px] font-bold ${cardClosed ? 'text-red-400' : 'text-[#00c853]'}`}>
                {cardClosed ? 'Closed' : 'Open'}
              </span>
            </div>
          </div>
        </div>

        {/* Owner Actions */}
        {isOwner && (
          <div className="px-[18px] mt-5">
            <div className="text-[10px] font-bold uppercase tracking-[.16em] text-text3 mb-3">
              Actions
            </div>
            <div className="space-y-2.5">
              {!cardClosed && (
                <button
                  onClick={handleCloseCard}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-[rgba(239,68,68,0.06)] py-3.5 text-[12px] font-bold text-red-400 transition-all hover:bg-[rgba(239,68,68,0.12)]"
                >
                  <Lock size={14} />
                  Close Card
                </button>
              )}

              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-gold/20 bg-[rgba(217,172,61,0.06)] py-3.5 text-[12px] font-bold text-gold transition-all hover:bg-[rgba(217,172,61,0.12)]"
              >
                {copied ? <Check size={14} className="text-[#00c853]" /> : <Share2 size={14} />}
                {copied ? 'Link Copied!' : 'Copy Invite Link'}
              </button>

              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gold-grad py-3.5 text-[12px] font-black text-[#1a1300] transition-all hover:brightness-110"
              >
                <Share2 size={14} />
                Share Card
              </button>
            </div>
          </div>
        )}

        {/* Non-owner actions */}
        {!isOwner && !cardClosed && (
          <div className="px-[18px] mt-5">
            <div className="text-[10px] font-bold uppercase tracking-[.16em] text-text3 mb-3">
              Actions
            </div>
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-gold/20 bg-[rgba(217,172,61,0.06)] py-3.5 text-[12px] font-bold text-gold transition-all hover:bg-[rgba(217,172,61,0.12)]"
            >
              {copied ? <Check size={14} className="text-[#00c853]" /> : <Share2 size={14} />}
              {copied ? 'Link Copied!' : 'Copy Invite Link'}
            </button>
          </div>
        )}

        <div className="h-8" />
      </div>
    </MainScreenShell>
  );
}

export default function CollabViewPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <CollabViewInner />
    </Suspense>
  );
}
