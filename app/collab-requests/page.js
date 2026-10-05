'use client';

// ─────────────────────────────────────────────────────────────
// COLLABORATION REQUESTS inbox — incoming (accept/decline)
// and outgoing (status/withdraw). Accepting opens the chat.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock, Loader2, MessageCircle, UserPlus, X } from 'lucide-react';
import SubpageHeader from '@/components/SubpageHeader';
import Avatar from '@/components/Avatar';
import AuthSkeleton from '@/components/AuthSkeleton';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { timeAgo } from '@/lib/admin';
import {
  subscribeIncomingCollabRequests,
  decideCollabRequest,
  withdrawCollabRequest,
  getMySentCollabRequests,
} from '@/lib/collabRequests';

export default function CollabRequestsPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const showToast = useStore((s) => s.showToast);
  const [incoming, setIncoming] = useState([]);
  const [sent, setSent] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!profile?.id) return undefined;
    const unsub = subscribeIncomingCollabRequests(profile.id, (list) => {
      setIncoming(list);
      setLoaded(true);
    });
    getMySentCollabRequests(profile.id).then(setSent).catch(() => setSent([]));
    return unsub;
  }, [profile?.id]);

  async function decide(request, decision) {
    setBusy(true);
    try {
      await decideCollabRequest(profile, request, decision);
      showToast(decision === 'accepted' ? 'Request accepted — chat opened' : 'Request declined');
      if (decision === 'accepted') router.push(`/messages/${request.uid}`);
    } catch (e) {
      showToast('Could not update the request');
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(recipientUid) {
    setBusy(true);
    try {
      await withdrawCollabRequest(recipientUid, profile.id);
      setSent((s) => s.filter((r) => r.recipientUid !== recipientUid));
      showToast('Request withdrawn');
    } catch (e) {
      showToast('Could not withdraw');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <AuthSkeleton />;

  const pending = incoming.filter((r) => r.status === 'pending');
  const decided = incoming.filter((r) => r.status !== 'pending');

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <SubpageHeader title="Collaboration requests" />
      <div className="no-scrollbar flex-1 overflow-y-auto px-[18px] pb-8">
        {!loaded ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[12.5px] text-text3">
            <Loader2 size={15} className="animate-spin" /> Loading…
          </div>
        ) : null}

        <Section title={`Incoming (${pending.length})`}>
          {pending.length === 0 ? (
            <Empty
              icon={UserPlus}
              text="No pending requests. Founders who want to build with you will land here."
            />
          ) : (
            pending.map((r) => (
              <div key={r.id} className="rounded-2xl border border-linesoft bg-card p-4">
                <div className="flex items-center gap-2.5">
                  <button onClick={() => router.push(`/profile/${r.uid}`)}>
                    <Avatar src={r.avatar} name={r.name} size={40} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => router.push(`/profile/${r.uid}`)}
                      className="block truncate text-[13.5px] font-extrabold"
                    >
                      {r.name}
                    </button>
                    <div className="text-[10.5px] text-text3">
                      {r.createdAt?.toDate ? timeAgo(r.createdAt) : ''}
                      {r.intent ? ` · ${String(r.intent).replace(/_/g, ' ')}` : ''}
                    </div>
                  </div>
                </div>
                {r.message ? (
                  <p className="mt-2.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-text2">
                    “{r.message}”
                  </p>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => decide(r, 'accepted')}
                    disabled={busy}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-grad py-2.5 text-[12px] font-black text-[#171100] disabled:opacity-50"
                  >
                    <Check size={14} /> Accept
                  </button>
                  <button
                    onClick={() => decide(r, 'declined')}
                    disabled={busy}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-linesoft py-2.5 text-[12px] font-bold text-text2 disabled:opacity-50"
                  >
                    <X size={14} /> Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </Section>

        <Section title="Answered">
          {decided.length === 0 ? (
            <Empty icon={Clock} text="Requests you accept or decline will show up here." />
          ) : (
            decided.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2.5 rounded-2xl border border-linesoft bg-card p-3"
              >
                <Avatar src={r.avatar} name={r.name} size={32} />
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">{r.name}</span>
                {r.status === 'accepted' ? (
                  <button
                    onClick={() => router.push(`/messages/${r.uid}`)}
                    className="flex items-center gap-1 rounded-full border border-brandgreen/40 px-2.5 py-1 text-[10.5px] font-bold text-brandgreen"
                  >
                    <MessageCircle size={11} /> Chat
                  </button>
                ) : (
                  <span className="text-[11px] text-text3">{r.status}</span>
                )}
              </div>
            ))
          )}
        </Section>

        <Section title={`Sent (${sent.filter((r) => r.status === 'pending').length} pending)`}>
          {sent.length === 0 ? (
            <Empty
              icon={SendIcon}
              text="Requests you send from Match will show up here."
            />
          ) : (
            sent.map((r) => (
              <div
                key={r.recipientUid}
                className="flex items-center gap-2.5 rounded-2xl border border-linesoft bg-card p-3"
              >
                <Avatar src={r.avatar} name={r.name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-bold">{r.name}</div>
                  <div className="text-[10.5px] text-text3">
                    {r.createdAt?.toDate ? timeAgo(r.createdAt) : ''}
                  </div>
                </div>
                {r.status === 'pending' ? (
                  <button
                    onClick={() => withdraw(r.recipientUid)}
                    disabled={busy}
                    className="rounded-full border border-linesoft px-2.5 py-1 text-[10.5px] font-bold text-text2 disabled:opacity-40"
                  >
                    Withdraw
                  </button>
                ) : r.status === 'accepted' ? (
                  <button
                    onClick={() => router.push(`/messages/${r.recipientUid}`)}
                    className="flex items-center gap-1 rounded-full border border-brandgreen/40 px-2.5 py-1 text-[10.5px] font-bold text-brandgreen"
                  >
                    <MessageCircle size={11} /> Chat
                  </button>
                ) : (
                  <span className="text-[11px] text-text3">{r.status}</span>
                )}
              </div>
            ))
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-4">
      <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-text3">
        {title}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Empty({ icon: Icon, text }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-linesoft bg-card p-4">
      <Icon size={15} className="mt-0.5 flex-none text-gold" />
      <p className="text-[12px] leading-relaxed text-text3">{text}</p>
    </div>
  );
}

function SendIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}
