'use client';

// 1:1 chat-call signalling.
//
// Two signal channels keep call control and media from colliding:
//   control: session `callctl:<uid>` — offer/accept/decline/busy/hangup,
//            addressed to a user's inbox so they can receive calls anywhere
//            in the app, not only while the chat page is open.
//   media:   session `call:<a~b>`    — VoiceMesh SDP/ICE for the pair.
// VoiceMesh consumes every signal addressed to it in its own session, so
// control traffic must never share the media session.

export const CALL_KINDS = {
  OFFER: 'call-offer',
  ACCEPT: 'call-accept',
  DECLINE: 'call-decline',
  BUSY: 'call-busy',
  HANGUP: 'call-hangup',
  // Sent to your OWN inbox so every other tab you have open stops ringing.
  SYNC: 'call-sync',
  // Either side turned the camera on mid-call - promote the layout on both.
  VIDEO_ON: 'call-video-on',
};

export function controlSessionFor(uid) {
  return `callctl:${uid}`;
}

export function mediaSessionFor(uidA, uidB) {
  return `call:${[uidA, uidB].sort().join('~')}`;
}

export function newCallId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

let controller = null;

// CallManager registers itself on mount; the chat header (or any future
// entry point) only needs to import startVoiceCall.
export function registerCallController(api) {
  controller = api;
  return () => {
    if (controller === api) controller = null;
  };
}

export function startVoiceCall(peerId, peerMeta) {
  if (!controller || !peerId) return false;
  controller.startCall(peerId, peerMeta || {}, {});
  return true;
}

export function startVideoCall(peerId, peerMeta) {
  if (!controller || !peerId) return false;
  controller.startCall(peerId, peerMeta || {}, { video: true });
  return true;
}
