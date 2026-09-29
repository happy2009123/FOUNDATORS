'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CalendarClock, Loader2, MessageCircle, Mic, Radio, Users } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import Avatar from '@/components/Avatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import VoiceRoomCard from '@/components/voice/VoiceRoomCard';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { getUserProfile } from '@/lib/firestore';
import { fetchHostRooms } from '@/lib/voice';

export default function FounderVoiceProfilePage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const params = useParams() || {};
  const uid = params.uid;

  const me = useStore((s) => s.profile);
  const showToast = useStore((s) => s.showToast);
  const toggleFollowUser = useStore((s) => s.toggleFollowUser);
  const followedUsers = useStore((s) => s.followedUsers);

  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');

  const isMe = me && uid && me.id === uid;
  const isFollowing = !!(uid && followedUsers && followedUsers[uid]);

  useEffect(() => {
    if (!ready || !uid) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getUserProfile(uid), fetchHostRooms(uid)])
      .then(([profileRes, hostRooms]) => {
        if (cancelled) return;
        setUser(profileRes && profileRes.success ? profileRes.data : null);
        setRooms(hostRooms);
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setRooms([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, uid]);

  const live = rooms.filter((r) => r.status === 'live');
  const upcoming = rooms.filter((r) => r.status === 'scheduled').sort((a, b) => (a.scheduledAtMs || 0) - (b.scheduledAtMs || 0));
  const past = rooms.filter((r) => r.status === 'ended').sort((a, b) => (b.endedAtMs || 0) - (a.endedAtMs || 0));
  const shown = tab === 'live' ? live : tab === 'upcoming' ? upcoming : past;

  return (
    <MainScreenShell className="wide-desktop no-rail">
      {ready ? (
        <div className="mx-auto w-full max-w-[960px] px-4 pb-12 pt-4">
          <button
            onClick={() => router.push('/voice')}
            className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-text2 active:text-gold"
          >
            <ArrowLeft size={15} /> Voice home
          </button>

          {loading ? (
            <div className="space-y-3">
              <div className="skeleton h-32 w-full rounded-2xl" />
              <div className="skeleton h-48 w-full rounded-2xl" />
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-line bg-card p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Avatar src={user && user.avatar} name={(user && user.name) || 'Founder'} size={84} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h1 className="truncate text-[20px] font-black">{(user && user.name) || 'Founder'}</h1>
                      {user && user.verified ? <VerifiedBadge size={16} /> : null}
                    </div>
                    <div className="text-[12.5px] text-text3">{(user && user.handle) || ''}</div>
                    {user && user.bio ? (
                      <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-text2">{user.bio}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {user && user.role ? (
                        <span className="rounded-full border border-line px-2.5 py-1 text-[10.5px] font-bold text-text2">
                          {user.role}
                        </span>
                      ) : null}
                      {(user && user.skills ? user.skills : []).slice(0, 6).map((s) => (
                        <span key={s} className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10.5px] font-bold text-text3">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:flex-col">
                    {!isMe ? (
                      <button
                        onClick={() => {
                          toggleFollowUser(uid);
                          showToast(isFollowing ? 'Unfollowed' : 'Following');
                        }}
                        className={`rounded-xl px-4 py-2.5 text-[12.5px] font-black active:scale-95 ${
                          isFollowing ? 'border border-gold/60 bg-gold/10 text-gold-hi' : 'bg-gold-grad text-[#171100]'
                        }`}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    ) : null}
                    <button
                      onClick={() => router.push(`/profile/${uid}`)}
                      className="rounded-xl border border-line px-4 py-2.5 text-[12.5px] font-black text-text2 active:scale-95"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => setTab('upcoming')}
                      className="rounded-xl border border-line px-4 py-2.5 text-[12.5px] font-black text-text2 active:scale-95"
                    >
                      Upcoming Rooms
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Rooms hosted', value: rooms.length, icon: Mic },
                    { label: 'Followers', value: (user && user.followers) || 0, icon: Users },
                    { label: 'Live now', value: live.length, icon: Radio },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-linesoft bg-white/[0.03] px-3 py-2.5 text-center">
                      <s.icon size={13} className="mx-auto mb-1 text-gold" />
                      <div className="text-[15px] font-black text-gold-hi">{s.value}</div>
                      <div className="text-[9.5px] font-bold uppercase tracking-wider text-text3">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                {[
                  { key: 'live', label: `Live (${live.length})` },
                  { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
                  { key: 'past', label: `Past (${past.length})` },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`rounded-full border px-4 py-2 text-[12px] font-extrabold ${
                      tab === t.key ? 'border-gold/70 bg-gold/10 text-gold-hi' : 'border-line bg-card text-text2'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                {shown.length ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {shown.map((room) => (
                      <VoiceRoomCard
                        key={room.roomId}
                        room={room}
                        onJoin={(r) => router.push(`/voice/room/${r.roomId}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
                    <CalendarClock size={26} className="mx-auto mb-2 text-text3" />
                    <div className="text-[13.5px] font-extrabold">
                      {tab === 'past' ? 'No past rooms yet' : tab === 'live' ? 'Not live right now' : 'No upcoming rooms'}
                    </div>
                    <div className="mt-1 text-[11.5px] text-text3">
                      {isMe ? 'Create a room to grow your voice presence.' : 'Follow to get notified when they host.'}
                    </div>
                    {isMe ? (
                      <button
                        onClick={() => router.push('/voice/create')}
                        className="mt-4 rounded-xl bg-gold-grad px-5 py-2.5 text-[12.5px] font-black text-[#171100]"
                      >
                        + Create Room
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[960px] px-4 py-6">
          <div className="skeleton h-32 w-full rounded-2xl" />
        </div>
      )}
    </MainScreenShell>
  );
}
