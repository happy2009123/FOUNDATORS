'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, Camera, Upload, Music, Type, Sparkles, Send, ChevronLeft, Pause, Play, RotateCcw, Timer, Zap, Loader2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { uploadImage } from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Avatar from '@/components/Avatar';

const EFFECTS = [
  { name: 'None', filter: '' },
  { name: 'Warm', filter: 'sepia(0.3) saturate(1.4) brightness(1.1)' },
  { name: 'Cool', filter: 'saturate(0.8) brightness(1.1) hue-rotate(15deg)' },
  { name: 'Vintage', filter: 'sepia(0.5) contrast(1.1) brightness(0.9)' },
  { name: 'B&W', filter: 'grayscale(1) contrast(1.2)' },
  { name: 'Vivid', filter: 'saturate(1.8) contrast(1.1)' },
];

const SOUNDS = [
  { name: 'Original Audio', artist: '' },
  { name: 'Trending Beat', artist: 'DJ Found' },
  { name: 'Lo-fi Vibes', artist: 'Chill Hop' },
  { name: 'Upbeat Energy', artist: 'Pop Mix' },
  { name: 'Motivational', artist: 'Inspire' },
];

export default function CreateReelPage() {
  const router = useRouter();
  const { vibrate, notification } = useHaptics();
  const showToast = useStore((s) => s.showToast);
  const profile = useStore((s) => s.profile);

  const [step, setStep] = useState('capture');
  const [videoPreview, setVideoPreview] = useState(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [selectedEffect, setSelectedEffect] = useState(0);
  const [selectedSound, setSelectedSound] = useState(0);
  const [caption, setCaption] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showSounds, setShowSounds] = useState(false);
  const fileInputRef = useRef(null);
  const recordInterval = useRef(null);

  const startRecording = useCallback(() => {
    vibrate('medium');
    setIsRecording(true);
    setRecordTime(0);
    recordInterval.current = setInterval(() => {
      setRecordTime((prev) => {
        if (prev >= 60) {
          clearInterval(recordInterval.current);
          return 60;
        }
        return prev + 1;
      });
    }, 1000);
  }, [vibrate]);

  const stopRecording = useCallback(() => {
    vibrate('light');
    setIsRecording(false);
    clearInterval(recordInterval.current);
    if (recordTime > 0) setStep('edit');
  }, [recordTime, vibrate]);

  const handleVideoSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      showToast('Only videos allowed');
      return;
    }
    setSelectedVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    setStep('edit');
    e.target.value = '';
  }, [showToast]);

  const handlePublish = useCallback(async () => {
    if (!profile?.id) {
      showToast('You must be logged in to post a reel');
      return;
    }
    vibrate('medium');
    setIsUploading(true);
    try {
      let reelUrl = null;
      if (selectedVideoFile) {
        const result = await uploadImage(selectedVideoFile, `reels/${profile.id}/${Date.now()}`);
        if (!result.success) {
          showToast('Failed to upload video: ' + result.error);
          setIsUploading(false);
          return;
        }
        reelUrl = result.data;
      }

      await addDoc(collection(db, 'reels'), {
        authorKey: profile.id,
        authorName: profile.name,
        authorAvatar: profile.avatar,
        videoUrl: reelUrl,
        text: caption.trim(),
        effect: EFFECTS[selectedEffect].name,
        sound: SOUNDS[selectedSound].name,
        likes: 0,
        comments: 0,
        shares: 0,
        createdAt: serverTimestamp(),
      });

      notification('success');
      showToast('Reel published!');
      router.push('/reels');
    } catch (err) {
      showToast('Failed to publish reel: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  }, [profile, selectedVideoFile, caption, selectedEffect, selectedSound, vibrate, notification, showToast, router]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="app-shell flex flex-col overflow-hidden bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 z-10">
        <button onClick={() => step === 'edit' ? setStep('capture') : router.back()} className="h-9 w-9 flex items-center justify-center rounded-full text-white" aria-label="Go back">
          <ChevronLeft size={20} />
        </button>
        <span className="text-[15px] font-bold text-white">{step === 'capture' ? 'New Reel' : 'Edit Reel'}</span>
        {step === 'edit' && (
          <button onClick={handlePublish} disabled={isUploading} className="flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-[12px] font-bold text-[#1a1300] disabled:opacity-50" aria-label="Publish reel">
            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {isUploading ? 'Posting...' : 'Post'}
          </button>
        )}
        {step === 'capture' && <div className="w-9" />}
      </div>

      {/* Capture step */}
      {step === 'capture' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          {/* Camera viewfinder */}
          <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 flex items-center justify-center">
            {isRecording && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                <div className="h-2.5 w-2.5 rounded-full bg-red animate-pulse" />
                <span className="text-[11px] font-bold text-white">{formatTime(recordTime)}</span>
              </div>
            )}
            {!videoPreview ? (
              <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-3 text-white/40" aria-label="Upload video">
                <Upload size={40} />
                <span className="text-[12px]">Upload from gallery</span>
              </button>
            ) : (
              <video src={videoPreview} className="w-full h-full object-cover" autoPlay muted loop />
            )}
          </div>

          {/* Effects */}
          <div className="mt-6 flex gap-3 overflow-x-auto px-4">
            {EFFECTS.map((effect, i) => (
              <button
                key={effect.name}
                onClick={() => { setSelectedEffect(i); vibrate('light'); }}
                className={`flex flex-none flex-col items-center gap-1.5 ${selectedEffect === i ? 'opacity-100' : 'opacity-50'}`}
              >
                <div className={`h-12 w-12 rounded-xl bg-zinc-800 border-2 transition-colors ${selectedEffect === i ? 'border-gold' : 'border-transparent'}`} style={{ filter: effect.filter }} />
                <span className="text-[9px] font-bold text-white">{effect.name}</span>
              </button>
            ))}
          </div>

          {/* Sound selector */}
          <button
            onClick={() => setShowSounds(!showSounds)}
            className="mt-4 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[12px] font-bold text-white"
          >
            <Music size={14} />
            {SOUNDS[selectedSound].name}
          </button>

          {showSounds && (
            <div className="mt-3 w-full max-w-[280px] rounded-2xl bg-zinc-900 border border-white/10 p-3 space-y-1">
              {SOUNDS.map((sound, i) => (
                <button
                  key={sound.name}
                  onClick={() => { setSelectedSound(i); setShowSounds(false); vibrate('light'); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${selectedSound === i ? 'bg-gold/10 text-gold' : 'text-white'}`}
                >
                  <Music size={14} />
                  <div>
                    <div className="text-[12px] font-bold">{sound.name}</div>
                    {sound.artist && <div className="text-[10px] text-text3">{sound.artist}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Record / upload buttons */}
          <div className="mt-6 flex items-center gap-6">
            <button onClick={() => fileInputRef.current?.click()} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white" aria-label="Upload video">
              <Upload size={20} />
            </button>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 transition-all ${
                isRecording ? 'border-red bg-red/20 scale-110' : 'border-white bg-white/10'
              }`}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              <div className={`rounded-full transition-all ${isRecording ? 'h-6 w-6 bg-red rounded-lg' : 'h-[52px] w-[52px] bg-red'}`} />
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white" aria-label="Timer">
              <Timer size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Edit step */}
      {step === 'edit' && (
        <div className="flex-1 flex flex-col px-4 pb-4">
          {/* Preview */}
          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-full max-w-[200px] aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-900">
              {videoPreview ? (
                <video src={videoPreview} className="w-full h-full object-cover" style={{ filter: EFFECTS[selectedEffect].filter }} autoPlay muted loop />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center text-white/40 text-[12px]">
                  Recording preview
                </div>
              )}
            </div>
          </div>

          {/* Caption */}
          <div className="mt-4">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              maxLength={500}
              className="w-full rounded-2xl border border-linesoft bg-card px-4 py-3 text-[13px] text-white placeholder:text-text3 focus:border-gold focus:outline-none min-h-[80px]"
              aria-label="Reel caption"
            />
            <div className="mt-1 text-right text-[10px] text-text3">{caption.length}/500</div>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
    </div>
  );
}
