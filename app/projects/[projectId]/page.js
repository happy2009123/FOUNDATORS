'use client';

// ─────────────────────────────────────────────────────────────
// PROJECT DETAIL — Build With Me 2.0 home for one project.
// Apply to join (owner accepts), follow, ask questions, see
// members. Live via snapshots; membership never self-granted.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Loader2, Users, UserPlus, UserCheck, Send, X, Check, MessageCircle,
  Mic, KanbanSquare, Target, Trophy, Briefcase, Link2, HelpCircle,
  Pencil, Trash2,
} from 'lucide-react';
import SubpageHeader from '@/components/SubpageHeader';
import Avatar from '@/components/Avatar';
import AuthSkeleton from '@/components/AuthSkeleton';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { getSupabase } from '@/lib/supabase/client';
import { subscribeQuery } from '@/lib/supabase/realtime';
import { mapRow } from '@/lib/supabase/db';
import { timeAgo } from '@/lib/admin';
import {
  subscribeProject,
  subscribeProjectApplications,
  subscribeProjectQuestions,
  toggleProjectFollow,
  applyToProject,
  withdrawApplication,
  decideApplication,
  addProjectQuestion,
  fetchUsersByIds,
  isProjectMember,
  updateProjectDetails,
  deleteProject,
  PROJECT_CATEGORIES,
  PROJECT_STAGES,
} from '@/lib/projects';

export default function ProjectDetailPage() {
  const ready = useRequireAuth();
  const { projectId } = useParams();
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const showToast = useStore((s) => s.showToast);

  const [project, setProject] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [applications, setApplications] = useState([]);
  const [myApplication, setMyApplication] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [members, setMembers] = useState([]);
  const [applyOpen, setApplyOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [qText, setQText] = useState('');
  const [busy, setBusy] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  // Owner edit/delete (previously absent entirely — the create form even
  // promises "You can edit details later", but no such UI existed).
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', stage: 'Idea', category: 'Other' });
  const [editBusy, setEditBusy] = useState(false);
  const [editDeleteConfirm, setEditDeleteConfirm] = useState(false);

  // Disarm the delete confirmation if the owner hesitates.
  useEffect(() => {
    if (!editDeleteConfirm) return undefined;
    const t = setTimeout(() => setEditDeleteConfirm(false), 4000);
    return () => clearTimeout(t);
  }, [editDeleteConfirm]);

  const isOwner = Boolean(project && profile && project.ownerUid === profile.id);
  const isMember = isProjectMember(project, profile?.id);
  const following = Boolean(
    profile && project && Array.isArray(project.followers) && project.followers.includes(profile.id)
  );

  useEffect(() => {
    setLoadError(false);
    const unsub = subscribeProject(projectId, (p, err) => {
      setProject(p);
      setLoadError(Boolean(err));
      setLoaded(true);
    });
    return unsub;
  }, [projectId, retryTick]);

  useEffect(() => {
    if (!isOwner) {
      setApplications([]);
      return undefined;
    }
    const unsub = subscribeProjectApplications(projectId, setApplications);
    return unsub;
  }, [projectId, isOwner]);

  // LIVE subscription to the applicant's own application doc — the old
  // code read it once with getDoc, so a later owner decision (or a
  // withdraw elsewhere) never showed up, and there was no way to notice a
  // decline and re-apply. Doc id == applicant uid; field is `uid`.
  useEffect(() => {
    if (isOwner || !profile?.id || !projectId) {
      setMyApplication(null);
      return undefined;
    }
    let alive = true;
    let unsub = null;
    (async () => {
      try {
        if (!getSupabase()) {
          if (alive) setMyApplication(null);
          return;
        }
        unsub = subscribeQuery({
          key: `my-application:${projectId}:${profile.id}`,
          table: 'project_applications',
          filter: `project_id=eq.${projectId}`,
          queryFn: async () => {
            const { data, error } = await getSupabase()
              .from('project_applications')
              .select('*')
              .eq('project_id', projectId)
              .eq('user_id', profile.id)
              // Withdrawn rows stay in the table (no DELETE policy) but count
              // as "no application" — the old code deleted the doc outright.
              .neq('status', 'withdrawn')
              .limit(1);
            if (error) throw error;
            const row = mapRow((data || [])[0]);
            return row ? { ...row, uid: row.userId } : null;
          },
          onData: (row) => {
            if (alive) setMyApplication(row);
          },
          onError: () => {
            if (alive) setMyApplication(null);
          },
        });
        if (!alive && unsub) { unsub(); unsub = null; }
      } catch {
        if (alive) setMyApplication(null);
      }
    })();
    return () => {
      alive = false;
      if (unsub) { unsub(); unsub = null; }
    };
  }, [projectId, isOwner, profile?.id]);

  useEffect(() => {
    const unsub = subscribeProjectQuestions(projectId, setQuestions);
    return unsub;
  }, [projectId]);

  const memberKey = Array.isArray(project?.members) ? project.members.join(',') : '';
  useEffect(() => {
    let alive = true;
    if (memberKey) {
      fetchUsersByIds(memberKey.split(',')).then((u) => { if (alive) setMembers(u); });
    } else {
      setMembers([]);
    }
    return () => { alive = false; };
  }, [memberKey]);

  async function toggleFollow() {
    if (!profile) return;
    const next = !following;
    setFollowBusy(true);
    try {
      await toggleProjectFollow(projectId, profile.id, next);
      setProject((p) =>
        p
          ? {
              ...p,
              followers: next
                ? [...(p.followers || []), profile.id]
                : (p.followers || []).filter((f) => f !== profile.id),
            }
          : p
      );
    } catch (e) {
      showToast('Could not update follow');
    } finally {
      setFollowBusy(false);
    }
  }

  async function sendApplication() {
    if (!profile) return;
    if (!msg.trim()) {
      showToast('Add a short message first');
      return;
    }
    setBusy(true);
    try {
      await applyToProject(projectId, profile, msg);
      setMyApplication({
        uid: profile.id,
        status: 'pending',
        message: msg,
        createdAt: { toDate: () => new Date() },
      });
      setMsg('');
      setApplyOpen(false);
      showToast('Application sent');
    } catch (e) {
      showToast('Could not send the application');
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!profile) return;
    setBusy(true);
    try {
      await withdrawApplication(projectId, profile.id);
      setMyApplication(null);
      showToast('Application withdrawn');
    } catch (e) {
      showToast('Could not withdraw');
    } finally {
      setBusy(false);
    }
  }

  // Declined applicants were stuck: the status chip was a dead end with no
  // re-apply control, and applyToProject()'s setDoc on the old doc was
  // permission-denied anyway (owner-only update). Clear the declined doc
  // first, then open the normal application form.
  async function reapply() {
    if (!profile) return;
    setBusy(true);
    try {
      await withdrawApplication(projectId, profile.id);
      setMyApplication(null);
      setApplyOpen(true);
    } catch (e) {
      showToast('Could not reset your application');
    } finally {
      setBusy(false);
    }
  }

  function openEdit() {
    setEditForm({
      name: project?.name || '',
      description: project?.description || '',
      stage: project?.stage || 'Idea',
      category: project?.category || 'Other',
    });
    setEditDeleteConfirm(false);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editForm.name.trim()) {
      showToast('Project name is required');
      return;
    }
    setEditBusy(true);
    try {
      await updateProjectDetails(projectId, editForm);
      setEditOpen(false);
      showToast('Project updated');
    } catch (e) {
      showToast('Could not save changes');
    } finally {
      setEditBusy(false);
    }
  }

  // Two-tap delete so a stray tap can never wipe the project.
  async function handleDeleteClick() {
    if (!editDeleteConfirm) {
      setEditDeleteConfirm(true);
      return;
    }
    setEditBusy(true);
    try {
      await deleteProject(projectId);
      showToast('Project deleted');
      router.replace('/projects');
    } catch (e) {
      showToast('Could not delete the project');
      setEditDeleteConfirm(false);
    } finally {
      setEditBusy(false);
    }
  }

  async function decide(app, decision) {
    setBusy(true);
    try {
      await decideApplication(projectId, profile, app, decision, project?.name);
      showToast(decision === 'accepted' ? 'Member added' : 'Application declined');
    } catch (e) {
      showToast('Could not update the application');
    } finally {
      setBusy(false);
    }
  }

  async function ask() {
    if (!profile || !qText.trim()) return;
    setBusy(true);
    try {
      await addProjectQuestion(projectId, profile, qText);
      setQText('');
    } catch (e) {
      showToast('Could not post the question');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <AuthSkeleton />;

  if (loaded && loadError && !project) {
    // A failed subscription used to fall through to a permanent spinner (the
    // error callback never set `loaded`). Show an honest, retryable state.
    return (
      <div className="app-shell flex min-h-0 flex-1 flex-col">
        <SubpageHeader title="Project" />
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="text-4xl">📡</div>
          <h2 className="mt-3 text-[17px] font-extrabold">Couldn&apos;t load this project</h2>
          <p className="mt-1.5 text-[12px] text-text2">
            Check your connection and try again.
          </p>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => {
                setLoaded(false);
                setRetryTick((t) => t + 1);
              }}
              className="rounded-full bg-gold-grad px-5 py-2.5 text-[12.5px] font-bold text-[#171100]"
            >
              Try again
            </button>
            <button
              onClick={() => router.replace('/projects')}
              className="rounded-full border border-linesoft px-5 py-2.5 text-[12.5px] font-bold text-text2"
            >
              Back to projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loaded && !project) {
    return (
      <div className="app-shell flex min-h-0 flex-1 flex-col">
        <SubpageHeader title="Project" />
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="text-4xl">🧭</div>
          <h2 className="mt-3 text-[17px] font-extrabold">Project not found</h2>
          <p className="mt-1.5 text-[12px] text-text2">It may have been removed by its owner.</p>
          <button
            onClick={() => router.replace('/projects')}
            className="mt-5 rounded-full bg-gold-grad px-5 py-2.5 text-[12.5px] font-bold text-[#171100]"
          >
            Back to projects
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="app-shell flex min-h-0 flex-1 flex-col">
        <SubpageHeader title="Project" />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 size={22} className="animate-spin text-gold" />
        </div>
      </div>
    );
  }

  const pending = applications.filter((a) => a.status === 'pending');
  const decided = applications.filter((a) => a.status !== 'pending');
  const progress = Math.max(0, Math.min(100, Number(project.progress) || 0));

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <SubpageHeader
        title="Project"
        right={
          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href).catch(() => {});
              showToast('Link copied');
            }}
            className="flex h-[44px] w-[44px] items-center justify-center text-gold-hi"
            aria-label="Share project"
          >
            <Link2 size={18} />
          </button>
        }
      />
      <div className="no-scrollbar flex-1 overflow-y-auto px-[18px] pb-8">
        {/* ── header ─────────────────────────────────────────── */}
        <div className="mt-4 rounded-2xl border border-linesoft bg-card p-4">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-gold/10 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-gold-hi">
              {project.stage || 'Building'}
            </span>
            {project.category ? (
              <span className="rounded-full border border-linesoft px-2.5 py-1 text-[10.5px] font-bold text-text2">
                {project.category}
              </span>
            ) : null}
            <span className="rounded-full border border-brandgreen/40 px-2.5 py-1 text-[10.5px] font-bold text-brandgreen">
              {project.status === 'building' ? 'Building' : project.status || 'Building'}
            </span>
          </div>

          <h1 className="mt-3 text-[20px] font-extrabold leading-tight">{project.name}</h1>
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-text2">
            {project.description}
          </p>

          <button
            onClick={() => router.push(`/profile/${project.ownerUid}`)}
            className="mt-3 flex w-full items-center gap-2.5 rounded-xl bg-white/[0.03] p-2.5 text-left active:bg-white/[0.06]"
          >
            <Avatar src={project.ownerAvatar} name={project.ownerName} size={34} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-extrabold">{project.ownerName}</div>
              <div className="text-[10.5px] text-text3">Project owner</div>
            </div>
            <UserCheck size={15} className="flex-none text-gold" />
          </button>

          <div className="mt-3">
            <div className="flex items-center justify-between text-[10.5px] font-bold text-text3">
              <span>Progress</span>
              <span className="text-gold-hi">{progress}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full bg-gold-grad transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat icon={Users} value={members.length || project.membersCount || 1} label="Members" />
            <Stat icon={UserPlus} value={(project.followers || []).length} label="Followers" />
            <Stat icon={MessageCircle} value={questions.length} label="Questions" />
          </div>

          {/* actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={toggleFollow}
              disabled={followBusy || !profile || isOwner}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[12.5px] font-bold active:scale-[0.98] disabled:opacity-40 ${
                following
                  ? 'border-gold bg-gold/15 text-gold-hi'
                  : 'border-linesoft text-text1'
              }`}
            >
              {following ? <UserCheck size={15} /> : <UserPlus size={15} />}
              {following ? 'Following' : 'Follow'}
            </button>

            {isOwner ? (
              <>
                <button
                  onClick={() => router.push(`/copilot?project=${projectId}`)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-grad py-2.5 text-[12.5px] font-extrabold text-[#171100] active:scale-[0.98]"
                >
                  <KanbanSquare size={15} /> Task board
                </button>
                <button
                  onClick={() => (editOpen ? setEditOpen(false) : openEdit())}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-gold/40 px-4 py-2.5 text-[12.5px] font-bold text-gold-hi active:scale-[0.98]"
                >
                  <Pencil size={14} /> {editOpen ? 'Close' : 'Edit'}
                </button>
              </>
            ) : isMember ? (
              <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-brandgreen/40 bg-brandgreen/10 py-2.5 text-[12.5px] font-bold text-brandgreen">
                <UserCheck size={15} /> On the team
              </span>
            ) : myApplication?.status === 'pending' ? (
              <div className="flex flex-1 gap-2">
                <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 py-2.5 text-[12.5px] font-bold text-gold-hi">
                  <Send size={14} /> Applied
                </span>
                <button
                  onClick={withdraw}
                  disabled={busy}
                  className="rounded-xl border border-linesoft px-3 text-[12px] font-bold text-text2 disabled:opacity-40"
                >
                  Undo
                </button>
              </div>
            ) : myApplication?.status === 'declined' ? (
              <div className="flex flex-1 gap-2">
                <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-linesoft py-2.5 text-[12.5px] font-bold text-text3">
                  Application declined
                </span>
                <button
                  onClick={reapply}
                  disabled={busy}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-gold-grad px-4 text-[12.5px] font-extrabold text-[#171100] disabled:opacity-40"
                >
                  Apply again
                </button>
              </div>
            ) : myApplication?.status ? (
              <span className="flex flex-1 items-center justify-center rounded-xl border border-linesoft py-2.5 text-[12.5px] font-bold text-text3">
                Application {myApplication.status}
              </span>
            ) : applyOpen ? null : (
              <button
                onClick={() => setApplyOpen(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-grad py-2.5 text-[12.5px] font-extrabold text-[#171100] active:scale-[0.98]"
              >
                <UserPlus size={15} /> Request to join
              </button>
            )}
          </div>

          {/* owner edit panel */}
          {isOwner && editOpen && (
            <div className="mt-3 space-y-3 rounded-xl border border-gold/30 bg-gold/[0.05] p-3">
              <div>
                <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-text3">Project name</div>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  maxLength={120}
                  className="w-full rounded-xl border border-linesoft bg-white/[0.03] px-3 py-2 text-[13px] font-bold text-white focus:border-gold/50 focus:outline-none"
                />
              </div>
              <div>
                <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-text3">Description</div>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  maxLength={4000}
                  className="w-full resize-none rounded-xl border border-linesoft bg-white/[0.03] px-3 py-2 text-[13px] leading-relaxed text-white focus:border-gold/50 focus:outline-none"
                />
              </div>
              <div>
                <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-text3">Stage</div>
                <div className="flex flex-wrap gap-1.5">
                  {PROJECT_STAGES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditForm((f) => ({ ...f, stage: s }))}
                      className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-colors ${
                        editForm.stage === s
                          ? 'border-gold bg-gold/15 text-gold-hi'
                          : 'border-linesoft text-text2'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-text3">Category</div>
                <div className="flex flex-wrap gap-1.5">
                  {PROJECT_CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditForm((f) => ({ ...f, category: c }))}
                      className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-colors ${
                        editForm.category === c
                          ? 'border-gold bg-gold/15 text-gold-hi'
                          : 'border-linesoft text-text2'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  disabled={editBusy || !editForm.name.trim()}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-grad py-2.5 text-[12.5px] font-extrabold text-[#171100] disabled:opacity-50"
                >
                  {editBusy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save changes
                </button>
                <button
                  onClick={() => setEditOpen(false)}
                  className="rounded-xl border border-linesoft px-4 text-[12.5px] font-bold text-text2"
                >
                  Close
                </button>
              </div>
              <div className="border-t border-linesoft pt-3">
                <button
                  onClick={handleDeleteClick}
                  disabled={editBusy}
                  className={`flex w-full items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[12.5px] font-bold disabled:opacity-50 ${
                    editDeleteConfirm
                      ? 'border-brandred bg-brandred/15 text-brandred'
                      : 'border-brandred/40 text-brandred'
                  }`}
                >
                  <Trash2 size={14} />
                  {editDeleteConfirm ? 'Tap again to permanently delete' : 'Delete project'}
                </button>
              </div>
            </div>
          )}

          {applyOpen && !isMember && !myApplication && !isOwner ? (
            <div className="mt-3 rounded-xl border border-gold/30 bg-gold/[0.05] p-3">
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Why do you want to join? What would you bring?"
                rows={3}
                maxLength={1000}
                className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-white placeholder:text-text3 focus:outline-none"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={sendApplication}
                  disabled={busy || !msg.trim()}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-grad py-2.5 text-[12.5px] font-extrabold text-[#171100] disabled:opacity-50"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Send application
                </button>
                <button
                  onClick={() => setApplyOpen(false)}
                  className="rounded-xl border border-linesoft px-3 text-[12.5px] font-bold text-text2"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── problem / solution ─────────────────────────────── */}
        {project.problem || project.solution ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {project.problem ? (
              <Card title="Problem" icon={HelpCircle}>
                <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-text2">
                  {project.problem}
                </p>
              </Card>
            ) : null}
            {project.solution ? (
              <Card title="Solution" icon={Target}>
                <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-text2">
                  {project.solution}
                </p>
              </Card>
            ) : null}
          </div>
        ) : null}

        {/* ── skills / team / goals ──────────────────────────── */}
        {Array.isArray(project.skillsNeeded) && project.skillsNeeded.length ? (
          <Card title="Skills needed" icon={Briefcase}>
            <div className="flex flex-wrap gap-1.5">
              {project.skillsNeeded.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-gold/10 px-2.5 py-1 text-[11px] font-bold text-gold-hi"
                >
                  {s}
                </span>
              ))}
            </div>
          </Card>
        ) : null}

        {project.teamRequirements ? (
          <Card title="Team requirements" icon={Users}>
            <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-text2">
              {project.teamRequirements}
            </p>
          </Card>
        ) : null}

        {project.goals ? (
          <Card title="Goals" icon={Trophy}>
            <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-text2">
              {project.goals}
            </p>
          </Card>
        ) : null}

        {/* ── members ────────────────────────────────────────── */}
        <Card title={`Team (${members.length || 1})`} icon={Users}>
          <div className="flex flex-col gap-1">
            {(members.length ? members : [{ id: project.ownerUid, name: project.ownerName, avatar: project.ownerAvatar }]).map((m) => (
              <button
                key={m.id}
                onClick={() => router.push(`/profile/${m.id}`)}
                className="flex items-center gap-2.5 rounded-xl p-1.5 text-left active:bg-white/5"
              >
                <Avatar src={m.avatar} name={m.name} size={32} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{m.name}</span>
                {m.id === project.ownerUid ? (
                  <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-extrabold text-gold-hi">
                    Owner
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </Card>

        {/* ── applications (owner only) ──────────────────────── */}
        {isOwner ? (
          <Card title={`Applications (${pending.length})`} icon={UserPlus}>
            {pending.length === 0 ? (
              <p className="text-[12.5px] text-text3">No pending requests right now.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {pending.map((a) => (
                  <div key={a.id} className="rounded-xl border border-linesoft bg-white/[0.03] p-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar src={a.avatar} name={a.name} size={32} />
                      <button
                        onClick={() => router.push(`/profile/${a.uid}`)}
                        className="min-w-0 flex-1 truncate text-left text-[13px] font-extrabold"
                      >
                        {a.name}
                      </button>
                      <span className="text-[10.5px] text-text3">
                        {a.createdAt?.toDate ? timeAgo(a.createdAt) : ''}
                      </span>
                    </div>
                    {a.message ? (
                      <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-text2">
                        “{a.message}”
                      </p>
                    ) : null}
                    <div className="mt-2.5 flex gap-2">
                      <button
                        onClick={() => decide(a, 'accepted')}
                        disabled={busy}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-grad py-2 text-[12px] font-extrabold text-[#171100] disabled:opacity-50"
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button
                        onClick={() => decide(a, 'declined')}
                        disabled={busy}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-linesoft py-2 text-[12px] font-bold text-text2 disabled:opacity-50"
                      >
                        <X size={14} /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {decided.length ? (
              <div className="mt-3 border-t border-linesoft pt-2">
                {decided.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center gap-2 py-1 text-[12px] text-text3">
                    <Avatar src={a.avatar} name={a.name} size={20} />
                    <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    <span
                      className={
                        a.status === 'accepted' ? 'font-bold text-brandgreen' : 'text-text3'
                      }
                    >
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        ) : null}

        {/* ── questions ──────────────────────────────────────── */}
        <Card title={`Questions (${questions.length})`} icon={MessageCircle}>
          {questions.length === 0 ? (
            <p className="text-[12.5px] text-text3">
              No questions yet. Ask anything the owner should clarify for builders.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {questions.map((q) => (
                <div key={q.id} className="flex gap-2.5">
                  <Avatar src={q.authorAvatar} name={q.authorName} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <button
                        onClick={() => router.push(`/profile/${q.authorKey}`)}
                        className="truncate text-[12.5px] font-extrabold"
                      >
                        {q.authorName}
                      </button>
                      <span className="flex-none text-[10.5px] text-text3">
                        {q.createdAt?.toDate ? timeAgo(q.createdAt) : ''}
                      </span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-text2">
                      {q.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex gap-2 border-t border-linesoft pt-3">
            <input
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') ask(); }}
              placeholder={profile ? 'Ask the team a question…' : 'Sign in to ask'}
              disabled={!profile || busy}
              maxLength={1000}
              className="min-w-0 flex-1 rounded-xl border border-linesoft bg-white/[0.03] px-3 py-2 text-[12.5px] text-white placeholder:text-text3 focus:border-gold/50 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={ask}
              disabled={!profile || busy || !qText.trim()}
              className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-xl border border-gold/40 text-gold disabled:opacity-40"
              aria-label="Send question"
            >
              <Send size={14} />
            </button>
          </div>
        </Card>

        {/* ── voice ──────────────────────────────────────────── */}
        <button
          onClick={() => router.push(`/voice/create?project=${projectId}`)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-line py-3 text-[12.5px] font-bold text-gold-hi active:bg-white/5"
        >
          <Mic size={15} /> Start a Voice room for this project
        </button>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label }) {
  return (
    <div className="rounded-xl bg-white/[0.03] py-2">
      <div className="flex items-center justify-center gap-1">
        <Icon size={13} className="text-gold" />
        <span className="text-[14px] font-extrabold">{value}</span>
      </div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-text3">{label}</div>
    </div>
  );
}

function Card({ title, icon: Icon, children }) {
  return (
    <div className="mt-3 rounded-2xl border border-linesoft bg-card p-4">
      <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-text3">
        <Icon size={13} className="text-gold" />
        {title}
      </div>
      {children}
    </div>
  );
}
