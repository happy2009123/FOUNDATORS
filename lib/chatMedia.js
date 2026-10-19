'use client';

import { uploadImage } from './firestore';
import { uploadToCloudinary, isCloudinaryConfigured } from './cloudinary';
import { getSupabase } from './supabase/client';

// chat_messages has a single `text` column (no media columns), so chat
// media is encoded inside the text itself:
//   media:image:<url>
//   media:audio:<seconds>:<url>
//   media:file:<urlencoded-name>:<url>
// The renderer parses these prefixes; anything else is plain text. This
// keeps images, voice notes and files working across deploys with no
// schema change and no migration ordering risk.

const IMAGE_PREFIX = 'media:image:';
const AUDIO_PREFIX = 'media:audio:';
const FILE_PREFIX = 'media:file:';

export function buildImageText(url) {
  return `${IMAGE_PREFIX}${url}`;
}

export function buildAudioText(url, seconds) {
  return `${AUDIO_PREFIX}${Math.max(1, Math.round(seconds))}:${url}`;
}

export function buildFileText(url, name) {
  // encodeURIComponent keeps ':' out of the name so the split below is safe.
  return `${FILE_PREFIX}${encodeURIComponent(name || 'file')}:${url}`;
}

export function parseChatMedia(text) {
  const t = typeof text === 'string' ? text : '';
  if (t.startsWith(IMAGE_PREFIX)) {
    const url = t.slice(IMAGE_PREFIX.length);
    return /^https?:\/\/\S+$/.test(url) ? { kind: 'image', url } : null;
  }
  if (t.startsWith(AUDIO_PREFIX)) {
    const rest = t.slice(AUDIO_PREFIX.length);
    const sep = rest.indexOf(':');
    if (sep > 0) {
      const seconds = parseInt(rest.slice(0, sep), 10);
      const url = rest.slice(sep + 1);
      if (seconds > 0 && /^https?:\/\/\S+$/.test(url)) {
        return { kind: 'audio', url, seconds };
      }
    }
  }
  if (t.startsWith(FILE_PREFIX)) {
    const rest = t.slice(FILE_PREFIX.length);
    const sep = rest.indexOf(':');
    if (sep > 0) {
      const url = rest.slice(sep + 1);
      if (/^https?:\/\/\S+$/.test(url)) {
        let name = 'file';
        try {
          name = decodeURIComponent(rest.slice(0, sep)) || 'file';
        } catch {
          name = rest.slice(0, sep);
        }
        return { kind: 'file', url, name };
      }
    }
  }
  return null;
}

function fmtDuration(s) {
  const sec = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
}

function fmtFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Human label for conversation previews, replies and forwarded quotes.
export function chatMediaLabel(text) {
  const media = parseChatMedia(text);
  if (media?.kind === 'image') return 'Photo';
  if (media?.kind === 'audio') return `Voice message (${fmtDuration(media.seconds)})`;
  if (media?.kind === 'file') return `Attachment: ${media.name}`;
  return typeof text === 'string' ? text : '';
}

export { fmtFileSize };

export async function uploadChatImage(file, uid) {
  const name = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  // The storage fallback's insert policy requires the uploader's uid as a
  // path segment (0001 storage_authenticated_insert) - keep it in the path
  // so both the Cloudinary and Supabase Storage routes accept the upload.
  const folder = uid ? `foundators/${uid}` : 'foundators';
  const res = await uploadImage(file, `${folder}/${name}`);
  if (!res || !res.success || !res.data) throw new Error(res?.error || 'Image upload failed');
  return res.data;
}

export async function uploadChatAudio(blob, uid) {
  const type = blob.type || '';
  const ext = type.includes('ogg') ? 'ogg' : type.includes('mp4') || type.includes('m4a') ? 'm4a' : 'webm';
  const name = `voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const file = new File([blob], name, { type: type || 'audio/webm' });

  // Storage first (uid-scoped path required by 0001 storage_authenticated_insert).
  const supabase = getSupabase();
  if (supabase && uid) {
    const path = `foundators/${uid}/${name}`;
    try {
      const { error } = await supabase.storage
        .from('uploads')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (!error) {
        const { data } = supabase.storage.from('uploads').getPublicUrl(path);
        if (data?.publicUrl) return data.publicUrl;
      }
    } catch (err) {
      console.warn('[chat] storage audio failed, trying Cloudinary:', err?.message);
    }
  }

  if (isCloudinaryConfigured()) {
    try {
      return await uploadToCloudinary(file, 'video', 'foundators/voice');
    } catch (err) {
      console.warn('[chat] Cloudinary audio failed:', err?.message);
    }
  }
  throw new Error('Upload failed');
}

// Any non-image file (PDF, zip, doc, …). Cloudinary raw uploads need an
// extension on public_id — uploadToCloudinary sends the file name so the
// sign route can append it. Falls back to Supabase Storage (uid-scoped
// path required by the bucket's insert policy).
export async function uploadChatFile(file, uid) {
  const safeExt = (String(file.name || '').split('.').pop() || 'bin')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8) || 'bin';
  const base = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const folder = uid ? `foundators/${uid}` : 'foundators';

  // Storage first (uid-scoped path required by 0001 storage_authenticated_insert).
  const supabase = getSupabase();
  if (supabase && uid) {
    const path = `${folder}/${base}.${safeExt}`;
    try {
      const { error } = await supabase.storage
        .from('uploads')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (!error) {
        const { data } = supabase.storage.from('uploads').getPublicUrl(path);
        if (data?.publicUrl) return data.publicUrl;
      }
    } catch (err) {
      console.warn('[chat] storage file failed, trying Cloudinary:', err?.message);
    }
  }

  if (isCloudinaryConfigured()) {
    try {
      return await uploadToCloudinary(file, 'raw', folder, file.name || `${base}.${safeExt}`);
    } catch (err) {
      console.warn('[chat] Cloudinary raw upload failed:', err?.message);
    }
  }
  throw new Error('Upload failed');
}
