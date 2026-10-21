'use client';

import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { subscribeSignals, sendSignalFrom, deleteSignal } from '@/lib/voice';
import { VoiceMesh } from '@/lib/voiceAudio';
import { sendMessage as sendFS, conversationIdFor } from '@/lib/firestore';
import {
  CALL_KINDS,
  controlSessionFor,
  mediaSessionFor,
  newCallId,
  registerCallController,
} from '@/lib/call';
import CallScreen from './CallScreen';
import Avatar from '@/components/Avatar';
import { initialsAvatar } from '@/lib/avatar';
import { startIncomingRing, startRingbackTune } from '@/lib/ringtone';
import { beginCallKeepAwake, endCallKeepAwake } from '@/lib/callKeepAwake';

const RING_TIMEOUT_MS = 45000;
const OFFER_STALE_MS = 45000;

// Global 1:1 call controller, mounted once in Providers.
//
// - Subscribes to the signed-in user's control inbox (callctl:<uid>) so
//   incoming calls ring anywhere in the app, not just on the chat page.
// - Outgoing calls are started from the chat header via startVoiceCall().
// - Real audio runs on VoiceMesh (the same WebRTC + TURN stack the voice
//   room uses) over the media session call:<a~b>.
// - Declines/cancels/timeouts append a missed-call message to the DM.
export default function CallManager() {
  const profile = useStore((s) => s.profile);
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const showToast = useStore((s) => s.showToast);
  const { vibrate } = useHaptics();

  const [call, setCall] = useState(null); // { mode, peer, callId, role, type: 'voice'|'video' }
  const [audioState, setAudioState] = useState({ peers: 'idle', mic: 'off', video: 'off', peerCount: 0 });
  const [remoteStream, setRemoteStream] = useState(null);
  const [micIssue, setMicIssue] = useState(null);
  const [, forceTick] = useState(0);

  const profileRef = useRef(profile);
  profileRef.current = profile;
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const vibrateRef = useRef(vibrate);
  vibrateRef.current = vibrate;

  const callRef = useRef(null);
  const meshRef = useRef(null);
  const startedAtRef = useRef(0);
  const handlersRef = useRef({});
  const audioElRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);

  // Re-render every second while connected so the timer advances.
  useEffect(() => {
    if (call?.mode !== 'active') return;
    const iv = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, [call?.mode]);

  // Attach the remote stream, with a play-on-gesture fallback for autoplay
  // policies (same pattern as the voice room).
  useEffect(() => {
    const el = audioElRef.current;
    if (!el) return;
    el.srcObject = remoteStream || null;
    if (!remoteStream) return;
    const attempt = el.play && el.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => {
        const once = () => {
          const p = el.play && el.play();
          if (p && p.catch) p.catch(() => {});
        };
        window.addEventListener('pointerdown', once, { once: true });
      });
    }
  }, [remoteStream]);

  // Remote video element (video calls). Re-runs when the CallScreen video
  // layout mounts (call.type/mode change) so srcObject lands on the el.
  useEffect(() => {
    const el = remoteVideoRef.current;
    if (!el) return;
    el.srcObject = remoteStream || null;
    if (!remoteStream) return;
    const attempt = el.play && el.play();
    if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
  }, [remoteStream, call?.type, call?.mode]);

  // Local camera preview: pull the live video track from the mesh.
  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    const mesh = meshRef.current;
    const s = mesh && mesh.getVideoStream ? mesh.getVideoStream() : null;
    el.srcObject = s || null;
    if (s) {
      const attempt = el.play && el.play();
      if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
    }
  }, [call?.type, call?.mode, audioState]);

  const myUid = profile?.id;
  useEffect(() => {
    if (!isLoggedIn || !myUid) return;

    const controlSession = controlSessionFor(myUid);
    let stopRingFn = null;
    let stopRingbackFn = null;
    let outgoingTimer = null;

    const updateCall = (next) => {
      callRef.current = next;
      setCall(next);
      // Background survival: wake-lock on web + Android foreground service
      // while any call UI is up; released the moment the call is torn down.
      if (next) beginCallKeepAwake(() => handlersRef.current?.hangupCall());
      else endCallKeepAwake();
    };

    const clearOutgoingTimer = () => {
      if (outgoingTimer) {
        clearTimeout(outgoingTimer);
        outgoingTimer = null;
      }
    };

    const stopRing = () => {
      if (stopRingFn) {
        try {
          stopRingFn();
        } catch (e) {}
        stopRingFn = null;
      }
    };

    const startRing = () => {
      stopRing();
      stopRingFn = startIncomingRing();
    };

    // The caller tune: plays from dial until the call is answered, declined,
    // busy, cancelled or times out.
    const stopRingback = () => {
      if (stopRingbackFn) {
        try {
          stopRingbackFn();
        } catch (e) {}
        stopRingbackFn = null;
      }
    };

    const startRingback = () => {
      stopRingback();
      stopRingbackFn = startRingbackTune();
    };

    const teardownMesh = () => {
      if (meshRef.current) {
        try {
          meshRef.current.destroy();
        } catch (e) {}
        meshRef.current = null;
      }
      setRemoteStream(null);
      setAudioState({ peers: 'idle', mic: 'off', video: 'off', peerCount: 0 });
      setMicIssue(null);
    };

    const sendControl = (to, kind, payload) => {
      // Control signals must land in the RECIPIENT's inbox (callctl:<to>) -
      // both sides subscribe only to their OWN inbox, so writing into the
      // sender's session meant offers/accepts never reached anyone.
      sendSignalFrom(controlSessionFor(to), myUid, to, kind, payload || {}).catch(() => {});
    };

    const logMissedCall = (peer, type) => {
      const me = profileRef.current;
      if (!me?.id || !peer?.id) return;
      try {
        Promise.resolve(
          sendFS(conversationIdFor(me.id, peer.id), {
            text: type === 'video' ? 'Missed video call' : 'Missed voice call',
            senderKey: me.id,
            senderName: me.name || 'User',
            senderAvatar: me.avatar || null,
            participants: [me.id, peer.id],
            participantNames: { [me.id]: me.name || 'User', [peer.id]: peer.name || 'User' },
            participantAvatars: { [me.id]: me.avatar || '', [peer.id]: peer.avatar || '' },
          })
        ).catch(() => {});
      } catch (e) {}
    };

    const startMedia = async (peer, wantVideo) => {
      teardownMesh();
      const mesh = new VoiceMesh({
        roomId: mediaSessionFor(myUid, peer.id),
        selfId: myUid,
        enableVideo: !!wantVideo,
        onStateChange: setAudioState,
        onRemoteStream: (uid, stream) => setRemoteStream(stream),
        onActiveSpeakers: () => {},
        onLog: (kind, err) => console.warn('[call]', kind, err),
      });
      meshRef.current = mesh;
      // Mic first so peer connections are born with the track attached
      // (and the permission prompt fires inside the accept gesture).
      try {
        const mic = await mesh.ensureMic();
        setMicIssue(mic.ok ? null : mic.reason || 'unavailable');
      } catch (e) {
        setMicIssue('unavailable');
      }
      if (wantVideo) {
        // Camera prompt also needs the gesture context. Fall back to a
        // voice call (keeping audio) if the camera is unavailable/denied.
        try {
          const v = await mesh.ensureVideo();
          if (!v.ok) {
            showToastRef.current && showToastRef.current('Camera unavailable - continuing as voice call');
            updateCall({ ...callRef.current, type: 'voice' });
          }
        } catch (e) {
          showToastRef.current && showToastRef.current('Camera unavailable - continuing as voice call');
          updateCall({ ...callRef.current, type: 'voice' });
        }
        forceTick((t) => t + 1);
      }
      mesh.setParticipants([
        { uid: myUid, status: 'joined', role: 'speaker' },
        { uid: peer.id, status: 'joined', role: 'speaker' },
      ]);
      try {
        await mesh.start();
      } catch (e) {
        console.warn('[call] mesh start failed', e);
      }
    };

    const processSignal = (sig) => {
      const c = callRef.current;
      const p = sig.payload || {};
      switch (sig.kind) {
        case CALL_KINDS.OFFER: {
          if (c) {
            sendControl(sig.from, CALL_KINDS.BUSY, { callId: p.callId });
            return;
          }
          if (!p.callId || !p.ts || Date.now() - p.ts > OFFER_STALE_MS) return;
          updateCall({
            mode: 'incoming',
            peer: { id: sig.from, name: p.name || 'Someone', avatar: p.avatar || null },
            callId: p.callId,
            role: 'callee',
            type: p.video ? 'video' : 'voice',
          });
          startRing();
          return;
        }
        case CALL_KINDS.ACCEPT:
          if (c && c.mode === 'outgoing' && p.callId === c.callId) {
            clearOutgoingTimer();
            stopRingback();
            updateCall({ ...c, mode: 'active' });
            startedAtRef.current = Date.now();
            startMedia(c.peer, c.type === 'video');
          }
          return;
        case CALL_KINDS.DECLINE:
          if (c && c.mode === 'outgoing') {
            clearOutgoingTimer();
            stopRingback();
            updateCall(null);
            logMissedCall(c.peer, c.type === 'video' ? 'video' : 'voice');
            showToastRef.current && showToastRef.current('Call declined');
          }
          return;
        case CALL_KINDS.BUSY:
          if (c && c.mode === 'outgoing') {
            clearOutgoingTimer();
            stopRingback();
            updateCall(null);
            showToastRef.current && showToastRef.current('They are busy');
          }
          return;
        case CALL_KINDS.HANGUP:
          if (!c) return;
          if (c.mode === 'incoming') {
            stopRing();
            updateCall(null);
          } else if (c.mode === 'active') {
            teardownMesh();
            updateCall(null);
            showToastRef.current && showToastRef.current('Call ended');
          } else {
            clearOutgoingTimer();
            stopRingback();
            updateCall(null);
          }
          return;
        case CALL_KINDS.VIDEO_ON:
          // Peer turned their camera on mid-call - switch to the video
          // layout and silently mirror our own camera if permission was
          // already granted (silent no-op when blocked; user can still
          // tap the camera button).
          if (c && c.mode === 'active' && c.type !== 'video') {
            updateCall({ ...c, type: 'video' });
            forceTick((t) => t + 1);
            const m = meshRef.current;
            if (m && (!m.videoTrack || m.videoState === 'off')) {
              m.ensureVideo().then((res) => {
                if (res && res.ok) forceTick((t2) => t2 + 1);
              }).catch(() => {});
            }
          }
          return;
        case CALL_KINDS.SYNC:
          // Another tab of mine handled this call - stop my duplicate UI.
          if (c && c.mode === 'incoming' && p.callId === c.callId) {
            stopRing();
            updateCall(null);
          }
          return;
        default:
      }
    };

    const handleRows = (rows) => {
      (rows || []).forEach((sig) => {
        if (!sig || !sig.id) return;
        Promise.resolve(processSignal(sig)).finally(() => deleteSignal(controlSession, sig.id));
      });
    };

    const startCall = (peerId, meta = {}, opts = {}) => {
      if (callRef.current) {
        showToastRef.current && showToastRef.current('You are already in a call');
        return;
      }
      const video = !!(opts && opts.video);
      const peer = { id: peerId, name: meta.name || 'User', avatar: meta.avatar || null };
      const callId = newCallId();
      // Unlock the microphone (and camera for video calls) inside the tap
      // gesture so the callee's accept (and the caller's own prompt on
      // stricter browsers) never hits a gesture block. Result is discarded;
      // ensureMic/ensureVideo re-acquire later.
      try {
        const g = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
        if (g) {
          Promise.resolve(g.call(navigator.mediaDevices, { audio: true, video }))
            .then((s) => s.getTracks().forEach((t) => t.stop()))
            .catch(() => {});
        }
      } catch (e) {}
      updateCall({ mode: 'outgoing', peer, callId, role: 'caller', type: video ? 'video' : 'voice' });
      sendSignalFrom(controlSessionFor(peerId), myUid, peerId, CALL_KINDS.OFFER, {
        callId,
        ts: Date.now(),
        video: video || undefined,
        name: profileRef.current?.name,
        avatar: profileRef.current?.avatar,
      }).catch(() => {
        // sendSignalFrom already retried 3x - a rejection here is fatal.
        const cur = callRef.current;
        if (cur && cur.mode === 'outgoing' && cur.callId === callId) {
          stopRingback();
          updateCall(null);
          showToastRef.current && showToastRef.current('Could not start the call - check your connection');
        }
      });
      startRingback();
      clearOutgoingTimer();
      outgoingTimer = setTimeout(() => {
        const cur = callRef.current;
        if (cur && cur.mode === 'outgoing' && cur.callId === callId) {
          sendControl(peerId, CALL_KINDS.HANGUP, { callId });
          stopRingback();
          updateCall(null);
          logMissedCall(peer, video ? 'video' : 'voice');
          showToastRef.current && showToastRef.current('No answer');
        }
      }, RING_TIMEOUT_MS);
    };

    const acceptCall = () => {
      const c = callRef.current;
      if (!c || c.mode !== 'incoming') return;
      vibrateRef.current && vibrateRef.current('light');
      stopRing();
      sendControl(myUid, CALL_KINDS.SYNC, { callId: c.callId, action: 'accepted' });
      sendControl(c.peer.id, CALL_KINDS.ACCEPT, { callId: c.callId });
      updateCall({ ...c, mode: 'active' });
      startedAtRef.current = Date.now();
      startMedia(c.peer, c.type === 'video');
    };

    const declineCall = () => {
      const c = callRef.current;
      if (!c || c.mode !== 'incoming') return;
      vibrateRef.current && vibrateRef.current('light');
      stopRing();
      sendControl(myUid, CALL_KINDS.SYNC, { callId: c.callId, action: 'declined' });
      sendControl(c.peer.id, CALL_KINDS.DECLINE, { callId: c.callId });
      updateCall(null);
    };

    const hangupCall = () => {
      const c = callRef.current;
      if (!c) return;
      vibrateRef.current && vibrateRef.current('medium');
      clearOutgoingTimer();
      stopRing();
      stopRingback();
      const wasActive = c.mode === 'active';
      sendControl(c.peer.id, CALL_KINDS.HANGUP, { callId: c.callId });
      teardownMesh();
      if (c.role === 'caller' && !wasActive) logMissedCall(c.peer);
      updateCall(null);
    };

    const toggleMute = () => {
      const m = meshRef.current;
      if (!m) return;
      m.setMicEnabled(m.micState === 'muted');
    };

    const retryMic = () => {
      const m = meshRef.current;
      if (!m) return;
      Promise.resolve(m.ensureMic())
        .then((r) => setMicIssue(r && r.ok ? null : (r && r.reason) || 'unavailable'))
        .catch(() => setMicIssue('unavailable'));
    };

    const toggleCamera = async () => {
      const m = meshRef.current;
      if (!m) return;
      const c = callRef.current;
      if (!c || c.mode !== 'active') return;
      if (!m.videoTrack || m.videoState === 'off') {
        // No live camera yet (voice call, or denied at start): acquire it
        // inside the tap gesture and promote the call to video on both
        // sides. The track publish renegotiates automatically.
        const res = await m.ensureVideo();
        if (!res || !res.ok) {
          showToastRef.current &&
            showToastRef.current(
              res && res.reason === 'denied'
                ? 'Camera blocked - allow camera access in your browser'
                : 'No camera found on this device'
            );
          return;
        }
        updateCall({ ...c, type: 'video' });
        sendControl(c.peer.id, CALL_KINDS.VIDEO_ON, { callId: c.callId });
        forceTick((t) => t + 1);
        return;
      }
      const on = m.videoState === 'on';
      m.setVideoEnabled(!on);
      forceTick((t) => t + 1);
    };

    handlersRef.current = { startCall, acceptCall, declineCall, hangupCall, toggleMute, toggleCamera, retryMic };

    const unregister = registerCallController({ startCall });
    const unsubscribe = subscribeSignals(controlSession, myUid, handleRows);

    return () => {
      unregister();
      unsubscribe();
      clearOutgoingTimer();
      stopRing();
      stopRingback();
      const c = callRef.current;
      if (c) {
        // Page unloading or logging out mid-call - tell the peer.
        sendSignalFrom(controlSessionFor(c.peer.id), myUid, c.peer.id, CALL_KINDS.HANGUP, { callId: c.callId }).catch(() => {});
      }
      teardownMesh();
      callRef.current = null;
      setCall(null);
      endCallKeepAwake();
    };
  }, [isLoggedIn, myUid]);

  const incoming = call?.mode === 'incoming';
  const inCall = call && (call.mode === 'outgoing' || call.mode === 'active');

  return (
    <>
      {incoming && (
        <div className="fixed inset-0 z-[600] flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-black px-6 text-white">
          <Avatar src={call.peer.avatar || initialsAvatar(call.peer.name || '?')} name={call.peer.name || '?'} size={104} />
          <h2 className="mt-5 text-[22px] font-black">{call.peer.name}</h2>
          <p className="mt-1 text-[13px] text-white/60">
            Incoming {call.type === 'video' ? 'video' : 'voice'} call
          </p>
          <div className="mt-10 flex items-center gap-10">
            <button
              onClick={() => handlersRef.current?.declineCall()}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-brandred"
              aria-label="Decline call"
            >
              <PhoneOff size={24} className="text-white" />
            </button>
            <button
              onClick={() => handlersRef.current?.acceptCall()}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-brandgreen"
              aria-label="Accept call"
            >
              <Phone size={24} className="text-white" />
            </button>
          </div>
        </div>
      )}
      {inCall && (
        <CallScreen
          name={call.peer.name}
          avatar={call.peer.avatar}
          type={call.type || 'voice'}
          mode={call.mode}
          duration={
            call.mode === 'active' && startedAtRef.current
              ? Math.floor((Date.now() - startedAtRef.current) / 1000)
              : 0
          }
          audioState={audioState}
          micIssue={micIssue}
          remoteVideoRef={remoteVideoRef}
          localVideoRef={localVideoRef}
          onToggleMute={() => handlersRef.current?.toggleMute()}
          onToggleCamera={() => handlersRef.current?.toggleCamera()}
          onHangup={() => handlersRef.current?.hangupCall()}
          onRetryMic={() => handlersRef.current?.retryMic()}
        />
      )}
      <audio ref={audioElRef} autoPlay playsInline />
    </>
  );
}
