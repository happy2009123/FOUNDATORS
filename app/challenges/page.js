'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ArrowRight,
  Braces,
  Flame,
  Medal,
  Trophy,
  Zap,
  Clock,
  CheckCircle,
  Lock,
  Star,
  Target,
  Award,
  ChevronRight,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import SubpageHeader from '@/components/SubpageHeader';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'quick', label: 'Quick' },
  { id: 'creative', label: 'Creative' },
  { id: 'code', label: 'Code' },
  { id: 'strategy', label: 'Strategy' },
];

const CHALLENGES = [
  {
    id: 'daily-builder',
    name: 'Daily Builder',
    description: 'Describe a startup in 60 seconds',
    detail:
      'Practice pitching clearly and concisely. Record yourself (or write out) a 60-second explanation of a startup idea — who it helps, what it does, and why it matters.',
    timeLimit: '10 min',
    timeLimitSec: 600,
    points: 100,
    icon: Zap,
    category: 'quick',
    steps: [
      "Pick a startup idea (or use today's prompt)",
      'Write or record your 60-second pitch',
      'Cover: problem, solution, audience',
      'Submit your pitch for review',
    ],
  },
  {
    id: 'coding-sprint',
    name: 'Coding Sprint',
    description: 'Build a clean REST endpoint',
    detail:
      'Speed-code a well-structured REST API endpoint. Focus on clean code, proper error handling, and clear naming.',
    timeLimit: '45 min',
    timeLimitSec: 2700,
    points: 400,
    icon: Braces,
    category: 'code',
    steps: [
      'Set up your endpoint route and method',
      'Implement request validation',
      'Add proper error handling',
      'Write a clean JSON response',
      'Test with sample requests',
    ],
  },
  {
    id: 'startup-battle',
    name: 'Startup Battle',
    description: 'Create a ₹10,000 business model',
    detail:
      'Design a viable business that can launch with only ₹10,000. Think lean — what can you build, sell, and ship without raising money?',
    timeLimit: '30 min',
    timeLimitSec: 1800,
    points: 300,
    icon: Trophy,
    category: 'strategy',
    steps: [
      'Define your micro-business idea',
      'List startup costs under ₹10,000',
      'Identify your first customer segment',
      'Sketch a simple revenue model',
      'Write your launch plan',
    ],
  },
  {
    id: 'growth-challenge',
    name: 'Growth Challenge',
    description: 'Find your first 10 customers',
    detail:
      'Go out and get 10 real people interested in your product. DM, call, post, or walk up to them — whatever it takes.',
    timeLimit: '1 day',
    timeLimitSec: 86400,
    points: 250,
    icon: Target,
    category: 'creative',
    steps: [
      'Identify where your customers hang out',
      'Craft a simple outreach message',
      'Send 20+ outreaches',
      'Follow up with interested people',
      'Log your first 10 signups / interests',
    ],
  },
];

const LEADERBOARD = [
  { rank: 1, name: 'Priya S.', avatar: 'PS', points: 12450 },
  { rank: 2, name: 'Arjun M.', avatar: 'AM', points: 11200 },
  { rank: 3, name: 'Zara K.', avatar: 'ZK', points: 9870 },
  { rank: 4, name: 'Dev R.', avatar: 'DR', points: 8340 },
  { rank: 5, name: 'You', avatar: 'ME', points: 2840, isUser: true },
];

const BADGES = [
  { id: 'first-challenge', name: 'First Challenge', icon: Star, earned: true },
  { id: '7-day-streak', name: '7-Day Streak', icon: Flame, earned: true },
  { id: '1000-points', name: '1000 Points', icon: Trophy, earned: true },
  { id: 'speed-runner', name: 'Speed Runner', icon: Zap, earned: true },
  { id: 'team-player', name: 'Team Player', icon: Award, earned: false },
];

function formatTime(sec) {
  if (sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function ConfettiParticle({ delay, left, color }) {
  return (
    <div
      className="pointer-events-none fixed z-[100] animate-confetti-fall"
      style={{
        left: `${left}%`,
        top: '-10px',
        width: '8px',
        height: '8px',
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        backgroundColor: color,
        animationDelay: `${delay}ms`,
        animationDuration: `${1200 + Math.random() * 800}ms`,
        animationFillMode: 'forwards',
        animationIterationCount: '1',
      }}
    />
  );
}

function ConfettiOverlay() {
  const colors = ['#D9AC3D', '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  const particles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      delay: Math.random() * 400,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
    })),
  []);

  return (
    <div className="fixed inset-0 z-[99] pointer-events-none">
      {particles.map((p) => (
        <ConfettiParticle key={p.id} {...p} />
      ))}
    </div>
  );
}

export default function Challenges() {
  const showToast = useStore((s) => s.showToast);
  const challengeProgress = useStore((s) => s.challengeProgress);
  const storeStartChallenge = useStore((s) => s.startChallenge);
  const storeCompleteChallenge = useStore((s) => s.completeChallenge);
  const profile = useStore((s) => s.profile);
  const { vibrate, notification } = useHaptics();

  const [activeCategory, setActiveCategory] = useState('all');
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [streakDays] = useState(5);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const completedCount = useMemo(() =>
    CHALLENGES.filter((c) => challengeProgress[c.id]?.completed).length,
  [challengeProgress]);

  const totalPointsEarned = useMemo(() =>
    CHALLENGES.filter((c) => challengeProgress[c.id]?.completed).reduce((sum, c) => sum + c.points, 0),
  [challengeProgress]);

  const getChallengeStatus = useCallback(
    (id) => {
      const p = challengeProgress[id];
      if (!p) return 'idle';
      if (p.completed) return 'completed';
      if (p.started) return 'in-progress';
      return 'idle';
    },
  [challengeProgress]);

  const activeChallenge = activeId ? CHALLENGES.find((c) => c.id === activeId) : null;
  const activeProgress = activeId ? getChallengeStatus(activeId) : null;

  useEffect(() => {
    if (activeId && challengeProgress[activeId]?.started && !challengeProgress[activeId]?.completed) {
      const ch = CHALLENGES.find((c) => c.id === activeId);
      if (!ch) return;

      const elapsed = Math.floor((Date.now() - challengeProgress[activeId].startTime) / 1000);
      const remaining = Math.max(0, ch.timeLimitSec - elapsed);

      if (remaining <= 0) {
        completeChallengeHandler(activeId);
        return;
      }

      setTimer(remaining);
      startTimeRef.current = Date.now();
      setTimerActive(true);
    } else {
      setTimerActive(false);
    }
  }, [activeId, challengeProgress]);

  useEffect(() => {
    if (!timerActive || !activeId) {
      return;
    }

    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTimerActive(false);
          completeChallengeHandler(activeId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
    };
  }, [timerActive, activeId]);

  const completeChallengeHandler = useCallback(
    (id) => {
      clearInterval(timerRef.current);
      setTimerActive(false);
      const ch = CHALLENGES.find((c) => c.id === id);
      if (!ch) return;

      if (challengeProgress[id]?.completed) return;

      storeCompleteChallenge(id);
      notification();
      vibrate();
      setActiveId(null);
      setTimer(0);

      setShowConfetti(true);
      setShowSuccess(true);
      setTimeout(() => {
        setShowConfetti(false);
        setShowSuccess(false);
      }, 2500);

      showToast(`+${ch.points} points! Challenge complete.`);
    },
    [challengeProgress, storeCompleteChallenge, notification, vibrate, showToast]
  );

  const startChallenge = useCallback(
    (id) => {
      const ch = CHALLENGES.find((c) => c.id === id);
      if (!ch) return;
      vibrate();

      storeStartChallenge(id);
      setActiveId(id);
      setTimer(ch.timeLimitSec);
      showToast(`${ch.name} started!`);
    },
    [storeStartChallenge, vibrate, showToast]
  );

  const cancelChallenge = useCallback(
    (id) => {
      clearInterval(timerRef.current);
      setTimerActive(false);
      setActiveId(null);
      setTimer(0);
      showToast('Challenge cancelled');
    },
    [showToast]
  );

  const filteredChallenges = useMemo(() => {
    if (activeCategory === 'all') return CHALLENGES;
    return CHALLENGES.filter((c) => c.category === activeCategory);
  }, [activeCategory]);

  return (
    <MainScreenShell>
      <SubpageHeader title="Challenges" />

      <div className="no-scrollbar px-[18px] pb-6">
        {/* Streak Card */}
        <div className="gold-card mt-3 p-5 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl" role="img" aria-label="fire">
              🔥
            </span>
            <span className="text-[21px] font-black">7 day streak</span>
            <span className="text-2xl" role="img" aria-label="fire">
              🔥
            </span>
          </div>
          <div className="mt-3 flex justify-center gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <span
                key={i}
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-[9px] font-black ${
                  i < streakDays
                    ? 'border-transparent bg-gold-grad text-[#171100]'
                    : 'border-line text-text3'
                }`}
              >
                {i + 1}
              </span>
            ))}
          </div>
          <div className="mt-3 text-[10.5px] text-text2">
            Keep building to grow your Builder Score.
          </div>
        </div>

        {/* Points Earned Banner */}
        {totalPointsEarned > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-gold/20 bg-gold/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-gold" />
              <span className="text-[13px] font-bold text-gold">
                {totalPointsEarned.toLocaleString()} points earned
              </span>
            </div>
            <span className="text-[11px] text-text3">
              {completedCount}/{CHALLENGES.length} done
            </span>
          </div>
        )}

        {/* Stats Row */}
        <div className="mt-5 grid grid-cols-4 gap-2">
          <Stat
            n={(2840 + totalPointsEarned).toLocaleString()}
            l="Points"
            icon={Medal}
          />
          <Stat n="#18" l="Rank" icon={Trophy} />
          <Stat n="9" l="Badges" icon={Award} />
          <Stat n="7 days" l="Streak" icon={Flame} />
        </div>

        {/* Active Challenge Banner */}
        {activeId && activeChallenge && activeProgress === 'in-progress' && (
          <div className="mt-5 glass-card border-gold/30 p-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gold">
                Currently working on
              </div>
              <div className="flex items-center gap-1 text-[11px] text-text2">
                <Clock size={12} />
                <span className={timer <= 30 ? 'font-bold text-red' : ''}>
                  {formatTime(timer)}
                </span>
              </div>
            </div>
            <div className="mt-2 text-[14px] font-extrabold">
              {activeChallenge.name}
            </div>
            <div className="mt-1 text-[10.5px] text-text2">
              {activeChallenge.description}
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
              <div
                className="h-full rounded-full bg-gold-grad transition-all duration-500"
                style={{
                  width: `${((activeChallenge.timeLimitSec - timer) / activeChallenge.timeLimitSec) * 100}%`,
                }}
              />
            </div>
            <div className="mt-1 text-right text-[9px] text-text3">
              {Math.round(((activeChallenge.timeLimitSec - timer) / activeChallenge.timeLimitSec) * 100)}% elapsed
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  vibrate();
                  completeChallengeHandler(activeId);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold py-2.5 text-[11px] font-bold text-[#171100]"
              >
                <CheckCircle size={13} /> Complete
              </button>
              <button
                onClick={() => {
                  vibrate();
                  cancelChallenge(activeId);
                }}
                className="flex items-center justify-center rounded-xl border border-line px-3 text-[11px] text-text3"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="mt-5 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-extrabold">
              Today&apos;s challenges
            </h2>
            <p className="text-[10px] text-text3">
              Earn points, badges and proof of work.
            </p>
          </div>
          <Trophy size={18} className="text-gold" />
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                vibrate();
                setActiveCategory(cat.id);
              }}
              className={`flex-none rounded-full px-3.5 py-1.5 text-[10.5px] font-bold transition-all ${
                activeCategory === cat.id
                  ? 'bg-gold text-[#171100]'
                  : 'border border-line text-text3 hover:text-text2'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Challenge List */}
        <div className="mt-3 space-y-2.5">
          {filteredChallenges.map((c) => {
            const Icon = c.icon;
            const st = getChallengeStatus(c.id);
            const isActive = activeId === c.id && st === 'in-progress';
            const progressPercent =
              st === 'in-progress' && activeId === c.id
                ? Math.round(
                    ((c.timeLimitSec - timer) / c.timeLimitSec) * 100
                  )
                : st === 'completed'
                ? 100
                : 0;

            return (
              <button
                key={c.id}
                onClick={() => {
                  if (st === 'idle') {
                    setDetailId(c.id);
                  } else if (st === 'in-progress') {
                    setActiveId(c.id);
                  }
                }}
                className="glass-card flex w-full items-center gap-3 p-4 text-left"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                    st === 'completed'
                      ? 'border-green-500/40 bg-green-500/10 text-green-400'
                      : st === 'in-progress'
                      ? 'border-gold/40 bg-gold/10 text-gold'
                      : 'border-line text-gold'
                  }`}
                >
                  {st === 'completed' ? (
                    <CheckCircle size={18} />
                  ) : (
                    <Icon size={18} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-[12.5px] font-extrabold">{c.name}</div>
                    {st === 'in-progress' && (
                      <div className="flex items-center gap-1.5">
                        <Clock size={10} className="text-gold" />
                        <span className="text-[10px] text-gold">
                          {formatTime(timer)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-text2">
                    {c.description}
                  </div>
                  <div className="mt-1 text-[9.5px] text-text3">
                    {c.timeLimit} · +{c.points} pts
                  </div>

                  {/* Progress bar per challenge */}
                  {st === 'in-progress' && (
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
                      <div
                        className="h-full rounded-full bg-gold-grad transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                  {st === 'completed' && (
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all duration-500"
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  {st === 'idle' && (
                    <ChevronRight size={15} className="text-text3" />
                  )}
                  {st === 'in-progress' && (
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[9px] font-bold text-gold">
                      Active
                    </span>
                  )}
                  {st === 'completed' && (
                    <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[9px] font-bold text-green-400">
                      Done ✓
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {filteredChallenges.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <Target size={28} className="text-text3" />
              <div className="mt-2 text-[12px] text-text3">
                No challenges in this category yet.
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold">Leaderboard</h2>
            <Medal size={16} className="text-gold" />
          </div>
          <div className="mt-3 space-y-2">
            {LEADERBOARD.map((u) => (
              <div
                key={u.rank}
                className={`glass-card flex items-center gap-3 p-3 ${
                  u.isUser ? 'border-gold/30 bg-gold/5' : ''
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black ${
                    u.rank === 1
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : u.rank === 2
                      ? 'bg-gray-300/15 text-gray-300'
                      : u.rank === 3
                      ? 'bg-orange-400/15 text-orange-400'
                      : 'bg-white/5 text-text3'
                  }`}
                >
                  {u.avatar}
                </div>
                <div className="flex-1">
                  <div className="text-[12px] font-bold">
                    {u.name}
                    {u.isUser && (
                      <span className="ml-1.5 text-[9px] text-gold">(you)</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-extrabold text-gold">
                    {(u.points + (u.isUser ? totalPointsEarned : 0)).toLocaleString()}
                  </div>
                  <div className="text-[8px] text-text3">#{u.rank}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold">Badges</h2>
            <Star size={16} className="text-gold" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {BADGES.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.id}
                  className={`glass-card flex flex-col items-center p-3 text-center ${
                    b.earned ? '' : 'opacity-40'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      b.earned
                        ? 'bg-gold/15 text-gold'
                        : 'bg-white/5 text-text3'
                    }`}
                  >
                    {b.earned ? <Icon size={18} /> : <Lock size={18} />}
                  </div>
                  <div className="mt-2 text-[10px] font-bold">{b.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Challenge Detail Modal */}
      {detailId && (
        <ChallengeDetail
          challenge={CHALLENGES.find((c) => c.id === detailId)}
          onStart={() => {
            setDetailId(null);
            startChallenge(detailId);
          }}
          onClose={() => setDetailId(null)}
        />
      )}

      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mx-6 flex flex-col items-center rounded-3xl bg-card p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/20">
              <CheckCircle size={36} className="text-gold" />
            </div>
            <div className="mt-4 text-[18px] font-black">
              Challenge Complete!
            </div>
            <div className="mt-1 text-[11px] text-text2">
              Points have been added to your score.
            </div>
          </div>
        </div>
      )}

      {/* Confetti Overlay */}
      {showConfetti && <ConfettiOverlay />}

      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall 1.5s ease-out forwards;
        }
      `}</style>
    </MainScreenShell>
  );
}

function Stat({ n, l, icon: Icon }) {
  return (
    <div className="glass-card p-3 text-center">
      <Icon size={14} className="mx-auto text-gold" />
      <div className="mt-1 text-[14px] font-black">{n}</div>
      <div className="text-[8px] text-text3">{l}</div>
    </div>
  );
}

function ChallengeDetail({ challenge, onStart, onClose }) {
  const c = challenge;
  const Icon = c.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-card px-5 pb-8 pt-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
            <Icon size={22} />
          </div>
          <div>
            <div className="text-[16px] font-extrabold">{c.name}</div>
            <div className="text-[11px] text-text2">{c.description}</div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-line bg-[#0a0a0a] p-4">
          <div className="text-[11px] font-bold text-text2">Overview</div>
          <div className="mt-1.5 text-[12px] leading-relaxed text-text3">
            {c.detail}
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-line bg-[#0a0a0a] p-4">
          <div className="text-[11px] font-bold text-text2">
            Steps to Complete
          </div>
          <div className="mt-2 space-y-2">
            {c.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/10 text-[9px] font-bold text-gold">
                  {i + 1}
                </div>
                <div className="text-[11px] text-text3">{step}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-text2">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            {c.timeLimit}
          </div>
          <div className="font-bold text-gold">+{c.points} pts</div>
        </div>

        <button
          onClick={onStart}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-[13px] font-bold text-[#171100]"
        >
          <Play size={15} />
          Start Challenge
        </button>
      </div>
    </div>
  );
}
