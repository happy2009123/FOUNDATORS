'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, Camera, Type, Palette, Sparkles, Send, Image, Check, ChevronLeft } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { uploadImage } from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Avatar from '@/components/Avatar';

const BACKGROUNDS = [
  'from-purple-600 to-pink-500',
  'from-amber-500 to-orange-600',
  'from-blue-600 to-cyan-500',
  'from-green-500 to-emerald-600',
  'from-rose-500 to-red-600',
  'from-violet-600 to-purple-700',
  'from-sky-500 to-blue-600',
  'from-teal-500 to-cyan-600',
  'from-indigo-500 to-violet-600',
  'from-pink-500 to-rose-500',
  'from-[#020202] to-[#1a1300]',
  'from-[#1a1300] to-[#2a2000]',
];

const FONTS = ['sans-serif', 'serif', 'monospace', 'cursive'];

export default function StoryCreator() {
  const router = useRouter();
  const { vibrate, notification } = useHaptics();
  const showToast = useStore((s) => s.showToast);
  const profile = useStore((s) => s.profile);

  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [bg, setBg] = useState(BACKGROUNDS[0]);
  const [font, setFont] = useState(FONTS[0]);
  const [fontSize, setFontSize] = useState(28);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Only images allowed');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target.result);
      setMode('photo');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [showToast]);

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let { width, height } = img;
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width *= ratio;
          height *= ratio;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
        }, 'image/jpeg', 0.8);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleShare = useCallback(async () => {
    if (!profile?.id) {
      showToast('You must be logged in to post a story');
      return;
    }
    vibrate('medium');
    setIsUploading(true);
    try {
      let imageUrl = null;

      if (mode === 'photo' && selectedFile) {
        const compressed = await compressImage(selectedFile);
        const result = await uploadImage(compressed, `stories/${profile.id}/${compressed.name}`);
        if (!result.success) {
          showToast('Failed to upload image: ' + result.error);
          setIsUploading(false);
          return;
        }
        imageUrl = result.data;
      }

      await addDoc(collection(db, 'stories'), {
        authorKey: profile.id,
        authorName: profile.name,
        authorAvatar: profile.avatar,
        imageUrl,
        text: mode === 'text' ? text.trim() : null,
        bg: mode === 'text' ? bg : null,
        font: mode === 'text' ? font : null,
        fontSize: mode === 'text' ? fontSize : null,
        mode,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      notification('success');
      showToast('Story shared!');
      router.push('/home');
    } catch (err) {
      showToast('Failed to share story: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  }, [profile, mode, text, bg, font, fontSize, selectedFile, vibrate, notification, showToast, router]);

  return (
    <div className="app-shell flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-linesoft">
        <button onClick={() => router.back()} className="h-9 w-9 flex items-center justify-center rounded-full" aria-label="Go back">
          <ChevronLeft size={20} />
        </button>
        <span className="text-[15px] font-bold">Create Story</span>
        <div className="w-9" />
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 px-4 py-3">
        {[
          { key: 'text', label: 'Text', icon: Type },
          { key: 'photo', label: 'Photo', icon: Camera },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold transition-all ${
              mode === key ? 'bg-gold text-[#1a1300]' : 'bg-white/5 text-text2'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className={`relative w-full max-w-[320px] aspect-[9/16] rounded-3xl overflow-hidden bg-gradient-to-br ${bg} flex items-center justify-center p-8`}>
          {mode === 'text' && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your story..."
              className="w-full h-full bg-transparent text-white text-center resize-none focus:outline-none placeholder:text-white/50"
              style={{ fontSize: `${fontSize}px`, fontFamily: font }}
              aria-label="Story text"
            />
          )}
          {mode === 'photo' && imagePreview && (
            <img src={imagePreview} alt="Story preview" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {mode === 'photo' && !imagePreview && (
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 text-white/60" aria-label="Add photo">
              <Camera size={40} />
              <span className="text-[12px]">Tap to add photo</span>
            </button>
          )}
          {/* Avatar */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <Avatar src={profile?.avatar} name={profile?.name} size={32} />
            <span className="text-[12px] font-bold text-white drop-shadow">{profile?.name?.split(' ')[0]}</span>
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

      {/* Controls */}
      <div className="px-4 py-4 space-y-3">
        {mode === 'text' && (
          <>
            {/* Font size */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-text3 w-16">Size</span>
              <input
                type="range"
                min={16}
                max={48}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="flex-1 accent-gold"
                aria-label="Font size"
              />
            </div>
            {/* Font family */}
            <div className="flex gap-2">
              {FONTS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFont(f)}
                  className={`flex-1 rounded-xl py-2 text-[11px] font-bold transition-all ${
                    font === f ? 'bg-gold text-[#1a1300]' : 'bg-white/5 text-text2'
                  }`}
                  style={{ fontFamily: f }}
                >
                  {f.split('-')[0]}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Background picker */}
        <button
          onClick={() => setShowBgPicker(!showBgPicker)}
          className="flex items-center gap-2 text-[12px] font-bold text-text2"
        >
          <Palette size={14} />
          {showBgPicker ? 'Hide backgrounds' : 'Change background'}
        </button>
        {showBgPicker && (
          <div className="flex flex-wrap gap-2">
            {BACKGROUNDS.map((background) => (
              <button
                key={background}
                onClick={() => { setBg(background); vibrate('light'); }}
                className={`h-10 w-10 rounded-xl bg-gradient-to-br ${background} transition-transform ${
                  bg === background ? 'ring-2 ring-gold scale-110' : ''
                }`}
                aria-label={`Background ${background}`}
              />
            ))}
          </div>
        )}

        {/* Share button */}
        <button
          onClick={handleShare}
          disabled={isUploading || (mode === 'text' && !text.trim()) || (mode === 'photo' && !imagePreview)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gold-grad py-3.5 text-[14px] font-extrabold text-[#1a1300] disabled:opacity-40"
        >
          {isUploading ? (
            <span className="flex items-center gap-2"><Sparkles size={16} className="animate-spin" /> Sharing...</span>
          ) : (
            <><Send size={16} /> Share to Story</>
          )}
        </button>
      </div>
    </div>
  );
}
