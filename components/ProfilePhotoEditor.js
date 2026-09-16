'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, X, Check, QrCode, Download, Share2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import Avatar from './Avatar';

export default function ProfilePhotoEditor() {
  const { vibrate, notification } = useHaptics();
  const showToast = useStore((s) => s.showToast);
  const profile = useStore((s) => s.profile);
  const updateProfile = useStore((s) => s.updateProfile);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const handleAvatar = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Only images'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setAvatarPreview(ev.target.result); e.target.value = ''; };
    reader.readAsDataURL(file);
  }, [showToast]);

  const handleCover = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Only images'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setCoverPreview(ev.target.result); e.target.value = ''; };
    reader.readAsDataURL(file);
  }, [showToast]);

  const saveAvatar = useCallback(() => {
    if (!avatarPreview) return;
    vibrate('medium');
    updateProfile({ avatar: avatarPreview });
    setAvatarPreview(null);
    notification('success');
    showToast('Profile photo updated');
  }, [avatarPreview, vibrate, updateProfile, notification, showToast]);

  const saveCover = useCallback(() => {
    if (!coverPreview) return;
    vibrate('medium');
    updateProfile({ coverPhoto: coverPreview });
    setCoverPreview(null);
    notification('success');
    showToast('Cover photo updated');
  }, [coverPreview, vibrate, updateProfile, notification, showToast]);

  return (
    <div className="space-y-4">
      {/* Avatar section */}
      <div className="rounded-2xl border border-linesoft bg-card p-4">
        <h3 className="text-[13px] font-bold mb-3">Profile Photo</h3>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar src={avatarPreview || profile?.avatar} name={profile?.name} size={72} />
            <button onClick={() => avatarInputRef.current?.click()} className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-gold text-[#1a1300]" aria-label="Change photo">
              <Camera size={14} />
            </button>
          </div>
          <div className="flex-1">
            <p className="text-[12px] text-text2">Tap the camera icon to upload a new photo</p>
            {avatarPreview && (
              <div className="flex gap-2 mt-2">
                <button onClick={saveAvatar} className="flex items-center gap-1 rounded-full bg-gold px-3 py-1.5 text-[11px] font-bold text-[#1a1300]">
                  <Check size={12} /> Save
                </button>
                <button onClick={() => setAvatarPreview(null)} className="rounded-full border border-linesoft px-3 py-1.5 text-[11px] font-bold text-text2">Cancel</button>
              </div>
            )}
          </div>
        </div>
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
      </div>

      {/* Cover section */}
      <div className="rounded-2xl border border-linesoft bg-card p-4">
        <h3 className="text-[13px] font-bold mb-3">Cover Photo</h3>
        <div className="relative h-[120px] rounded-xl overflow-hidden bg-white/5">
          {coverPreview || profile?.coverPhoto ? (
            <img src={coverPreview || profile?.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-text3 text-[12px]">No cover photo</div>
          )}
          <button onClick={() => coverInputRef.current?.click()} className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm" aria-label="Change cover">
            <Camera size={16} />
          </button>
        </div>
        {coverPreview && (
          <div className="flex gap-2 mt-2">
            <button onClick={saveCover} className="flex items-center gap-1 rounded-full bg-gold px-3 py-1.5 text-[11px] font-bold text-[#1a1300]">
              <Check size={12} /> Save cover
            </button>
            <button onClick={() => setCoverPreview(null)} className="rounded-full border border-linesoft px-3 py-1.5 text-[11px] font-bold text-text2">Cancel</button>
          </div>
        )}
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCover} />
      </div>

      {/* QR Code */}
      <div className="rounded-2xl border border-linesoft bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold">Profile QR Code</h3>
          <button onClick={() => setShowQR(!showQR)} className="text-gold text-[12px] font-bold">
            {showQR ? 'Hide' : 'Show'}
          </button>
        </div>
        {showQR && (
          <div className="flex flex-col items-center py-4">
            <div className="h-[160px] w-[160px] rounded-2xl bg-white p-3 flex items-center justify-center">
              <div className="grid grid-cols-8 gap-[2px] w-full h-full">
                {Array.from({ length: 64 }, (_, i) => (
                  <div key={i} className={`rounded-[1px] ${Math.random() > 0.45 ? 'bg-black' : 'bg-white'}`} />
                ))}
              </div>
            </div>
            <p className="mt-3 text-[12px] font-bold">{profile?.name || 'Your Name'}</p>
            <p className="text-[10px] text-text3">@{profile?.handle || 'yourhandle'}</p>
            <div className="flex gap-2 mt-3">
              <button className="flex items-center gap-1 rounded-full bg-gold px-4 py-2 text-[11px] font-bold text-[#1a1300]">
                <Download size={12} /> Save
              </button>
              <button className="flex items-center gap-1 rounded-full border border-linesoft px-4 py-2 text-[11px] font-bold text-text2">
                <Share2 size={12} /> Share
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
