'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Video, PhoneOff, Mic, MicOff, Camera, CameraOff, MoreHorizontal } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import Avatar from '@/components/Avatar';
import { initialsAvatar } from '@/lib/avatar';

export default function CallScreen({ userId, type, onClose }) {
  const router = useRouter();
  const { vibrate } = useHaptics();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isRinging, setIsRinging] = useState(true);

  const user = { name: 'Arjun Verma', avatar: initialsAvatar('Arjun Verma') };

  useEffect(() => {
    if (isRinging) {
      const t = setTimeout(() => { setIsRinging(false); setIsConnected(true); }, 3000);
      return () => clearTimeout(t);
    }
  }, [isRinging]);

  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const formatDuration = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleEnd = useCallback(() => {
    vibrate('medium');
    onClose();
  }, [vibrate, onClose]);

  return (
    <div className="fixed inset-0 z-[500] bg-gradient-to-b from-zinc-900 to-black flex flex-col">
      {/* Status */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative">
          <Avatar src={user.avatar} name={user.name} size={100} />
          {type === 'video' && !isVideoOff && (
            <div className="absolute inset-0 rounded-full border-2 border-gold/30 animate-pulse" />
          )}
        </div>
        <h2 className="mt-4 text-[22px] font-black text-white">{user.name}</h2>
        <p className="text-[13px] text-white/60">
          {isRinging ? 'Ringing...' : isConnected ? formatDuration(duration) : 'Connecting...'}
        </p>
      </div>

      {/* Controls */}
      <div className="pb-12 px-6">
        <div className="flex items-center justify-center gap-6">
          {type === 'video' && (
            <button
              onClick={() => { setIsVideoOff(!isVideoOff); vibrate('light'); }}
              className={`flex h-14 w-14 items-center justify-center rounded-full ${isVideoOff ? 'bg-white/20' : 'bg-white/10'}`}
              aria-label={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
            >
              {isVideoOff ? <CameraOff size={20} className="text-white" /> : <Camera size={20} className="text-white" />}
            </button>
          )}
          <button
            onClick={() => { setIsMuted(!isMuted); vibrate('light'); }}
            className={`flex h-14 w-14 items-center justify-center rounded-full ${isMuted ? 'bg-white/20' : 'bg-white/10'}`}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
          </button>
          <button
            onClick={handleEnd}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red"
            aria-label="End call"
          >
            <PhoneOff size={24} className="text-white" />
          </button>
          <button
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10"
            aria-label="More options"
          >
            <MoreHorizontal size={20} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
