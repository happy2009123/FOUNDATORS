'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Check, Sparkles, Users, Rocket, Code2, Lightbulb, Target, UserPlus } from 'lucide-react';
import Logo from '@/components/Logo';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import Avatar from '@/components/Avatar';
import { db, auth } from '@/lib/firebase';
import { doc, getDocs, collection, setDoc, serverTimestamp } from 'firebase/firestore';

const STEPS = ['welcome', 'role', 'interests', 'follow', 'done'];

const ROLES = [
  { key: 'founder', label: 'Founder', icon: Rocket, desc: 'Building a startup' },
  { key: 'developer', label: 'Developer', icon: Code2, desc: 'Writing code' },
  { key: 'designer', label: 'Designer', icon: Lightbulb, desc: 'Creating interfaces' },
  { key: 'marketer', label: 'Marketer', icon: Target, desc: 'Growing products' },
  { key: 'investor', label: 'Investor', icon: Sparkles, desc: 'Funding ideas' },
];

const INTERESTS = [
  'AI & Machine Learning', 'Web Development', 'Mobile Apps', 'SaaS', 'FinTech',
  'HealthTech', 'EdTech', 'Climate Tech', 'E-commerce', 'Gaming',
  'Product Design', 'Marketing', 'Fundraising', 'No-Code', 'Open Source',
];

const SUGGESTED_KEYS = ['arjun', 'meera', 'rohan', 'sophia', 'ishita', 'daniel'];
const SUGGESTED_REASONS = {
  arjun: 'AI + EdTech',
  meera: 'HealthTech',
  rohan: 'SaaS + AI',
  sophia: 'Investor',
  ishita: 'Design',
  daniel: 'Full-stack',
};

export default function Onboarding() {
  const router = useRouter();
  const { vibrate } = useHaptics();
  const updateProfile = useStore((s) => s.updateProfile);
  const showToast = useStore((s) => s.showToast);
  const toggleFollowUser = useStore((s) => s.toggleFollowUser);
  const followedUsers = useStore((s) => s.followedUsers);

  const [step, setStep] = useState(0);
  const [role, setRole] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [name, setName] = useState('');
  const [suggestedUsers, setSuggestedUsers] = useState({});

  const currentStep = STEPS[step];

  useEffect(() => {
    const keys = SUGGESTED_KEYS;
    keys.forEach((key) => {
      getDocs(collection(db, 'users')).then((snap) => {
        const users = {};
        snap.forEach((d) => { users[d.id] = { id: d.id, ...d.data() }; });
        setSuggestedUsers(users);
      }).catch(() => {});
    });
  }, []);

  const next = useCallback(() => {
    vibrate('light');
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }, [step, vibrate]);

  const prev = useCallback(() => {
    vibrate('light');
    if (step > 0) setStep((s) => s - 1);
  }, [step, vibrate]);

  const finish = useCallback(async () => {
    vibrate('medium');
    if (name.trim()) updateProfile({ name: name.trim() });
    if (role) updateProfile({ role: ROLES.find((r) => r.key === role)?.label || role });
    if (selectedInterests.length) updateProfile({ interests: selectedInterests });

    if (auth?.currentUser) {
      const uid = auth.currentUser.uid;
      await setDoc(doc(db, 'users', uid), {
        name: name.trim() || undefined,
        role: ROLES.find((r) => r.key === role)?.label || role || undefined,
        interests: selectedInterests.length ? selectedInterests : undefined,
        profileCompleted: true,
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    }

    localStorage.setItem('onboarding_complete', 'true');
    router.push('/home');
  }, [name, role, selectedInterests, updateProfile, router, vibrate]);

  const toggleInterest = (interest) => {
    vibrate('light');
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  return (
    <div className="app-shell flex flex-col overflow-y-auto px-6 pb-8 pt-6">
      {/* Progress */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full overflow-hidden bg-white/10">
            <div className={`h-full rounded-full transition-all duration-500 ${i <= step ? 'bg-gold' : 'bg-transparent'}`} />
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1">
        {currentStep === 'welcome' && (
          <div className="flex flex-col items-center text-center pt-8">
            <Logo size={72} className="mb-4" />
            <h1 className="text-[28px] font-black leading-tight">
              Welcome to <span className="text-gold-gradient">Foundators</span>
            </h1>
            <p className="mt-3 text-[14px] text-text2 leading-relaxed max-w-[300px]">
              Let&apos;s set up your profile so we can connect you with the right people and opportunities.
            </p>
            <div className="mt-8 w-full max-w-[300px]">
              <label className="mb-2 block text-left text-[12px] font-bold text-text3">Your name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                aria-label="Your name"
                className="w-full rounded-2xl border border-line bg-white/[0.03] px-4 py-3.5 text-[14px] text-white placeholder:text-text3 focus:border-gold focus:outline-none"
              />
            </div>
          </div>
        )}

        {currentStep === 'role' && (
          <div className="pt-4">
            <h2 className="text-[22px] font-black text-center mb-2">What best describes you?</h2>
            <p className="text-[13px] text-text2 text-center mb-6">Select your primary role</p>
            <div className="space-y-3">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const selected = role === r.key;
                return (
                  <button
                    key={r.key}
                    onClick={() => { vibrate('light'); setRole(r.key); }}
                    className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                      selected
                        ? 'border-gold bg-[rgba(217,172,61,0.1)]'
                        : 'border-linesoft bg-card hover:border-white/20'
                    }`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${selected ? 'bg-gold text-[#1a1300]' : 'bg-white/5 text-gold'}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="text-[14px] font-bold">{r.label}</div>
                      <div className="text-[12px] text-text2">{r.desc}</div>
                    </div>
                    {selected && <Check size={18} className="text-gold" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentStep === 'interests' && (
          <div className="pt-4">
            <h2 className="text-[22px] font-black text-center mb-2">What are you interested in?</h2>
            <p className="text-[13px] text-text2 text-center mb-6">Pick at least 3 to personalize your feed</p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => {
                const selected = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`rounded-full border px-4 py-2.5 text-[12px] font-bold transition-all ${
                      selected
                        ? 'border-gold bg-gold text-[#1a1300]'
                        : 'border-linesoft bg-card text-text2 hover:border-white/20'
                    }`}
                  >
                    {selected && <Check size={12} className="mr-1 inline" />}
                    {interest}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 text-center text-[12px] text-text3">
              {selectedInterests.length} selected
            </div>
          </div>
        )}

        {currentStep === 'follow' && (
          <div className="pt-4">
            <h2 className="text-[22px] font-black text-center mb-2">Find people to follow</h2>
            <p className="text-[13px] text-text2 text-center mb-6">Follow at least 3 to populate your feed</p>
            <div className="space-y-3">
              {SUGGESTED_KEYS.map((key) => {
                const user = suggestedUsers[key];
                if (!user) return null;
                const reason = SUGGESTED_REASONS[key] || '';
                const isFollowing = !!followedUsers[key];
                return (
                  <div key={key} className="flex items-center gap-3 rounded-2xl border border-linesoft bg-card p-3.5">
                    <Avatar src={user.avatar} name={user.name} size={46} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[14px] font-bold">{user.name}</span>
                        {user.verified && <span className="text-gold text-[10px]">✓</span>}
                      </div>
                      <div className="text-[11px] text-text2">{reason}</div>
                    </div>
                    <button
                      onClick={() => { vibrate('light'); toggleFollowUser(key); }}
                      className={`flex h-10 items-center gap-1.5 rounded-full border px-4 text-[12px] font-bold transition-all ${
                        isFollowing
                          ? 'border-transparent bg-gold text-[#1a1300]'
                          : 'border-gold text-gold-hi'
                      }`}
                    >
                      {isFollowing ? <><Check size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentStep === 'done' && (
          <div className="flex flex-col items-center text-center pt-12">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gold/15">
              <Check size={36} className="text-gold" />
            </div>
            <h2 className="text-[24px] font-black">You&apos;re all set!</h2>
            <p className="mt-2 text-[14px] text-text2 max-w-[280px]">
              Your feed is ready. Start exploring, connecting, and building.
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center gap-3">
        {step > 0 && (
          <button onClick={prev} className="flex h-12 w-12 items-center justify-center rounded-full border border-linesoft text-text2" aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
        )}
        <button
          onClick={currentStep === 'done' ? finish : next}
          disabled={currentStep === 'welcome' && !name.trim()}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gold-grad py-3.5 text-[14px] font-extrabold text-[#1a1300] shadow-[0_8px_20px_-6px_rgba(184,134,11,0.5)] active:scale-[0.98] disabled:opacity-50"
        >
          {currentStep === 'done' ? 'Start Exploring' : 'Continue'}
          <ArrowRight size={16} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
