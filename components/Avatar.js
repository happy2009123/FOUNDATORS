'use client';

import { useState } from 'react';

function getInitials(name) {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase() || '?';
}

const GRADIENTS = [
  'from-[#b8860b] to-[#f7dd8f]',
  'from-[#8a5cff] to-[#3b1f8f]',
  'from-[#2ecc71] to-[#1a8a4a]',
  'from-[#5b8dff] to-[#2a5ccc]',
  'from-[#e05297] to-[#a02362]',
  'from-[#ff8c42] to-[#d45d00]',
];

function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function Avatar({ src, name, size = 48, className = '' }) {
  const [error, setError] = useState(false);
  const isLegacyRandom = typeof src === 'string' && src.includes('pravatar');
  const showFallback = error || !src || isLegacyRandom;
  const gradient = GRADIENTS[hashName(name || '') % GRADIENTS.length];

  if (showFallback) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-gradient-to-br ${gradient} font-display font-extrabold text-[#171100] ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.46 }}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name ? `${name}'s avatar` : 'Avatar'}
      loading="lazy"
      onError={() => setError(true)}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
