'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ArrowRight, Braces, Flame, Medal, Trophy, Zap, Clock, CheckCircle, Lock, Star,
  Target, Award, ChevronRight, Play, RotateCcw, Sparkles, Plus, X,
} from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import SubpageHeader from '@/components/SubpageHeader';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, query, orderBy, limit,
  doc, getDoc, updateDoc, addDoc, arrayUnion, arrayRemove, serverTimestamp,
} from 'firebase/firestore';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'quick', label: 'Quick' },
  { id: 'creative', label: 'Creative' },
  { id: 'code', label: 'Code' },
  { id: 'strategy', label: 'Strategy' },
];

const CREATE_CATEGORIES = ['quick', 'creative', 'code', 'strategy'];

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
        left: `${left}%`, top: '-10px', width: '8px', height: '8px',
        borderRadius: Math.random() > 0.5 ? '50%' : '2px', backgroundColor: color,
        animationDelay: `${delay}ms`, animationDuration: `${1200 + Math.random() * 800}ms`,
        animationFillMode: 'forwards', animationIterationCount: '1',
      }}
    />
  );
}

function ConfettiOverlay() {
  const colors = ['#D9AC3D', '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  const particles = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    id: i, delay: Math.random() * 400, left: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
  })), []);
  return (
    <div className="fixed inset-0 z-[99] pointer-events-none">
      {particles.map((p) => (<ConfettiParticle key={p.id} {...p} />))}
    </div>
  );
}

export default function ChallengesContent() {
  const showToast = useStore((s) => s.showToast);
  const profile = useStore((s) => s.profile);
  const challengeProgress = useStore((s) => s.challengeProgress);
  const storeStartChallenge = useStore((s) => s.startChallenge);
  const storeCompleteChallenge = useStore((s) => s.completeChallenge);
  const { vibrate, notification } = useHaptics();

  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newChallenge, setNewChallenge] = useState({ name: '', description: '', timeLimit: '10', points: '100', category: 'quick' });
  const [formErrors, setFormErrors] = useState({});
  const timerRef = useRef(null);

  useEffect(() => {
    async function fetchChallenges() {
      try {
        const q = query(collection(db, 'challenges'), orderBy('createdAt', 'desc'), limit(20));
        const snap = await getDocs(q);
        const items = [];
        snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
        setChallenges(items);
      } catch (err) {
        console.error('Failed to fetch challenges:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchChallenges();
  }, []);

  const completedCount = useMemo(() => challenges.filter((c) => challengeProgress[c.id]?.completed).length, [challenges, challengeProgress]);
  const totalPointsEarned = useMemo(() => challenges.filter((c) => challengeProgress[c.id]?.completed).reduce((sum, c) => sum + (c.points || 0), 0), [challenges, challengeProgress]);

  const getChallengeStatus = useCallback((id) => {
    const p = challengeProgress[id];
    if (!p) return 'idle';
    if (p.completed) return 'completed';
    if (p.started) return 'in-progress';
    return 'idle';
  }, [challengeProgress]);

  const activeChallenge = activeId ? challenges.find((c) => c.id === activeId) : null;
  const activeProgress = activeId ? getChallengeStatus(activeId) : null;

  useEffect(() => {
    if (activeId && challengeProgress[activeId]?.started && !challengeProgress[activeId]?.completed) {
      const ch = challenges.find((c) => c.id === activeId);
      if (!ch) return;
      const elapsed = Math.floor((Date.now() - challengeProgress[activeId].startTime) / 1000);
      const remaining = Math.max(0, (ch.timeLimitSec || 600) - elapsed);
      if (remaining <= 0) { completeChallengeHandler(activeId); return; }
      setTimer(remaining);
      setTimerActive(true);
    } else { setTimerActive(false); }
  }, [activeId, challengeProgress, challenges]);

  useEffect(() => {
    if (!timerActive || !activeId) return;
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); setTimerActive(false); completeChallengeHandler(activeId); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerActive, activeId]);

  const completeChallengeHandler = useCallback((id) => {
    clearInterval(timerRef.current); setTimerActive(false);
    const ch = challenges.find((c) => c.id === id);
    if (!ch || challengeProgress[id]?.completed) return;
    storeCompleteChallenge(id); notification(); vibrate();
    setActiveId(null); setTimer(0);
    setShowConfetti(true); setShowSuccess(true);
    setTimeout(() => { setShowConfetti(false); setShowSuccess(false); }, 2500);
    showToast(`+${ch.points || 0} points! Challenge complete.`);
  }, [challenges, challengeProgress, storeCompleteChallenge, notification, vibrate, showToast]);

  const startChallenge = useCallback((id) => {
    const ch = challenges.find((c) => c.id === id);
    if (!ch) return;
    vibrate(); storeStartChallenge(id); setActiveId(id); setTimer(ch.timeLimitSec || 600);
    showToast(`${ch.name} started!`);
  }, [challenges, storeStartChallenge, vibrate, showToast]);

  const cancelChallenge = useCallback((id) => {
    clearInterval(timerRef.current); setTimerActive(false); setActiveId(null); setTimer(0);
    showToast('Challenge cancelled');
  }, [showToast]);

  const filteredChallenges = useMemo(() => {
    if (activeCategory === 'all') return challenges;
    return challenges.filter((c) => c.category === activeCategory);
  }, [challenges, activeCategory]);

  async function handleJoinChallenge(challenge) {
    if (!profile?.id) { showToast('Please sign in to join challenges'); return; }
    vibrate('medium');
    const participants = challenge.participants || [];
    const isJoined = participants.includes(profile.id);
    try {
      const challengeRef = doc(db, 'challenges', challenge.id);
      await updateDoc(challengeRef, {
        participants: isJoined ? arrayRemove(profile.id) : arrayUnion(profile.id),
      });
      setChallenges((prev) => prev.map((c) => {
        if (c.id !== challenge.id) return c;
        const updated = isJoined
          ? (c.participants || []).filter((id) => id !== profile.id)
          : [...(c.participants || []), profile.id];
        return { ...c, participants: updated };
      }));
      if (isJoined) { showToast(`Left ${challenge.name}`); }
      else { notification('success'); showToast(`Joined ${challenge.name}!`); }
    } catch (err) {
      console.error('Join challenge failed:', err);
      showToast('Failed to join challenge.');
    }
  }

  function validateForm() {
    const errors = {};
    if (!newChallenge.name.trim()) errors.name = 'Challenge name is required';
    if (!newChallenge.description.trim()) errors.description = 'Description is required';
    setFormErrors(errors);
    return Object.keys(errors.length === 0 ? errors : {}) === 0;
  }

  async function handleCreateChallenge() {
    if (!newChallenge.name.trim() || !newChallenge.description.trim()) {
      setFormErrors({
        name: !newChallenge.name.trim() ? 'Challenge name is required' : '',
        description: !newChallenge.description.trim() ? 'Description is required' : '',
      });
      if (!newChallenge.name.trim() || !newChallenge.description.trim()) {
        vibrate('heavy'); notification('error'); showToast('Please fill in all fields'); return;
      }
    }
    if (!profile?.id) { showToast('Please sign in to create challenges'); return; }
    setCreating(true);
    try {
      const timeLimitSec = parseInt(newChallenge.timeLimit, 10) * 60;
      const points = parseInt(newChallenge.points, 10) || 100;
      const docRef = await addDoc(collection(db, 'challenges'), {
        name: newChallenge.name.trim(),
        description: newChallenge.description.trim(),
        category: newChallenge.category,
        timeLimit: `${newChallenge.timeLimit} min`,
        timeLimitSec: isNaN(timeLimitSec) ? 600 : timeLimitSec,
        points,
        creatorKey: profile.id,
        creatorName: profile.name,
        participants: [profile.id],
        createdAt: serverTimestamp(),
      });
      const created = {
        id: docRef.id,
        name: newChallenge.name.trim(),
        description: newChallenge.description.trim(),
        category: newChallenge.category,
        timeLimit: `${newChallenge.timeLimit} min`,
        timeLimitSec: isNaN(timeLimitSec) ? 600 : timeLimitSec,
        points,
        creatorKey: profile.id,
        creatorName: profile.name,
        participants: [profile.id],
      };
      vibrate('heavy'); notification('success');
      setChallenges((prev) => [created, ...prev]);
      setNewChallenge({ name: '', description: '', timeLimit: '10', points: '100', category: 'quick' });
      setFormErrors({}); setShowCreateForm(false);
      showToast(`"${created.name}" challenge created!`);
    } catch (err) {
      console.error('Failed to create challenge:', err);
      vibrate('heavy'); notification('error');
      showToast('Failed to create challenge.');
    } finally {
      setCreating(false);
    }
  }

  if (showCreateForm) {
    return (
      <MainScreenShell>
        <SubpageHeader title="Create Challenge" onBack={() => { setShowCreateForm(false); setNewChallenge({ name: '', description: '', timeLimit: '10', points: '100', category: 'quick' }); setFormErrors({}); }} />
        <div className="no-scrollbar px-[18px] pb-6">
          <div className="gold-card mt-3 overflow-hidden p-5">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[rgba(217,172,61,.12)] opacity-30" />
            <div className="relative">
              <Plus className="text-gold" size={22} />
              <div className="mt-2 text-[20px] font-black">Create a challenge.</div>
              <div className="mt-1 text-[10.5px] text-text2">Push the community to build, ship, and grow.</div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-text2">Challenge Name</label>
              <input value={newChallenge.name} onChange={(e) => setNewChallenge((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Build a landing page in 10 min" className={`w-full rounded-xl border bg-card px-4 py-3 text-[12.5px] outline-none transition-colors placeholder:text-text3 ${formErrors.name ? 'border-red-500' : 'border-linesoft focus:border-gold'}`} />
              {formErrors.name && <p className="mt-1 text-[10px] text-red-400">{formErrors.name}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-text2">Description</label>
              <textarea value={newChallenge.description} onChange={(e) => setNewChallenge((p) => ({ ...p, description: e.target.value }))} placeholder="What should participants build or do?" rows={3} className={`w-full resize-none rounded-xl border bg-card px-4 py-3 text-[12.5px] outline-none transition-colors placeholder:text-text3 ${formErrors.description ? 'border-red-500' : 'border-linesoft focus:border-gold'}`} />
              {formErrors.description && <p className="mt-1 text-[10px] text-red-400">{formErrors.description}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-text2">Time Limit (min)</label>
                <input type="number" min="1" value={newChallenge.timeLimit} onChange={(e) => setNewChallenge((p) => ({ ...p, timeLimit: e.target.value }))} className="w-full rounded-xl border border-linesoft bg-card px-4 py-3 text-[12.5px] outline-none focus:border-gold" />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-text2">Points</label>
                <input type="number" min="10" value={newChallenge.points} onChange={(e) => setNewChallenge((p) => ({ ...p, points: e.target.value }))} className="w-full rounded-xl border border-linesoft bg-card px-4 py-3 text-[12.5px] outline-none focus:border-gold" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-text2">Category</label>
              <div className="flex flex-wrap gap-2">
                {CREATE_CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setNewChallenge((p) => ({ ...p, category: cat }))} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-bold capitalize transition-colors ${newChallenge.category === cat ? 'border-transparent bg-gold-grad text-[#171100]' : 'border-linesoft text-text2'}`}>{cat}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button onClick={() => { setShowCreateForm(false); setNewChallenge({ name: '', description: '', timeLimit: '10', points: '100', category: 'quick' }); setFormErrors({}); }} className="flex-1 rounded-xl border border-linesoft bg-card py-3 text-[12px] font-bold text-text2">Cancel</button>
              <button onClick={handleCreateChallenge} disabled={creating} className="flex-1 rounded-xl bg-gold-grad py-3 text-[12px] font-black text-[#171100] disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Challenge'}
              </button>
            </div>
          </div>
        </div>
      </MainScreenShell>
    );
  }

  return (
    <MainScreenShell>
      <SubpageHeader title="Challenges" />
      <div className="no-scrollbar px-[18px] pb-6">
        {loading ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        ) : challenges.length === 0 ? (
          <>
            <div className="gold-card mt-3 p-5 text-center">
              <div className="text-4xl mb-3">🏆</div>
              <div className="text-[18px] font-black">No active challenges yet.</div>
              <div className="mt-2 text-[11px] text-text2">Create one to get the community building!</div>
            </div>
            <button onClick={() => { vibrate('light'); setShowCreateForm(true); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold-grad py-3 text-[11px] font-black text-[#171100]">
              <Plus size={15} /> Create Challenge
            </button>
            <div className="mt-5 grid grid-cols-4 gap-2">
              <Stat n="0" l="Points" icon={Medal} />
              <Stat n="-" l="Rank" icon={Trophy} />
              <Stat n="0" l="Badges" icon={Award} />
              <Stat n="0 days" l="Streak" icon={Flame} />
            </div>
          </>
        ) : (
          <>
            <div className="gold-card mt-3 p-5 text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl" role="img" aria-label="fire">🔥</span>
                <span className="text-[21px] font-black">Build daily</span>
                <span className="text-2xl" role="img" aria-label="fire">🔥</span>
              </div>
              <div className="mt-3 text-[10.5px] text-text2">Keep building to grow your Builder Score.</div>
            </div>

            {totalPointsEarned > 0 && (
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-gold/20 bg-gold/5 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-gold" />
                  <span className="text-[13px] font-bold text-gold">{totalPointsEarned.toLocaleString()} points earned</span>
                </div>
                <span className="text-[11px] text-text3">{completedCount}/{challenges.length} done</span>
              </div>
            )}

            <div className="mt-5 grid grid-cols-4 gap-2">
              <Stat n={(2840 + totalPointsEarned).toLocaleString()} l="Points" icon={Medal} />
              <Stat n="#18" l="Rank" icon={Trophy} />
              <Stat n="9" l="Badges" icon={Award} />
              <Stat n="7 days" l="Streak" icon={Flame} />
            </div>

            {activeId && activeChallenge && activeProgress === 'in-progress' && (
              <div className="mt-5 glass-card border-gold/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gold">Currently working on</div>
                  <div className="flex items-center gap-1 text-[11px] text-text2"><Clock size={12} /><span className={timer <= 30 ? 'font-bold text-red' : ''}>{formatTime(timer)}</span></div>
                </div>
                <div className="mt-2 text-[14px] font-extrabold">{activeChallenge.name}</div>
                <div className="mt-1 text-[10.5px] text-text2">{activeChallenge.description}</div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
                  <div className="h-full rounded-full bg-gold-grad transition-all duration-500" style={{ width: `${((activeChallenge.timeLimitSec - timer) / activeChallenge.timeLimitSec) * 100}%` }} />
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { vibrate(); completeChallengeHandler(activeId); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold py-2.5 text-[11px] font-bold text-[#171100]"><CheckCircle size={13} /> Complete</button>
                  <button onClick={() => { vibrate(); cancelChallenge(activeId); }} className="flex items-center justify-center rounded-xl border border-line px-3 text-[11px] text-text3"><RotateCcw size={13} /></button>
                </div>
              </div>
            )}

            <button onClick={() => { vibrate('light'); setShowCreateForm(true); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gold/40 bg-gold/[0.06] py-3 text-[12px] font-bold text-gold transition-colors hover:bg-gold/10">
              <Plus size={16} /> Create Challenge
            </button>

            <div className="mt-5 flex items-center justify-between">
              <div><h2 className="text-[15px] font-extrabold">Today&apos;s challenges</h2><p className="text-[10px] text-text3">Earn points, badges and proof of work.</p></div>
              <Trophy size={18} className="text-gold" />
            </div>

            <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button key={cat.id} onClick={() => { vibrate(); setActiveCategory(cat.id); }} className={`flex-none rounded-full px-3.5 py-1.5 text-[10.5px] font-bold transition-all ${activeCategory === cat.id ? 'bg-gold text-[#171100]' : 'border border-line text-text3 hover:text-text2'}`}>{cat.label}</button>
              ))}
            </div>

            <div className="mt-3 space-y-2.5">
              {filteredChallenges.map((c) => {
                const st = getChallengeStatus(c.id);
                const isActive = activeId === c.id && st === 'in-progress';
                const participants = c.participants || [];
                const isJoined = participants.includes(profile?.id);
                return (
                  <div key={c.id} className="glass-card p-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${st === 'completed' ? 'border-green-500/40 bg-green-500/10 text-green-400' : st === 'in-progress' ? 'border-gold/40 bg-gold/10 text-gold' : 'border-line text-gold'}`}>
                        {st === 'completed' ? <CheckCircle size={18} /> : <Zap size={18} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="text-[12.5px] font-extrabold">{c.name}</div>
                          {st === 'in-progress' && <div className="flex items-center gap-1.5"><Clock size={10} className="text-gold" /><span className="text-[10px] text-gold">{formatTime(timer)}</span></div>}
                        </div>
                        <div className="mt-0.5 text-[10.5px] text-text2">{c.description}</div>
                        <div className="mt-1 text-[9.5px] text-text3">{c.timeLimit || '10 min'} · +{c.points || 100} pts · {participants.length} joined</div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {st === 'completed' ? (
                        <span className="flex-1 rounded-xl bg-green-500/15 py-2.5 text-center text-[10.5px] font-bold text-green-400">Completed ✓</span>
                      ) : st === 'in-progress' ? (
                        <button onClick={() => { vibrate(); setActiveId(c.id); }} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-gold py-2.5 text-[10.5px] font-bold text-[#171100]"><Play size={12} /> Continue</button>
                      ) : (
                        <>
                          <button onClick={() => { vibrate(); startChallenge(c.id); }} className="flex-1 rounded-xl bg-gold-grad py-2.5 text-[10.5px] font-black text-[#171100]">Start</button>
                          <button onClick={() => handleJoinChallenge(c)} className={`rounded-xl border px-3 py-2.5 text-[10.5px] font-bold transition-all ${isJoined ? 'border-brandgreen/40 bg-brandgreen/10 text-brandgreen' : 'border-linesoft text-gold-hi hover:bg-gold/10'}`}>
                            {isJoined ? 'Joined ✓' : 'Join'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredChallenges.length === 0 && (
                <div className="flex flex-col items-center py-10 text-center"><Target size={28} className="text-text3" /><div className="mt-2 text-[12px] text-text3">No challenges in this category yet.</div></div>
              )}
            </div>
          </>
        )}
      </div>

      {detailId && (
        <ChallengeDetail challenge={challenges.find((c) => c.id === detailId)} onStart={() => { setDetailId(null); startChallenge(detailId); }} onClose={() => setDetailId(null)} />
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mx-6 flex flex-col items-center rounded-3xl bg-card p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/20"><CheckCircle size={36} className="text-gold" /></div>
            <div className="mt-4 text-[18px] font-black">Challenge Complete!</div>
            <div className="mt-1 text-[11px] text-text2">Points have been added to your score.</div>
          </div>
        </div>
      )}

      {showConfetti && <ConfettiOverlay />}

      <style jsx global>{`
        @keyframes confetti-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
        .animate-confetti-fall { animation: confetti-fall 1.5s ease-out forwards; }
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
  if (!challenge) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-card px-5 pb-8 pt-6" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold"><Zap size={22} /></div>
          <div>
            <div className="text-[16px] font-extrabold">{challenge.name}</div>
            <div className="text-[11px] text-text2">{challenge.description}</div>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-line bg-[#0a0a0a] p-4">
          <div className="text-[11px] font-bold text-text2">Overview</div>
          <div className="mt-1.5 text-[12px] leading-relaxed text-text3">{challenge.detail || challenge.description}</div>
        </div>
        {challenge.steps && (
          <div className="mt-3 rounded-2xl border border-line bg-[#0a0a0a] p-4">
            <div className="text-[11px] font-bold text-text2">Steps to Complete</div>
            <div className="mt-2 space-y-2">
              {challenge.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/10 text-[9px] font-bold text-gold">{i + 1}</div>
                  <div className="text-[11px] text-text3">{step}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between text-[11px] text-text2">
          <div className="flex items-center gap-1"><Clock size={12} /> {challenge.timeLimit || '10 min'}</div>
          <div className="font-bold text-gold">+{challenge.points || 100} pts</div>
        </div>
        <button onClick={onStart} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-[13px] font-bold text-[#171100]"><Play size={15} /> Start Challenge</button>
      </div>
    </div>
  );
}
