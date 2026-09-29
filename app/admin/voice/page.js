'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN → VOICE MODERATION
// Live inventory of FOUNDATORS VOICE rooms with real moderation
// actions: lock/unlock a room, force-end a live room, delete a
// room (cleans every subcollection), plus an audit-log entry for
// every action taken. Data comes straight from voiceRooms.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Radio, CalendarClock, History, Eye, Trash2, Lock, Unlock, StopCircle, Flag } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { useStore } from '@/lib/store';
import {
  endVoiceRoom, deleteVoiceRoom, toggleRoomLock, formatRoomTime,
} from '@/lib/voice';
import { recordAdminAction, fetchReports } from '@/lib/adminData';
import { timeAgo } from '@/lib/admin';
import {
  Card, PageHeader, TableSkeleton, EmptyState, ErrorState, Badge,
  ConfirmDialog, FilterChips, AvatarDot,
} from '@/components/admin/ui';

const TABS = [
  { value: 'live', label: 'Live now' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'ended', label: 'Ended' },
];

async function fetchVoiceRooms(status, maxN) {
  const q = query(collection(db, 'voiceRooms'), where('status', '==', status), limit(maxN));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ roomId: d.id, id: d.id, ...d.data() }));
  const ts = (v) => v?.toMillis?.() || v?.seconds * 1000 || 0;
  if (status === 'scheduled') list.sort((a, b) => (a.scheduledAtMs || 0) - (b.scheduledAtMs || 0));
  else if (status === 'ended') list.sort((a, b) => ts(b.endedAt) - ts(a.endedAt));
  else list.sort((a, b) => ts(b.startedAt) - ts(a.startedAt));
  return list;
}

export default function AdminVoicePage() {
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const showToast = useStore((s) => s.showToast);

  const [tab, setTab] = useState('live');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null); // {kind, room}
  const [busy, setBusy] = useState(false);
  const [flagged, setFlagged] = useState({});

  const load = useCallback(async () => {
    setError(null);
    setRows(null);
    try {
      const list = await fetchVoiceRooms(tab, tab === 'ended' ? 40 : 30);
      setRows(list);
      if (tab === 'live') {
        try {
          const reports = await fetchReports(100);
          const map = {};
          (reports || []).forEach((r) => {
            if (r.targetType === 'voiceRoom' && r.reportedId) map[r.reportedId] = (map[r.reportedId] || 0) + 1;
          });
          setFlagged(map);
        } catch {}
      }
    } catch (e) {
      setError(e?.message || 'Failed to load rooms');
      setRows([]);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function runAction(kind, room) {
    setBusy(true);
    setConfirm(null);
    try {
      if (kind === 'end') {
        await endVoiceRoom(room.roomId, profile?.id);
        await recordAdminAction('voice_end_room', room.roomId, `Force-ended live room "${room.title}"`);
        showToast('Room ended');
      } else if (kind === 'lock') {
        await toggleRoomLock(room.roomId, !room.isLocked);
        await recordAdminAction(room.isLocked ? 'voice_unlock_room' : 'voice_lock_room', room.roomId, `${room.isLocked ? 'Unlocked' : 'Locked'} room "${room.title}"`);
        showToast(room.isLocked ? 'Room unlocked' : 'Room locked');
      } else if (kind === 'delete') {
        await deleteVoiceRoom(room.roomId);
        await recordAdminAction('voice_delete_room', room.roomId, `Deleted room "${room.title}"`);
        showToast('Room deleted');
      }
      load();
    } catch (e) {
      showToast(`Failed: ${e?.message || 'permission denied'}`);
    }
    setBusy(false);
  }

  return (
    <div className="animate-screen-in">
      <PageHeader
        title="Voice Moderation"
        subtitle="Live, scheduled and past FOUNDATORS VOICE rooms — lock, force-end or delete."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterChips options={TABS} value={tab} onChange={setTab} />
      </div>

      <Card className="overflow-hidden">
        {!rows ? (
          <TableSkeleton rows={5} cols={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Radio}
            title={tab === 'live' ? 'No live rooms' : tab === 'scheduled' ? 'No scheduled rooms' : 'No ended rooms yet'}
            body={tab === 'live' ? 'Nothing is broadcasting right now.' : tab === 'scheduled' ? 'Upcoming rooms will appear here.' : 'Completed sessions will appear here.'}
          />
        ) : (
          rows.map((r) => (
            <div key={r.roomId} className="flex items-start gap-3 border-b border-white/5 px-5 py-4 last:border-0 hover:bg-white/[0.03]">
              <AvatarDot src={r.hostAvatar} name={r.hostName} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[13px] font-bold">{r.title || 'Untitled room'}</span>
                  <Badge tone={r.status === 'live' ? 'green' : r.status === 'scheduled' ? 'gold' : 'gray'}>
                    {r.status === 'live' ? 'live' : r.status}
                  </Badge>
                  {r.type ? <Badge tone="gray">{r.type}</Badge> : null}
                  {r.isLocked ? <Badge tone="red">locked</Badge> : null}
                  {flagged[r.roomId] ? <Badge tone="red">{flagged[r.roomId]} report(s)</Badge> : null}
                  <span className="text-[11.5px] text-text3">
                    {r.status === 'scheduled' ? formatRoomTime(r) : timeAgo(r.startedAt || r.createdAt)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-text2">
                  {r.description || 'No description.'}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-4 text-[11.5px] text-text3">
                  <span>host: {r.hostName || 'Unknown'}</span>
                  <span>speakers: {r.speakerCount || 0}/{r.maxSpeakers || 0}</span>
                  <span>listeners: {Math.max(0, (r.participantCount || 0) - (r.speakerCount || 0))}</span>
                  <span>{r.category || 'uncategorised'}</span>
                </div>
              </div>
              <div className="flex flex-none flex-wrap justify-end gap-1.5">
                <button
                  onClick={() => router.push(`/voice/room/${r.roomId}`)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[11.5px] font-bold text-text2 hover:border-gold/40 hover:text-gold-hi"
                >
                  <Eye size={13} /> Open
                </button>
                {r.status === 'live' && (
                  <>
                    <button
                      onClick={() => runAction('lock', r)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[11.5px] font-bold text-text2 hover:border-gold/40 hover:text-gold-hi"
                    >
                      {r.isLocked ? <Unlock size={13} /> : <Lock size={13} />} {r.isLocked ? 'Unlock' : 'Lock'}
                    </button>
                    <button
                      onClick={() => setConfirm({ kind: 'end', room: r })}
                      className="inline-flex items-center gap-1 rounded-lg border border-brandred/30 px-3 py-1.5 text-[11.5px] font-bold text-brandred hover:bg-brandred/10"
                    >
                      <StopCircle size={13} /> End
                    </button>
                  </>
                )}
                <button
                  onClick={() => setConfirm({ kind: 'delete', room: r })}
                  className="inline-flex items-center gap-1 rounded-lg border border-brandred/30 px-3 py-1.5 text-[11.5px] font-bold text-brandred hover:bg-brandred/10"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </Card>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === 'delete' ? 'Delete room' : 'Force-end room'}
        body={
          confirm
            ? confirm.kind === 'delete'
              ? `Delete "${confirm.room.title}" and all of its data (participants, questions, signals)? This cannot be undone. Recorded in the admin audit log.`
              : `Force-end "${confirm.room.title}"? Listeners are disconnected immediately. Recorded in the admin audit log.`
            : ''
        }
        confirmLabel={confirm?.kind === 'delete' ? 'Delete' : 'End room'}
        danger
        busy={busy}
        onConfirm={() => runAction(confirm.kind, confirm.room)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
