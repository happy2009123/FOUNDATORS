'use client';

import { BadgeCheck } from 'lucide-react';

export default function VerifiedBadge({ size = 14 }) {
  return <BadgeCheck size={size} className="text-gold" fill="none" aria-label="Verified" role="img" />;
}
