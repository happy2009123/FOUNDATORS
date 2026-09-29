'use client';

import { subscribeSignals, sendSignalFrom, deleteSignal } from './voice';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const SPEAKER_ROLES = ['host', 'coHost', 'speaker'];
const ACTIVE_THRESHOLD = 0.09;
const ACTIVE_HOLD_MS = 1600;

function levelFromStats(report, prev) {
  if (report.audioLevel !== undefined && report.audioLevel !== null) {
    return { level: Math.min(1, Number(report.audioLevel) || 0), prev: prev || null };
  }
  const energy = Number(report.totalAudioEnergy) || 0;
  const time = Number(report.timestamp) || 0;
  const p = prev || { energy: 0, time: 0 };
  let level = 0;
  if (p.time && time > p.time) {
    const dt = (time - p.time) / 1000;
    const de = energy - p.energy;
    if (dt > 0 && de >= 0) level = Math.min(1, (de / dt) * 12);
  }
  p.energy = energy;
  p.time = time;
  return { level, prev: p };
}

export class VoiceMesh {
  constructor({ roomId, selfId, onStateChange, onRemoteStream, onActiveSpeakers, onLog }) {
    this.roomId = roomId;
    this.selfId = selfId;
    this.onStateChange = onStateChange || (() => {});
    this.onRemoteStream = onRemoteStream || (() => {});
    this.onActiveSpeakers = onActiveSpeakers || (() => {});
    this.onLog = onLog || (() => {});
    this.peers = new Map();
    this.publisherIds = new Set();
    this.desired = new Set();
    this.micStream = null;
    this.micState = 'off';
    this.started = false;
    this.destroyed = false;
    this.unsubSignals = null;
    this.statsTimer = null;
    this.prevEnergy = new Map();
    this.activeUntil = new Map();
    this.lastActiveKey = '';
    this.audioCtx = null;
    this.analyser = null;
    this.dataArray = null;
    this.iceQueues = new Map();
    this.makingOffer = new Map();
    this.ignoreOffer = new Map();
  }

  setParticipants(participants) {
    const publishers = new Set();
    const present = new Set();
    (participants || []).forEach((p) => {
      if (!p || p.status !== 'joined') return;
      present.add(p.uid);
      if (SPEAKER_ROLES.includes(p.role)) publishers.add(p.uid);
    });
    this.publisherIds = publishers;
    const selfIsPub = publishers.has(this.selfId);
    const desired = new Set();
    present.forEach((uid) => {
      if (uid === this.selfId) return;
      if (selfIsPub || publishers.has(uid)) desired.add(uid);
    });
    this.desired = desired;
    if (!this.started || this.destroyed) return;
    desired.forEach((uid) => this.ensurePeer(uid));
    [...this.peers.keys()].forEach((uid) => {
      if (!desired.has(uid)) this.closePeer(uid);
    });
  }

  start() {
    if (this.started || this.destroyed) return;
    this.started = true;
    this.unsubSignals = subscribeSignals(this.roomId, this.selfId, (changes) => {
      changes.forEach((signal) => {
        if (signal.from === this.selfId) return;
        this.handleSignal(signal).finally(() => deleteSignal(this.roomId, signal.id));
      });
    });
    this.statsTimer = setInterval(() => this.tickLevels(), 1200);
    this.emitState();
  }

  makePeerConnection(uid) {
    const initiator = this.selfId < uid;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 4 });
    const entry = {
      pc,
      initiator,
      polite: !initiator,
      remoteStream: null,
      senders: [],
      connectionState: 'new',
      hasRemoteDesc: false,
      nudgeTimer: null,
    };
    this.peers.set(uid, entry);
    this.iceQueues.set(uid, []);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalFrom(this.roomId, this.selfId, uid, 'ice', {
          candidate: event.candidate.toJSON ? event.candidate.toJSON() : { candidate: event.candidate.candidate, sdpMid: event.candidate.sdpMid, sdpMLineIndex: event.candidate.sdpMLineIndex },
        }).catch(() => {});
      }
    };

    pc.onnegotiationneeded = async () => {
      if (this.destroyed) return;
      try {
        this.makingOffer.set(uid, true);
        await pc.setLocalDescription();
        sendSignalFrom(this.roomId, this.selfId, uid, 'sdp', {
          type: pc.localDescription.type,
          sdp: pc.localDescription.sdp,
        }).catch(() => {});
      } catch (e) {
        this.onLog('offer-error', e);
      } finally {
        this.makingOffer.set(uid, false);
      }
    };

    pc.ontrack = (event) => {
      const stream = (event.streams && event.streams[0]) || new MediaStream([event.track]);
      entry.remoteStream = stream;
      this.onRemoteStream(uid, stream);
      event.track.onended = () => this.onRemoteStream(uid, null);
    };

    pc.onconnectionstatechange = () => {
      entry.connectionState = pc.connectionState;
      this.emitState();
      if (pc.connectionState === 'failed') this.recoverPeer(uid);
      else if (pc.connectionState === 'disconnected') {
        entry.nudgeTimer = setTimeout(() => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') this.recoverPeer(uid);
        }, 3500);
      }
    };

    if (initiator) {
      if (this.micStream && this.micStream.getAudioTracks().some((t) => t.readyState === 'live')) {
        const sender = pc.addTrack(this.micStream.getAudioTracks()[0], this.micStream);
        entry.senders.push(sender);
      } else {
        pc.addTransceiver('audio', { direction: 'recvonly' });
      }
    } else if (this.micStream && this.micStream.getAudioTracks().some((t) => t.readyState === 'live')) {
      pc.addTransceiver('audio', { direction: 'sendrecv' });
    }
    return entry;
  }

  ensurePeer(uid) {
    if (this.peers.has(uid)) return;
    this.makePeerConnection(uid);
  }

  closePeer(uid) {
    const entry = this.peers.get(uid);
    if (!entry) return;
    clearTimeout(entry.nudgeTimer);
    try {
      entry.pc.onnegotiationneeded = null;
      entry.pc.close();
    } catch (e) {}
    this.peers.delete(uid);
    this.iceQueues.delete(uid);
    this.makingOffer.delete(uid);
    this.ignoreOffer.delete(uid);
    this.prevEnergy.delete(uid);
    this.activeUntil.delete(uid);
    this.onRemoteStream(uid, null);
    this.emitState();
  }

  async recoverPeer(uid) {
    if (this.destroyed || !this.desired.has(uid)) return;
    const wasInitiator = this.selfId < uid;
    this.closePeer(uid);
    setTimeout(() => {
      if (this.destroyed || !this.desired.has(uid) || this.peers.has(uid)) return;
      if (wasInitiator) {
        this.ensurePeer(uid);
      } else {
        sendSignalFrom(this.roomId, this.selfId, uid, 'nudge', {}).catch(() => {});
      }
    }, 1200);
  }

  async handleSignal(signal) {
    if (this.destroyed) return;
    const uid = signal.from;
    if (!this.desired.has(uid)) return;
    let entry = this.peers.get(uid);
    if (!entry) {
      if (signal.kind === 'nudge') return;
      entry = this.makePeerConnection(uid);
    }
    const pc = entry.pc;
    try {
      if (signal.kind === 'nudge') {
        if (this.selfId < uid && !this.peers.has(uid)) this.ensurePeer(uid);
        return;
      }
      if (signal.kind === 'ice') {
        const candidate = signal.payload && signal.payload.candidate;
        if (!candidate) return;
        if (!entry.hasRemoteDesc) {
          this.iceQueues.get(uid).push(candidate);
          return;
        }
        await pc.addIceCandidate(candidate);
        return;
      }
      if (signal.kind === 'sdp' && signal.payload) {
        const description = { type: signal.payload.type, sdp: signal.payload.sdp };
        const offerCollision =
          description.type === 'offer' && (this.makingOffer.get(uid) || pc.signalingState !== 'stable');
        this.ignoreOffer.set(uid, !entry.polite && offerCollision);
        if (this.ignoreOffer.get(uid)) return;
        await pc.setRemoteDescription(description);
        entry.hasRemoteDesc = true;
        const queued = this.iceQueues.get(uid) || [];
        for (const candidate of queued) {
          try {
            await pc.addIceCandidate(candidate);
          } catch (e) {}
        }
        this.iceQueues.set(uid, []);
        if (description.type === 'offer') {
          if (this.micStream && this.micStream.getAudioTracks().some((t) => t.readyState === 'live')) {
            const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
            const track = this.micStream.getAudioTracks()[0];
            if (sender) await sender.replaceTrack(track);
            else {
              const newSender = pc.addTrack(track, this.micStream);
              entry.senders.push(newSender);
            }
          }
          await pc.setLocalDescription();
          sendSignalFrom(this.roomId, this.selfId, uid, 'sdp', {
            type: pc.localDescription.type,
            sdp: pc.localDescription.sdp,
          }).catch(() => {});
        }
      }
    } catch (e) {
      this.onLog('signal-error', e);
    }
  }

  async ensureMic() {
    if (this.destroyed) return { ok: false, reason: 'destroyed' };
    if (this.micStream && this.micStream.getAudioTracks().some((t) => t.readyState === 'live')) {
      this.micStream.getAudioTracks().forEach((t) => {
        t.enabled = true;
      });
      this.micState = 'on';
      this.emitState();
      await this.publishMic();
      return { ok: true };
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      this.micStream = stream;
      this.micState = 'on';
      this.setupAnalyser(stream);
      stream.getAudioTracks().forEach((t) => {
        t.onended = () => {
          this.micState = 'denied';
          this.emitState();
        };
      });
      this.emitState();
      await this.publishMic();
      return { ok: true };
    } catch (e) {
      const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      this.micState = denied ? 'denied' : 'unavailable';
      this.emitState();
      return { ok: false, reason: this.micState, error: e };
    }
  }

  async publishMic() {
    if (!this.micStream) return;
    const track = this.micStream.getAudioTracks()[0];
    if (!track) return;
    for (const [, entry] of this.peers) {
      try {
        const sender = entry.pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
        if (sender) {
          if (sender.track !== track) await sender.replaceTrack(track);
        } else if (entry.initiator) {
          entry.senders.push(entry.pc.addTrack(track, this.micStream));
        } else {
          const transceiver = entry.pc.getTransceivers().find((t) => t.receiver && t.receiver.track && t.receiver.track.kind === 'audio');
          if (transceiver) {
            transceiver.direction = 'sendrecv';
            await transceiver.sender.replaceTrack(track);
          } else {
            entry.senders.push(entry.pc.addTrack(track, this.micStream));
          }
        }
      } catch (e) {
        this.onLog('publish-error', e);
      }
    }
  }

  setMicEnabled(enabled) {
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((t) => {
        t.enabled = !!enabled;
      });
      this.micState = enabled ? 'on' : 'muted';
      this.emitState();
    }
  }

  async releaseMic() {
    if (this.micStream) {
      for (const [, entry] of this.peers) {
        try {
          const sender = entry.pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
          if (sender) await sender.replaceTrack(null);
        } catch (e) {}
      }
      this.micStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {}
      });
      this.micStream = null;
    }
    this.micState = 'off';
    if (this.audioCtx) {
      try {
        await this.audioCtx.close();
      } catch (e) {}
      this.audioCtx = null;
      this.analyser = null;
      this.dataArray = null;
    }
    this.emitState();
  }

  setupAnalyser(stream) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.audioCtx = new Ctx();
      const source = this.audioCtx.createMediaStreamSource(stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      source.connect(this.analyser);
      this.dataArray = new Float32Array(this.analyser.fftSize);
    } catch (e) {}
  }

  localLevel() {
    if (!this.analyser || !this.dataArray || this.micState !== 'on') return 0;
    try {
      this.analyser.getFloatTimeDomainData(this.dataArray);
      let peak = 0;
      for (let i = 0; i < this.dataArray.length; i += 1) {
        const v = Math.abs(this.dataArray[i]);
        if (v > peak) peak = v;
      }
      return Math.min(1, peak * 3);
    } catch (e) {
      return 0;
    }
  }

  async tickLevels() {
    if (this.destroyed) return;
    const now = Date.now();
    const levels = new Map();
    if (this.micState === 'on') {
      const selfLevel = this.localLevel();
      if (selfLevel > 0) levels.set(this.selfId, selfLevel);
    }
    const jobs = [];
    for (const [uid, entry] of this.peers) {
      if (entry.pc.connectionState !== 'connected') continue;
      jobs.push(
        entry.pc
          .getStats()
          .then((reports) => {
            reports.forEach((report) => {
              if (report.type === 'inbound-rtp' && (report.kind === 'audio' || report.mediaType === 'audio')) {
                const result = levelFromStats(report, this.prevEnergy.get(uid));
                this.prevEnergy.set(uid, result.prev);
                if (result.level > 0) levels.set(uid, result.level);
              }
            });
          })
          .catch(() => {})
      );
    }
    await Promise.all(jobs);
    levels.forEach((level, uid) => {
      if (level >= ACTIVE_THRESHOLD) this.activeUntil.set(uid, now + ACTIVE_HOLD_MS);
    });
    const active = [];
    this.activeUntil.forEach((until, uid) => {
      if (until > now) active.push(uid);
      else this.activeUntil.delete(uid);
    });
    active.sort();
    const key = active.join(',');
    if (key !== this.lastActiveKey) {
      this.lastActiveKey = key;
      this.onActiveSpeakers(active);
    }
  }

  emitState() {
    if (this.destroyed) return;
    let peerState = 'idle';
    const states = [...this.peers.values()].map((e) => e.connectionState);
    if (states.some((s) => s === 'connecting' || s === 'new')) peerState = 'connecting';
    if (states.some((s) => s === 'connected') && peerState !== 'connecting') peerState = 'connected';
    if (states.some((s) => s === 'reconnecting')) peerState = 'reconnecting';
    if (states.some((s) => s === 'failed') && !states.includes('connected')) peerState = 'reconnecting';
    if (!states.length) peerState = 'connected';
    this.onStateChange({
      peers: peerState,
      mic: this.micState,
      peerCount: this.peers.size,
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.started = false;
    try {
      if (this.unsubSignals) this.unsubSignals();
    } catch (e) {}
    if (this.statsTimer) clearInterval(this.statsTimer);
    [...this.peers.keys()].forEach((uid) => this.closePeer(uid));
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {}
      });
      this.micStream = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (e) {}
      this.audioCtx = null;
    }
    this.onRemoteStream('', null);
  }
}

export default VoiceMesh;
