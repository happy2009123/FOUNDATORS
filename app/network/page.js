'use client';

// ─────────────────────────────────────────────────────────────
// MY NETWORK — LinkedIn-style connection inbox: pending requests
// (accept/decline via the 0013 RPCs), sent requests (withdraw),
// my connections (message), and People You May Know ranked by
// shared interests/skills. All real graph data — no seeded people.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, UserPlus, UserCheck, X, MessageCircle, Users, Loader2, Clock, Sparkles,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { notifyUser } from '@/lib/notify';
import Avatar from '@/components/Avatar';
import {
  listIncomingRequests,
  listOutgoingRequests,
  listConnectionIds,
  respondConnectionRequest,
  withdrawConnectionRequest,
  sendConnectionRequest,
  peopleYouMayKnow,
} from '@/lib/network';

export default function NetworkPage() {
  const router = useRouter();
  const { vibrate, notification } = useHaptics();
  const showToast = useStore((s) => s.showToast);
  const profile = useStore((s) => s.profile);
  const followedUsers = useStore((s) => s.followedUsers);
  const ensureContactForUser = useStore((s) => s.ensureContactForUser);

  const [loading, setLoading] = useState(true);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [connections, setConnections] = useState([]);
  const [pymk, setPymk] = useState([]);
  const [people, setPeople] = useState({}); // id -> profile row
  const [busyId, setBusyId] = useState(null);
  const [sentPymk, setSentPymk] = useState({});

  const myId = profile?.id;

  const loadProfiles = useCallback(async (ids) => {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return {};
    try {
      const { getSupabase } = await import('@/lib/supabase/client');
      const { mapRows } = await import('@/lib/supabase/db');
      const sb = getSupabase();
      if (!sb) return {};
      const { data, error } = await sb.from('profiles').select('*').in('id', unique);
      if (error) throw error;
      const map = {};
      mapRows(data || []).forEach((r) => { map[r.id] = r; });
      return map;
    } catch {
      return {};
    }
  }, []);

  const load = useCallback(async () => {
    if (!myId) return;
    setLoading(true);
    try {
      const [inc, out, connIds, pymkRows] = await Promise.all([
        listIncomingRequests(myId),
        listOutgoingRequests(myId),
        listConnectionIds(myId),
        peopleYouMayKnow(myId, { followedIds: Object.keys(followedUsers || {}) }),
      ]);
      setIncoming(inc);
      setOutgoing(out);
      setConnections(connIds);
      setPymk(pymkRows);

      const idList = [
        ...inc.map((r) => r.from_id),
        ...out.map((r) => r.to_id),
        ...connIds,
      ];
      const map = await loadProfiles(idList);
      // PYMK rows already carry profile fields — index them too so the
      // Message button on a suggestion opens the right chat.
      pymkRows.forEach((r) => { if (r?.id) map[r.id] = r; });
      setPeople(map);
    } finally {
      setLoading(false);
    }
  }, [myId, followedUsers, loadProfiles]);

  useEffect(() => {
    if (myId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  const handleAccept = useCallback(async (req) => {
    if (busyId) return;
    setBusyId(req.id);
    vibrate('medium');
    const result = await respondConnectionRequest(req.id, true);
    if (result === 'accepted') {
      setIncoming((prev) => prev.filter((r) => r.id !== req.id));
      setConnections((prev) => [req.from_id, ...prev.filter((x) => x !== req.from_id)]);
      notification('success');
      const who = people[req.from_id]?.name || 'connection';
      showToast(`You are now connected with ${who}`);
      setPymk((prev) => prev.filter((p) => p.id !== req.from_id));
      notifyUser(req.from_id, {
        type: 'connection',
        actorKey: myId,
        actorName: profile?.name || 'Someone',
        text: `${profile?.name || 'Someone'} accepted your connection request`,
        linkType: 'network',
        linkId: '',
      }).catch(() => {});
    } else {
      showToast('Could not accept request — try again');
    }
    setBusyId(null);
  }, [busyId, people, vibrate, notification, showToast]);

  const handleDecline = useCallback(async (req) => {
    if (busyId) return;
    setBusyId(req.id);
    const result = await respondConnectionRequest(req.id, false);
    if (result === 'declined') {
      setIncoming((prev) => prev.filter((r) => r.id !== req.id));
      showToast('Request declined');
    } else {
      showToast('Could not decline request — try again');
    }
    setBusyId(null);
  }, [busyId, showToast]);

  const handleWithdraw = useCallback(async (req) => {
    if (busyId) return;
    setBusyId(req.id);
    const ok = await withdrawConnectionRequest(req.id);
    if (ok) {
      setOutgoing((prev) => prev.filter((r) => r.id !== req.id));
      showToast('Request withdrawn');
    } else {
      showToast('Could not withdraw request');
    }
    setBusyId(null);
  }, [busyId, showToast]);

  const handleConnectPymk = useCallback(async (uid) => {
    if (busyId || sentPymk[uid]) return;
    setBusyId(uid);
    vibrate('light');
    const res = await sendConnectionRequest(uid);
    if (res === 'sent' || res === 'pending') {
      setSentPymk((prev) => ({ ...prev, [uid]: true }));
      showToast('Connection request sent');
      notification('success');
    } else if (res === 'already_connected') {
      setPymk((prev) => prev.filter((p) => p.id !== uid));
      showToast('Already connected');
    } else {
      showToast('Could not send request — try again');
    }
    setBusyId(null);
  }, [busyId, sentPymk, vibrate, notification, showToast]);

  const handleMessage = useCallback((uid) => {
    const key = ensureContactForUser(uid, people[uid] || { id: uid, name: 'User' });
    router.push(`/messages/${key}`);
  }, [ensureContactForUser, people, router]);

  const openProfile = useCallback((uid) => router.push(`/profile/${uid}`), [router]);

  function PersonRow({ uid, right }) {
    const p = people[uid];
    return (
      <div className="flex items-center gap-3 py-3">
        <button onClick={() => openProfile(uid)} className="flex-none">
          <Avatar src={p?.avatar} name={p?.name || '?'} size={44} />
        </button>
        <button onClick={() => openProfile(uid)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1">
            <span className="truncate text-[13.5px] font-bold">{p?.name || 'User'}</span>
            {p?.verified && <span className="text-[10px] text-gold">&#10003;</span>}
          </div>
          <div className="truncate text-[11.5px] text-text2">{p?.role || p?.handle || ''}</div>
        </button>
        {right}
      </div>
    );
  }

  return (
    <div className="app-shell flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-none items-center gap-3 border-b border-linesoft px-4 py-3">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full" aria-label="Go back">
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-[16px] font-black">My Network</h1>
          <p className="text-[11px] text-text3">
            {loading ? 'Loading…' : `${connections.length} connection${connections.length === 1 ? '' : 's'} · ${incoming.length} pending`}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/10 text-gold">
          <Users size={17} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={22} className="animate-spin text-gold" />
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {/* ── Pending requests ── */}
            <section>
              <h2 className="mb-1 text-[12px] font-bold text-text3">
                Pending requests {incoming.length > 0 && `(${incoming.length})`}
              </h2>
              {incoming.length === 0 ? (
                <p className="py-3 text-[12.5px] text-text3">No pending requests right now.</p>
              ) : (
                incoming.map((req) => (
                  <PersonRow
                    key={req.id}
                    uid={req.from_id}
                    right={
                      <div className="flex flex-none gap-2">
                        <button
                          onClick={() => handleDecline(req)}
                          disabled={busyId === req.id}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-linesoft text-text2 disabled:opacity-50"
                          aria-label="Decline request"
                        >
                          <X size={16} />
                        </button>
                        <button
                          onClick={() => handleAccept(req)}
                          disabled={busyId === req.id}
                          className="flex h-9 items-center gap-1.5 rounded-full bg-gold px-4 text-[12px] font-bold text-[#1a1300] disabled:opacity-50"
                        >
                          <UserCheck size={14} />
                          Accept
                        </button>
                      </div>
                    }
                  />
                ))
              )}
            </section>

            {/* ── Sent ── */}
            {outgoing.length > 0 && (
              <section>
                <h2 className="mb-1 text-[12px] font-bold text-text3">
                  Sent ({outgoing.length})
                </h2>
                {outgoing.map((req) => (
                  <PersonRow
                    key={req.id}
                    uid={req.to_id}
                    right={
                      <button
                        onClick={() => handleWithdraw(req)}
                        disabled={busyId === req.id}
                        className="flex flex-none items-center gap-1.5 rounded-full border border-linesoft px-3.5 py-2 text-[11.5px] font-bold text-text2 disabled:opacity-50"
                      >
                        <Clock size={13} />
                        Pending · Withdraw
                      </button>
                    }
                  />
                ))}
              </section>
            )}

            {/* ── Connections ── */}
            <section>
              <h2 className="mb-1 text-[12px] font-bold text-text3">
                Your connections {connections.length > 0 && `(${connections.length})`}
              </h2>
              {connections.length === 0 ? (
                <p className="py-3 text-[12.5px] text-text3">
                  No connections yet — accept a request or invite people below.
                </p>
              ) : (
                connections.map((uid) => (
                  <PersonRow
                    key={uid}
                    uid={uid}
                    right={
                      <button
                        onClick={() => handleMessage(uid)}
                        className="flex flex-none items-center gap-1.5 rounded-full border border-gold px-3.5 py-2 text-[11.5px] font-bold text-gold"
                      >
                        <MessageCircle size={13} />
                        Message
                      </button>
                    }
                  />
                ))
              )}
            </section>

            {/* ── People you may know ── */}
            <section>
              <h2 className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-text3">
                <Sparkles size={12} className="text-gold" />
                People you may know
              </h2>
              {pymk.length === 0 ? (
                <p className="py-3 text-[12.5px] text-text3">
                  Follow or connect with more founders to get suggestions.
                </p>
              ) : (
                pymk.map((person) => (
                  <PersonRow
                    key={person.id}
                    uid={person.id}
                    right={
                      <button
                        onClick={() => handleConnectPymk(person.id)}
                        disabled={busyId === person.id || sentPymk[person.id]}
                        className={`flex flex-none items-center gap-1.5 rounded-full px-3.5 py-2 text-[11.5px] font-bold disabled:opacity-70 ${
                          sentPymk[person.id]
                            ? 'bg-white/5 text-text3'
                            : 'border border-gold text-gold'
                        }`}
                      >
                        <UserPlus size={13} />
                        {sentPymk[person.id] ? 'Sent' : 'Connect'}
                      </button>
                    }
                  />
                ))
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
