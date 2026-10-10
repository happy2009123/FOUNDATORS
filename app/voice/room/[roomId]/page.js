'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  Hand,
  Link2,
  Loader2,
  Megaphone,
  Mic,
  MicOff,
  MessageCircle,
  MoreVertical,
  Radio,
  Share2,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import Avatar from '@/components/Avatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { conversationIdFor } from '@/lib/firestore';
import { VoiceMesh } from '@/lib/voiceAudio';
import {
  subscribeVoiceRoom,
  subscribeVoiceParticipants,
  subscribeVoiceRequests,
  subscribeVoiceQuestions,
  subscribeVoiceReactions,
  joinVoiceRoom,
  leaveVoiceRoom,
  heartbeatVoiceRoom,
  updateVoiceCounts,
  raiseHand,
  cancelHand,
  approveSpeaker,
  rejectSpeaker,
  setParticipantRole,
  removeParticipant,
  setSelfMuted,
  inviteSpeaker,
  toggleRoomLock,
  pinRoomTopic,
  updateVoiceRoom,
  addQuestion,
  setQuestionStatus,
  deleteQuestion,
  sendReaction,
  setVoiceReminder,
  startVoiceRoom,
  endVoiceRoom,
  shareVoiceRoom,
  voiceRoomUrl,
  reportVoiceRoom,
  canModerateRoom,
  isRoomSpeaker,
  formatRoomTime,
} from '@/lib/voice';
import { notifyUser } from '@/lib/notify';
import {
  TemplateCard,
  QuestionsPanel,
  PeoplePanel,
  HostControlsPanel,
  useInviteSearch,
} from '@/components/voice/RoomPanels';

function RemoteAudio({ stream }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream || null;
    el.muted = false;
    if (stream) {
      // Some Android WebViews only un-mute after canplay fires.
      const onReady = () => attemptPlay(el);
      el.addEventListener('canplay', onReady);
      attemptPlay(el);
      return () => el.removeEventListener('canplay', onReady);
    }
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline />;
}

// iOS/Safari block programmatic play() that did not start from a user
// gesture. Queue any element whose play() rejected and retry it on the
// next tap anywhere on screen, so remote voice unblocks after one touch
// instead of staying silent forever.
const pendingPlays = new Set();
let unlockListenerBound = false;

function attemptPlay(el) {
  const p = el.play();
  if (!p || typeof p.catch !== 'function') return;
  p.catch(() => {
    pendingPlays.add(el);
    if (unlockListenerBound) return;
    unlockListenerBound = true;
    const onGesture = () => {
      pendingPlays.forEach((target) => {
        const retry = target.play();
        if (retry && typeof retry.then === 'function') {
          retry.then(() => pendingPlays.delete(target)).catch(() => {});
        } else {
          pendingPlays.delete(target);
        }
      });
      if (pendingPlays.size === 0) {
        document.removeEventListener('pointerdown', onGesture);
        document.removeEventListener('touchstart', onGesture);
        unlockListenerBound = false;
      }
    };
    document.addEventListener('pointerdown', onGesture, { passive: true });
    document.addEventListener('touchstart', onGesture, { passive: true });
  });
}

function SpeakerTile({ p, active, isMe, muted, compact }) {
  return (
    <div
      className={`relative flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 transition-all duration-300 ${
        active
          ? 'border-gold/70 bg-gold/[0.07] shadow-[0_0_26px_-8px_rgba(217,172,61,0.9)]'
          : 'border-line bg-card'
      } ${compact ? '' : ''}`}
    >
      <span
        className={`rounded-full p-[3px] transition-all ${
          active ? 'bg-gold-grad shadow-[0_0_16px_-4px_rgba(217,172,61,0.9)]' : 'bg-white/10'
        }`}
      >
        <Avatar src={p.avatar} name={p.name} size={compact ? 44 : 54} />
      </span>
      <div className="flex max-w-full items-center gap-1">
        <span className="truncate text-[11.5px] font-extrabold text-text1">{p.name}{isMe ? ' (you)' : ''}</span>
        {p.verified ? <VerifiedBadge size={10} /> : null}
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
          p.role === 'host'
            ? 'bg-gold text-[#171100]'
            : p.role === 'coHost'
            ? 'bg-brandblue/20 text-brandblue'
            : 'border border-line text-text2'
        }`}
      >
        {p.role === 'coHost' ? 'Co-Host' : p.role}
      </span>
      {isMe && muted && isRoomSpeaker(p.role) ? (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-brandred">
          <MicOff size={11} />
        </span>
      ) : null}
      {!isMe && p.isMuted && isRoomSpeaker(p.role) ? (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-brandred">
          <MicOff size={11} />
        </span>
      ) : null}
    </div>
  );
}

const REACTION_EMOJIS = ['❤️', '🔥', '👏', '💡', '🚀'];

export default function VoiceRoomPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const params = useParams() || {};
  const roomId = params.roomId;

  const profile = useStore((s) => s.profile);
  const showToast = useStore((s) => s.showToast);
  const publishPost = useStore((s) => s.publishPost);
  const toggleFollowUser = useStore((s) => s.toggleFollowUser);
  const blockUser = useStore((s) => s.blockUser);
  const reportItem = useStore((s) => s.reportItem);
  const followedUsers = useStore((s) => s.followedUsers);

  const [room, setRoom] = useState(null);
  const [roomMissing, setRoomMissing] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [participantsLoaded, setParticipantsLoaded] = useState(false);
  const [requests, setRequests] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [joined, setJoined] = useState(false);
  const [myRole, setMyRole] = useState(null);
  const [kicked, setKicked] = useState(false);
  const [joinError, setJoinError] = useState('');

  const [streams, setStreams] = useState({});
  const [audioState, setAudioState] = useState({ peers: 'idle', mic: 'off', peerCount: 0 });
  const [muted, setMuted] = useState(false);
  const [micIssue, setMicIssue] = useState('');
  const [activeSpeakers, setActiveSpeakers] = useState([]);

  const [sheet, setSheet] = useState(null);
  const [sideTab, setSideTab] = useState('questions');
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reactionPulse, setReactionPulse] = useState(0);
  const [inviteResults, inviteSearch, inviteClear] = useInviteSearch();
  const [now, setNow] = useState(Date.now());

  const meshRef = useRef(null);
  const joinedRef = useRef(false);
  const participantsLoadedRef = useRef(false);

  const uid = profile && profile.id ? profile.id : null;
  const isHost = !!(room && uid && room.hostId === uid);
  const canMod = !!(room && uid && canModerateRoom(room, uid, myRole));
  const myP = useMemo(() => participants.find((p) => p.uid === uid) || null, [participants, uid]);
  const mySpeaker = isRoomSpeaker(myRole);
  const speakers = useMemo(
    () => participants.filter((p) => p.status === 'joined' && isRoomSpeaker(p.role)),
    [participants]
  );
  const listeners = useMemo(
    () => participants.filter((p) => p.status === 'joined' && p.role === 'listener'),
    [participants]
  );
  const pinnedQuestion = useMemo(() => questions.find((q) => q.status === 'pinned') || null, [questions]);
  const liveCount = participants.filter((p) => p.status === 'joined').length;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!ready || !roomId) return;
    const unsubs = [
      subscribeVoiceRoom(
        roomId,
        (data) => {
          if (data === null) setRoomMissing(true);
          setRoom(data);
        },
        () => setAccessDenied(true)
      ),
      subscribeVoiceParticipants(roomId, (rows) => {
        setParticipants(rows);
        participantsLoadedRef.current = true;
        setParticipantsLoaded(true);
      }),
      subscribeVoiceQuestions(roomId, setQuestions),
    ];
    return () =>
      unsubs.forEach((u) => {
        try {
          u();
        } catch (e) {}
      });
  }, [ready, roomId]);

  useEffect(() => {
    if (!ready || !roomId || !room) return;
    if (!canMod) return;
    return subscribeVoiceRequests(roomId, setRequests);
  }, [ready, roomId, room, canMod]);

  useEffect(() => {
    if (!ready || !roomId || !room) return;
    if (room.allowReactions === false) return;
    return subscribeVoiceReactions(roomId, setReactions);
  }, [ready, roomId, room]);

  useEffect(() => {
    if (!room || room.status !== 'live' || !uid || !participantsLoaded) return;
    if (joinedRef.current || kicked || joinError) return;
    if (room.type === 'private' && !participants.some((p) => p.uid === uid) && !isHost) {
      setJoinError('This is a private room — the host must invite you.');
      return;
    }
    if (room.isLocked && !isHost && !participants.some((p) => p.uid === uid)) {
      setJoinError('This room is locked right now.');
      return;
    }
    joinedRef.current = true;
    joinVoiceRoom(roomId, profile, isHost ? 'host' : undefined)
      .then((role) => {
        setJoined(true);
        setMyRole(role);
      })
      .catch((e) => {
        joinedRef.current = false;
        setJoinError('Could not join this room. You may not have access.');
      });
  }, [ready, room, uid, participants, participantsLoaded, kicked, joinError, isHost, profile, roomId]);

  useEffect(() => {
    if (!joined || !participantsLoaded || kicked) return;
    if (!myP && participantsLoadedRef.current) {
      setKicked(true);
      joinedRef.current = false;
    } else if (myP) {
      setMyRole(myP.role);
    }
  }, [joined, participants, participantsLoaded, myP, kicked]);

  useEffect(() => {
    if (!ready || !roomId || !joined || !room || room.status !== 'live') return;
    const mesh = new VoiceMesh({
      roomId,
      selfId: uid,
      onStateChange: setAudioState,
      onRemoteStream: (peerId, stream) =>
        setStreams((prev) => {
          const next = { ...prev };
          if (stream) next[peerId] = stream;
          else delete next[peerId];
          return next;
        }),
      onActiveSpeakers: setActiveSpeakers,
    });
    meshRef.current = mesh;
    mesh.setParticipants(participants);
    mesh.start();
    return () => {
      mesh.destroy();
      meshRef.current = null;
      setStreams({});
      setActiveSpeakers([]);
    };
  }, [ready, roomId, joined, room && room.status, uid]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh) mesh.setParticipants(participants);
    if (participantsLoaded && room && uid) {
      const joinedRows = participants.filter((p) => p.status === 'joined');
      const speakerRows = joinedRows.filter((p) => isRoomSpeaker(p.role));
      const preview = [...speakerRows, ...joinedRows.filter((p) => !isRoomSpeaker(p.role))]
        .map((p) => p.avatar)
        .filter(Boolean)
        .slice(0, 6);
      const needsUpdate =
        joinedRows.length !== (room.participantCount || 0) ||
        speakerRows.length !== (room.speakerCount || 0) ||
        preview.join('|') !== (room.previewAvatars || []).join('|');
      if (needsUpdate && canMod) {
        updateVoiceCounts(roomId, {
          participantCount: joinedRows.length,
          speakerCount: speakerRows.length,
          previewAvatars: preview,
        });
      }
    }
  }, [participants, participantsLoaded, room, uid, canMod, roomId]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !joined) return;
    if (mySpeaker) {
      mesh.ensureMic().then((res) => {
        if (!res.ok) setMicIssue(res.reason || 'unavailable');
        else setMicIssue('');
      });
      if (myP && myP.isMuted) {
        mesh.setMicEnabled(false);
        setMuted(true);
      } else {
        mesh.setMicEnabled(true);
        setMuted(false);
      }
    } else {
      mesh.releaseMic();
      setMuted(false);
      setMicIssue('');
      if (myP && myP.isMuted) setSelfMuted(roomId, uid, false).catch(() => {});
    }
  }, [mySpeaker, joined, myRole]);

  useEffect(() => {
    if (!ready || !joined || !room || room.status !== 'live') return;
    heartbeatVoiceRoom(roomId, uid, isHost);
    const t = setInterval(() => heartbeatVoiceRoom(roomId, uid, isHost), 20000);
    return () => clearInterval(t);
  }, [ready, joined, room, roomId, uid, isHost]);

  useEffect(() => {
    if (!ready || !joined || !room || room.status !== 'live') return;
    const onUnload = () => {
      leaveVoiceRoom(roomId, uid);
    };
    window.addEventListener('pagehide', onUnload);
    return () => {
      window.removeEventListener('pagehide', onUnload);
      leaveVoiceRoom(roomId, uid);
    };
  }, [ready, joined, room, roomId, uid]);

  useEffect(() => {
    if (!canMod || !participantsLoaded || !room) return;
    const prune = () => {
      const cutoff = Date.now() - 100000;
      participants.forEach((p) => {
        if (p.uid === uid || p.status !== 'joined' || p.role === 'host') return;
        const last = p.lastActiveAt && p.lastActiveAt.toDate ? p.lastActiveAt.toDate().getTime() : 0;
        if (last && last < cutoff) removeParticipant(roomId, p.uid).catch(() => {});
      });
    };
    const t = setInterval(prune, 60000);
    return () => clearInterval(t);
  }, [canMod, participants, participantsLoaded, room, uid, roomId]);

  const ensureMic = useCallback(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.ensureMic().then((res) => {
      if (res.ok) setMicIssue('');
      else {
        setMicIssue(res.reason || 'unavailable');
        if (res.reason === 'insecure') showToast('Voice needs HTTPS — open the app over https:// to use your mic.');
        else if (res.reason === 'denied') showToast('Microphone blocked. Allow mic access in your browser, then tap the mic again.');
        else showToast('No microphone found on this device.');
      }
    });
  }, [showToast]);

  // The mic button itself activates the microphone inside a real tap.
  // Mobile browsers (iOS especially) attach the permission prompt to a user
  // gesture — the automatic effect can fail silently, so tapping the mic
  // must always be a valid way to (re)enable it.
  const onMicPress = () => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (audioState.mic !== 'on' && audioState.mic !== 'muted') {
      ensureMic();
      return;
    }
    toggleMute();
  };

  const toggleMute = () => {
    const mesh = meshRef.current;
    if (!mesh || !mySpeaker) return;
    const next = !muted;
    setMuted(next);
    mesh.setMicEnabled(!next);
    setSelfMuted(roomId, uid, next).catch(() => {});
  };

  const onRaise = async () => {
    if (!room || !myP) return;
    setBusy(true);
    try {
      if (myP.raisedHand) {
        await cancelHand(roomId, uid);
        showToast('Hand lowered');
      } else {
        await raiseHand(room, profile);
        showToast('Hand raised — the host will see your request');
      }
    } catch (e) {
      showToast('Could not raise hand');
    }
    setBusy(false);
  };

  const onAsk = async (text) => {
    try {
      await addQuestion(room, profile, text);
    } catch (e) {
      showToast(e.message || 'Could not send question');
    }
  };

  const actions = useMemo(
    () => ({
      approve: async (targetUid) => {
        setBusy(true);
        try {
          const req = requests.find((r) => r.uid === targetUid);
          if (req) await approveSpeaker(room, targetUid, profile);
          else await setParticipantRole(roomId, targetUid, 'speaker');
          showToast('Speaker approved');
        } catch (e) {
          showToast('Could not approve speaker');
        }
        setBusy(false);
      },
      reject: async (targetUid) => {
        try {
          await rejectSpeaker(room, targetUid);
          showToast('Request rejected');
        } catch (e) {
          showToast('Could not reject request');
        }
      },
      demote: async (targetUid) => {
        try {
          await setParticipantRole(roomId, targetUid, 'listener');
        } catch (e) {
          showToast('Could not move speaker');
        }
      },
      toggleCoHost: async (targetUid, on) => {
        try {
          await setParticipantRole(roomId, targetUid, on ? 'coHost' : 'listener');
          showToast(on ? 'Co-host added' : 'Co-host removed');
        } catch (e) {
          showToast('Could not change co-host');
        }
      },
      remove: async (targetUid) => {
        try {
          await removeParticipant(roomId, targetUid);
          showToast('Participant removed');
        } catch (e) {
          showToast('Could not remove participant');
        }
      },
    }),
    [room, roomId, requests, profile, showToast]
  );

  const doShare = () => shareVoiceRoom(room, showToast);

  const shareToFeed = async () => {
    try {
      const url = voiceRoomUrl(room.roomId);
      const when = room.status === 'live' ? 'live now' : room.status === 'scheduled' ? 'starts soon' : 'happened';
      await publishPost({
        text: `🎙 "${room.title}" is ${when} on Foundators Voice — jump in: ${url}`,
        tagType: 'voice',
        imageUrl: '',
      });
      showToast('Shared to your feed');
    } catch (e) {
      showToast('Could not share to feed');
    }
  };

  const doReportRoom = async () => {
    setMenuOpen(false);
    try {
      await reportVoiceRoom(room, uid, 'Inappropriate room');
      showToast('Room reported. Thank you.');
    } catch (e) {
      showToast('Could not send report');
    }
  };

  const doReportUser = (p) => {
    reportItem({
      type: 'user',
      targetType: 'user',
      targetUserId: p.uid,
      reason: 'Inappropriate behavior in voice room',
      details: `Room ${roomId}`,
    });
    showToast('User reported. Thank you.');
  };

  const doBlock = (p) => {
    blockUser(p.uid);
    showToast(`${p.name} blocked`);
  };

  const doFollow = () => {
    if (!uid || isHost) return;
    toggleFollowUser(room.hostId);
    showToast(followedUsers[room.hostId] ? 'Unfollowed' : 'Following host');
  };

  const doMessageHost = () => {
    if (!uid) return;
    router.push(`/messages/${conversationIdFor(uid, room.hostId)}`);
  };

  const doReminder = async () => {
    try {
      await setVoiceReminder(roomId, uid, true);
      showToast('Reminder set');
    } catch (e) {
      showToast('Could not set reminder');
    }
  };

  const doStart = async () => {
    setBusy(true);
    try {
      await startVoiceRoom(roomId);
      await notifyUser(room.hostId, {
        type: 'voice_started',
        actorKey: room.hostId,
        actorName: room.hostName,
        text: `Your room “${room.title}” is starting now.`,
        linkType: 'voice_room',
        linkId: roomId,
      }).catch(() => {});
      const { notifyRoomStarted, notifyFollowersOfRoom } = await import('@/lib/voice');
      notifyRoomStarted(room).catch(() => {});
      notifyFollowersOfRoom(room).catch(() => {});
      showToast('Room is live!');
    } catch (e) {
      showToast('Could not start room');
    }
    setBusy(false);
  };

  const doEnd = async () => {
    setBusy(true);
    try {
      await endVoiceRoom(roomId, uid);
      if (meshRef.current) meshRef.current.destroy();
      showToast('Room ended');
    } catch (e) {
      showToast('Could not end room');
    }
    setBusy(false);
  };

  const doLeave = async () => {
    if (meshRef.current) meshRef.current.destroy();
    joinedRef.current = false;
    setJoined(false);
    try {
      await leaveVoiceRoom(roomId, uid);
    } catch (e) {}
    router.push('/voice');
  };

  const sendReactionNow = async (type) => {
    try {
      await sendReaction(room, profile, type);
      setReactionPulse((n) => n + 1);
    } catch (e) {}
  };

  const stateLabel = (() => {
    if (audioState.mic === 'insecure') return 'Mic needs https://';
    if (audioState.mic === 'denied' || audioState.mic === 'unavailable') return 'Microphone unavailable';
    if (kicked || !joined) return 'Disconnected';
    if (audioState.peers === 'connecting') return 'Connecting…';
    if (audioState.peers === 'reconnecting') return 'Reconnecting…';
    if (audioState.peers === 'connected') return 'Connected';
    return 'Disconnected';
  })();

  const stateTone =
    audioState.peers === 'connected' && (mySpeaker ? audioState.mic === 'on' || audioState.mic === 'muted' : true)
      ? 'text-brandgreen'
      : audioState.peers === 'reconnecting' || audioState.mic === 'denied'
      ? 'text-brandred'
      : 'text-gold';

  const countdown = room && room.scheduledAtMs ? Math.max(0, room.scheduledAtMs - now) : 0;

  if (!ready) {
    return (
      <MainScreenShell className="wide-desktop fill-stage no-rail">
        <div className="p-4">
          <div className="skeleton mb-3 h-14 w-full rounded-2xl" />
          <div className="skeleton mb-3 h-64 w-full rounded-2xl" />
          <div className="skeleton h-40 w-full rounded-2xl" />
        </div>
      </MainScreenShell>
    );
  }

  if (accessDenied) {
    return (
      <MainScreenShell className="wide-desktop fill-stage no-rail">
        <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <ShieldAlert size={34} className="text-gold" />
          <div className="text-[16px] font-black">You don&apos;t have access to this room</div>
          <div className="max-w-[340px] text-[12.5px] text-text3">
            Private rooms are invite-only. Ask the host for an invitation, or go back to Voice.
          </div>
          <button onClick={() => router.push('/voice')} className="rounded-xl bg-gold-grad px-5 py-2.5 text-[13px] font-black text-[#171100]">
            Back to Voice
          </button>
        </div>
      </MainScreenShell>
    );
  }

  if (roomMissing || (!room && participantsLoaded)) {
    return (
      <MainScreenShell className="wide-desktop fill-stage no-rail">
        <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <Radio size={34} className="text-gold" />
          <div className="text-[16px] font-black">Room not found</div>
          <button onClick={() => router.push('/voice')} className="rounded-xl bg-gold-grad px-5 py-2.5 text-[13px] font-black text-[#171100]">
            Back to Voice
          </button>
        </div>
      </MainScreenShell>
    );
  }

  if (!room) {
    return (
      <MainScreenShell className="wide-desktop fill-stage no-rail">
        <div className="flex min-h-full items-center justify-center gap-2 text-[13px] text-text3">
          <Loader2 size={16} className="animate-spin" /> Loading room…
        </div>
      </MainScreenShell>
    );
  }

  const header = (
    <header className="flex items-center gap-2.5 border-b border-linesoft px-3 py-3">
      <button
        onClick={() => router.push('/voice')}
        aria-label="Back"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line text-gold active:bg-white/5"
      >
        <ArrowLeft size={16} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {room.status === 'live' ? (
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-brandred" />
          ) : null}
          <h1 className="truncate text-[14px] font-black leading-tight">{room.title}</h1>
        </div>
        <div className="flex items-center gap-2 text-[10.5px] font-bold text-text3">
          {room.status === 'live' ? (
            <>
              <span className={stateTone}>{stateLabel}</span>
              <span>·</span>
              <span>{liveCount} founders here</span>
            </>
          ) : room.status === 'scheduled' ? (
            <span>Starts {formatRoomTime(room)}</span>
          ) : (
            <span>Ended</span>
          )}
        </div>
      </div>
      <button
        onClick={doShare}
        aria-label="Share room"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line text-gold active:bg-white/5"
      >
        <Share2 size={15} />
      </button>
      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Room menu"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-gold active:bg-white/5"
        >
          <MoreVertical size={15} />
        </button>
        {menuOpen ? (
          <div className="absolute right-0 top-11 z-[90] w-56 overflow-hidden rounded-2xl border border-line bg-[#0d0d0d] shadow-2xl">
            {[
              { label: 'Copy room link', icon: Link2, run: doShare },
              { label: 'Share to feed', icon: Megaphone, run: shareToFeed },
              { label: 'View host profile', icon: Users, run: () => router.push(`/voice/founder/${room.hostId}`) },
              { label: 'Report room', icon: ShieldAlert, run: doReportRoom },
              {
                label: isHost ? 'End room' : 'Leave room',
                icon: X,
                run: () => {
                  setMenuOpen(false);
                  if (isHost && room.status === 'live') doEnd();
                  else doLeave();
                },
                danger: true,
              },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setMenuOpen(false);
                  item.run();
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-[12.5px] font-bold active:bg-white/5 ${
                  item.danger ? 'text-brandred' : 'text-text1'
                }`}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );

  if (room.status === 'ended') {
    return (
      <MainScreenShell className="wide-desktop fill-stage no-rail">
        <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <Radio size={34} className="text-text3" />
          <div className="text-[16px] font-black">This room has ended</div>
          <div className="max-w-[360px] text-[12.5px] text-text3">
            “{room.title}” by {room.hostName} has closed. Check Voice for live rooms.
          </div>
          <button onClick={() => router.push('/voice')} className="rounded-xl bg-gold-grad px-5 py-2.5 text-[13px] font-black text-[#171100]">
            Back to Voice
          </button>
        </div>
      </MainScreenShell>
    );
  }

  if (room.status === 'scheduled') {
    const h = Math.floor(countdown / 3600000);
    const m = Math.floor((countdown % 3600000) / 60000);
    const s = Math.floor((countdown % 60000) / 1000);
    return (
      <MainScreenShell className="wide-desktop fill-stage no-rail">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          <div className="rounded-2xl border border-line bg-card p-5">
            {header}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ['Hours', h],
                ['Minutes', m],
                ['Seconds', s],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-line bg-white/[0.03] py-4 text-center">
                  <div className="text-[26px] font-black text-gold-hi">{String(value).padStart(2, '0')}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-text3">{label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Avatar src={room.hostAvatar} name={room.hostName} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[14px] font-extrabold">{room.hostName}</span>
                  {room.hostVerified ? <VerifiedBadge size={12} /> : null}
                </div>
                <div className="text-[11.5px] text-text3">
                  {room.category} · {formatRoomTime(room)}
                </div>
              </div>
              {!isHost ? (
                <button
                  onClick={doFollow}
                  className={`rounded-xl border px-3.5 py-2 text-[12px] font-black active:scale-95 ${
                    followedUsers[room.hostId] ? 'border-gold/60 bg-gold/10 text-gold-hi' : 'border-line text-text2'
                  }`}
                >
                  {followedUsers[room.hostId] ? 'Following' : 'Follow'}
                </button>
              ) : null}
            </div>
            {room.description ? (
              <p className="mt-3 text-[13px] leading-relaxed text-text2">{room.description}</p>
            ) : null}
            <TemplateCard room={room} />
            <div className="mt-4 flex flex-wrap gap-2">
              {isHost ? (
                <button
                  onClick={doStart}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gold-grad px-5 py-3 text-[13.5px] font-black text-[#171100] active:scale-[0.98] disabled:opacity-50"
                >
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Radio size={15} />}
                  Start room now
                </button>
              ) : (
                <button
                  onClick={doReminder}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gold/60 bg-gold/10 px-5 py-3 text-[13.5px] font-black text-gold-hi active:scale-[0.98]"
                >
                  <Bell size={15} /> Set reminder
                </button>
              )}
              <button
                onClick={doShare}
                className="rounded-2xl border border-line px-5 py-3 text-[13px] font-black text-text2 active:scale-[0.98]"
              >
                <Share2 size={15} className="mr-1.5 inline" />
                Share
              </button>
            </div>
          </div>
        </div>
      </MainScreenShell>
    );
  }

  const questionsJsx = (
    <QuestionsPanel
      room={room}
      questions={questions}
      profile={profile}
      canModerate={canMod}
      onAsk={onAsk}
      onStatus={(qid, status) => setQuestionStatus(roomId, qid, status).catch(() => showToast('Could not update question'))}
      onDelete={(qid) => deleteQuestion(roomId, qid).catch(() => showToast('Could not delete question'))}
    />
  );

  const peopleJsx = (
    <PeoplePanel
      participants={participants}
      requests={requests}
      canModerate={canMod}
      meId={uid}
      actions={actions}
      onReport={doReportUser}
      onBlock={doBlock}
    />
  );

  const hostJsx = (
    <HostControlsPanel
      room={room}
      isHost={isHost}
      canModerate={canMod}
      inviteResults={inviteResults}
      onInviteSearch={inviteSearch}
      onInvitePick={(u) => {
        inviteSpeaker(room, u, profile)
          .then(() => {
            inviteClear();
            showToast(`${u.name} invited`);
          })
          .catch(() => showToast('Could not invite'));
      }}
      onLock={(on) => toggleRoomLock(roomId, on).catch(() => showToast('Could not update lock'))}
      onPin={(topic) => pinRoomTopic(roomId, topic).then(() => showToast('Topic pinned')).catch(() => {})}
      onTitle={(t) => updateVoiceRoom(roomId, { title: t }).then(() => showToast('Title updated')).catch(() => {})}
      onEnd={doEnd}
    />
  );

  const stage = (
    <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="px-3.5 pt-3">
        <TemplateCard room={room} />
        {room.pinnedTopic ? (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/[0.07] px-3 py-2 text-[12px] font-bold text-gold-hi">
            <Megaphone size={13} /> {room.pinnedTopic}
          </div>
        ) : null}
        {pinnedQuestion ? (
          <div className="mt-2 rounded-xl border border-gold/50 bg-gold/[0.08] px-3 py-2.5">
            <div className="text-[9.5px] font-black uppercase tracking-widest text-gold-hi">Pinned question</div>
            <div className="mt-0.5 text-[12.5px] font-semibold text-text1">{pinnedQuestion.text}</div>
            <div className="text-[10.5px] text-text3">asked by {pinnedQuestion.authorName}</div>
          </div>
        ) : null}
      </div>

      <div className="px-3.5 pt-4">
        <div className="mb-2 flex items-center gap-2 text-[10.5px] font-black uppercase tracking-widest text-text3">
          <Mic size={11} className="text-gold" /> Speakers
          <span className="h-px flex-1 bg-linesoft" />
          {speakers.length}
        </div>
        <div className={`grid gap-2.5 ${speakers.length > 3 ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {speakers.map((p) => (
            <SpeakerTile
              key={p.uid}
              p={p}
              active={activeSpeakers.includes(p.uid)}
              isMe={p.uid === uid}
              muted={p.uid === uid ? muted : p.isMuted}
              compact
            />
          ))}
          {!speakers.length ? (
            <div className="col-span-full rounded-2xl border border-dashed border-line px-4 py-6 text-center text-[12px] text-text3">
              Nobody on stage yet — raise your hand to speak.
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-3.5 pb-4 pt-5">
        <div className="mb-2 flex items-center gap-2 text-[10.5px] font-black uppercase tracking-widest text-text3">
          <Users size={11} /> Listeners
          <span className="h-px flex-1 bg-linesoft" />
          {listeners.length}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {listeners.slice(0, 24).map((p) => (
            <span key={p.uid} className="relative" title={`${p.name} — Listener`}>
              <Avatar src={p.avatar} name={p.name} size={34} />
              {activeSpeakers.includes(p.uid) ? (
                <span className="absolute inset-0 rounded-full ring-2 ring-gold" />
              ) : null}
            </span>
          ))}
          {listeners.length > 24 ? (
            <span className="flex h-[34px] min-w-[34px] items-center justify-center rounded-full bg-white/10 px-2 text-[11px] font-bold text-text2">
              +{listeners.length - 24}
            </span>
          ) : null}
          {!listeners.length ? <span className="text-[12px] text-text3">No listeners yet.</span> : null}
        </div>
      </div>

      <div className="relative min-h-[90px] px-3.5 pb-4">
        <div className="pointer-events-none absolute bottom-2 right-3 z-10 flex flex-col-reverse items-end gap-1.5">
          {reactions.slice(-8).map((r, i) => (
            <span
              key={`${r.userId}-${r.createdAtMs}-${i}`}
              className="animate-fade-up rounded-full bg-black/60 px-2.5 py-1.5 text-[18px] shadow-lg backdrop-blur"
            >
              {r.type}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          {REACTION_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => sendReactionNow(e)}
              disabled={room.allowReactions === false}
              className="rounded-full border border-line bg-card px-3 py-1.5 text-[16px] active:scale-125 disabled:opacity-40"
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const bottomBars = (
    <div className="border-t border-linesoft bg-[#0a0a0a] px-3 pb-3 pt-2.5">
      <div className="mb-2 flex gap-2">
        <button
          onClick={() => {
            setSheet('questions');
            setSideTab('questions');
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-card py-2 text-[11.5px] font-extrabold text-text2 lg:hidden active:bg-white/5"
        >
          <MessageCircle size={13} /> Questions
        </button>
        <button
          onClick={() => {
            setSheet('people');
            setSideTab('people');
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-card py-2 text-[11.5px] font-extrabold text-text2 lg:hidden active:bg-white/5"
        >
          <Users size={13} /> People
        </button>
        {canMod ? (
          <button
            onClick={() => {
              setSheet('host');
              setSideTab('host');
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gold/50 bg-gold/10 py-2 text-[11.5px] font-extrabold text-gold-hi lg:hidden active:bg-white/5"
          >
            <ShieldAlert size={13} /> Host
          </button>
        ) : null}
        <button
          onClick={doShare}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-card px-4 py-2 text-[11.5px] font-extrabold text-text2 active:bg-white/5"
        >
          <Link2 size={13} /> Share
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        {mySpeaker ? (
          <button
            onClick={onMicPress}
            aria-label={audioState.mic === 'on' && !muted ? 'Mute microphone' : 'Enable microphone'}
            className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg active:scale-95 ${
              audioState.mic === 'on' && muted
                ? 'bg-brandred/20 text-brandred ring-2 ring-brandred/60'
                : audioState.mic === 'on'
                ? 'bg-gold-grad text-[#171100]'
                : 'border border-gold/50 bg-gold/10 text-gold-hi'
            }`}
          >
            {audioState.mic === 'on' && muted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        ) : (
          <button
            onClick={onRaise}
            disabled={busy || !room.allowRaiseHand}
            className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-[13px] font-black active:scale-[0.98] disabled:opacity-40 ${
              myP && myP.raisedHand
                ? 'border border-gold/60 bg-gold/10 text-gold-hi'
                : 'bg-gold-grad text-[#171100]'
            }`}
          >
            <Hand size={16} />
            {myP && myP.raisedHand ? 'Hand raised' : 'Raise Hand'}
          </button>
        )}
        {mySpeaker ? (
          <div className="hidden min-w-0 flex-1 flex-col sm:flex">
            <span className="truncate text-[11.5px] font-bold text-text1">
              {audioState.mic === 'on'
                ? `You're on stage — ${muted ? 'muted' : 'microphone live'}`
                : 'You\u2019re on stage — tap the mic to start talking'}
            </span>
            <span className="text-[10.5px] text-text3">{stateLabel}</span>
          </div>
        ) : null}
        <button
          onClick={doLeave}
          className="ml-auto flex h-12 items-center justify-center gap-2 rounded-2xl border border-brandred/50 bg-brandred/10 px-5 text-[13px] font-black text-brandred active:scale-[0.98]"
        >
          <X size={15} /> Leave
        </button>
      </div>
      {micIssue && mySpeaker ? (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-brandred/40 bg-brandred/10 px-3 py-2.5">
          <ShieldAlert size={14} className="shrink-0 text-brandred" />
          <span className="min-w-0 flex-1 text-[11.5px] font-bold text-brandred">
            {micIssue === 'insecure'
              ? 'Voice needs a secure connection — open this page over https:// to use the microphone.'
              : micIssue === 'denied'
              ? 'Microphone blocked. Allow mic access in your browser settings, then tap Retry.'
              : 'No microphone found on this device.'}
          </span>
          <button onClick={ensureMic} className="shrink-0 rounded-lg bg-gold-grad px-2.5 py-1.5 text-[10.5px] font-black text-[#171100]">
            Retry
          </button>
          <button
            onClick={() => {
              setParticipantRole(roomId, uid, 'listener').then(() => setMicIssue(''));
            }}
            className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-[10.5px] font-bold text-text2"
          >
            Listen instead
          </button>
        </div>
      ) : null}
    </div>
  );

  const sidePanel = (
    <aside className="hidden min-h-0 flex-col border-l border-linesoft bg-card/40 lg:flex lg:w-[340px]">
      <div className="flex gap-1.5 border-b border-linesoft p-3">
        {[
          { key: 'questions', label: 'Questions', icon: MessageCircle },
          { key: 'people', label: 'People', icon: Users },
          ...(canMod ? [{ key: 'host', label: 'Host', icon: ShieldAlert }] : []),
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setSideTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11.5px] font-extrabold ${
              sideTab === t.key ? 'bg-gold/10 text-gold-hi' : 'text-text2 active:bg-white/5'
            }`}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
        {sideTab === 'questions' ? questionsJsx : sideTab === 'people' ? peopleJsx : hostJsx}
      </div>
    </aside>
  );

  return (
    <MainScreenShell className="wide-desktop fill-stage no-rail">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col">
          {header}

          {kicked ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <ShieldAlert size={30} className="text-brandred" />
              <div className="text-[15px] font-black">You were removed from this room</div>
              <button onClick={() => router.push('/voice')} className="rounded-xl bg-gold-grad px-5 py-2.5 text-[13px] font-black text-[#171100]">
                Back to Voice
              </button>
            </div>
          ) : joinError ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <ShieldAlert size={30} className="text-gold" />
              <div className="max-w-[340px] text-[13.5px] font-bold text-text2">{joinError}</div>
              <button onClick={() => router.push('/voice')} className="rounded-xl bg-gold-grad px-5 py-2.5 text-[13px] font-black text-[#171100]">
                Back to Voice
              </button>
            </div>
          ) : (
            <>
              {stage}
              {bottomBars}
            </>
          )}
        </div>

        {sidePanel}
        {Object.entries(streams).map(([peerId, stream]) => (
          <RemoteAudio key={peerId} stream={stream} />
        ))}
      </div>

      {sheet ? (
        <div className="fixed inset-0 z-[110] flex items-end lg:hidden" onClick={() => setSheet(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative flex max-h-[76vh] w-full flex-col rounded-t-3xl border-t border-line bg-[#0b0b0d] pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-linesoft px-4 py-3">
              <span className="text-[13.5px] font-black">
                {sheet === 'questions' ? 'Questions' : sheet === 'people' ? 'People' : 'Host controls'}
              </span>
              <button onClick={() => setSheet(null)} aria-label="Close panel" className="rounded-lg border border-line p-1.5 text-text2">
                <X size={14} />
              </button>
            </div>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
              {sheet === 'questions' ? questionsJsx : sheet === 'people' ? peopleJsx : hostJsx}
            </div>
          </div>
        </div>
      ) : null}
    </MainScreenShell>
  );
}
