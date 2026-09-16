'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';

export default function Toast() {
  const toastMessage = useStore((s) => s.toastMessage);
  const toastId = useStore((s) => s.toastId);
  const [visible, setVisible] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (toastId === 0) return;
    setVisible(true);
    setAnimKey((k) => k + 1);
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, [toastId]);

  if (!toastMessage) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed left-1/2 z-[200] -translate-x-1/2 transition-all duration-500"
      style={{
        bottom: visible ? 'calc(env(safe-area-inset-bottom, 0px) + 100px)' : 'calc(env(safe-area-inset-bottom, 0px) + 70px)',
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? 0 : 8}px)`,
      }}
    >
      <div
        className="relative overflow-hidden whitespace-nowrap rounded-2xl border border-[rgba(212,175,55,0.2)] px-5 py-3 text-[12.5px] font-semibold text-white shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        style={{
          background: 'linear-gradient(135deg, rgba(22,22,22,0.92), rgba(10,10,10,0.95))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {toastMessage}
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-white/5">
          <div
            key={animKey}
            className="h-full rounded-full bg-gradient-to-r from-[#b8860b] via-[#f7dd8f] to-[#d9ac3d]"
            style={{
              width: '100%',
              animation: 'toastProgress 2.2s linear forwards',
            }}
          />
        </div>
      </div>
    </div>
  );
}
