'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, FolderKanban, Plus, Sparkles } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import CopilotHome from '@/components/copilot/Home';
import { MODE_ICONS } from '@/components/copilot/Home';
import { MessageList, Composer } from '@/components/copilot/Chat';
import CopilotContext from '@/components/copilot/Context';
import {
  MODES,
  bumpProjectProgress,
  callCopilot,
  createConversation,
  createProjectFromCard,
  generateTasks,
  listConversations,
  listMyProjects,
  loadMessages,
  listProjectTasks,
  modeMeta,
  saveMessage,
  setTaskStatus,
  touchConversation,
} from '@/lib/copilot';

function deriveTitle(text) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  return clean.length > 52 ? `${clean.slice(0, 52)}…` : clean || 'New conversation';
}

function buildPayload(modeKey, text, projectContext) {
  if (modeKey === 'chat') return { message: text, projectContext };
  return { idea: text, projectContext };
}

function historyFrom(messages) {
  return messages
    .map((m) => {
      const content =
        m.text || (m.card && (m.card.summary || m.card.title)) || (m.card ? JSON.stringify(m.card).slice(0, 1500) : '');
      return content ? { role: m.role, content: String(content).slice(0, 4000) } : null;
    })
    .filter(Boolean);
}

let localSeq = 0;
function localId(prefix) {
  localSeq += 1;
  return `${prefix}-local-${localSeq}`;
}

export default function CopilotPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const showToast = useStore((s) => s.showToast);
  const publishPost = useStore((s) => s.publishPost);

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeMeta, setActiveMeta] = useState(null);
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState('analyze');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [mobileContext, setMobileContext] = useState(false);
  const [publishDraft, setPublishDraft] = useState(null);
  const [publishing, setPublishing] = useState(false);

  const uid = profile && profile.id ? profile.id : null;

  const refreshConversations = useCallback(async () => {
    if (!uid) return;
    try {
      setConversations(await listConversations(uid));
    } catch (e) {
      setConversations([]);
    }
  }, [uid]);

  const refreshProjects = useCallback(async () => {
    if (!uid) return;
    try {
      const list = await listMyProjects(uid);
      setProjects(list);
      return list;
    } catch (e) {
      setProjects([]);
      return [];
    }
  }, [uid]);

  useEffect(() => {
    if (!ready || !uid) return;
    refreshConversations();
    refreshProjects();
  }, [ready, uid, refreshConversations, refreshProjects]);

  useEffect(() => {
    if (!ready || selectedProject || !projects.length) return;
    const wanted = new URLSearchParams(window.location.search).get('project');
    if (!wanted) return;
    const found = projects.find((p) => p.id === wanted);
    if (found) setSelectedProject(found);
  }, [ready, projects, selectedProject]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = () => {
      if (mq.matches) setMobileContext(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!ready || !uid || !selectedProject) {
      setTasks([]);
      return;
    }
    let cancelled = false;
    setLoadingTasks(true);
    listProjectTasks(selectedProject.id)
      .then((list) => {
        if (!cancelled) setTasks(list);
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingTasks(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, uid, selectedProject]);

  const projectContext = selectedProject
    ? `${selectedProject.name}. Problem: ${selectedProject.problem || 'n/a'}. Solution: ${
        selectedProject.solution || 'n/a'
      }. Tasks: ${selectedProject.tasksDone || 0}/${selectedProject.tasksTotal || 0} done (${
        selectedProject.progress || 0
      }%).`
    : '';

  async function runRequest({ convId, convMeta, modeKey, payload, userText, priorMessages }) {
    const uid2 = uid;
    setBusy(true);
    const userMsg = { id: localId('u'), role: 'user', text: userText };
    setMessages([...priorMessages, userMsg]);
    let savedUser = null;
    try {
      savedUser = await saveMessage(uid2, convId, userMsg);
      setMessages((prev) => prev.map((m) => (m.id === userMsg.id ? { ...m, id: savedUser } : m)));
    } catch (e) {
      showToast('Could not save your message - check that security rules are published');
    }
    try {
      const json = await callCopilot({
        mode: modeKey,
        payload,
        history: historyFrom([...priorMessages, userMsg]),
      });
      const structured = json.data && typeof json.data === 'object';
      const assistantMsg = {
        id: localId('a'),
        role: 'assistant',
        text: structured ? '' : String(json.data || ''),
        cardType: structured ? (modeKey === 'draft' ? 'bwm_draft' : modeKey) : null,
        card: structured ? json.data : null,
        source: json.source,
      };
      const savedAssistant = await saveMessage(uid2, convId, assistantMsg).catch(() => null);
      if (savedAssistant) assistantMsg.id = savedAssistant;
      setMessages((prev) => [...prev, assistantMsg]);
      await touchConversation(uid2, convId, {
        mode: modeKey,
        messageCount: (convMeta && convMeta.messageCount ? convMeta.messageCount : priorMessages.length) + 2,
        lastPayload: payload,
      }).catch(() => {});
      await refreshConversations();
      return { ok: true };
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: localId('e'),
          role: 'assistant',
          text: `I could not reach the Copilot: ${err.message}. Your message was saved - try again in a moment.`,
          cardType: null,
          card: null,
          source: null,
        },
      ]);
      showToast(`Copilot error: ${err.message}`);
      return { ok: false };
    } finally {
      setBusy(false);
    }
  }

  async function startConversation(modeKey, text) {
    if (!uid || busy) return;
    const payload = buildPayload(modeKey, text, projectContext);
    let convId = null;
    try {
      convId = await createConversation(uid, { title: deriveTitle(text), mode: modeKey });
    } catch (e) {
      showToast('Could not start a conversation - check that security rules are published');
      return;
    }
    const meta = { id: convId, title: deriveTitle(text), mode: modeKey, messageCount: 0 };
    setActiveId(convId);
    setActiveMeta(meta);
    setMode(modeKey);
    setMobileContext(false);
    setMessages([]);
    await runRequest({ convId, convMeta: meta, modeKey, payload, userText: text, priorMessages: [] });
  }

  async function sendFollowup() {
    const text = input.trim();
    if (!text || busy || !activeId || !uid) return;
    setInput('');
    const payload = buildPayload(mode, text, projectContext);
    await runRequest({
      convId: activeId,
      convMeta: activeMeta,
      modeKey: mode,
      payload,
      userText: text,
      priorMessages: messages,
    });
    if (activeMeta && activeMeta.title === 'New conversation') {
      const title = deriveTitle(text);
      setActiveMeta({ ...activeMeta, title });
      touchConversation(uid, activeId, { title }).catch(() => {});
    }
  }

  async function openConversation(conv) {
    setActiveId(conv.id);
    setActiveMeta(conv);
    setMode(conv.mode || 'chat');
    setMobileContext(false);
    setLoadingThread(true);
    try {
      setMessages(await loadMessages(uid, conv.id));
    } catch (e) {
      setMessages([]);
      showToast('Could not load this conversation');
    } finally {
      setLoadingThread(false);
    }
  }

  function newChat() {
    setActiveId(null);
    setActiveMeta(null);
    setMessages([]);
    setInput('');
    setMobileContext(false);
  }

  async function selectProject(project) {
    setSelectedProject(project);
    setMobileContext(false);
  }

  async function onTaskStatus(task, nextStatus) {
    if (!selectedProject) return;
    const projectId = selectedProject.id;
    const prev = tasks;
    setTasks((list) => list.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    try {
      await setTaskStatus(projectId, task.id, nextStatus);
      const progress = await bumpProjectProgress(projectId);
      setProjects((list) =>
        list.map((p) =>
          p.id === projectId
            ? {
                ...p,
                progress,
                tasksDone: nextStatus === 'done' ? (p.tasksDone || 0) + 1 : Math.max(0, (p.tasksDone || 0) - (nextStatus === 'done' ? 0 : 1)),
              }
            : p
        )
      );
      setSelectedProject((p) => (p && p.id === projectId ? { ...p, progress } : p));
      await refreshProjects();
      const fresh = await listProjectTasks(projectId).catch(() => null);
      if (fresh) setTasks(fresh);
    } catch (e) {
      setTasks(prev);
      showToast(`Could not save task status: ${e.message || 'rules not published'}`);
    }
  }

  function switchMode(modeKey) {
    setMode(modeKey);
    if (activeId && uid && activeMeta) {
      touchConversation(uid, activeId, { mode: modeKey }).catch(() => {});
      setActiveMeta({ ...activeMeta, mode: modeKey });
    }
  }

  function lastCardMessage() {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].card) return messages[i];
    }
    return null;
  }

  async function onCardAction(actionKey, extra) {
    if (actionKey === 'goto-validate') return switchMode('validate');
    if (actionKey === 'goto-mvp') return switchMode('mvp');
    if (actionKey === 'goto-launch') return switchMode('launch');
    if (actionKey === 'goto-chat') return switchMode('chat');

    const msg = lastCardMessage();
    if (!msg || !msg.card) return;

    if (actionKey === 'create-project') {
      if (!uid) return;
      const chosen = extra && Array.isArray(extra.features) && extra.features.length ? extra.features : msg.card.features;
      const card = { ...msg.card, features: Array.isArray(chosen) ? chosen : [] };
      setBusy(true);
      try {
        const projectId = await createProjectFromCard(card, profile, activeId);
        const note = {
          id: localId('a'),
          role: 'assistant',
          text: `Project “${card.title}” created with ${Array.isArray(card.tasks) ? card.tasks.length : 0} tasks and ${card.features.length} selected feature${card.features.length === 1 ? '' : 's'}. Select it in the context panel to track TODO / IN PROGRESS / DONE.`,
          cardType: null,
          card: null,
          source: 'system',
        };
        if (activeId) await saveMessage(uid, activeId, note).catch(() => {});
        setMessages((prev) => [...prev, note]);
        const list = await refreshProjects();
        const created = (list || []).find((p) => p.id === projectId);
        if (created) setSelectedProject(created);
        showToast('Project created');
        setMobileContext(false);
      } catch (e) {
        showToast(`Could not create project: ${e.message || 'rules not published'}`);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (actionKey === 'add-tasks') {
      if (!selectedProject) {
        showToast('Select a project in the context panel first');
        return;
      }
      setBusy(true);
      try {
        await generateTasks(selectedProject.id, Array.isArray(msg.card.tasks) ? msg.card.tasks : []);
        await bumpProjectProgress(selectedProject.id);
        const fresh = await listProjectTasks(selectedProject.id).catch(() => null);
        if (fresh) setTasks(fresh);
        await refreshProjects();
        const updated = (await listMyProjects(uid).catch(() => [])).find((p) => p.id === selectedProject.id);
        if (updated) setSelectedProject(updated);
        showToast('Tasks added to project');
      } catch (e) {
        showToast(`Could not add tasks: ${e.message || 'rules not published'}`);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (actionKey === 'publish-bwm') {
      setPublishDraft(bwmText(msg.card));
      return;
    }

    if (actionKey === 'regenerate') {
      if (!activeId || busy) return;
      const payload = (activeMeta && activeMeta.lastPayload) || { idea: deriveTitle(String(msg.card.text || '').slice(0, 500)) };
      await runRequest({
        convId: activeId,
        convMeta: activeMeta,
        modeKey: 'draft',
        payload,
        userText: 'Regenerate the Build With Me draft.',
        priorMessages: messages,
      });
    }
  }

  async function confirmPublish() {
    if (!publishDraft || publishing) return;
    setPublishing(true);
    try {
      const newId = await publishPost({ text: publishDraft.trim().slice(0, 5000), tagType: 'cofounder', imageUrl: null });
      if (newId) {
        showToast('Build With Me post published!');
        setPublishDraft(null);
        if (uid && activeId) {
          const note = {
            id: localId('a'),
            role: 'assistant',
            text: 'Published to the feed as a Co-founder post. Replies and DMs will land in your messages.',
            cardType: null,
            card: null,
            source: 'system',
          };
          await saveMessage(uid, activeId, note).catch(() => {});
          setMessages((prev) => [...prev, note]);
        }
      }
    } catch (e) {
      showToast(`Could not publish: ${e.message}`);
    } finally {
      setPublishing(false);
    }
  }

  function bwmText(card) {
    return String((card && card.text) || '').slice(0, 5000);
  }

  const activeMode = modeMeta(mode);

  const modesBlock = (
    <div className="px-3 py-3">
      <div className="mb-2 px-1 text-[10px] font-black uppercase tracking-wider text-text3">Modes</div>
      <div className="space-y-1">
        {MODES.map((m) => {
          const Icon = MODE_ICONS[m.key];
          return (
            <button
              key={m.key}
              onClick={() => {
                setMobileContext(false);
                switchMode(m.key);
              }}
              className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-all ${
                m.key === mode ? 'bg-gold/10 text-gold' : 'text-text2 active:bg-white/5'
              }`}
            >
              <Icon size={15} />
              <span className="text-[12.5px] font-bold">{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const recentBlock = conversations.length ? (
    <div className="px-3 pb-3">
      <div className="mb-2 px-1 text-[10px] font-black uppercase tracking-wider text-text3">Recent</div>
      <div className="space-y-1">
        {conversations.slice(0, 8).map((c) => (
          <button
            key={c.id}
            onClick={() => openConversation(c)}
            className={`w-full truncate rounded-xl px-2.5 py-2 text-left text-[12px] transition-all ${
              c.id === activeId ? 'bg-white/10 font-bold text-text1' : 'text-text2 active:bg-white/5'
            }`}
            title={c.title}
          >
            {c.title}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  const contextPanel = (
    <CopilotContext
      projects={projects}
      selectedProject={selectedProject}
      tasks={tasks}
      loadingTasks={loadingTasks}
      onSelectProject={selectProject}
      onTaskStatus={onTaskStatus}
      onGoProjects={() => router.push('/projects')}
    />
  );

  return (
    <MainScreenShell className="wide-desktop copilot-shell fill-stage no-rail">
      {ready ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[208px_minmax(0,1fr)_296px]">
          <aside className="hidden min-h-0 flex-col border-r border-linesoft bg-card/40 lg:flex">
            <div className="border-b border-linesoft p-3">
              <button
                onClick={newChat}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-grad py-2.5 text-[12.5px] font-black text-[#171100] active:scale-[0.98]"
              >
                <Plus size={15} />
                New chat
              </button>
            </div>
            {modesBlock}
            <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">{recentBlock}</div>
          </aside>

          <section className="m-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-card/40 lg:m-0 lg:rounded-none lg:border-0 lg:bg-transparent">
            <header className="flex items-center gap-2 border-b border-linesoft px-3 py-2.5">
              {mobileContext ? (
                <button
                  onClick={() => setMobileContext(false)}
                  aria-label="Back to chat"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-gold"
                >
                  <ChevronLeft size={17} />
                </button>
              ) : (
                <button
                  onClick={newChat}
                  aria-label="New chat"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-gold"
                >
                  <Plus size={17} />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={13} className="shrink-0 text-gold" />
                  <span className="truncate text-[13.5px] font-extrabold">
                    {mobileContext ? 'Panel' : activeMeta ? activeMeta.title : 'AI Founder Copilot'}
                  </span>
                </div>
                <div className="text-[10px] uppercase tracking-wide text-text3">
                  {mobileContext ? `Modes · ${projects.length} projects` : activeMode.label}
                </div>
              </div>
              <button
                onClick={() => setMobileContext(true)}
                aria-label="Open copilot panel"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-gold lg:hidden"
              >
                <FolderKanban size={16} />
              </button>
            </header>

            {activeId && !mobileContext ? (
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-linesoft px-3 py-2 lg:hidden">
                {MODES.map((m) => {
                  const Icon = MODE_ICONS[m.key];
                  return (
                    <button
                      key={m.key}
                      onClick={() => switchMode(m.key)}
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-[10.5px] font-extrabold ${
                        m.key === mode
                          ? 'border-gold/70 bg-[rgba(217,172,61,0.14)] text-gold-hi'
                          : 'border-line text-text2'
                      }`}
                    >
                      <Icon size={11} />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {mobileContext ? (
              <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                <div className="overflow-hidden rounded-2xl border border-line bg-card/60">{modesBlock}</div>
                {recentBlock ? (
                  <div className="overflow-hidden rounded-2xl border border-line bg-card/60">{recentBlock}</div>
                ) : null}
                <div className="overflow-hidden rounded-2xl border border-line bg-card/60">{contextPanel}</div>
              </div>
            ) : activeId ? (
              <>
                {loadingThread ? (
                  <div className="flex min-h-0 flex-1 items-center justify-center text-[12px] text-text3">
                    Loading conversation…
                  </div>
                ) : (
                  <MessageList
                    messages={messages}
                    busy={busy}
                    onAction={onCardAction}
                    hasProject={!!selectedProject}
                  />
                )}
                <Composer
                  value={input}
                  onChange={setInput}
                  onSend={sendFollowup}
                  busy={busy || loadingThread}
                  placeholder={activeMode.placeholder}
                />
              </>
            ) : (
              <CopilotHome
                conversations={conversations}
                busy={busy}
                onStart={startConversation}
                onOpen={openConversation}
              />
            )}
          </section>

          <aside className="hidden min-h-0 border-l border-linesoft bg-card/40 lg:block">{contextPanel}</aside>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <div className="skeleton h-10 w-1/3 rounded-xl" />
          <div className="skeleton flex-1 rounded-2xl" />
        </div>
      )}

      {publishDraft !== null ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="gold-card w-full max-w-[560px] p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[13.5px] font-extrabold">Review your Build With Me post</div>
              <button
                onClick={() => setPublishDraft(null)}
                aria-label="Close"
                className="text-[11px] font-bold text-text3"
              >
                Close
              </button>
            </div>
            <p className="mb-2 text-[11.5px] text-text3">
              Edit anything you want, then publish. It goes to the feed as a Co-founder post.
            </p>
            <textarea
              value={publishDraft}
              onChange={(e) => setPublishDraft(e.target.value)}
              rows={9}
              className="no-scrollbar w-full resize-none rounded-xl border border-line bg-white/[0.04] p-3 text-[13px] leading-relaxed text-text1 outline-none focus:border-gold/50"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setPublishDraft(null)}
                className="rounded-xl border border-line px-4 py-2 text-[12px] font-bold text-text2"
              >
                Cancel
              </button>
              <button
                onClick={confirmPublish}
                disabled={publishing || !publishDraft.trim()}
                className="rounded-xl bg-gold-grad px-4 py-2 text-[12px] font-black text-[#171100] disabled:opacity-50"
              >
                {publishing ? 'Publishing…' : 'Publish to feed'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </MainScreenShell>
  );
}
