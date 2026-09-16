'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useHaptics } from '@/lib/useHaptics';

export default function CopyButton({ text, label = 'Copy', className = '' }) {
  const [copied, setCopied] = useState(false);
  const { vibrate } = useHaptics();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      vibrate('light');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      vibrate('light');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? 'Copied!' : label}
      className={`inline-flex h-[44px] items-center gap-1.5 rounded-lg border border-linesoft bg-card px-3 text-[10px] font-bold text-text2 transition-all hover:border-gold hover:text-gold ${className}`}
    >
      {copied ? (
        <>
          <Check size={12} className="text-green-400" />
          <span className="text-green-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy size={12} />
          {label}
        </>
      )}
    </button>
  );
}
