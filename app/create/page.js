'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lightbulb, TrendingUp, Users, ImageIcon, X, Save, Clock, Loader2 } from 'lucide-react';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { uploadImage } from '@/lib/firestore';
import Avatar from '@/components/Avatar';
import AuthSkeleton from '@/components/AuthSkeleton';

const TAGS = [
  { key: 'idea', label: 'Idea', icon: Lightbulb, cls: 'bg-[rgba(217,172,61,0.14)] text-gold-hi border-[rgba(217,172,61,0.4)]' },
  { key: 'update', label: 'Update', icon: TrendingUp, cls: 'bg-[rgba(46,204,113,0.12)] text-brandgreen border-[rgba(46,204,113,0.4)]' },
  { key: 'cofounder', label: 'Co-founder', icon: Users, cls: 'bg-[rgba(91,141,255,0.14)] text-brandblue border-[rgba(91,141,255,0.4)]' },
];

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_TEXT = 280;

export default function CreatePage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const publishPost = useStore((s) => s.publishPost);
  const showToast = useStore((s) => s.showToast);
  const { vibrate, notification } = useHaptics();

  const [text, setText] = useState('');
  const [tag, setTag] = useState('idea');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem('editing_draft'));
      if (draft) {
        setText(draft.text || '');
        setTag(draft.tag || 'idea');
        setImagePreview(draft.imagePreview || null);
        localStorage.removeItem('editing_draft');
      }
    } catch {}
  }, []);

  if (!ready) return <AuthSkeleton />;

  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast('Only JPEG, PNG, WebP and GIF images are allowed');
      return;
    }
    if (file.size > MAX_SIZE) {
      showToast('Image must be under 5MB');
      return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = '';
  }

  function handleRemoveImage() {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview(null);
  }

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

  async function handlePublish() {
    if (!text.trim() && !selectedImage && !imagePreview) {
      showToast('Write something or add an image before posting');
      return;
    }
    if (text.length > MAX_TEXT) {
      showToast(`Post must be under ${MAX_TEXT} characters`);
      return;
    }
    setIsPublishing(true);
    try {
      let finalImageUrl = imagePreview;
      if (selectedImage) {
        const postId = `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const compressed = await compressImage(selectedImage);
        const result = await uploadImage(compressed, `posts/${postId}/${compressed.name}`);
        if (result.success) {
          finalImageUrl = result.data;
        } else {
          showToast('Failed to upload image: ' + result.error);
          setIsPublishing(false);
          return;
        }
      }
      publishPost({ text: text.trim(), tagType: tag, imageUrl: finalImageUrl });
      notification('success');
      showToast('Post published!');
      router.push('/home');
    } catch (err) {
      showToast('Failed to publish: ' + err.message);
    } finally {
      setIsPublishing(false);
    }
  }

  function handleSaveDraft() {
    if (!text.trim() && !imagePreview) {
      showToast('Nothing to save');
      return;
    }
    vibrate('light');
    const drafts = JSON.parse(localStorage.getItem('post_drafts') || '[]');
    drafts.push({
      id: `draft_${Date.now()}`,
      text: text.trim(),
      tag,
      imagePreview,
      savedAt: Date.now(),
    });
    localStorage.setItem('post_drafts', JSON.stringify(drafts));
    showToast('Draft saved!');
  }

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <div className="flex flex-none items-center justify-between border-b border-linesoft px-4 py-3.5">
        <button onClick={() => router.push('/home')} className="text-xs font-bold text-gold">
          Cancel
        </button>
        <h2 className="text-[17px] font-extrabold">New Post</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 rounded-full border border-linesoft px-3 py-2 text-[11px] font-bold text-text2"
            aria-label="Save as draft"
          >
            <Save size={13} />
            Draft
          </button>
          <button
            onClick={handlePublish}
            disabled={isPublishing || text.length > MAX_TEXT || (!text.trim() && !selectedImage)}
            className="rounded-full bg-gold-grad px-[18px] py-2 text-xs font-extrabold text-[#1a1300] disabled:opacity-50"
          >
            {isPublishing ? <Loader2 size={14} className="animate-spin" /> : 'Post'}
          </button>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto p-[18px]">
        <div className="mb-3.5 flex items-center gap-2.5">
          <Avatar src={profile.avatar} name={profile.name} size={40} />
          <div>
            <div className="text-sm font-extrabold">{profile.name}</div>
            <div className="text-[11.5px] text-text2">Posting publicly to Foundators</div>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share an idea, an update, or what you're looking for..."
            aria-label="Write your post"
            autoFocus
            className={`min-h-[130px] w-full rounded-2xl border border-linesoft bg-card p-3.5 text-[14.5px] leading-relaxed text-white placeholder:text-text3 focus:border-gold focus:outline-none ${imagePreview ? 'pb-2' : ''}`}
          />
          {imagePreview && (
            <div className="pointer-events-none absolute inset-x-3.5 bottom-3.5">
              <div className="pointer-events-auto relative inline-block overflow-hidden rounded-xl border border-linesoft">
                <img src={imagePreview} alt="Preview" className="max-h-40 rounded-xl object-cover" />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-2">
          <span className={`text-[11px] ${text.length > MAX_TEXT ? 'text-red-500' : 'text-text3'}`}>
            {text.length}/{MAX_TEXT}
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />

        <div className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-text2">Tag your post</div>
        <div className="flex flex-wrap gap-2.5">
          {TAGS.map((t) => {
            const Icon = t.icon;
            const active = tag === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTag(t.key)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-opacity ${t.cls} ${
                  active ? 'opacity-100' : 'opacity-40'
                }`}
              >
                <Icon size={13} />
                {t.label}
              </button>
            );
          })}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1.5 rounded-full border border-linesoft px-3 py-1.5 text-[11.5px] font-bold transition-opacity ${imagePreview ? 'bg-[rgba(217,172,61,0.14)] text-gold-hi border-[rgba(217,172,61,0.4)] opacity-100' : 'text-text2 opacity-40'}`}
          >
            <ImageIcon size={13} />
            Image
          </button>
        </div>
      </div>
    </div>
  );
}
