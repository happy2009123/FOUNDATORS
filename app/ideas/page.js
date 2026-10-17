'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Eye, Lock, Plus, Users, ChevronUp, ChevronDown,
  MessageCircle, Share2, TrendingUp, Clock, CheckCircle, Lightbulb, Star, X, Send, Heart, Save, RotateCcw, UserPlus, Pencil, Trash2,
} from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import SubpageHeader from '@/components/SubpageHeader';
import Avatar from '@/components/Avatar';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { formatPostTime } from '@/lib/timeago';
import { getSupabase } from '@/lib/supabase/client';
import { mapRows, randomId, toRow } from '@/lib/supabase/db';
import {
  saveIdeaVersion, fetchIdeaVersions, fetchVaultMembers,
  addVaultMember, removeVaultMember, restoreIdeaVersion,
} from '@/lib/ideasVault';
import { fetchUsersByIds } from '@/lib/projects';

const STAGE_COLORS = { MVP: '#22c55e', Concept: '#3b82f6', Prototype: '#f59e0b', Launched: '#a855f7' };

const FILTER_TABS = [
  { key: 'trending', label: 'Trending', icon: TrendingUp },
  { key: 'recent', label: 'Recent', icon: Clock },
];

const EMPTY_FORM = { name: '', tagline: '', stage: 'Concept', description: '', problem: '', solution: '', audience: '', tech: '', isPrivate: false };

export default function Ideas() {
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);
  const profile = useStore((s) => s.profile);
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
  const [editingId, setEditingId] = useState(null); // when set, form submits an update
  const [creating, setCreating] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [vault, setVault] = useState({ versions: [], members: [], loaded: false });
  const [vaultBusy, setVaultBusy] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteUsers, setInviteUsers] = useState([]);
  const [inviteLoaded, setInviteLoaded] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState([]);

  useEffect(() => {
    async function fetchIdeas() {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('ideas')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);
        if (error) throw error;
        const rows = mapRows(data || []);
        const commentRows = [];
        const ids = rows.map((r) => r.id);
        if (ids.length) {
          const { data: commentsData, error: commentsError } = await supabase
            .from('idea_comments')
            .select('*')
            .in('idea_id', ids)
            .order('created_at', { ascending: true });
          if (commentsError) throw commentsError;
          commentRows.push(...mapRows(commentsData || []));
        }
        const items = rows.map((row) => ({
          id: row.id,
          name: row.title || '',
          tagline: row.summary || '',
          stage: row.stage || '',
          description: row.description || '',
          audience: row.audience || '',
          tech: row.tech || '',
          problem: row.problem || '',
          solution: row.solution || '',
          authorKey: row.authorKey,
          authorName: row.authorName,
          authorAvatar: row.authorAvatar,
          isPrivate: !!row.isPrivate,
          upvotedBy: row.upvotes || [],
          votes: 0,
          createdAt: row.createdAt,
          comments: commentRows
            .filter((c) => c.ideaId === row.id)
            .map((c) => ({
              id: c.id,
              authorKey: c.authorKey,
              authorName: c.authorName,
              authorAvatar: c.authorAvatar,
              text: c.text,
              time: '',
              createdAt: c.createdAt,
              likes: (c.likedBy || []).length,
            })),
        }));
        setIdeas(items);
      } catch (err) {
        console.error('Failed to fetch ideas:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchIdeas();
  }, []);

  // Load vault versions + members when the author opens their own idea.
  useEffect(() => {
    if (!openId || !profile?.id) {
      setVault({ versions: [], members: [], loaded: false });
      setInviteUsers([]);
      setInviteLoaded(false);
      setInviteOpen(false);
      return undefined;
    }
    const idea = ideas.find((i) => i.id === openId);
    if (!idea || idea.authorKey !== profile.id) {
      setVault({ versions: [], members: [], loaded: true });
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const s = getSupabase();
        if (!s) return;
        const [vr, mr] = await Promise.all([
          s.from('idea_versions').select('*').eq('idea_id', openId).order('version', { ascending: false }).limit(20),
          s.from('idea_vault_members').select('*').eq('idea_id', openId).order('created_at', { ascending: false }).limit(50),
        ]);
        if (cancelled) return;
        setVault({
          versions: mapRows(vr.data || []),
          members: mapRows(mr.data || []),
          loaded: true,
        });
      } catch (e) {
        if (!cancelled) setVault((v) => ({ ...v, loaded: true }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openId, profile?.id, ideas]);

  // Resolve display names for vault members.
  useEffect(() => {
    if (!vault.members?.length) {
      setMemberProfiles([]);
      return;
    }
    let cancelled = false;
    fetchUsersByIds(vault.members.map((m) => m.userId)).then((list) => {
      if (!cancelled) setMemberProfiles(list);
    });
    return () => {
      cancelled = true;
    };
  }, [vault.members]);

  // Load the invite picker list once.
  useEffect(() => {
    if (!inviteOpen || inviteLoaded) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const s = getSupabase();
        if (!s) return;
        const { data, error } = await s
          .from('profiles')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        if (cancelled) return;
        setInviteUsers(mapRows(data || []).filter((u) => u && u.status !== 'suspended'));
      } catch {
      } finally {
        if (!cancelled) setInviteLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteOpen, inviteLoaded]);

  const openIdea = useCallback((id) => { vibrate('light'); setOpenId(id); }, [vibrate]);
  const closeIdea = useCallback(() => {
    vibrate('light');
    setOpenId(null);
    setNewComment('');
    setVault({ versions: [], members: [], loaded: false });
    setInviteOpen(false);
    setInviteSearch('');
  }, [vibrate]);

  async function handleSaveVersion() {
    if (!openIdeaData || !profile?.id || vaultBusy) return;
    setVaultBusy(true);
    try {
      const v = await saveIdeaVersion(openIdeaData, profile.id);
      showToast(`Version ${v} saved`);
      const list = await fetchIdeaVersions(openIdeaData.id);
      setVault((prev) => ({ ...prev, versions: list }));
    } catch (e) {
      showToast(e?.message?.includes('relation') || e?.message?.includes('column')
        ? 'Run migration 0012 in Supabase first'
        : 'Could not save version');
    } finally {
      setVaultBusy(false);
    }
  }

  async function handleRestoreVersion(versionRow) {
    if (!openIdeaData || !profile?.id || vaultBusy) return;
    if (!window.confirm(`Restore version ${versionRow.version}? This overwrites the current idea fields.`)) return;
    setVaultBusy(true);
    try {
      await restoreIdeaVersion(openIdeaData, versionRow);
      setIdeas((prev) => prev.map((i) => {
        if (i.id !== openIdeaData.id) return i;
        const body = versionRow.body || {};
        return {
          ...i,
          name: versionRow.title || i.name,
          tagline: versionRow.summary || i.tagline,
          description: body.description || i.description,
          problem: body.problem || i.problem,
          solution: body.solution || i.solution,
          audience: body.audience || i.audience,
          tech: body.tech || i.tech,
          stage: body.stage || i.stage,
        };
      }));
      showToast(`Restored version ${versionRow.version}`);
    } catch (e) {
      showToast('Could not restore version');
    } finally {
      setVaultBusy(false);
    }
  }

  async function handleInviteMember(u) {
    if (!openIdeaData || !profile?.id || vaultBusy) return;
    if (vault.members.some((m) => m.userId === u.id)) {
      showToast('Already has access');
      return;
    }
    setVaultBusy(true);
    try {
      await addVaultMember(openIdeaData.id, u.id, profile.id);
      setVault((prev) => ({
        ...prev,
        members: [{ ideaId: openIdeaData.id, userId: u.id, addedBy: profile.id }, ...prev.members],
      }));
      showToast(`${u.name || 'Member'} can now see this idea`);
      setInviteOpen(false);
      setInviteSearch('');
    } catch (e) {
      showToast(e?.message?.includes('relation') ? 'Run migration 0012 in Supabase first' : 'Could not invite member');
    } finally {
      setVaultBusy(false);
    }
  }

  async function handleRemoveMember(userId) {
    if (!openIdeaData || !profile?.id || vaultBusy) return;
    setVaultBusy(true);
    try {
      await removeVaultMember(openIdeaData.id, userId);
      setVault((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.userId !== userId),
      }));
      showToast('Access removed');
    } catch (e) {
      showToast('Could not remove member');
    } finally {
      setVaultBusy(false);
    }
  }

  const handleVote = useCallback(async (ideaId) => {
    if (!profile?.id) { showToast('Please sign in to vote'); return; }
    vibrate('medium');
    const idea = ideas.find((i) => i.id === ideaId);
    if (!idea) return;
    const upvotedBy = idea.upvotedBy || [];
    const isUpvoted = upvotedBy.includes(profile.id);
    try {
      const { error } = await getSupabase().rpc('array_toggle_self', {
        p_table: 'ideas',
        p_id: ideaId,
        p_column: 'upvotes',
      });
      if (error) throw error;
      setIdeas((prev) => prev.map((i) => {
        if (i.id !== ideaId) return i;
        const updated = isUpvoted
          ? (i.upvotedBy || []).filter((id) => id !== profile.id)
          : [...(i.upvotedBy || []), profile.id];
        return { ...i, upvotedBy: updated };
      }));
    } catch (err) {
      console.error('Vote failed:', err);
    }
  }, [profile, ideas, vibrate, showToast]);

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || !openId) return;
    if (!profile?.id) { showToast('Please sign in to comment'); return; }
    vibrate('light');
    setCommenting(true);
    try {
      const comment = {
        id: `c_${Date.now()}`,
        authorKey: profile.id,
        authorName: profile.name,
        authorAvatar: profile.avatar,
        text: newComment.trim(),
        time: 'Just now',
        // Real timestamp so the label ages; `time` kept for legacy comments.
        createdAt: Date.now(),
        likes: 0,
      };
      const { error } = await getSupabase()
        .from('idea_comments')
        .insert(toRow({
          id: comment.id,
          ideaId: openId,
          authorKey: profile.id,
          authorName: profile.name,
          authorAvatar: profile.avatar || null,
          text: comment.text,
        }));
      if (error) throw error;
      setIdeas((prev) => prev.map((idea) => {
        if (idea.id !== openId) return idea;
        return { ...idea, comments: [...(idea.comments || []), comment] };
      }));
      setNewComment('');
    } catch (err) {
      console.error('Comment failed:', err);
      showToast('Failed to add comment.');
    } finally {
      setCommenting(false);
    }
  }, [newComment, openId, profile, vibrate, showToast]);

  const handleLikeComment = useCallback((ideaId, commentId) => {
    vibrate('light');
    setCommentLikes((prev) => ({ ...prev, [`${ideaId}_${commentId}`]: !prev[`${ideaId}_${commentId}`] }));
  }, [vibrate]);

  async function handleSubmitIdea() {
    if (!form.name.trim() || !form.tagline.trim() || !form.description.trim()) {
      showToast('Please fill in name, tagline, and description'); return;
    }
    if (!profile?.id) { showToast('Please sign in to submit ideas'); return; }
    setCreating(true);
    try {
      if (editingId) {
        // Edit: update the row in place (RLS: ideas_update_own allows the author).
        const { error } = await getSupabase()
          .from('ideas')
          .update(toRow({
            title: form.name.trim(),
            summary: form.tagline.trim(),
            stage: form.stage,
            description: form.description.trim(),
            problem: form.problem.trim(),
            solution: form.solution.trim(),
            audience: form.audience.trim(),
            tech: form.tech.trim(),
            isPrivate: !!form.isPrivate,
          }))
          .eq('id', editingId);
        if (error) throw error;
        setIdeas((prev) => prev.map((i) => {
          if (i.id !== editingId) return i;
          return {
            ...i,
            name: form.name.trim(),
            tagline: form.tagline.trim(),
            stage: form.stage,
            description: form.description.trim(),
            problem: form.problem.trim(),
            solution: form.solution.trim(),
            audience: form.audience.trim(),
            tech: form.tech.trim(),
            isPrivate: !!form.isPrivate,
          };
        }));
        vibrate('medium');
        showToast('Idea updated!');
        setForm(EMPTY_FORM); setEditingId(null); setShowForm(false);
        return;
      }
      const ideaId = randomId();
      const { error } = await getSupabase()
        .from('ideas')
        .insert(toRow({
          id: ideaId,
          title: form.name.trim(),
          summary: form.tagline.trim(),
          stage: form.stage,
          description: form.description.trim(),
          problem: form.problem.trim(),
          solution: form.solution.trim(),
          audience: form.audience.trim(),
          tech: form.tech.trim(),
          authorKey: profile.id,
          authorName: profile.name,
          authorAvatar: profile.avatar || null,
          isPrivate: !!form.isPrivate,
          upvotes: [],
        }));
      if (error) throw error;
      const newIdea = {
        id: ideaId,
        name: form.name.trim(),
        tagline: form.tagline.trim(),
        stage: form.stage,
        description: form.description.trim(),
        problem: form.problem.trim(),
        solution: form.solution.trim(),
        audience: form.audience.trim(),
        tech: form.tech.trim(),
        authorKey: profile.id,
        authorName: profile.name,
        authorAvatar: profile.avatar,
        isPrivate: !!form.isPrivate,
        upvotedBy: [],
        votes: 0,
        comments: [],
        createdAt: new Date().toISOString().slice(0, 10),
      };
      vibrate('medium');
      setIdeas((prev) => [newIdea, ...prev]);
      setForm(EMPTY_FORM); setShowForm(false);
      showToast(form.isPrivate ? 'Idea saved to your vault (private)' : 'Idea published!');
    } catch (err) {
      console.error('Failed to submit idea:', err);
      showToast(editingId ? 'Failed to update idea.' : 'Failed to publish idea.');
    } finally {
      setCreating(false);
    }
  }

  function startEditIdea(idea) {
    if (!idea || idea.authorKey !== profile?.id) return;
    setForm({
      name: idea.name || '',
      tagline: idea.tagline || '',
      stage: idea.stage || 'Concept',
      description: idea.description || '',
      problem: idea.problem || '',
      solution: idea.solution || '',
      audience: idea.audience || '',
      tech: idea.tech || '',
      isPrivate: !!idea.isPrivate,
    });
    setEditingId(idea.id);
    setShowForm(true);
  }

  async function handleDeleteIdea(idea) {
    if (!idea || idea.authorKey !== profile?.id || vaultBusy) return;
    if (!window.confirm(`Delete "${idea.name}"? This cannot be undone.`)) return;
    setVaultBusy(true);
    try {
      const { error } = await getSupabase().from('ideas').delete().eq('id', idea.id);
      if (error) throw error;
      setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
      showToast('Idea deleted');
      if (openId === idea.id) closeIdea();
    } catch (e) {
      showToast('Could not delete idea');
    } finally {
      setVaultBusy(false);
    }
  }

  const getVote = (ideaId) => {
    const idea = ideas.find((i) => i.id === ideaId);
    if (!idea) return false;
    return (idea.upvotedBy || []).includes(profile?.id);
  };

  const getVoteCount = (idea) => {
    return (idea.upvotedBy || []).length || idea.votes || 0;
  };

  const sortedIdeas = [...ideas].sort((a, b) => {
    if (filter === 'trending') return getVoteCount(b) - getVoteCount(a);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const openIdeaData = ideas.find((i) => i.id === openId);
  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  function handleShareIdea(idea) {
    vibrate('light');
    const url = `${window.location.origin}/ideas`;
    if (navigator.share) {
      navigator.share({ title: idea.name, text: `${idea.name} — ${idea.tagline || ''}`, url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast('Idea link copied!'));
    } else {
      showToast('Idea link copied!');
    }
  }

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
              const voteCount = getVoteCount(idea);
              const comments = idea.comments || [];
              return (
                <div key={idea.id} className="glass-card p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {idea.isPrivate ? <Lock size={12} className="flex-none text-gold" /> : null}
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
                      <span className="text-[9px] text-text2">{typeof idea.createdAt === 'string' ? idea.createdAt : ''}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-text2">
                      <span className="flex items-center gap-1"><MessageCircle size={11} /> {comments.length}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex items-center rounded-xl border border-line bg-[rgba(255,255,255,.03)]">
                      <button onClick={() => handleVote(idea.id)} className={`flex items-center gap-1 rounded-l-xl px-3 py-2 transition-all ${voted ? 'text-[#D9AC3D]' : 'text-text2 hover:text-gold-hi'}`}><ChevronUp size={14} /></button>
                      <span className="border-x border-line px-2 py-2 text-[10px] font-bold text-text2">{voteCount}</span>
                      <button onClick={() => handleVote(idea.id)} className={`flex items-center gap-1 rounded-r-xl px-3 py-2 transition-all ${voted ? 'text-brandred' : 'text-text2 hover:text-brandred'}`}><ChevronDown size={14} /></button>
                    </div>
                    <button onClick={() => openIdea(idea.id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2.5 text-[10px] font-bold text-gold-hi"><Eye size={12} /> View</button>
                    <button onClick={() => handleShareIdea(idea)} className="rounded-xl border border-line p-2.5 text-text2 transition-colors hover:text-gold-hi"><Share2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-line bg-[rgba(217,172,61,.05)] p-4">
          <div className="flex items-center gap-2 text-[12px] font-extrabold"><Lock size={15} className="text-gold" /> Idea Vault</div>
          <p className="mt-1 text-[10.5px] leading-5 text-text2">Keep ideas private, track versions and invite only the people you trust.</p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[9px] font-bold text-gold">Live — toggle "Private" when submitting</div>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#020202]">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <button onClick={() => { vibrate('light'); setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }} className="p-1 text-text2"><X size={20} /></button>
              <span className="text-[13px] font-extrabold">{editingId ? 'Edit Idea' : 'Submit Idea'}</span>
              <button onClick={handleSubmitIdea} disabled={creating} className="rounded-lg bg-gold-grad px-3 py-1.5 text-[10px] font-black text-[#171100] disabled:opacity-50">{creating ? (editingId ? 'Saving...' : 'Publishing...') : (editingId ? 'Save' : 'Publish')}</button>
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
              <button
                onClick={() => { vibrate('light'); updateField('isPrivate', !form.isPrivate); }}
                className={`mt-4 flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all ${form.isPrivate ? 'border-gold/40 bg-gold/10' : 'border-line bg-[rgba(255,255,255,.03)]'}`}
              >
                <Lock size={16} className={`flex-none ${form.isPrivate ? 'text-gold' : 'text-text3'}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold">Private (Idea Vault)</div>
                  <div className="text-[10px] text-text2">Only you and founders you invite can see it</div>
                </div>
                <div className={`h-5 w-9 flex-none rounded-full transition-all ${form.isPrivate ? 'bg-gold' : 'bg-line'}`}>
                  <div className={`h-4 w-4 rounded-full bg-white transition-transform ${form.isPrivate ? 'translate-x-4.5 ml-0.5 mt-0.5' : 'ml-0.5 mt-0.5'}`} />
                </div>
              </button>
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
                {openIdeaData.isPrivate ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[9px] font-bold text-gold">
                    <Lock size={10} /> Private
                  </span>
                ) : null}
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
                  <span className="border-x border-line px-3 py-2.5 text-[11px] font-bold text-text2">{getVoteCount(openIdeaData)}</span>
                  <button onClick={() => handleVote(openIdeaData.id)} className={`flex items-center gap-1 rounded-r-xl px-4 py-2.5 transition-all ${getVote(openIdeaData.id) ? 'text-brandred' : 'text-text2 hover:text-brandred'}`}><ChevronDown size={16} /></button>
                </div>
                <button onClick={() => handleShareIdea(openIdeaData)} className="rounded-xl border border-line p-2.5 text-text2 transition-colors hover:text-gold-hi"><Share2 size={15} /></button>
                <button onClick={() => { vibrate('light'); router.push('/match/find_programmer'); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-grad py-2.5 text-[11px] font-black text-[#171100]">Build team <ArrowRight size={13} /></button>
              </div>

              {profile?.id && openIdeaData.authorKey === profile.id ? (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => { startEditIdea(openIdeaData); closeIdea(); }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-card py-2.5 text-[11px] font-bold text-text2 active:bg-white/5"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteIdea(openIdeaData)}
                    disabled={vaultBusy}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-brandred/30 bg-brandred/10 py-2.5 text-[11px] font-bold text-brandred active:bg-white/5 disabled:opacity-50"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              ) : null}

              {profile?.id && openIdeaData.authorKey === profile.id ? (
                <div className="mt-5 rounded-2xl border border-gold/25 bg-gold/[0.04] p-3.5">
                  <div className="flex items-center gap-2 text-[12px] font-extrabold text-gold-hi">
                    <Lock size={13} /> Idea Vault
                    {openIdeaData.isPrivate ? <span className="ml-auto rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[9px] font-bold text-gold">Private</span> : null}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button
                      onClick={handleSaveVersion}
                      disabled={vaultBusy}
                      className="flex items-center gap-1.5 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-[11px] font-bold text-gold-hi disabled:opacity-50"
                    >
                      <Save size={12} /> Save version
                    </button>
                    <button
                      onClick={() => { setInviteOpen((v) => !v); setInviteSearch(''); }}
                      className="flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-2 text-[11px] font-bold text-text2"
                    >
                      <UserPlus size={12} /> Invite
                    </button>
                  </div>
                  {inviteOpen ? (
                    <div className="mt-2.5">
                      <input
                        autoFocus
                        value={inviteSearch}
                        onChange={(e) => setInviteSearch(e.target.value)}
                        placeholder="Search founders to invite..."
                        className="w-full rounded-xl border border-line bg-white/[0.04] px-3 py-2 text-[11px] text-text1 outline-none placeholder:text-text3 focus:border-gold/40"
                      />
                      <div className="mt-1.5 max-h-36 space-y-1 overflow-y-auto">
                        {inviteUsers
                          .filter((u) => {
                            if (!u || u.id === profile?.id) return false;
                            if (vault.members.some((m) => m.userId === u.id)) return false;
                            if (inviteSearch && !(u.name || '').toLowerCase().includes(inviteSearch.toLowerCase())) return false;
                            return true;
                          })
                          .slice(0, 12)
                          .map((u) => (
                            <button
                              key={u.id}
                              onClick={() => handleInviteMember(u)}
                              disabled={vaultBusy}
                              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left active:bg-white/5 disabled:opacity-50"
                            >
                              <Avatar src={u.avatar || null} name={u.name || 'Member'} size={28} />
                              <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{u.name || 'Member'}</span>
                              <span className="flex-none text-[10px] font-bold text-gold">Add</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  ) : null}
                  {vault.members.length ? (
                    <div className="mt-2.5 space-y-1">
                      {vault.members.map((m) => {
                        const mp = memberProfiles.find((p) => p.id === m.userId);
                        return (
                          <div key={m.userId} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
                            <Avatar src={mp?.avatar || null} name={mp?.name || 'Member'} size={26} />
                            <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold">{mp?.name || m.userId}</span>
                            <button
                              onClick={() => handleRemoveMember(m.userId)}
                              disabled={vaultBusy}
                              className="flex-none text-[10px] font-bold text-brandred disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  {vault.versions.length ? (
                    <div className="mt-2.5 space-y-1 border-t border-gold/15 pt-2.5">
                      {vault.versions.map((v) => (
                        <div key={v.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5">
                          <span className="flex-none rounded-full border border-line bg-card px-2 py-0.5 text-[9px] font-bold text-text2">v{v.version}</span>
                          <span className="min-w-0 flex-1 truncate text-[11px] text-text2">{v.title || '(untitled)'}</span>
                          <button
                            onClick={() => handleRestoreVersion(v)}
                            disabled={vaultBusy}
                            className="flex flex-none items-center gap-1 text-[10px] font-bold text-gold-hi disabled:opacity-50"
                          >
                            <RotateCcw size={10} /> Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : vault.loaded ? (
                    <p className="mt-2 text-[10px] text-text3">No versions yet — save one to snapshot this idea.</p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5 border-t border-line pt-4">
                <h3 className="flex items-center gap-1.5 text-[12px] font-extrabold text-gold-hi"><MessageCircle size={13} /> Comments ({openIdeaData.comments?.length || 0})</h3>
                <div className="mt-3 flex items-center gap-2">
                  <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !commenting && handleAddComment()} placeholder="Add a comment..." className="flex-1 rounded-xl border border-line bg-[rgba(255,255,255,.03)] px-3 py-2.5 text-[11px] text-text placeholder:text-text2 focus:border-gold/50 focus:outline-none" />
                  <button onClick={handleAddComment} disabled={!newComment.trim() || commenting} className="rounded-xl bg-gold-grad p-2.5 text-[#171100] transition-opacity disabled:opacity-30"><Send size={14} /></button>
                </div>
                <div className="mt-3 space-y-3">
                  {(openIdeaData.comments || []).map((comment) => {
                    const liked = commentLikes[`${openId}_${comment.id}`];
                    return (
                      <div key={comment.id} className="rounded-xl bg-[rgba(255,255,255,.03)] p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-gold/20 flex items-center justify-center"><span className="text-[9px] font-bold text-gold">{comment.authorName?.[0] || '?'}</span></div>
                          <span className="text-[10px] font-bold text-text">{comment.authorName || 'Anonymous'}</span>
                          <span className="text-[9px] text-text2">· {formatPostTime(comment.createdAt) || comment.time}</span>
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
