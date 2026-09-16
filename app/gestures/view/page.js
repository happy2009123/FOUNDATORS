'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Share2, Heart } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { TEMPLATES, THEMES } from '@/components/gestures/GestureTemplates';
import { getPerson } from '@/lib/data';
import ShareModal from '@/components/gestures/ShareModal';

export default function GestureViewPageWrapper() {
  return (
    <Suspense fallback={<div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a]"><span className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>}>
      <GestureViewPage />
    </Suspense>
  );
}

function GestureViewPage() {
  const router = useRouter();
  const params = useSearchParams();
  const gestureId = params.get('id');
  const gestures = useStore((s) => s.gestures);
  const reactToGesture = useStore((s) => s.reactToGesture);
  const incrementGestureViews = useStore((s) => s.incrementGestureViews);
  const showToast = useStore((s) => s.showToast);
  const { vibrate, notification } = useHaptics();
  const [showShare, setShowShare] = useState(false);

  const gesture = useMemo(() => gestures.find((g) => g.id === gestureId), [gestures, gestureId]);
  const template = useMemo(() => gesture ? TEMPLATES.find((t) => t.key === gesture.templateKey) : null, [gesture]);
  const theme = useMemo(() => gesture ? THEMES[gesture.customizations?.themeKey || 'gold'] : THEMES.gold, [gesture]);

  useEffect(() => {
    if (gestureId) incrementGestureViews(gestureId);
  }, [gestureId, incrementGestureViews]);

  const gestureUrl = typeof window !== 'undefined' ? `${window.location.origin}/gestures/view?id=${gestureId}` : '';

  function handleReact(type) {
    reactToGesture(gestureId, type);
    notification('success');
    vibrate('light');
  }

  if (!gesture || !template) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a0a0a] px-6 text-center">
        <div className="text-5xl">🔍</div>
        <div className="mt-4 text-[16px] font-extrabold">Gesture not found</div>
        <div className="mt-1 text-[12px] text-text2">This gesture may have been deleted or the link is invalid.</div>
        <button onClick={() => router.push('/gestures')} className="mt-6 rounded-full bg-gold-grad px-6 py-2.5 text-[11px] font-black text-[#1a1300]">
          Browse Gestures
        </button>
      </div>
    );
  }

  const Preview = template.component;
  const totalReactions = Object.values(gesture.reactions || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="flex min-h-[100dvh] flex-col" style={{ background: theme.bg }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
          <ArrowLeft size={18} />
        </button>
        <div className="text-[11px] font-bold text-white/60">Foundators Gesture</div>
        <button onClick={() => setShowShare(true)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
          <Share2 size={16} />
        </button>
      </div>

      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        gestureUrl={gestureUrl}
        gestureName={template?.name || 'Gesture'}
        recipientName={gesture.customizations?.name || 'you'}
      />

      {/* Full gesture display */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-[360px] overflow-hidden rounded-[24px] border border-white/10" style={{ aspectRatio: '9/16', maxHeight: '70vh' }}>
          <Preview
            name={gesture.customizations?.name || 'Friend'}
            message={gesture.customizations?.message || ''}
            theme={theme}
          />
        </div>
      </div>

      {/* Reactions & info */}
      <div className="px-4 pb-6 pt-3">
        <div className="text-center text-[11px] text-white/40">
          From <span className="font-bold text-white/70">{getPerson(gesture.authorKey)?.name || 'Someone'}</span> · {new Date(gesture.createdAt).toLocaleDateString()}
        </div>

        {/* Reaction buttons */}
        <div className="mt-3 flex items-center justify-center gap-3">
          {[
            { type: 'love', label: '❤️' },
            { type: 'celebrate', label: '🎉' },
            { type: 'laugh', label: '😂' },
            { type: 'cry', label: '😢' },
          ].map((r) => (
            <button
              key={r.type}
              onClick={() => handleReact(r.type)}
              className="flex flex-col items-center gap-1"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl transition-all active:scale-110">
                {r.label}
              </div>
              <span className="text-[10px] font-bold text-white/50">{gesture.reactions[r.type] || 0}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-white/30">
          <span>{gesture.views} views</span>
          <span>·</span>
          <span>{totalReactions} reactions</span>
        </div>

        <button
          onClick={() => router.push('/gestures/create')}
          className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-[12px] font-bold text-white/70"
        >
          Create your own gesture →
        </button>
      </div>
    </div>
  );
}
