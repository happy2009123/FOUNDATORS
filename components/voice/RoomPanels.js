'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  HelpCircle,
  MessageSquare,
  Pin,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
  Lock,
  LockOpen,
  Radio,
} from 'lucide-react';
import Avatar from '@/components/Avatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import { searchUsers } from '@/lib/firestore';

const ROLE_LABEL = {
  host: 'Host',
  coHost: 'Co-Host',
  speaker: 'Speaker',
  listener: 'Listener',
};

export function TemplateCard({ room }) {
  if (!room || !room.templateData || room.template === 'standard') return null;
  const d = room.templateData;
  if (room.template === 'pitch') {
    const rows = [
      ['Startup', d.startupName],
      ['Problem', d.problem],
      ['Solution', d.solution],
      ['Target users', d.targetUsers],
      ['Stage', d.stage],
    ].filter(([, v]) => v && String(v).trim());
    if (!rows.length) return null;
    return (
      <div className="rounded-2xl border border-line bg-card p-4">
        <div className="mb-2 text-[10.5px] font-black uppercase tracking-widest text-gold">Pitch Room</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="rounded-xl border border-linesoft bg-white/[0.03] px-3 py-2">
              <div className="text-[9.5px] font-black uppercase tracking-wider text-text3">{k}</div>
              <div className="mt-0.5 text-[12.5px] font-semibold leading-snug text-text1">{String(v)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (room.template === 'cofounder') {
    const rows = [
      ['Role needed', d.roleNeeded],
      ['Skills', d.skills],
      ['Project', d.project],
      ['Stage', d.stage],
    ].filter(([, v]) => v && String(v).trim());
    if (!rows.length) return null;
    return (
      <div className="rounded-2xl border border-brandblue/40 bg-brandblue/[0.07] p-4">
        <div className="mb-2 text-[10.5px] font-black uppercase tracking-widest text-brandblue">
          Co-Founder Search
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="rounded-xl border border-line bg-white/[0.03] px-3 py-2">
              <div className="text-[9.5px] font-black uppercase tracking-wider text-text3">{k}</div>
              <div className="mt-0.5 text-[12.5px] font-semibold leading-snug text-text1">{String(v)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (room.template === 'ama') {
    return (
      <div className="rounded-2xl border border-gold/40 bg-gold/[0.07] px-4 py-3 text-[12.5px] text-gold-hi">
        <span className="font-black">Founder AMA</span> — listeners submit questions, the host answers
        verbally. Pinned questions appear on stage.
      </div>
    );
  }
  return null;
}

export function QuestionsPanel({
  room,
  questions,
  profile,
  canModerate,
  onAsk,
  onStatus,
  onDelete,
  compact = false,
}) {
  const [text, setText] = useState('');
  const allowAsk = room && room.allowQuestions;
  const pending = questions.filter((q) => q.status !== 'answered');
  const answered = questions.filter((q) => q.status === 'answered');
  const sorted = [...pending, ...answered];

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAsk(text);
    setText('');
  };

  return (
    <div className="flex min-h-0 flex-col">
      {allowAsk ? (
        <form onSubmit={submit} className="mb-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder="Ask the speakers a question…"
            className="min-w-0 flex-1 rounded-xl border border-line bg-white/[0.04] px-3 py-2.5 text-[12.5px] text-text1 outline-none placeholder:text-text3 focus:border-gold/50"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="shrink-0 rounded-xl bg-gold-grad px-3.5 text-[12px] font-black text-[#171100] disabled:opacity-40"
          >
            Ask
          </button>
        </form>
      ) : null}

      {!sorted.length ? (
        <div className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-[11.5px] text-text3">
          No questions yet. {allowAsk ? 'Be the first to ask.' : 'Questions are off for this room.'}
        </div>
      ) : null}

      <div className={`space-y-2 ${compact ? '' : 'min-h-0 overflow-y-auto no-scrollbar'}`}>
        {sorted.map((q) => (
          <div
            key={q.id}
            className={`rounded-xl border px-3 py-2.5 ${
              q.status === 'pinned'
                ? 'border-gold/60 bg-gold/[0.08]'
                : q.status === 'answered'
                ? 'border-linesoft bg-white/[0.02] opacity-70'
                : 'border-line bg-card'
            }`}
          >
            <div className="flex items-center gap-2">
              <Avatar src={q.authorAvatar} name={q.authorName} size={20} />
              <span className="text-[11.5px] font-bold text-text2">{q.authorName}</span>
              {q.status === 'pinned' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-gold-hi">
                  <Pin size={8} /> Pinned
                </span>
              ) : null}
              {q.status === 'answered' ? (
                <span className="rounded-full bg-brandgreen/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-brandgreen">
                  Answered
                </span>
              ) : null}
            </div>
            <div className="mt-1 text-[12.5px] leading-snug text-text1">{q.text}</div>
            {canModerate ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {q.status !== 'pinned' ? (
                  <button
                    onClick={() => onStatus(q.id, 'pinned')}
                    className="rounded-lg border border-line px-2 py-1 text-[10px] font-bold text-text2 active:bg-white/5"
                  >
                    <Pin size={9} className="mr-1 inline" />
                    Pin
                  </button>
                ) : (
                  <button
                    onClick={() => onStatus(q.id, 'pending')}
                    className="rounded-lg border border-line px-2 py-1 text-[10px] font-bold text-text2 active:bg-white/5"
                  >
                    Unpin
                  </button>
                )}
                {q.status !== 'answered' ? (
                  <button
                    onClick={() => onStatus(q.id, 'answered')}
                    className="rounded-lg border border-line px-2 py-1 text-[10px] font-bold text-text2 active:bg-white/5"
                  >
                    Mark answered
                  </button>
                ) : null}
                <button
                  onClick={() => onDelete(q.id)}
                  className="rounded-lg border border-brandred/40 px-2 py-1 text-[10px] font-bold text-brandred active:bg-white/5"
                >
                  <Trash2 size={9} className="mr-1 inline" />
                  Delete
                </button>
              </div>
            ) : q.authorId === (profile && profile.id) ? (
              <div className="mt-1.5">
                <button
                  onClick={() => onDelete(q.id)}
                  className="rounded-lg border border-line px-2 py-1 text-[10px] font-bold text-text3 active:bg-white/5"
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PeoplePanel({ participants, requests, canModerate, meId, actions, onReport, onBlock }) {
  const speakers = participants.filter((p) => ['host', 'coHost', 'speaker'].includes(p.role) && p.status === 'joined');
  const listeners = participants.filter((p) => p.role === 'listener' && p.status === 'joined');
  const pending = (requests || []).filter((r) => r.status === 'pending');

  const tileActions = (p) => {
    if (!canModerate || p.uid === meId) return null;
    const isHostRow = p.role === 'host';
    return (
      <div className="flex flex-wrap gap-1">
        {pending.some((r) => r.uid === p.uid) ? (
          <>
            <button
              onClick={() => actions.approve(p.uid)}
              className="rounded-lg bg-brandgreen/15 px-2 py-1 text-[9.5px] font-black text-brandgreen"
            >
              Approve
            </button>
            <button
              onClick={() => actions.reject(p.uid)}
              className="rounded-lg border border-line px-2 py-1 text-[9.5px] font-bold text-text2"
            >
              Reject
            </button>
          </>
        ) : null}
        {!isHostRow && p.role !== 'speaker' && p.raisedHand ? (
          <button
            onClick={() => actions.approve(p.uid)}
            className="rounded-lg bg-brandgreen/15 px-2 py-1 text-[9.5px] font-black text-brandgreen"
          >
            Make speaker
          </button>
        ) : null}
        {!isHostRow && p.role === 'speaker' ? (
          <button
            onClick={() => actions.demote(p.uid)}
            className="rounded-lg border border-line px-2 py-1 text-[9.5px] font-bold text-text2"
          >
            To listener
          </button>
        ) : null}
        {!isHostRow ? (
          <button
            onClick={() => actions.toggleCoHost(p.uid, p.role !== 'coHost')}
            className="rounded-lg border border-line px-2 py-1 text-[9.5px] font-bold text-text2"
          >
            {p.role === 'coHost' ? 'Remove co-host' : 'Make co-host'}
          </button>
        ) : null}
        {!isHostRow ? (
          <button
            onClick={() => actions.remove(p.uid)}
            className="rounded-lg border border-brandred/40 px-2 py-1 text-[9.5px] font-bold text-brandred"
          >
            <UserMinus size={9} className="mr-0.5 inline" />
            Remove
          </button>
        ) : null}
      </div>
    );
  };

  const row = (p) => (
    <div key={p.uid} className="rounded-xl border border-line bg-card px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <Avatar src={p.avatar} name={p.name} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[12.5px] font-bold text-text1">
              {p.name}
              {p.uid === meId ? ' (you)' : ''}
            </span>
            {p.verified ? <VerifiedBadge size={11} /> : null}
          </div>
          <div className="text-[10px] font-black uppercase tracking-wider text-text3">
            {ROLE_LABEL[p.role] || p.role}
            {p.isMuted && p.role !== 'listener' ? ' · muted' : ''}
            {p.invited ? ' · invited' : ''}
          </div>
        </div>
        {p.uid !== meId ? (
          <div className="flex shrink-0 gap-1.5">
            <button
              onClick={() => onReport(p)}
              className="rounded-lg border border-line px-2 py-1 text-[9.5px] font-bold text-text3 active:bg-white/5"
            >
              Report
            </button>
            {p.role !== 'host' ? (
              <button
                onClick={() => onBlock(p)}
                className="rounded-lg border border-line px-2 py-1 text-[9.5px] font-bold text-text3 active:bg-white/5"
              >
                Block
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {tileActions(p)}
    </div>
  );

  return (
    <div className="space-y-4">
      {canModerate && pending.length ? (
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wider text-gold-hi">
            <HandIcon /> Speaker Requests ({pending.length})
          </div>
          <div className="space-y-2">
            {pending.map((r) => (
              <div key={r.uid} className="flex items-center gap-2.5 rounded-xl border border-gold/40 bg-gold/[0.06] px-3 py-2.5">
                <Avatar src={r.avatar} name={r.name} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-[12.5px] font-bold text-text1">{r.name}</span>
                    {r.verified ? <VerifiedBadge size={11} /> : null}
                  </div>
                  <div className="text-[10px] text-text3">wants to speak</div>
                </div>
                <button
                  onClick={() => actions.approve(r.uid)}
                  className="rounded-lg bg-brandgreen px-2.5 py-1.5 text-[10.5px] font-black text-black"
                >
                  <CheckCircle2 size={11} className="mr-1 inline" />
                  Approve
                </button>
                <button
                  onClick={() => actions.reject(r.uid)}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-[10.5px] font-bold text-text2"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wider text-text3">
          <Radio size={11} className="text-gold" /> Speakers ({speakers.length})
        </div>
        <div className="space-y-2">{speakers.length ? speakers.map(row) : <div className="text-[11.5px] text-text3">No speakers on stage yet.</div>}</div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wider text-text3">
          <Users size={11} /> Listeners ({listeners.length})
        </div>
        <div className="space-y-2">{listeners.length ? listeners.map(row) : <div className="text-[11.5px] text-text3">No listeners yet.</div>}</div>
      </div>
    </div>
  );
}

function HandIcon() {
  return <span className="text-[12px]">✋</span>;
}

export function HostControlsPanel({
  room,
  isHost,
  canModerate,
  onLock,
  onPin,
  onTitle,
  onEnd,
  onInvite,
  onInviteSearch,
  inviteResults,
  onInvitePick,
}) {
  const [locked, setLocked] = useState(!!room.isLocked);
  const [pin, setPin] = useState(room.pinnedTopic || '');
  const [title, setTitle] = useState(room.title || '');
  const [query, setQuery] = useState('');

  const runSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    onInviteSearch(query.trim());
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-text3">
          {locked ? <Lock size={12} className="text-gold" /> : <LockOpen size={12} />} Room state
        </div>
        <button
          disabled={!canModerate}
          onClick={() => {
            const next = !locked;
            setLocked(next);
            onLock(next);
          }}
          className={`w-full rounded-xl border px-3 py-2.5 text-[12.5px] font-bold transition-all disabled:opacity-40 ${
            locked ? 'border-gold/60 bg-gold/10 text-gold-hi' : 'border-line text-text2'
          }`}
        >
          {locked ? 'Room is locked — tap to unlock' : 'Lock room (no new joins)'}
        </button>
      </div>

      <div className="rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-2.5 text-[11px] font-black uppercase tracking-wider text-text3">Pin topic</div>
        <div className="flex gap-2">
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            maxLength={200}
            placeholder="Discussion topic shown on stage"
            className="min-w-0 flex-1 rounded-xl border border-line bg-white/[0.04] px-3 py-2 text-[12.5px] text-text1 outline-none placeholder:text-text3 focus:border-gold/50"
          />
          <button
            disabled={!canModerate}
            onClick={() => onPin(pin)}
            className="shrink-0 rounded-xl border border-gold/50 bg-gold/10 px-3 text-[11.5px] font-black text-gold-hi disabled:opacity-40"
          >
            Pin
          </button>
        </div>
      </div>

      {isHost ? (
        <div className="rounded-2xl border border-line bg-card p-3.5">
          <div className="mb-2.5 text-[11px] font-black uppercase tracking-wider text-text3">Room title</div>
          <div className="flex gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="min-w-0 flex-1 rounded-xl border border-line bg-white/[0.04] px-3 py-2 text-[12.5px] text-text1 outline-none focus:border-gold/50"
            />
            <button
              disabled={!canModerate || !title.trim() || title.trim() === room.title}
              onClick={() => onTitle(title.trim())}
              className="shrink-0 rounded-xl border border-gold/50 bg-gold/10 px-3 text-[11.5px] font-black text-gold-hi disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      ) : null}

      {canModerate ? (
        <div className="rounded-2xl border border-line bg-card p-3.5">
          <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-text3">
            <UserPlus size={12} /> Invite a speaker
          </div>
          <form onSubmit={runSearch} className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search founders…"
              className="min-w-0 flex-1 rounded-xl border border-line bg-white/[0.04] px-3 py-2 text-[12.5px] text-text1 outline-none placeholder:text-text3 focus:border-gold/50"
            />
            <button type="submit" className="shrink-0 rounded-xl border border-line px-3 text-text2 active:bg-white/5">
              <Search size={14} />
            </button>
          </form>
          {inviteResults && inviteResults.length ? (
            <div className="mt-2 space-y-1.5">
              {inviteResults.slice(0, 5).map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    onInvitePick(u);
                    setQuery('');
                  }}
                  className="flex w-full items-center gap-2 rounded-xl border border-line bg-white/[0.03] px-2.5 py-2 text-left active:bg-white/5"
                >
                  <Avatar src={u.avatar} name={u.name} size={24} />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-text1">{u.name}</span>
                  <UserPlus size={12} className="text-gold" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {isHost ? (
        <button
          onClick={onEnd}
          className="w-full rounded-2xl border border-brandred/50 bg-brandred/10 px-4 py-3 text-[13px] font-black text-brandred active:scale-[0.98]"
        >
          End room for everyone
        </button>
      ) : null}

      <div className="rounded-2xl border border-linesoft bg-white/[0.02] p-3.5 text-[11px] leading-relaxed text-text3">
        <div className="mb-1 flex items-center gap-1.5 font-black uppercase tracking-wider text-text2">
          <HelpCircle size={11} /> Permissions
        </div>
        Host: full control. Co-host: moderation. Speaker: microphone. Listener: raise hand, questions and
        reactions. Roles are enforced by security rules, not just this UI.
      </div>
    </div>
  );
}

export function useInviteSearch() {
  const [results, setResults] = useState([]);
  const search = async (q) => {
    try {
      const res = await searchUsers(q);
      setResults(res && res.success ? res.data || [] : []);
    } catch (e) {
      setResults([]);
    }
  };
  const clear = () => setResults([]);
  return [results, search, clear];
}

export { ROLE_LABEL, MessageSquare };
