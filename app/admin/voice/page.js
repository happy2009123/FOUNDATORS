'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN → VOICE MODERATION
// Live inventory of FOUNDATORS VOICE rooms with real moderation
// actions: force-end a live room, delete a room, plus an
// audit-log entry for every action taken. Data comes straight
// from voice_sessions; room status is derived from active /
// ended_at (the table has no status column).
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Radio, Eye, Trash2, StopCircle } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { mapRows, toMillis } from '@/lib/supabase/db';
import { useStore } from '@/lib/store';
import {
  endVoiceRoom, deleteVoiceRoom, formatRoomTime,
} from '@/lib/voice';
import { recordAdminAction, fetchReports, resolveUsers } from '@/lib/adminData';
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
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  let q = supabase.from('voice_sessions').select('*').limit(maxN);
  if (status === 'ended') {
    q = q.not('ended_at', 'is', null).order('ended_at', { ascending: false });
  } else if (status === 'live') {
    q = q.eq('active', true).is('ended_at', null).order('created_at', { ascending: false });
  } else {
    q = q.eq('active', false).is('ended_at', null).order('created_at', { ascending: true });
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const list = mapRows(data).map((r) => ({
    ...r,
    roomId: r.id,
    status,
    participantCount: Array.isArray(r.participants) ? r.participants.length : 0,
    createdAtMs: toMillis(r.createdAt),
  }));
  const hostIds = [...new Set(list.map((r) => r.hostId).filter(Boolean))];
  const hosts = hostIds.length ? await resolveUsers(hostIds) : {};
  return list.map((r) => ({
    ...r,
    hostName: hosts[r.hostId]?.name || r.hostName,
    hostAvatar: hosts[r.hostId]?.avatar || r.hostAvatar,
  }));
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
          const res = await fetchReports(100);
          const reports = res.ok ? res.data : [];
          const map = {};
          (reports || []).forEach((r) => {
            if (r.targetType === 'voiceRoom' && r.targetId) map[r.targetId] = (map[r.targetId] || 0) + 1;
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
        subtitle="Live, scheduled and past FOUNDATORS VOICE rooms — force-end or delete."
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
                  {flagged[r.roomId] ? <Badge tone="red">{flagged[r.roomId]} report(s)</Badge> : null}
                  <span className="text-[11.5px] text-text3">
                    {r.status === 'ended'
                      ? `ended ${timeAgo(r.endedAt || r.createdAt)}`
                      : formatRoomTime(r) || timeAgo(r.createdAt)}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-4 text-[11.5px] text-text3">
                  <span>host: {r.hostName || 'Unknown'}</span>
                  <span>participants: {r.participantCount}</span>
                  <span>{r.channel || 'no channel'}</span>
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
                  <button
                    onClick={() => setConfirm({ kind: 'end', room: r })}
                    className="inline-flex items-center gap-1 rounded-lg border border-brandred/30 px-3 py-1.5 text-[11.5px] font-bold text-brandred hover:bg-brandred/10"
                  >
                    <StopCircle size={13} /> End
                  </button>
                )}
                <button
                  onClick={() => r.hostId === profile?.id && setConfirm({ kind: 'delete', room: r })}
                  disabled={r.hostId !== profile?.id}
                  title={r.hostId === profile?.id ? 'Delete this room' : 'RLS only lets the host delete a room — admins delete others from the Supabase dashboard'}
                  className="inline-flex items-center gap-1 rounded-lg border border-brandred/30 px-3 py-1.5 text-[11.5px] font-bold text-brandred hover:bg-brandred/10 disabled:cursor-not-allowed disabled:opacity-40"
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
              ? `Delete "${confirm.room.title}" and its session data? This cannot be undone. Recorded in the admin audit log.`
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
