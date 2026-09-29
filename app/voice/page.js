'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic,
  Plus,
  Radio,
  CalendarClock,
  Sparkles,
  LayoutGrid,
  Users,
  Headphones,
  TrendingUp,
  FolderKanban,
} from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import VoiceRoomCard from '@/components/voice/VoiceRoomCard';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { notifyUser } from '@/lib/notify';
import {
  VOICE_CATEGORIES,
  subscribeVoiceByStatus,
  subscribeHostRooms,
  subscribeMyVoiceReminders,
  setVoiceReminder,
  scoreVoiceRooms,
  markReminderNotified,
} from '@/lib/voice';

const TABS = [
  { key: 'live', label: 'Live Now', icon: Radio },
  { key: 'upcoming', label: 'Upcoming', icon: CalendarClock },
  { key: 'foryou', label: 'For You', icon: Sparkles },
  { key: 'mine', label: 'My Rooms', icon: LayoutGrid },
];

function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-card/50 px-6 py-12 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/10 text-gold">
        <Icon size={22} />
      </span>
      <div className="text-[14px] font-extrabold">{title}</div>
      <div className="mt-1 max-w-[320px] text-[12px] leading-relaxed text-text3">{body}</div>
      {action}
    </div>
  );
}

export default function VoiceHomePage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const showToast = useStore((s) => s.showToast);
  const followedUsers = useStore((s) => s.followedUsers);

  const [tab, setTab] = useState('live');
  const [category, setCategory] = useState('');
  const [liveRooms, setLiveRooms] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [mine, setMine] = useState([]);
  const [reminders, setReminders] = useState([]);
  const notifiedRef = useRef(new Set());

  const uid = profile && profile.id ? profile.id : null;

  useEffect(() => {
    if (!ready || !uid) return;
    const unsubs = [
      subscribeVoiceByStatus('live', setLiveRooms),
      subscribeVoiceByStatus('scheduled', setUpcoming),
      subscribeHostRooms(uid, setMine),
      subscribeMyVoiceReminders(uid, setReminders),
    ];
    return () => unsubs.forEach((u) => {
      try {
        u();
      } catch (e) {}
    });
  }, [ready, uid]);

  useEffect(() => {
    if (!ready || !uid || !upcoming.length) return;
    const check = () => {
      upcoming.forEach((room) => {
        if (!reminders.includes(room.roomId)) return;
        if (room.hostId === uid) return;
        if (!room.scheduledAtMs) return;
        const delta = room.scheduledAtMs - Date.now();
        if (delta <= 0 || delta > 15 * 60 * 1000) return;
        const key = `${uid}:${room.roomId}`;
        if (notifiedRef.current.has(key)) return;
        notifiedRef.current.add(key);
        notifyUser(uid, {
          type: 'voice_reminder',
          actorKey: room.hostId,
          actorName: room.hostName,
          text: `Your reminder: “${room.title}” starts in 15 minutes.`,
          linkType: 'voice_room',
          linkId: room.roomId,
        }).catch(() => {});
        markReminderNotified(uid, room.roomId).catch(() => {});
      });
    };
    check();
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, [ready, uid, upcoming, reminders]);

  const sortedLive = useMemo(
    () =>
      [...liveRooms]
        .filter((r) => (category ? r.category === category : true))
        .sort((a, b) => (b.startedAtMs || 0) - (a.startedAtMs || 0)),
    [liveRooms, category]
  );
  const sortedUpcoming = useMemo(
    () =>
      [...upcoming]
        .filter((r) => (category ? r.category === category : true))
        .sort((a, b) => (a.scheduledAtMs || 0) - (b.scheduledAtMs || 0)),
    [upcoming, category]
  );
  const sortedMine = useMemo(() => {
    const rows = [...mine].filter((r) => (category ? r.category === category : true));
    if (tab === 'mine-upcoming') return rows.filter((r) => r.status === 'scheduled').sort((a, b) => (a.scheduledAtMs || 0) - (b.scheduledAtMs || 0));
    if (tab === 'mine-past') return rows.filter((r) => r.status === 'ended').sort((a, b) => (b.endedAtMs || 0) - (a.endedAtMs || 0));
    return rows.filter((r) => r.status !== 'ended').sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  }, [mine, category, tab]);

  const forYou = useMemo(() => {
    const seen = new Set();
    const pool = [...liveRooms, ...upcoming].filter((r) => {
      if (seen.has(r.roomId)) return false;
      seen.add(r.roomId);
      return category ? r.category === category : true;
    });
    return scoreVoiceRooms(pool, profile, followedUsers).slice(0, 12);
  }, [liveRooms, upcoming, profile, followedUsers, category]);

  const quickStats = useMemo(() => {
    const all = new Map();
    [...liveRooms, ...upcoming, ...mine].forEach((r) => all.set(r.roomId, r));
    const rows = [...all.values()];
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      live: liveRooms.length,
      upcoming: upcoming.length,
      listeners: liveRooms.reduce((sum, r) => sum + (r.participantCount || 0), 0),
      week: rows.filter((r) => (r.createdAtMs || 0) >= weekAgo).length,
    };
  }, [liveRooms, upcoming, mine]);

  const toggleReminder = async (room) => {
    if (!uid) return;
    const on = !reminders.includes(room.roomId);
    try {
      await setVoiceReminder(room.roomId, uid, on);
      showToast(on ? 'Reminder set' : 'Reminder removed');
    } catch (e) {
      showToast('Could not update reminder');
    }
  };

  const goCreate = () => router.push('/voice/create');
  const goRoom = (room) => router.push(`/voice/room/${room.roomId}`);

  const visibleRooms =
    tab === 'live'
      ? sortedLive
      : tab === 'upcoming'
      ? sortedUpcoming
      : tab === 'foryou'
      ? forYou
      : sortedMine;

  const categoryChip = (cat) => (
    <button
      key={cat}
      onClick={() => setCategory(category === cat ? '' : cat)}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-all active:scale-95 ${
        category === cat ? 'border-gold/70 bg-gold/10 text-gold-hi' : 'border-line bg-card text-text2 active:bg-white/5'
      }`}
    >
      {cat}
    </button>
  );

  const rightRail = (
    <aside className="hidden w-[300px] shrink-0 flex-col gap-4 lg:flex">
      <div className="rounded-2xl border border-line bg-card p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-grad text-[#171100]">
            <Sparkles size={17} />
          </span>
          <div className="text-[13.5px] font-extrabold leading-tight">
            Start a conversation.
            <br />
            <span className="text-text2 font-bold">Find your people.</span>
          </div>
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-text3">
          Create a room and bring together founders, builders and dreamers.
        </p>
        <button
          onClick={goCreate}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gold-grad py-2.5 text-[12.5px] font-black text-[#171100] active:scale-[0.98]"
        >
          <Plus size={15} /> Create Room
        </button>
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-[13px] font-extrabold">
          <LayoutGrid size={15} className="text-gold" /> Categories
        </div>
        <div className="grid grid-cols-2 gap-2">
          {VOICE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(category === cat ? '' : cat)}
              className={`truncate rounded-xl border px-2.5 py-2 text-left text-[11.5px] font-bold transition-all active:scale-[0.98] ${
                category === cat ? 'border-gold/70 bg-gold/10 text-gold-hi' : 'border-line bg-white/[0.03] text-text2 active:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-[13px] font-extrabold">
          <TrendingUp size={15} className="text-gold" /> Quick Stats
        </div>
        <div className="space-y-2.5">
          {[
            { icon: Radio, label: 'Live rooms', value: quickStats.live },
            { icon: CalendarClock, label: 'Upcoming rooms', value: quickStats.upcoming },
            { icon: Headphones, label: 'Listeners now', value: quickStats.listeners },
            { icon: Mic, label: 'Rooms this week', value: quickStats.week },
          ].map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[12px] text-text2">
                <s.icon size={13} className="text-text3" /> {s.label}
              </span>
              <span className="text-[13.5px] font-black text-gold-hi">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-[13px] font-extrabold">
            <FolderKanban size={15} className="text-gold" /> My Rooms
          </span>
          <button onClick={() => setTab('mine')} className="text-[11px] font-bold text-gold">
            View All →
          </button>
        </div>
        {mine.filter((r) => r.status !== 'ended').length ? (
          <div className="space-y-1.5">
            {mine
              .filter((r) => r.status !== 'ended')
              .slice(0, 3)
              .map((r) => (
                <button
                  key={r.roomId}
                  onClick={() => goRoom(r)}
                  className="w-full truncate rounded-xl border border-line bg-white/[0.03] px-2.5 py-2 text-left text-[12px] font-bold text-text2 active:bg-white/5"
                >
                  {r.title}
                </button>
              ))}
          </div>
        ) : (
          <p className="text-[11.5px] text-text3">You haven&apos;t created any rooms yet.</p>
        )}
        <button
          onClick={goCreate}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gold/50 bg-gold/10 py-2.5 text-[12.5px] font-black text-gold-hi active:scale-[0.98]"
        >
          <Plus size={15} /> Create Room
        </button>
      </div>
    </aside>
  );

  return (
    <MainScreenShell className="wide-desktop no-rail">
      {ready ? (
        <div className="mx-auto w-full max-w-[1360px] px-4 pb-10 pt-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3.5">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-grad text-[#171100] shadow-[0_8px_28px_-8px_rgba(217,172,61,0.55)]">
                <Mic size={26} />
              </span>
              <div>
                <h1 className="font-display text-[22px] font-black leading-none sm:text-[26px]">
                  FOUNDATORS <span className="text-gold">VOICE</span>
                </h1>
                <p className="mt-1.5 text-[12.5px] text-text2">
                  Where founders talk, connect and build.
                </p>
                <div className="mt-1 hidden items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-text3 sm:flex">
                  Talk <span className="text-gold">·</span> Share <span className="text-gold">·</span> Build
                </div>
              </div>
            </div>
            <button
              onClick={goCreate}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gold-grad px-6 py-3 text-[14px] font-black text-[#171100] shadow-[0_6px_20px_-6px_rgba(217,172,61,0.6)] active:scale-[0.98]"
            >
              <Plus size={17} strokeWidth={2.6} /> Create Room
            </button>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-[12.5px] font-extrabold transition-all ${
                  tab === t.key
                    ? 'border-gold/70 bg-gold/10 text-gold-hi shadow-[0_0_16px_-6px_rgba(217,172,61,0.5)]'
                    : 'border-line bg-card text-text2 active:bg-white/5'
                }`}
              >
                <t.icon size={13} />
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar lg:hidden">
            <button
              onClick={() => setCategory('')}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${
                !category ? 'border-gold/70 bg-gold/10 text-gold-hi' : 'border-line bg-card text-text2'
              }`}
            >
              All
            </button>
            {VOICE_CATEGORIES.map(categoryChip)}
          </div>

          <div className="mt-5 flex gap-6">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[15.5px] font-black">
                  {tab === 'live' ? <Radio size={16} className="text-brandred" /> : null}
                  {tab === 'upcoming' ? <CalendarClock size={16} className="text-gold" /> : null}
                  {tab === 'foryou' ? <Sparkles size={16} className="text-gold" /> : null}
                  {tab === 'mine' ? <Users size={16} className="text-gold" /> : null}
                  {TABS.find((t) => t.key === tab)?.label}
                  {category ? <span className="text-[12px] font-bold text-text3">· {category}</span> : null}
                </h2>
                <span className="text-[11.5px] font-bold text-text3">{visibleRooms.length} rooms</span>
              </div>

              {visibleRooms.length ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleRooms.map((room) => (
                    <VoiceRoomCard
                      key={room.roomId}
                      room={room}
                      onJoin={goRoom}
                      onReminder={toggleReminder}
                      reminded={reminders.includes(room.roomId)}
                      actionLabel={room.hostId === uid && room.status === 'live' ? 'Open Room' : 'Join Room'}
                    />
                  ))}
                </div>
              ) : tab === 'mine' ? (
                <EmptyState
                  icon={Mic}
                  title="No rooms yet"
                  body="Create your first Founder Voice room — go live now or schedule it for later."
                  action={
                    <button
                      onClick={goCreate}
                      className="mt-4 rounded-xl bg-gold-grad px-5 py-2.5 text-[12.5px] font-black text-[#171100] active:scale-[0.98]"
                    >
                      + Create Room
                    </button>
                  }
                />
              ) : tab === 'foryou' ? (
                <EmptyState
                  icon={Sparkles}
                  title="Nothing matched yet"
                  body="Rooms are scored from your skills, interests and the founders you follow. Follow more founders or create your own room."
                />
              ) : (
                <EmptyState
                  icon={Radio}
                  title={tab === 'live' ? 'No live rooms right now' : 'No upcoming rooms'}
                  body={
                    tab === 'live'
                      ? 'Be the first — start a room and invite your network.'
                      : 'Schedule a room so your followers get a reminder.'
                  }
                  action={
                    <button
                      onClick={goCreate}
                      className="mt-4 rounded-xl bg-gold-grad px-5 py-2.5 text-[12.5px] font-black text-[#171100] active:scale-[0.98]"
                    >
                      + Create Room
                    </button>
                  }
                />
              )}
            </div>

            {rightRail}
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[1360px] px-4 py-6">
          <div className="skeleton mb-4 h-24 w-full rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-56 rounded-2xl" />
            ))}
          </div>
        </div>
      )}
    </MainScreenShell>
  );
}
