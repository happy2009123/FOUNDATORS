'use client';

import { useEffect, useCallback, useState } from 'react';
import { X, MessageCircle, Smartphone, Send, Link2, Check } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';

const SHARE_OPTIONS = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    color: 'bg-[#25D366]',
    textColor: 'text-[#25D366]',
    getLink: (url, name) =>
      `https://wa.me/?text=${encodeURIComponent(`I made a special gesture for you: ${name} 🎁 Open it here: ${url}`)}`,
  },
  {
    id: 'sms',
    name: 'SMS',
    color: 'bg-[#3B82F6]',
    textColor: 'text-[#3B82F6]',
    getLink: (url, name) =>
      `sms:?body=${encodeURIComponent(`I made a special gesture for you: ${name} 🎁 Open it here: ${url}`)}`,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    isGradient: true,
    color: 'bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]',
    textColor: 'text-[#E1306C]',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    color: 'bg-[#0088cc]',
    textColor: 'text-[#0088cc]',
    getLink: (url, name) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`I made a special gesture for you: ${name} 🎁`)}`,
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    color: 'bg-white/10',
    textColor: 'text-white',
    getLink: (url, name) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I made a special gesture for you: ${name} 🎁`)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: 'copy',
    name: 'Copy Link',
    color: 'bg-[#D9AC3D]/20',
    textColor: 'text-[#D9AC3D]',
  },
];

export default function ShareModal({ isOpen, onClose, gestureUrl, gestureName, recipientName }) {
  const showToast = useStore((s) => s.showToast);
  const { vibrate } = useHaptics();
  const [copiedId, setCopiedId] = useState(null);

  const handleShare = useCallback(
    (option) => {
      vibrate('light');

      if (option.id === 'copy') {
        navigator.clipboard?.writeText(gestureUrl).then(() => {
          setCopiedId('copy');
          showToast('Link copied to clipboard');
          setTimeout(() => setCopiedId(null), 2000);
        });
        return;
      }

      if (option.id === 'instagram') {
        navigator.clipboard?.writeText(gestureUrl).then(() => {
          setCopiedId('instagram');
          showToast('Link copied! Paste it in your Instagram story or DM');
          setTimeout(() => setCopiedId(null), 2000);
        });
        return;
      }

      const url = option.getLink(gestureUrl, gestureName);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    },
    [gestureUrl, gestureName, vibrate, showToast]
  );

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-t-3xl border-t border-linesoft bg-card transition-transform duration-300 ease-out"
        style={{ transform: isOpen ? 'translateY(0)' : 'translateY(100%)' }}
      >
        <div className="flex flex-col max-h-[85vh]">
          <div className="flex justify-center pt-3 pb-2">
            <div className="h-1 w-10 rounded-full bg-linesoft" />
          </div>
          <div className="px-5 pb-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Share this gesture</h2>
              <button onClick={onClose} aria-label="Close share dialog" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-text3 transition-colors hover:bg-white/10 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="mb-5 rounded-xl border border-linesoft bg-white/[0.02] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D9AC3D]/10">
                  <span className="text-lg">🎁</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{gestureName}</p>
                  <p className="truncate text-sm text-text3">For {recipientName || 'someone special'}</p>
                </div>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              {SHARE_OPTIONS.map((option) => {
                const Icon = copiedId === option.id ? Check : (option.id === 'copy' ? Link2 : option.id === 'whatsapp' ? MessageCircle : option.id === 'sms' ? Smartphone : option.id === 'telegram' ? Send : MessageCircle);
                const isCopied = copiedId === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleShare(option)}
                    aria-label={`Share via ${option.name}`}
                    className="flex items-center gap-3 rounded-xl border border-linesoft bg-white/[0.02] p-3.5 transition-all duration-200 active:scale-[0.98] hover:border-white/10 hover:bg-white/[0.04]"
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isCopied ? 'bg-[#22c55e]/20' : option.color + '/15'}`}>
                      <Icon size={18} className={isCopied ? 'text-[#22c55e]' : option.textColor} />
                    </div>
                    <span className="text-left text-sm font-medium text-white">
                      {isCopied ? 'Copied!' : option.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={onClose}
              className="w-full rounded-xl border border-[#222] bg-[#1A1A1A] py-3.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[#222] active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
