'use client';

import { Award } from 'lucide-react';

export default function FoundingBadge({ number, onClick, size = 'sm' }) {
  if (!number && number !== 0) return null;
  const big = size === 'lg';

  const Tag = onClick ? 'button' : 'span';

  return (
    <Tag
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border border-gold/50 bg-gold/10 font-extrabold uppercase tracking-wide text-gold-hi ${
        big ? 'px-3 py-1 text-[11px]' : 'px-2 py-0.5 text-[9.5px]'
      } ${onClick ? 'transition-colors hover:bg-gold/20' : ''}`}
      title={`Founding Member #${number} of FOUNDATORS 100`}
    >
      <Award size={big ? 13 : 11} className="flex-none" />
      Founding #{number}
    </Tag>
  );
}
