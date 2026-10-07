'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Users, Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { useFirebaseAuth } from '@/lib/useFirebaseAuth';
import { checkRateLimit } from '@/lib/rateLimit';
import { useHydration } from '@/lib/useHydration';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);
  const { notification } = useHaptics();
  const { signInWithEmail, signInWithGoogle } = useFirebaseAuth();
  const hydrated = useHydration();
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const authReady = useStore((s) => s.authReady);

  // A live session must never land on the login screen: if the user is
  // already signed in (Firebase session restored on reload, or a login
  // that just completed), skip straight to home.
  useEffect(() => {
    if (!hydrated || !authReady) return;
    if (isLoggedIn || auth?.currentUser) router.replace('/home');
  }, [hydrated, authReady, isLoggedIn, router]);

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
      router.push('/home');
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
      router.push('/home');
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

        <div className="mb-[22px] flex justify-center gap-3.5">
          <SocialButton onClick={handleGoogleSignIn} aria-label="Sign in with Google">
            <span className="text-[15px] font-extrabold">G</span>
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
