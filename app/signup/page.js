'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { useFirebaseAuth } from '@/lib/useFirebaseAuth';
import { checkRateLimit } from '@/lib/rateLimit';

export default function SignupPage() {
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);
  const { notification } = useHaptics();
  const { signUpWithEmail, signInWithGoogle } = useFirebaseAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password || !confirm) {
      showToast('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      showToast('Passwords do not match');
      return;
    }
    const { allowed, retryMs } = checkRateLimit('signup', 3, 300000);
    if (!allowed) {
      showToast(`Too many attempts. Try again in ${Math.ceil(retryMs / 1000)}s`);
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email, password, name.trim());
      notification('success');
      showToast(`Welcome to Foundators, ${name.trim().split(' ')[0]}!`);
      router.push('/onboarding');
    } catch (err) {
      const msg = err.message?.includes('already') ? 'An account with this email already exists' :
                  err.message?.includes('invalid') ? 'Invalid email address' :
                  err.message?.includes('at least') || err.message?.includes('weak') ? 'Password is too weak (min 6 characters)' :
                  err.message || 'Signup failed. Try again.';
      showToast(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    setLoading(true);
    try {
      await signInWithGoogle();
      notification('success');
      showToast('Welcome to Foundators!');
      router.push('/onboarding');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        showToast('Google sign-up failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell login-bg flex flex-1 flex-col overflow-y-auto px-6 pb-8 pt-10 text-center">
      <div className="page-entrance">
      <Logo size={64} className="mx-auto mb-3 animate-float" />
      <h1 className="mb-[22px] text-[26px] font-extrabold leading-tight">
        Create your <span className="text-gold-gradient animate-shimmer">Foundators</span> account
      </h1>

      <div className="rounded-[26px] border border-line bg-gradient-to-b from-[rgba(217,172,61,0.05)] to-transparent p-[26px] text-left shadow-[0_0_40px_-10px_rgba(184,134,11,0.2)]">
        <Field icon={User} placeholder="Full name" value={name} onChange={setName} ariaLabel="Full name" />
        <Field icon={Mail} placeholder="Email address" value={email} onChange={setEmail} ariaLabel="Email address" />
        <Field icon={Lock} placeholder="Password (min. 6 characters)" type="password" value={password} onChange={setPassword} ariaLabel="Password" />
        <Field icon={Lock} placeholder="Confirm password" type="password" value={confirm} onChange={setConfirm} last ariaLabel="Confirm password" />

        <button
          onClick={handleSignup}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-grad py-[15px] text-[15px] font-extrabold text-[#1a1300] shadow-[0_10px_24px_-8px_rgba(184,134,11,0.6)] active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <>Create Account <ArrowRight size={16} strokeWidth={2.4} /></>}
        </button>

        <div className="my-[18px] flex items-center gap-3">
          <div className="h-px flex-1 bg-linesoft" />
          <span className="text-[11.5px] text-text2">or</span>
          <div className="h-px flex-1 bg-linesoft" />
        </div>

        <button
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white/[0.02] py-[13px] text-[13px] font-bold text-white active:bg-white/[0.06] disabled:opacity-60"
        >
          <span className="text-[15px] font-extrabold">G</span>
          Sign up with Google
        </button>

        <div className="mt-[18px] text-center text-[12.5px] text-text2">
          Already have an account?{' '}
          <button onClick={() => router.push('/login')} className="font-bold text-gold">
            Log in
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, placeholder, value, onChange, type = 'text', last = false, ariaLabel }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  
  return (
    <div className={`flex items-center gap-2.5 rounded-2xl border border-line bg-white/[0.02] px-[15px] py-[13px] focus-within:border-gold focus-within:ring-[3px] focus-within:ring-[rgba(217,172,61,0.12)] ${last ? 'mb-0' : 'mb-3.5'}`}>
      <Icon size={17} className="flex-none text-gold" />
      <input
        type={isPassword && showPassword ? 'text' : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        className="flex-1 bg-transparent text-sm text-white placeholder:text-text3 focus:outline-none"
      />
      {isPassword && (
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="flex-none text-text2" aria-label={showPassword ? 'Hide password' : 'Show password'}>
          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      )}
    </div>
  );
}
