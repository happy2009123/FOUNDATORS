'use client';

import { PhoneOff, Mic, MicOff, Camera, CameraOff, RefreshCw } from 'lucide-react';
import { useHaptics } from '@/lib/useHaptics';
import Avatar from '@/components/Avatar';
import { initialsAvatar } from '@/lib/avatar';

const MIC_ISSUE_TEXT = {
  denied: 'Microphone blocked - allow mic access in your browser',
  insecure: 'Calls need HTTPS',
  unavailable: 'Microphone unavailable',
};

function formatDuration(s) {
  const sec = Math.max(0, Math.floor(s));
  return `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;
}

// Pure presentation for an in-progress or outgoing 1:1 call.
// All signalling/WebRTC state lives in CallManager, which drives these props.
// type === 'video' && mode === 'active' renders the live camera layout
// (remote full-bleed + local PiP); everything else keeps the avatar UI.
export default function CallScreen({
  name,
  avatar,
  type = 'voice',
  mode,
  duration = 0,
  audioState,
  micIssue,
  remoteVideoRef,
  localVideoRef,
  onToggleMute,
  onToggleCamera,
  onHangup,
  onRetryMic,
}) {
  const { vibrate } = useHaptics();
  const peers = audioState?.peers || 'idle';
  const mic = audioState?.mic || 'off';
  const muted = mic === 'muted';
  const cameraOn = audioState?.video === 'on';
  const videoLive = type === 'video' && mode === 'active';

  let statusText;
  if (micIssue) statusText = MIC_ISSUE_TEXT[micIssue] || MIC_ISSUE_TEXT.unavailable;
  else if (mode === 'outgoing') statusText = 'Ringing...';
  else if (peers === 'connected' && (audioState?.peerCount || 0) > 0) statusText = formatDuration(duration);
  else if (peers === 'reconnecting') statusText = 'Reconnecting...';
  else statusText = 'Connecting...';

  return (
    <div className="dark-surface fixed inset-0 z-[500] flex flex-col bg-gradient-to-b from-zinc-900 to-black">
      {videoLive ? (
        <div className="relative flex-1 bg-black">
          {/* muted: audio plays exactly once through CallManager's <audio>
              element - an unmuted <video> playing the same stream double-
              renders the audio track (phasing/garble/perceived lag). */}
          <video ref={remoteVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          {cameraOn ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-4 right-4 h-36 w-24 rounded-2xl border border-white/20 object-cover bg-zinc-900 shadow-lg"
            />
          ) : null}
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 via-transparent to-transparent px-6 pt-12">
            <h2 className="text-[20px] font-black text-white drop-shadow">{name || 'Unknown'}</h2>
            <p className="text-[12px] text-white/80 drop-shadow">{statusText}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <Avatar src={avatar || initialsAvatar(name || '?')} name={name || '?'} size={104} />
          <h2 className="mt-4 text-[22px] font-black text-white">{name || 'Unknown'}</h2>
          <p className="mt-1 text-center text-[13px] text-white/60">{statusText}</p>
          {micIssue && onRetryMic && (
            <button
              onClick={() => { vibrate('light'); onRetryMic(); }}
              className="mt-4 flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-[12px] font-bold text-white/80"
            >
              <RefreshCw size={13} /> Try microphone again
            </button>
          )}
        </div>
      )}
      <div className="pb-12 px-6">
        <div className="flex items-center justify-center gap-6">
          {/* Camera toggle shows for every active call: on a voice call it
              acquires the camera and promotes the call to video for both
              sides (see CallManager.toggleCamera). */}
          <button
            onClick={() => { vibrate('light'); onToggleCamera?.(); }}
            className={`flex h-14 w-14 items-center justify-center rounded-full ${cameraOn ? 'bg-white/10' : 'bg-white/20'}`}
            aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'}
          >
            {cameraOn ? <Camera size={20} className="text-white" /> : <CameraOff size={20} className="text-white" />}
          </button>
          <button
            onClick={() => { vibrate('light'); onToggleMute?.(); }}
            className={`flex h-14 w-14 items-center justify-center rounded-full ${muted ? 'bg-white/20' : 'bg-white/10'}`}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
          </button>
          <button
            onClick={() => { vibrate('medium'); onHangup?.(); }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-brandred"
            aria-label="End call"
          >
            <PhoneOff size={24} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
