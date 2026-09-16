'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

export default function Intro({ children }) {
  const [showIntro, setShowIntro] = useState(true);
  const [phase, setPhase] = useState('dust');

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('dust'), 200),
      setTimeout(() => setPhase('converge'), 800),
      setTimeout(() => setPhase('logo'), 1500),
      setTimeout(() => setPhase('wordmark'), 2200),
      setTimeout(() => setPhase('tagline'), 2800),
      setTimeout(() => setPhase('bloom'), 3200),
      setTimeout(() => setPhase('fade'), 3600),
      setTimeout(() => setShowIntro(false), 4200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const skip = useCallback(() => setShowIntro(false), []);

  const particles = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: (Math.sin(i * 1.618 + 0.5) * 0.5 + 0.5) * 100,
    y: (Math.cos(i * 2.236 + 1.2) * 0.5 + 0.5) * 100,
    size: 1.5 + (i % 3) * 0.5,
    delay: (i * 0.05) % 0.6,
  })), []);

  if (!showIntro) return children;

  const showDust = phase !== 'black';
  const showConverge = ['converge', 'logo', 'wordmark', 'tagline', 'bloom'].includes(phase);
  const showLogo = ['logo', 'wordmark', 'tagline', 'bloom'].includes(phase);
  const showWordmark = ['wordmark', 'tagline', 'bloom'].includes(phase);
  const showTagline = ['tagline', 'bloom'].includes(phase);
  const showBloom = phase === 'bloom';
  const isFading = phase === 'fade';

  return (
    <>
      {children}
      <div
        className="intro-overlay fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#020202]"
        style={{ opacity: isFading ? 0 : 1, transition: 'opacity 0.8s ease', pointerEvents: isFading ? 'none' : 'auto' }}
      >
        {/* Vignette */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.8) 100%)',
        }} />

        {/* Ambient glow */}
        <div className="absolute" style={{
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(217,172,61,0.1) 0%, transparent 60%)',
          opacity: showBloom ? 1 : showLogo ? 0.3 : 0,
          transform: `scale(${showBloom ? 2.5 : showLogo ? 1.2 : 0.4})`,
          transition: 'all 1.2s cubic-bezier(0.4,0,0.2,1)',
          willChange: 'transform, opacity',
        }} />

        {/* Ring */}
        <div className="absolute" style={{
          width: '180px', height: '180px', borderRadius: '50%',
          border: '1px solid rgba(217,172,61,0.25)',
          opacity: showConverge ? 1 : 0,
          transform: `scale(${showBloom ? 3.5 : showLogo ? 2 : 1})`,
          transition: 'all 1.2s cubic-bezier(0.4,0,0.2,1)',
          willChange: 'transform, opacity',
        }} />

        {/* Counter-rotate ring */}
        {showLogo && (
          <div className="absolute" style={{
            width: '240px', height: '240px', borderRadius: '50%',
            border: '0.5px solid rgba(217,172,61,0.1)',
            animation: 'introSpin 16s linear infinite reverse',
            willChange: 'transform',
          }} />
        )}

        {/* Particles */}
        {showDust && particles.map(p => (
          <div key={p.id} className="absolute rounded-full" style={{
            width: `${p.size}px`, height: `${p.size}px`,
            background: '#f7dd8f',
            left: `${showConverge ? 50 : p.x}%`,
            top: `${showConverge ? 50 : p.y}%`,
            transform: 'translate(-50%, -50%)',
            opacity: showConverge ? 0.9 : 0.4,
            transition: `all 1s cubic-bezier(0.4,0,0.2,1) ${p.delay}s`,
            boxShadow: '0 0 4px rgba(217,172,61,0.5)',
            willChange: 'transform, opacity',
          }} />
        ))}

        {/* Logo */}
        <div className="relative" style={{
          zIndex: 10,
          opacity: showLogo ? 1 : 0,
          transform: `scale(${showLogo ? 1 : 0.5}) translateY(${showLogo ? 0 : 30}px)`,
          transition: 'all 1s cubic-bezier(0.16,1,0.3,1)',
          willChange: 'transform, opacity',
        }}>
          <div className="absolute" style={{
            inset: '-50px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(217,172,61,0.3) 0%, transparent 55%)',
            opacity: showBloom ? 1 : 0.2,
            transition: 'opacity 0.8s ease',
          }} />
          <svg width="80" height="80" viewBox="0 0 100 100" className="relative" style={{
            filter: showBloom ? 'drop-shadow(0 0 30px rgba(217,172,61,0.5))' : 'none',
            transition: 'filter 0.8s ease',
          }}>
            <defs>
              <linearGradient id="ig" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f7dd8f" />
                <stop offset="40%" stopColor="#d9ac3d" />
                <stop offset="100%" stopColor="#b8860b" />
              </linearGradient>
            </defs>
            <path d="M28 8 H78 L62 24 H44 V42 H68 L52 58 H44 V92 H28 Z" fill="url(#ig)" />
            <path d="M60 54 l4.5 9 9 4.5 -9 4.5 -4.5 9 -4.5-9 -9-4.5 9-4.5Z" fill="url(#ig)" />
          </svg>
        </div>

        {/* Wordmark */}
        <div className="relative mt-7" style={{ zIndex: 10 }}>
          <div className="flex items-center gap-[1px]">
            {'FOUNDATORS'.split('').map((ch, i) => (
              <span
                key={i}
                className="font-display font-black"
                style={{
                  fontSize: '30px',
                  letterSpacing: '0.2em',
                  color: ch === 'A' ? '#d9ac3d' : '#fff',
                  opacity: showWordmark ? 1 : 0,
                  transform: `translateY(${showWordmark ? 0 : 10}px)`,
                  transition: `all 0.5s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.04}s`,
                  textShadow: ch === 'A' ? '0 0 20px rgba(217,172,61,0.4)' : 'none',
                  willChange: 'transform, opacity',
                }}
              >
                {ch}
              </span>
            ))}
          </div>
        </div>

        {/* Tagline */}
        <div className="relative mt-4" style={{
          zIndex: 10,
          opacity: showTagline ? 1 : 0,
          transform: `translateY(${showTagline ? 0 : 8}px)`,
          transition: 'all 0.7s cubic-bezier(0.16,1,0.3,1)',
          willChange: 'transform, opacity',
        }}>
          <span className="text-[11px] font-bold tracking-[0.4em] uppercase" style={{ color: 'rgba(217,172,61,0.55)' }}>
            Ideas &middot; People &middot; Build
          </span>
        </div>

        {/* Gold line */}
        <div className="relative mt-5" style={{ zIndex: 10, opacity: showTagline ? 1 : 0, transition: 'opacity 0.6s ease 0.2s' }}>
          <div style={{
            width: showBloom ? '100px' : '0px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(217,172,61,0.5), transparent)',
            transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>

        {/* Shimmer */}
        {showBloom && (
          <div className="absolute inset-0" style={{
            zIndex: 50,
            background: 'linear-gradient(105deg, transparent 30%, rgba(247,221,143,0.08) 48%, rgba(247,221,143,0.15) 50%, rgba(247,221,143,0.08) 52%, transparent 70%)',
            animation: 'introSweep 0.7s ease forwards',
          }} />
        )}

        {/* Skip */}
        <button
          onClick={skip}
          aria-label="Skip intro animation"
          className="absolute right-5 top-12 flex h-[44px] items-center rounded-full border border-white/10 bg-white/5 px-4 text-[10px] font-bold tracking-[0.15em] uppercase text-white/40 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white/70"
          style={{ zIndex: 70, pointerEvents: 'auto' }}
        >
          Skip
        </button>
      </div>
    </>
  );
}
