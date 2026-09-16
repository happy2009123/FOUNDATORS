'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, ArrowRight, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import Logo from '@/components/Logo';
import { useFirebaseAuth } from '@/lib/useFirebaseAuth';
import { useStore } from '@/lib/store';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);
  const { sendPasswordReset, loading } = useFirebaseAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email.trim()) {
      showToast('Enter your email address');
      return;
    }
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      const msg = err.message?.includes('not found')
        ? 'No account found with this email'
        : err.message?.includes('invalid')
        ? 'Invalid email address'
        : err.message || 'Failed to send reset email';
      showToast(msg);
    }
  }

  return (
    <div className="app-shell login-bg flex flex-1 flex-col overflow-y-auto px-6 pb-8 pt-10 text-center">
      <div className="page-entrance">
        <Logo size={64} className="mx-auto mb-3 animate-float" />
        <div className="mb-1 font-display text-[22px] font-extrabold tracking-[0.2em]">
          FOUND<span className="text-gold">A</span>TORS
        </div>

        <div className="mt-6 rounded-[26px] border border-line bg-gradient-to-b from-[rgba(217,172,61,0.05)] to-transparent p-[26px] text-left shadow-[0_0_40px_-10px_rgba(184,134,11,0.2)]">
          {sent ? (
            <div className="text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-400" />
              <h2 className="mb-2 text-[20px] font-extrabold">Check your email</h2>
              <p className="mb-6 text-[13px] text-text2">
                We sent a password reset link to <span className="font-bold text-white">{email}</span>
              </p>
              <button
                onClick={() => router.push('/login')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-grad py-[15px] text-[15px] font-extrabold text-[#1a1300] shadow-[0_10px_24px_-8px_rgba(184,134,11,0.6)] active:scale-[0.98]"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <>
              <h2 className="mb-2 text-[20px] font-extrabold">Reset your password</h2>
              <p className="mb-5 text-[13px] text-text2">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-line bg-white/[0.02] px-[15px] py-[13px] focus-within:border-gold focus-within:ring-[3px] focus-within:ring-[rgba(217,172,61,0.12)]">
                <Mail size={17} className="flex-none text-gold" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  aria-label="Email address"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-text3 focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                />
              </div>

              <button
                onClick={handleReset}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-grad py-[15px] text-[15px] font-extrabold text-[#1a1300] shadow-[0_10px_24px_-8px_rgba(184,134,11,0.6)] active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <>Send Reset Link <ArrowRight size={16} strokeWidth={2.4} /></>}
              </button>
            </>
          )}

          <button
            onClick={() => router.push('/login')}
            className="mt-5 flex items-center gap-1 text-[13px] font-semibold text-text2 hover:text-gold"
          >
            <ArrowLeft size={14} /> Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
