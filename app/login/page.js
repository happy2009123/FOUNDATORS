'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Users, Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { useFirebaseAuth } from '@/lib/useFirebaseAuth';
import { checkRateLimit } from '@/lib/rateLimit';

export default function LoginPage() {
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);
  const { notification } = useHaptics();
  const { signInWithEmail, signInWithGoogle } = useFirebaseAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      showToast('Enter your email and password');
      return;
    }
    const { allowed, retryMs } = checkRateLimit('login', 5, 60000);
    if (!allowed) {
      showToast(`Too many attempts. Try again in ${Math.ceil(retryMs / 1000)}s`);
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      notification('success');
      const onboarded = localStorage.getItem('onboarding_complete');
      router.push(onboarded ? '/home' : '/onboarding');
    } catch (err) {
      const msg = err.message?.includes('not found') ? 'No account found with this email' :
                  err.message?.includes('password') ? 'Incorrect password' :
                  err.message?.includes('invalid') ? 'Invalid email address' :
                  err.message || 'Login failed. Try again.';
      showToast(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    try {
      await signInWithGoogle();
      notification('success');
      const onboarded = localStorage.getItem('onboarding_complete');
      router.push(onboarded ? '/home' : '/onboarding');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        showToast('Google sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell login-bg flex flex-1 flex-col overflow-y-auto px-6 pb-8 pt-10 text-center">
      <div className="page-entrance">
      <Logo size={64} className="mx-auto mb-3 animate-float" />
      <div className="mb-1 font-display text-[22px] font-extrabold tracking-[0.2em]">
        FOUND<span className="text-gold">A</span>TORS
      </div>
      <div className="mb-6 text-[10.5px] font-bold tracking-[0.25em] text-gold">
        IDEAS &nbsp;·&nbsp; PEOPLE &nbsp;·&nbsp; BUILD
      </div>

      <h1 className="mb-1.5 text-[26px] font-extrabold leading-tight">
        Ideas Move
        <br />
        <span className="text-gold-gradient animate-shimmer">The World Forward</span>
      </h1>
      <p className="mb-6 px-1.5 text-[13px] leading-relaxed text-text2">
        Join a global community of creators, builders and change makers.
      </p>

      <div className="rounded-[26px] border border-line bg-gradient-to-b from-[rgba(217,172,61,0.05)] to-transparent p-[26px] text-left shadow-[0_0_40px_-10px_rgba(184,134,11,0.2)]">
        <div className="mb-[18px] flex items-center gap-3">
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-line text-gold">
            <Users size={18} />
          </div>
          <div>
            <h2 className="text-[18px] font-extrabold">Welcome Back</h2>
            <p className="text-[11.5px] text-text2">Let&apos;s build something extraordinary together.</p>
          </div>
        </div>

        <div className="mb-3.5 flex items-center gap-2.5 rounded-2xl border border-line bg-white/[0.02] px-[15px] py-[13px] focus-within:border-gold focus-within:ring-[3px] focus-within:ring-[rgba(217,172,61,0.12)]">
          <Mail size={17} className="flex-none text-gold" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            aria-label="Email address"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-text3 focus:outline-none"
          />
        </div>

        <div className="mb-3.5 flex items-center gap-2.5 rounded-2xl border border-line bg-white/[0.02] px-[15px] py-[13px] focus-within:border-gold focus-within:ring-[3px] focus-within:ring-[rgba(217,172,61,0.12)]">
          <Lock size={17} className="flex-none text-gold" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Password"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-text3 focus:outline-none"
          />
          <button onClick={() => setShowPassword((v) => !v)} className="flex-none text-text2" aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>

        <button
          onClick={() => router.push('/forgot-password')}
          className="mb-5 block text-right text-xs font-semibold text-gold"
        >
          Forgot password?
        </button>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gold-grad py-[15px] text-[15px] font-extrabold text-[#1a1300] shadow-[0_10px_24px_-8px_rgba(184,134,11,0.6)] active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <>Log In <ArrowRight size={16} strokeWidth={2.4} /></>}
        </button>

        <div className="my-[22px] flex items-center gap-3">
          <div className="h-px flex-1 bg-linesoft" />
          <span className="text-[11.5px] text-text2">or continue with</span>
          <div className="h-px flex-1 bg-linesoft" />
        </div>

        <button
          onClick={async () => {
            setLoading(true);
            try {
              const stored = JSON.parse(localStorage.getItem('foundators-users') || '[]');
              if (!stored.find((u) => u.email === 'demo@foundators.app')) {
                stored.push({ email: 'demo@foundators.app', password: 'demo123', name: 'Demo User', createdAt: Date.now() });
                localStorage.setItem('foundators-users', JSON.stringify(stored));
              }
              await signInWithEmail('demo@foundators.app', 'demo123');
              notification('success');
              showToast('Welcome to Foundators!');
              router.push('/onboarding');
            } catch (err) {
              showToast('Demo login failed');
            } finally {
              setLoading(false);
            }
          }}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/30 bg-gold/5 py-3.5 text-[14px] font-bold text-gold active:scale-[0.98]"
        >
          Quick Demo Login
        </button>

        <div className="mb-[22px] flex justify-center gap-3.5">
          <SocialButton onClick={handleGoogleSignIn} aria-label="Sign in with Google">
            <span className="text-[15px] font-extrabold">G</span>
          </SocialButton>
          <SocialButton onClick={() => showToast('GitHub sign-in coming soon')} aria-label="Sign in with GitHub">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 .5C5.73.5.9 5.34.9 11.6c0 5.02 3.26 9.28 7.78 10.79.57.1.78-.25.78-.55v-2.1c-3.17.69-3.83-1.36-3.83-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.7.08-.69.08-.69 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.24 3.33.95.1-.74.4-1.24.72-1.53-2.53-.29-5.19-1.27-5.19-5.63 0-1.24.44-2.26 1.17-3.06-.12-.29-.5-1.45.11-3.02 0 0 .96-.31 3.15 1.17a10.9 10.9 0 0 1 5.74 0c2.19-1.48 3.15-1.17 3.15-1.17.61 1.57.23 2.73.11 3.02.73.8 1.17 1.82 1.17 3.06 0 4.37-2.66 5.33-5.2 5.62.41.36.77 1.08.77 2.17v3.22c0 .3.21.66.79.55A11.6 11.6 0 0 0 23.1 11.6C23.1 5.34 18.27.5 12 .5Z" />
            </svg>
          </SocialButton>
          <SocialButton onClick={() => showToast('LinkedIn sign-in coming soon')} aria-label="Sign in with LinkedIn">
            <span className="text-[15px] font-extrabold text-brandblue">in</span>
          </SocialButton>
          <SocialButton onClick={() => showToast('Apple sign-in coming soon')} aria-label="Sign in with Apple">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M16.4 1.4c.1 1.1-.3 2.1-1 2.9-.7.8-1.8 1.5-2.9 1.4-.1-1.1.4-2.2 1-2.9.8-.9 2-1.5 2.9-1.4Zm3.7 16.9c-.3.7-.6 1.3-1 1.9-.6 1-1.3 2.2-2.3 2.2-.9 0-1.2-.6-2.3-.6s-1.4.6-2.3.6c-1 0-1.7-1.1-2.4-2.1-1.6-2.3-2.8-6.6-1.1-9.5.8-1.4 2.2-2.3 3.7-2.3 1.1 0 2 .7 2.7.7.6 0 1.8-.9 3.1-.8.5 0 2 .2 3 1.5-.1.1-1.8 1-1.8 3.1 0 2.5 2.1 3.4 2.2 3.4-.1.3-.3 1-.9 1.9Z" />
            </svg>
          </SocialButton>
        </div>

        <div className="text-center text-[12.5px] text-text2">
          New here?{' '}
          <button onClick={() => router.push('/signup')} className="font-bold text-gold">
            Create an account →
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

function SocialButton({ children, onClick, 'aria-label': ariaLabel }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex h-[50px] w-[50px] items-center justify-center rounded-full border border-line bg-white/[0.02] active:bg-[rgba(212,175,55,0.1)]"
    >
      {children}
    </button>
  );
}
