'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Eye, Lock, Plus, Users, ChevronUp, ChevronDown,
  MessageCircle, Share2, TrendingUp, Clock, CheckCircle, Lightbulb, Star, X, Send, Heart,
} from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import SubpageHeader from '@/components/SubpageHeader';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

const STAGE_COLORS = { MVP: '#22c55e', Concept: '#3b82f6', Prototype: '#f59e0b', Launched: '#a855f7' };

const FILTER_TABS = [
  { key: 'trending', label: 'Trending', icon: TrendingUp },
  { key: 'recent', label: 'Recent', icon: Clock },
];

const EMPTY_FORM = { name: '', tagline: '', stage: 'Concept', description: '', problem: '', solution: '', audience: '', tech: '' };

export default function Ideas() {
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);
  const ideaVotes = useStore((s) => s.ideaVotes);
  const toggleIdeaVote = useStore((s) => s.toggleIdeaVote);
  const { vibrate } = useHaptics();

  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('trending');
  const [openId, setOpenId] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [commentLikes, setCommentLikes] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    async function fetchIdeas() {
      try {
        const q = query(collection(db, 'ideas'), orderBy('createdAt', 'desc'), limit(30));
        const snap = await getDocs(q);
        const items = [];
        snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
        setIdeas(items);
      } catch (err) {
        console.error('Failed to fetch ideas:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchIdeas();
  }, []);

  const openIdea = useCallback((id) => { vibrate('light'); setOpenId(id); }, [vibrate]);
  const closeIdea = useCallback(() => { vibrate('light'); setOpenId(null); setNewComment(''); }, [vibrate]);
  const handleVote = useCallback((ideaId) => { vibrate('medium'); toggleIdeaVote(ideaId); }, [toggleIdeaVote, vibrate]);

  const handleAddComment = useCallback(() => {
    if (!newComment.trim()) return;
    vibrate('light');
    setIdeas((prev) => prev.map((idea) => {
      if (idea.id !== openId) return idea;
      return { ...idea, comments: [...(idea.comments || []), { id: `c_${Date.now()}`, authorKey: 'me', authorName: 'You', text: newComment.trim(), time: 'Just now', likes: 0 }] };
    }));
    setNewComment('');
  }, [newComment, openId, vibrate]);

  const handleLikeComment = useCallback((ideaId, commentId) => {
    vibrate('light');
    setCommentLikes((prev) => ({ ...prev, [`${ideaId}_${commentId}`]: !prev[`${ideaId}_${commentId}`] }));
  }, [vibrate]);

  const handleSubmitIdea = useCallback(() => {
    if (!form.name.trim() || !form.tagline.trim() || !form.description.trim()) {
      showToast('Please fill in name, tagline, and description'); return;
    }
    vibrate('medium');
    const newIdea = {
      id: `user_${Date.now()}`, name: form.name.trim(), tagline: form.tagline.trim(),
      stage: form.stage, authorKey: 'me', authorName: 'You', votes: 0,
      createdAt: new Date().toISOString().slice(0, 10), description: form.description.trim(),
      problem: form.problem.trim(), solution: form.solution.trim(),
      audience: form.audience.trim(), tech: form.tech.trim(), comments: [],
    };
    setIdeas((prev) => [newIdea, ...prev]);
    setForm(EMPTY_FORM); setShowForm(false); showToast('Idea published!');
  }, [form, vibrate, showToast]);

  const getVote = (ideaId) => !!ideaVotes[ideaId];

  const sortedIdeas = [...ideas].sort((a, b) => {
    if (filter === 'trending') return (b.votes || 0) - (a.votes || 0);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const openIdeaData = ideas.find((i) => i.id === openId);
  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <MainScreenShell>
      <SubpageHeader title="Ideas" />
      <div className="no-scrollbar px-[18px] pb-6">
        <button onClick={() => { vibrate('light'); setShowForm(true); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gold-grad py-3 text-[11px] font-black text-[#171100]">
          <Plus size={15} /> Submit Idea
        </button>

        <div className="mt-5 flex gap-2">
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = filter === tab.key;
            return (
              <button key={tab.key} onClick={() => { vibrate('light'); setFilter(tab.key); }} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-bold transition-all ${active ? 'bg-gold-grad text-[#171100]' : 'border border-line bg-[rgba(255,255,255,.03)] text-text2'}`}>
                <Icon size={12} /> {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        ) : sortedIdeas.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.04]"><Lightbulb size={28} className="text-text3" /></div>
            <h3 className="text-[15px] font-extrabold">No ideas yet</h3>
            <p className="mt-1.5 text-[12px] text-text2">Share your first idea with the community!</p>
            <button onClick={() => setShowForm(true)} className="mt-4 rounded-full bg-gold-grad px-6 py-2.5 text-[11px] font-black text-[#171100]">Submit Idea</button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {sortedIdeas.map((idea) => {
              const voted = getVote(idea.id);
              return (
                <div key={idea.id} className="glass-card p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-extrabold">{idea.name}</span>
                        <span className="rounded-full border px-2 py-0.5 text-[9px] font-bold" style={{ borderColor: STAGE_COLORS[idea.stage], color: STAGE_COLORS[idea.stage] }}>{idea.stage}</span>
                      </div>
                      <div className="mt-1 text-[11px] leading-5 text-text2">{idea.tagline}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-gold/20 flex items-center justify-center"><span className="text-[9px] font-bold text-gold">{idea.authorName?.[0] || '?'}</span></div>
                      <span className="text-[10px] text-text2">{idea.authorName || 'Anonymous'}</span>
                      <span className="text-[9px] text-text2">·</span>
                      <span className="text-[9px] text-text2">{idea.createdAt}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-text2">
                      <span className="flex items-center gap-1"><MessageCircle size={11} /> {idea.comments?.length || 0}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex items-center rounded-xl border border-line bg-[rgba(255,255,255,.03)]">
                      <button onClick={() => handleVote(idea.id)} className={`flex items-center gap-1 rounded-l-xl px-3 py-2 transition-all ${voted ? 'text-[#D9AC3D]' : 'text-text2 hover:text-gold-hi'}`}><ChevronUp size={14} /></button>
                      <span className="border-x border-line px-2 py-2 text-[10px] font-bold text-text2">{(idea.votes || 0) + (voted ? 1 : 0)}</span>
                      <button onClick={() => handleVote(idea.id)} className={`flex items-center gap-1 rounded-r-xl px-3 py-2 transition-all ${voted ? 'text-red-400' : 'text-text2 hover:text-red-400'}`}><ChevronDown size={14} /></button>
                    </div>
                    <button onClick={() => openIdea(idea.id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2.5 text-[10px] font-bold text-gold-hi"><Eye size={12} /> View</button>
                    <button onClick={() => { vibrate('light'); showToast('Idea shared!'); }} className="rounded-xl border border-line p-2.5 text-text2 transition-colors hover:text-gold-hi"><Share2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-line bg-[rgba(217,172,61,.05)] p-4">
          <div className="flex items-center gap-2 text-[12px] font-extrabold"><Lock size={15} className="text-gold" /> Idea Vault</div>
          <p className="mt-1 text-[10.5px] leading-5 text-text2">Keep ideas private, track versions and invite only the people you trust.</p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[9px] font-bold text-gold">Coming soon</div>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#020202]">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <button onClick={() => { vibrate('light'); setShowForm(false); }} className="p-1 text-text2"><X size={20} /></button>
              <span className="text-[13px] font-extrabold">Submit Idea</span>
              <button onClick={handleSubmitIdea} className="rounded-lg bg-gold-grad px-3 py-1.5 text-[10px] font-black text-[#171100]">Publish</button>
            </div>
            <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
              <label className="mt-2 block text-[10px] font-bold text-text2">Name *</label>
              <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Your idea name" className="mt-1 w-full rounded-xl border border-line bg-[rgba(255,255,255,.03)] px-3 py-2.5 text-[11px] text-text placeholder:text-text2 focus:border-gold/50 focus:outline-none" />
              <label className="mt-3 block text-[10px] font-bold text-text2">Tagline *</label>
              <input type="text" value={form.tagline} onChange={(e) => updateField('tagline', e.target.value)} placeholder="One-liner pitch" className="mt-1 w-full rounded-xl border border-line bg-[rgba(255,255,255,.03)] px-3 py-2.5 text-[11px] text-text placeholder:text-text2 focus:border-gold/50 focus:outline-none" />
              <label className="mt-3 block text-[10px] font-bold text-text2">Stage</label>
              <div className="mt-1 flex gap-2">
                {Object.keys(STAGE_COLORS).map((stage) => (
                  <button key={stage} onClick={() => { vibrate('light'); updateField('stage', stage); }} className={`flex-1 rounded-xl border px-3 py-2 text-[10px] font-bold transition-all ${form.stage === stage ? 'bg-gold-grad text-[#171100]' : 'border-line bg-[rgba(255,255,255,.03)] text-text2'}`}>{stage}</button>
                ))}
              </div>
              <label className="mt-3 block text-[10px] font-bold text-text2">Description *</label>
              <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Describe your idea in detail" rows={3} className="mt-1 w-full rounded-xl border border-line bg-[rgba(255,255,255,.03)] px-3 py-2.5 text-[11px] text-text placeholder:text-text2 focus:border-gold/50 focus:outline-none resize-none" />
              <label className="mt-3 block text-[10px] font-bold text-text2">Problem</label>
              <textarea value={form.problem} onChange={(e) => updateField('problem', e.target.value)} placeholder="What problem does this solve?" rows={2} className="mt-1 w-full rounded-xl border border-line bg-[rgba(255,255,255,.03)] px-3 py-2.5 text-[11px] text-text placeholder:text-text2 focus:border-gold/50 focus:outline-none resize-none" />
              <label className="mt-3 block text-[10px] font-bold text-text2">Solution</label>
              <textarea value={form.solution} onChange={(e) => updateField('solution', e.target.value)} placeholder="How does your idea solve it?" rows={2} className="mt-1 w-full rounded-xl border border-line bg-[rgba(255,255,255,.03)] px-3 py-2.5 text-[11px] text-text placeholder:text-text2 focus:border-gold/50 focus:outline-none resize-none" />
              <label className="mt-3 block text-[10px] font-bold text-text2">Target Audience</label>
              <input type="text" value={form.audience} onChange={(e) => updateField('audience', e.target.value)} placeholder="Who will use this?" className="mt-1 w-full rounded-xl border border-line bg-[rgba(255,255,255,.03)] px-3 py-2.5 text-[11px] text-text placeholder:text-text2 focus:border-gold/50 focus:outline-none" />
              <label className="mt-3 block text-[10px] font-bold text-text2">Tech Stack</label>
              <input type="text" value={form.tech} onChange={(e) => updateField('tech', e.target.value)} placeholder="Technologies you plan to use" className="mt-1 w-full rounded-xl border border-line bg-[rgba(255,255,255,.03)] px-3 py-2.5 text-[11px] text-text placeholder:text-text2 focus:border-gold/50 focus:outline-none" />
            </div>
          </div>
        )}

        {openIdeaData && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#020202]">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <button onClick={closeIdea} className="p-1 text-text2"><X size={20} /></button>
              <span className="text-[13px] font-extrabold">{openIdeaData.name}</span>
              <div className="w-6" />
            </div>
            <div className="no-scrollbar px-4 py-4">
              <div className="flex items-center gap-2">
                <span className="text-[18px] font-black">{openIdeaData.name}</span>
                <span className="rounded-full border px-2 py-0.5 text-[10px] font-bold" style={{ borderColor: STAGE_COLORS[openIdeaData.stage], color: STAGE_COLORS[openIdeaData.stage] }}>{openIdeaData.stage}</span>
              </div>
              <div className="mt-4"><h3 className="text-[12px] font-extrabold text-gold-hi">Description</h3><p className="mt-1 text-[11px] leading-5 text-text2">{openIdeaData.description}</p></div>
              {openIdeaData.problem && <div className="mt-4"><h3 className="flex items-center gap-1.5 text-[12px] font-extrabold text-gold-hi"><Lightbulb size={13} /> Problem Statement</h3><p className="mt-1 text-[11px] leading-5 text-text2">{openIdeaData.problem}</p></div>}
              {openIdeaData.solution && <div className="mt-4"><h3 className="flex items-center gap-1.5 text-[12px] font-extrabold text-gold-hi"><CheckCircle size={13} /> Proposed Solution</h3><p className="mt-1 text-[11px] leading-5 text-text2">{openIdeaData.solution}</p></div>}
              {openIdeaData.audience && <div className="mt-4"><h3 className="flex items-center gap-1.5 text-[12px] font-extrabold text-gold-hi"><Users size={13} /> Target Audience</h3><p className="mt-1 text-[11px] leading-5 text-text2">{openIdeaData.audience}</p></div>}
              {openIdeaData.tech && <div className="mt-4"><h3 className="flex items-center gap-1.5 text-[12px] font-extrabold text-gold-hi"><Lock size={13} /> Tech Requirements</h3><p className="mt-1 text-[11px] leading-5 text-text2">{openIdeaData.tech}</p></div>}

              <div className="mt-5 flex items-center gap-3">
                <div className="flex items-center rounded-xl border border-line bg-[rgba(255,255,255,.03)]">
                  <button onClick={() => handleVote(openIdeaData.id)} className={`flex items-center gap-1 rounded-l-xl px-4 py-2.5 transition-all ${getVote(openIdeaData.id) ? 'text-[#D9AC3D]' : 'text-text2 hover:text-gold-hi'}`}><ChevronUp size={16} /></button>
                  <span className="border-x border-line px-3 py-2.5 text-[11px] font-bold text-text2">{(openIdeaData.votes || 0) + (getVote(openIdeaData.id) ? 1 : 0)}</span>
                  <button onClick={() => handleVote(openIdeaData.id)} className={`flex items-center gap-1 rounded-r-xl px-4 py-2.5 transition-all ${getVote(openIdeaData.id) ? 'text-red-400' : 'text-text2 hover:text-red-400'}`}><ChevronDown size={16} /></button>
                </div>
                <button onClick={() => { vibrate('light'); showToast('Idea shared!'); }} className="rounded-xl border border-line p-2.5 text-text2 transition-colors hover:text-gold-hi"><Share2 size={15} /></button>
                <button onClick={() => { vibrate('light'); router.push('/match/find_programmer'); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-grad py-2.5 text-[11px] font-black text-[#171100]">Build team <ArrowRight size={13} /></button>
              </div>

              <div className="mt-5 border-t border-line pt-4">
                <h3 className="flex items-center gap-1.5 text-[12px] font-extrabold text-gold-hi"><MessageCircle size={13} /> Comments ({openIdeaData.comments?.length || 0})</h3>
                <div className="mt-3 flex items-center gap-2">
                  <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddComment()} placeholder="Add a comment..." className="flex-1 rounded-xl border border-line bg-[rgba(255,255,255,.03)] px-3 py-2.5 text-[11px] text-text placeholder:text-text2 focus:border-gold/50 focus:outline-none" />
                  <button onClick={handleAddComment} disabled={!newComment.trim()} className="rounded-xl bg-gold-grad p-2.5 text-[#171100] transition-opacity disabled:opacity-30"><Send size={14} /></button>
                </div>
                <div className="mt-3 space-y-3">
                  {(openIdeaData.comments || []).map((comment) => {
                    const liked = commentLikes[`${openId}_${comment.id}`];
                    return (
                      <div key={comment.id} className="rounded-xl bg-[rgba(255,255,255,.03)] p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-gold/20 flex items-center justify-center"><span className="text-[9px] font-bold text-gold">{comment.authorName?.[0] || '?'}</span></div>
                          <span className="text-[10px] font-bold text-text">{comment.authorName || 'Anonymous'}</span>
                          <span className="text-[9px] text-text2">· {comment.time}</span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-4 text-text2">{comment.text}</p>
                        <div className="mt-2 flex items-center gap-3">
                          <button onClick={() => handleLikeComment(openId, comment.id)} className={`flex items-center gap-1 text-[10px] transition-colors ${liked ? 'text-[#D9AC3D]' : 'text-text2 hover:text-gold-hi'}`}>
                            <Heart size={11} fill={liked ? '#D9AC3D' : 'none'} /> {comment.likes + (liked ? 1 : 0)}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainScreenShell>
  );
}
