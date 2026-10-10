'use client';

// ─────────────────────────────────────────────────────────────
// MATCH BY INTENT — real candidates, real scoring.
// Scores come from intent→skill relevance, profile depth,
// verification and skill overlap (never array index). The main
// action is a collaboration request with a personal message;
// accepted requests open a real chat.
// ─────────────────────────────────────────────────────────────

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, CheckCircle2, Code2, Coins, Handshake, Loader2, MapPin,
  MessageCircle, Send, Sparkles, UserPlus, Users, X,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { mapRows } from '@/lib/supabase/db';
import MainScreenShell from '@/components/MainScreenShell';
import Avatar from '@/components/Avatar';
import { useStore } from '@/lib/store';
import {
  sendCollabRequest,
  withdrawCollabRequest,
  getMyRequestTo,
} from '@/lib/collabRequests';

const TITLES = {
  start_business: 'Start a business',
  find_programmer: 'Find a programmer',
  find_cofounder: 'Find a co-founder',
  find_job: 'Find a job',
  find_funding: 'Find funding',
  learn_skill: 'Learn a skill',
  find_mentor: 'Find a mentor',
  join_project: 'Join a project',
  hire_someone: 'Hire someone',
  network_locally: 'Network locally',
};

const INTENT_TERMS = {
  find_programmer: ['developer', 'engineer', 'programmer', 'react', 'node', 'python', 'full stack', 'fullstack', 'frontend', 'backend', 'mobile', 'android', 'ios', 'flutter', 'devops', 'blockchain', 'coder', 'coding', 'typescript', 'ml', 'ai'],
  find_cofounder: ['founder', 'cofounder', 'co-founder', 'business', 'strategy', 'growth', 'product', 'sales', 'leadership', 'entrepreneur', 'ceo'],
  start_business: ['founder', 'business', 'strategy', 'growth', 'sales', 'marketing', 'operations', 'entrepreneur', 'bootstrap'],
  find_mentor: ['mentor', 'advisor', 'strategy', 'leadership', 'investor', 'growth', 'product', 'scaling', 'ex-founder'],
  hire_someone: ['designer', 'developer', 'writer', 'marketer', 'freelancer', 'consultant', 'editor'],
  find_job: ['developer', 'designer', 'product', 'marketing', 'data', 'engineer', 'manager'],
  find_funding: ['investor', 'vc', 'funding', 'finance', 'angel', 'fundraise', 'capital'],
  join_project: ['developer', 'designer', 'product', 'growth', 'ai', 'react', 'python', 'builder'],
  learn_skill: ['teacher', 'mentor', 'coach', 'instructor', 'tutor'],
  network_locally: [],
};

function scoreCandidate(u, intent, myProfile) {
  const hay = `${(u.skills || []).join(' ')} ${u.role || ''} ${u.bio || ''} ${u.name || ''}`.toLowerCase();
  const terms = INTENT_TERMS[intent] || [];
  const hits = terms.filter((t) => hay.includes(t));
  let score = 55 + Math.min(30, hits.length * 10);
  if (u.verified) score += 5;
  if (u.foundingNumber) score += 4;
  if (u.bio && String(u.bio).length > 20) score += 3;
  if (u.avatar) score += 3;
  const mine = (myProfile?.skills || []).map((s) => String(s).toLowerCase()).filter(Boolean);
  const overlap = mine.filter((s) => hay.includes(s));
  score += Math.min(6, overlap.length * 2);
  const reason =
    hits.slice(0, 3).join(', ') ||
    overlap.slice(0, 3).join(', ') ||
    (u.role ? String(u.role) : 'Open to connect');
  return { score: Math.min(99, score), reason };
}

export default function IntentMatch() {
  const { intent } = useParams();
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const showToast = useStore((s) => s.showToast);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState({});
  const [composerFor, setComposerFor] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const title = TITLES[intent] || 'Find your people';

  useEffect(() => {
    let cancelled = false;
    async function fetchUsers() {
      try {
        const { data, error } = await getSupabase().from('profiles').select('*').limit(100);
        if (error) throw error;
        if (cancelled) return;
        const me = profile?.id;
        const all = mapRows(data || [])
          .filter((u) => u.id !== me && u.status !== 'suspended');
        const scored = all
          .map((u) => ({ ...u, _m: scoreCandidate(u, intent, profile) }))
          .sort((a, b) => b._m.score - a._m.score)
          .slice(0, 8);
        setUsers(scored);
        if (me && scored.length) {
          const results = await Promise.all(scored.map((u) => getMyRequestTo(u.id, me)));
          const map = {};
          scored.forEach((u, i) => {
            if (results[i]) map[u.id] = results[i].status;
          });
          setStatuses(map);
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchUsers();
    return () => { cancelled = true; };
  }, [intent, profile?.id]);

  async function sendTo(u) {
    if (!profile) return;
    if (!msg.trim()) {
      showToast('Add a short message first');
      return;
    }
    setBusy(true);
    try {
      await sendCollabRequest(u, profile, msg, intent);
      setStatuses((s) => ({ ...s, [u.id]: 'pending' }));
      setComposerFor(null);
      setMsg('');
      showToast('Collaboration request sent');
    } catch (e) {
      showToast('Could not send the request');
    } finally {
      setBusy(false);
    }
  }

  async function undo(u) {
    if (!profile) return;
    setBusy(true);
    try {
      await withdrawCollabRequest(u.id, profile.id);
      setStatuses((s) => {
        const next = { ...s };
        delete next[u.id];
        return next;
      });
      showToast('Request withdrawn');
    } catch (e) {
      showToast('Could not withdraw');
    } finally {
      setBusy(false);
    }
  }

  return (
    <MainScreenShell>
      <div className="flex items-center gap-3 border-b border-linesoft px-4 py-3.5">
        <button onClick={() => router.back()} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-extrabold">{title}</div>
          <div className="text-[9.5px] text-text3">Relevance-ranked builders</div>
        </div>
        <button
          onClick={() => router.push('/collab-requests')}
          className="rounded-full border border-gold/40 px-3 py-1.5 text-[10.5px] font-bold text-gold-hi"
        >
          My requests
        </button>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-[18px] py-4">
        <div className="gold-card p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-gold">
            <Sparkles size={13} /> MATCH ENGINE
          </div>
          <div className="mt-2 text-[18px] font-black">Best people for your mission.</div>
          <div className="mt-1 text-[10.5px] text-text2">
            Ranked by skills, profile depth, verification and how well they fit what you
            are trying to do — not by who signed up first.
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-text3">
            <Loader2 size={16} className="animate-spin" /> Loading matches…
          </div>
        ) : users.length === 0 ? (
          <p className="py-12 text-center text-[13px] text-text3">
            No builders available right now — check back soon.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {users.map((u) => {
              const status = statuses[u.id];
              return (
                <div key={u.id} className="glass-card p-4">
                  <div className="flex gap-3">
                    <button onClick={() => router.push(`/profile/${u.id}`)} aria-label={`Open ${u.name}'s profile`}>
                      <Avatar src={u.avatar} name={u.name} size={48} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[13.5px] font-extrabold">{u.name}</div>
                          <div className="truncate text-[10px] text-text2">{u.role || 'Builder'}</div>
                        </div>
                        <span className="flex-none rounded-full bg-gold-grad px-2 py-1 text-[9px] font-black text-[#171100]">
                          {u._m.score}%
                        </span>
                      </div>
                      <div className="mt-1 truncate text-[9.5px] text-gold-hi">
                        {u._m.reason}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(u.skills || []).slice(0, 3).map((s) => (
                          <span key={s} className="rounded-full border border-linesoft px-2 py-1 text-[9px] text-text2">
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[9.5px] text-text3">
                        <span className="flex items-center gap-1">
                          <MapPin size={10} /> {u.location || 'Remote'}
                        </span>
                        {u.verified ? (
                          <span className="flex items-center gap-1 text-brandgreen">
                            <CheckCircle2 size={10} /> Verified
                          </span>
                        ) : null}
                        {u.foundingNumber ? (
                          <span className="text-gold-hi">#{u.foundingNumber} Founding 100</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    {status === 'pending' ? (
                      <>
                        <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 py-2.5 text-[10.5px] font-black text-gold-hi">
                          <CheckCircle2 size={13} /> Requested
                        </span>
                        <button
                          onClick={() => undo(u)}
                          disabled={busy}
                          className="rounded-xl border border-linesoft px-3 text-[10.5px] font-bold text-text2 disabled:opacity-40"
                        >
                          Undo
                        </button>
                      </>
                    ) : status === 'accepted' ? (
                      <button
                        onClick={() => router.push(`/messages/${u.id}`)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-grad py-2.5 text-[10.5px] font-black text-[#171100]"
                      >
                        <MessageCircle size={13} /> Message
                      </button>
                    ) : composerFor === u.id ? null : (
                      <button
                        onClick={() => { setComposerFor(u.id); setMsg(''); }}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-grad py-2.5 text-[10.5px] font-black text-[#171100]"
                      >
                        <UserPlus size={13} /> Request to collaborate
                      </button>
                    )}
                    <button
                      onClick={() => router.push(`/profile/${u.id}`)}
                      className="flex-1 rounded-xl border border-line py-2.5 text-[10.5px] font-bold text-gold-hi"
                    >
                      View profile
                    </button>
                  </div>

                  {composerFor === u.id ? (
                    <div className="mt-2.5 rounded-xl border border-gold/30 bg-gold/[0.05] p-3">
                      <textarea
                        value={msg}
                        onChange={(e) => setMsg(e.target.value)}
                        placeholder="Why do you want to build together? What would you bring?"
                        rows={3}
                        maxLength={1000}
                        autoFocus
                        className="w-full resize-none bg-transparent text-[12.5px] leading-relaxed text-white placeholder:text-text3 focus:outline-none"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => sendTo(u)}
                          disabled={busy || !msg.trim()}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-grad py-2 text-[11px] font-black text-[#171100] disabled:opacity-50"
                        >
                          {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                          Send request
                        </button>
                        <button
                          onClick={() => setComposerFor(null)}
                          className="rounded-xl border border-linesoft px-3 text-[11px] font-bold text-text2"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainScreenShell>
  );
}
