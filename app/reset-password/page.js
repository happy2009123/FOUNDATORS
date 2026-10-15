'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import Logo from '@/components/Logo';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { updatePassword } from '@/lib/supabase/auth';
import { useStore } from '@/lib/store';

// Destination of the emailed reset link. auth/callback exchanges the PKCE
// code (establishing a recovery session) and redirects here; without a
// session the form can't do anything, so we show a request-new-link state.
export default function ResetPasswordPage() {
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured() || !getSupabase()) {
      setChecking(false);
      setHasSession(false);
      return;
    }
    let cancelled = false;
    getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        if (!cancelled) {
          setHasSession(!!data?.session);
          setChecking(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasSession(false);
          setChecking(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUpdate() {
    if (!password || password.length < 6) {
      showToast('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      showToast('Passwords do not match');
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      showToast(error.includes('same as') ? 'Choose a different password' : error || 'Could not update password');
      return;
    }
    setDone(true);
    showToast('Password updated');
    setTimeout(() => router.push('/home'), 1400);
  }

  return (
    <div className="app-shell login-bg flex flex-1 flex-col overflow-y-auto px-6 pb-8 pt-10 text-center">
      <div className="page-entrance">
        <Logo size={64} className="mx-auto mb-3 animate-float" />
        <div className="mb-1 font-display text-[22px] font-extrabold tracking-[0.2em]">
          FOUND<span className="text-gold">A</span>TORS
        </div>

        <div className="mt-6 rounded-[26px] border border-line bg-gradient-to-b from-[rgba(217,172,61,0.05)] to-transparent p-[26px] text-left shadow-[0_0_40px_-10px_rgba(184,134,11,0.2)]">
          {checking ? (
            <div className="flex flex-col items-center py-6 text-text2">
              <Loader2 size={22} className="animate-spin text-gold" />
              <p className="mt-3 text-[13px]">Verifying your reset link...</p>
            </div>
          ) : done ? (
            <div className="text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-400" />
              <h2 className="mb-2 text-[20px] font-extrabold">Password updated</h2>
              <p className="mb-6 text-[13px] text-text2">Taking you back home...</p>
            </div>
          ) : !hasSession ? (
            <div className="text-center">
              <h2 className="mb-2 text-[20px] font-extrabold">Link expired</h2>
              <p className="mb-6 text-[13px] text-text2">
                This reset link is invalid or already used. Request a fresh one and open it right away.
              </p>
              <button
                onClick={() => router.push('/forgot-password')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-grad py-[15px] text-[15px] font-extrabold text-[#1a1300] shadow-[0_10px_24px_-8px_rgba(184,134,11,0.6)] active:scale-[0.98]"
              >
                Request new link <ArrowRight size={16} strokeWidth={2.4} />
              </button>
            </div>
          ) : (
            <>
              <h2 className="mb-2 text-[20px] font-extrabold">Set a new password</h2>
              <p className="mb-5 text-[13px] text-text2">Choose a strong password for your account.</p>

              <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-line bg-white/[0.02] px-[15px] py-[13px] focus-within:border-gold focus-within:ring-[3px] focus-within:ring-[rgba(217,172,61,0.12)]">
                <Lock size={17} className="flex-none text-gold" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  aria-label="New password"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-text3 focus:outline-none"
                />
              </div>

              <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-line bg-white/[0.02] px-[15px] py-[13px] focus-within:border-gold focus-within:ring-[3px] focus-within:ring-[rgba(217,172,61,0.12)]">
                <Lock size={17} className="flex-none text-gold" />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  aria-label="Confirm new password"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-text3 focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                />
              </div>

              <button
                onClick={handleUpdate}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-grad py-[15px] text-[15px] font-extrabold text-[#1a1300] shadow-[0_10px_24px_-8px_rgba(184,134,11,0.6)] active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <>Update password <ArrowRight size={16} strokeWidth={2.4} /></>}
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
