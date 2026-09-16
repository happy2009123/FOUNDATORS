'use client';

import { useId } from 'react';

export default function Logo({ size = 24, className = '' }) {
  const gradId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f7dd8f" />
          <stop offset="50%" stopColor="#e0b74a" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
      </defs>
      <path d="M28 8 H78 L62 24 H44 V42 H68 L52 58 H44 V92 H28 Z" fill={`url(#${gradId})`} />
      <path d="M60 54 l4.5 9 9 4.5 -9 4.5 -4.5 9 -4.5-9 -9-4.5 9-4.5Z" fill={`url(#${gradId})`} />
    </svg>
  );
}

export function Wordmark({ size = 'text-base', className = '' }) {
  return (
    <span className={`font-display font-extrabold tracking-[0.2em] ${size} ${className}`}>
      FOUND<span className="text-gold">A</span>TORS
    </span>
  );
}
