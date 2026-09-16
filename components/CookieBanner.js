'use client';

import { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';
import { useHaptics } from '@/lib/useHaptics';

export default function CookieBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { vibrate } = useHaptics();

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setTimeout(() => setShow(true), 1000);
    }
  }, []);

  const handleAccept = () => {
    vibrate('light');
    localStorage.setItem('cookie-consent', 'accepted');
    setDismissed(true);
  };

  const handleDecline = () => {
    vibrate('light');
    localStorage.setItem('cookie-consent', 'declined');
    setDismissed(true);
  };

  if (!show || dismissed) return null;

  return (
    <div role="dialog" aria-label="Cookie consent" className="fixed bottom-0 left-0 right-0 z-[200] flex justify-center px-4 pb-4">
      <div className="w-full max-w-[520px] rounded-2xl border border-linesoft bg-[#111] p-4 shadow-2xl animate-slideUp">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gold/10">
            <Cookie size={18} className="text-gold" />
          </div>
          <div className="flex-1">
            <p className="text-[12px] leading-5 text-text2">
              We use cookies to improve your experience. By continuing, you agree to our cookie policy.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleAccept}
                aria-label="Accept cookies"
                className="flex-1 rounded-xl bg-gold-grad py-3 text-[11px] font-black text-[#1a1300]"
              >
                Accept
              </button>
              <button
                onClick={handleDecline}
                aria-label="Decline cookies"
                className="flex-1 rounded-xl border border-linesoft bg-card py-3 text-[11px] font-bold text-text2"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
