'use client';

import { useCallback } from 'react';
import { VolumeX, Volume2, Shield, Flag, Ban, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';

export default function ModerationSheet({ userKey, userName, onClose }) {
  const { vibrate, notification } = useHaptics();
  const showToast = useStore((s) => s.showToast);
  const profile = useStore((s) => s.profile);
  const isMuted = useStore((s) => !!s.mutedUsers[userKey]);
  const isRestricted = useStore((s) => !!s.restrictedUsers[userKey]);
  const isBlocked = useStore((s) => !!s.blockedUsers[userKey]);
  const toggleMuteUser = useStore((s) => s.toggleMuteUser);
  const toggleRestrictUser = useStore((s) => s.toggleRestrictUser);
  const blockUser = useStore((s) => s.blockUser);
  const reportItem = useStore((s) => s.reportItem);

  const handleMute = useCallback(() => {
    vibrate('light');
    toggleMuteUser(userKey);
    notification('success');
    showToast(isMuted ? `Unmuted ${userName}` : `Muted ${userName}`);
  }, [userKey, userName, isMuted, vibrate, toggleMuteUser, notification, showToast]);

  const handleRestrict = useCallback(() => {
    vibrate('light');
    toggleRestrictUser(userKey);
    notification('success');
    showToast(isRestricted ? `Unrestricted ${userName}` : `Restricted ${userName}`);
  }, [userKey, userName, isRestricted, vibrate, toggleRestrictUser, notification, showToast]);

  const handleBlock = useCallback(() => {
    vibrate('medium');
    blockUser(userKey);
    notification('success');
    showToast(isBlocked ? `Unblocked ${userName}` : `Blocked ${userName}`);
  }, [userKey, userName, isBlocked, vibrate, blockUser, notification, showToast]);

  return (
    <div className="fixed inset-0 z-[500] flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div className="rounded-t-3xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <span className="text-[16px] font-bold">Moderate {userName}</span>
          <button onClick={onClose} className="text-text2" aria-label="Close"><X size={20} /></button>
        </div>
        <div className="space-y-2">
          <button onClick={handleMute} className="flex w-full items-center gap-4 rounded-2xl border border-linesoft p-4 text-left transition-colors hover:bg-white/5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isMuted ? 'bg-gold/10 text-gold' : 'bg-white/5 text-text2'}`}>
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-bold">{isMuted ? 'Unmute' : 'Mute'} {userName}</div>
              <div className="text-[12px] text-text2">{isMuted ? "You'll see their posts again" : "Hide their posts from your feed"}</div>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors ${isMuted ? 'bg-gold' : 'bg-white/10'}`}>
              <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${isMuted ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
            </div>
          </button>

          <button onClick={handleRestrict} className="flex w-full items-center gap-4 rounded-2xl border border-linesoft p-4 text-left transition-colors hover:bg-white/5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isRestricted ? 'bg-amber-500/10 text-amber-500' : 'bg-white/5 text-text2'}`}>
              <Shield size={20} />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-bold">{isRestricted ? 'Unrestrict' : 'Restrict'} {userName}</div>
              <div className="text-[12px] text-text2">{isRestricted ? 'Their comments are visible again' : "Hide their comments without them knowing"}</div>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors ${isRestricted ? 'bg-amber-500' : 'bg-white/10'}`}>
              <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${isRestricted ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
            </div>
          </button>

          <button onClick={handleBlock} className="flex w-full items-center gap-4 rounded-2xl border border-linesoft p-4 text-left transition-colors hover:bg-white/5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isBlocked ? 'bg-red/10 text-red' : 'bg-white/5 text-text2'}`}>
              <Ban size={20} />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-bold">{isBlocked ? 'Unblock' : 'Block'} {userName}</div>
              <div className="text-[12px] text-text2">{isBlocked ? 'They can see your profile again' : "They can't see your profile or contact you"}</div>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors ${isBlocked ? 'bg-red' : 'bg-white/10'}`}>
              <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${isBlocked ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
            </div>
          </button>

          <button onClick={() => {
            vibrate('light');
            reportItem({
              targetUserId: userKey,
              targetUserName: userName,
              reason: 'reported',
              details: `Reported by ${profile.name}`,
            });
            notification('success');
            showToast('Report submitted');
            onClose();
          }} className="flex w-full items-center gap-4 rounded-2xl border border-linesoft p-4 text-left transition-colors hover:bg-white/5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-text2"><Flag size={20} /></div>
            <div className="flex-1">
              <div className="text-[14px] font-bold">Report {userName}</div>
              <div className="text-[12px] text-text2">Report their account or content</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
