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

  const [call, setCall] = useState(null); // { mode: 'incoming'|'outgoing'|'active', peer, callId, role }
  const [audioState, setAudioState] = useState({ peers: 'idle', mic: 'off', peerCount: 0 });
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

  const myUid = profile?.id;
  useEffect(() => {
    if (!isLoggedIn || !myUid) return;

    const controlSession = controlSessionFor(myUid);
    let stopRingFn = null;
    let outgoingTimer = null;

    const updateCall = (next) => {
      callRef.current = next;
      setCall(next);
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
      try {
        navigator.vibrate && navigator.vibrate([400, 250, 400]);
      } catch (e) {}
      // Two-tone ringtone via WebAudio (no asset needed). Browsers may keep
      // the context suspended until the first gesture - resume on touch.
      let cleanup = () => {};
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        const gain = ctx.createGain();
        gain.gain.value = 0.05;
        gain.connect(ctx.destination);
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 440;
        osc.connect(gain);
        osc.start();
        try {
          ctx.resume();
        } catch (e) {}
        const resume = () => {
          try {
            ctx.resume();
          } catch (e) {}
        };
        window.addEventListener('pointerdown', resume);
        const toneIv = setInterval(() => {
          osc.frequency.value = osc.frequency.value > 450 ? 420 : 480;
        }, 400);
        const vibrateIv = setInterval(() => {
          try {
            navigator.vibrate && navigator.vibrate([400, 250, 400]);
          } catch (e) {}
        }, 1400);
        cleanup = () => {
          clearInterval(toneIv);
          clearInterval(vibrateIv);
          window.removeEventListener('pointerdown', resume);
          try {
            osc.stop();
          } catch (e) {}
          try {
            ctx.close();
          } catch (e) {}
        };
      } catch (e) {}
      stopRingFn = cleanup;
    };

    const teardownMesh = () => {
      if (meshRef.current) {
        try {
          meshRef.current.destroy();
        } catch (e) {}
        meshRef.current = null;
      }
      setRemoteStream(null);
      setAudioState({ peers: 'idle', mic: 'off', peerCount: 0 });
      setMicIssue(null);
    };

    const sendControl = (to, kind, payload) => {
      sendSignalFrom(controlSession, myUid, to, kind, payload || {}).catch(() => {});
    };

    const logMissedCall = (peer) => {
      const me = profileRef.current;
      if (!me?.id || !peer?.id) return;
      try {
        Promise.resolve(
          sendFS(conversationIdFor(me.id, peer.id), {
            text: 'Missed voice call',
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

    const startMedia = async (peer) => {
      teardownMesh();
      const mesh = new VoiceMesh({
        roomId: mediaSessionFor(myUid, peer.id),
        selfId: myUid,
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
          });
          startRing();
          return;
        }
        case CALL_KINDS.ACCEPT:
          if (c && c.mode === 'outgoing' && p.callId === c.callId) {
            clearOutgoingTimer();
            updateCall({ ...c, mode: 'active' });
            startedAtRef.current = Date.now();
            startMedia(c.peer);
          }
          return;
        case CALL_KINDS.DECLINE:
          if (c && c.mode === 'outgoing') {
            clearOutgoingTimer();
            updateCall(null);
            logMissedCall(c.peer);
            showToastRef.current && showToastRef.current('Call declined');
          }
          return;
        case CALL_KINDS.BUSY:
          if (c && c.mode === 'outgoing') {
            clearOutgoingTimer();
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
            updateCall(null);
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

    const startCall = (peerId, meta = {}) => {
      if (callRef.current) {
        showToastRef.current && showToastRef.current('You are already in a call');
        return;
      }
      const peer = { id: peerId, name: meta.name || 'User', avatar: meta.avatar || null };
      const callId = newCallId();
      // Unlock the microphone inside the tap gesture so the callee's accept
      // (and the caller's own prompt on stricter browsers) never hits a
      // gesture block. Result is discarded; ensureMic re-acquires later.
      try {
        const g = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
        if (g) {
          Promise.resolve(g.call(navigator.mediaDevices, { audio: true }))
            .then((s) => s.getTracks().forEach((t) => t.stop()))
            .catch(() => {});
        }
      } catch (e) {}
      updateCall({ mode: 'outgoing', peer, callId, role: 'caller' });
      sendSignalFrom(controlSession, myUid, peerId, CALL_KINDS.OFFER, {
        callId,
        ts: Date.now(),
        name: profileRef.current?.name,
        avatar: profileRef.current?.avatar,
      }).catch(() => {
        // sendSignalFrom already retried 3x - a rejection here is fatal.
        const cur = callRef.current;
        if (cur && cur.mode === 'outgoing' && cur.callId === callId) {
          updateCall(null);
          showToastRef.current && showToastRef.current('Could not start the call - check your connection');
        }
      });
      clearOutgoingTimer();
      outgoingTimer = setTimeout(() => {
        const cur = callRef.current;
        if (cur && cur.mode === 'outgoing' && cur.callId === callId) {
          sendControl(peerId, CALL_KINDS.HANGUP, { callId });
          updateCall(null);
          logMissedCall(peer);
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
      startMedia(c.peer);
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

    handlersRef.current = { startCall, acceptCall, declineCall, hangupCall, toggleMute, retryMic };

    const unregister = registerCallController({ startCall });
    const unsubscribe = subscribeSignals(controlSession, myUid, handleRows);

    return () => {
      unregister();
      unsubscribe();
      clearOutgoingTimer();
      stopRing();
      const c = callRef.current;
      if (c) {
        // Page unloading or logging out mid-call - tell the peer.
        sendSignalFrom(controlSession, myUid, c.peer.id, CALL_KINDS.HANGUP, { callId: c.callId }).catch(() => {});
      }
      teardownMesh();
      callRef.current = null;
      setCall(null);
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
          <p className="mt-1 text-[13px] text-white/60">Incoming voice call</p>
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
          type="voice"
          mode={call.mode}
          duration={
            call.mode === 'active' && startedAtRef.current
              ? Math.floor((Date.now() - startedAtRef.current) / 1000)
              : 0
          }
          audioState={audioState}
          micIssue={micIssue}
          onToggleMute={() => handlersRef.current?.toggleMute()}
          onHangup={() => handlersRef.current?.hangupCall()}
          onRetryMic={() => handlersRef.current?.retryMic()}
        />
      )}
      <audio ref={audioElRef} autoPlay playsInline />
    </>
  );
}
