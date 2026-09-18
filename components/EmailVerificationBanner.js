'use client';
import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useFirebaseAuth } from '@/lib/useFirebaseAuth';
import { Mail, X } from 'lucide-react';

export default function EmailVerificationBanner() {
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const { sendEmailVerification, isEmailVerified } = useFirebaseAuth();
  const [verified, setVerified] = useState(true);
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    const check = async () => {
      const v = await isEmailVerified();
      setVerified(v);
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn, isEmailVerified]);

  if (verified || dismissed || !isLoggedIn) return null;

  const handleSend = async () => {
    setSending(true);
    await sendEmailVerification();
    setSending(false);
  };

  return (
    <div className="bg-gold/10 border border-gold/20 rounded-2xl mx-4 mt-3 p-4 flex items-start gap-3">
      <Mail size={18} className="text-gold mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-gold">Verify your email</div>
        <div className="text-[11px] text-text2 mt-0.5">Check your inbox and click the verification link.</div>
        <button onClick={handleSend} disabled={sending} className="mt-2 text-[11px] font-bold text-gold underline disabled:opacity-50">
          {sending ? 'Sending...' : 'Resend verification email'}
        </button>
      </div>
      <button onClick={() => setDismissed(true)} className="text-text3" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}
