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

// Attachment URLs are parsed out of free-form message text, so a sender
// could otherwise plant any https link (malware download buttons, phishing).
// Only the app's own storage/CDN hosts are trusted.
function isTrustedMediaUrl(url) {
  if (!/^https?:\/\/\S+$/.test(url)) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.endsWith('.supabase.co') ||
      host.endsWith('.supabase.in') ||
      host === 'res.cloudinary.com' ||
      host.endsWith('.cloudinary.com')
    );
  } catch {
    return false;
  }
}

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
    return isTrustedMediaUrl(url) ? { kind: 'image', url } : null;
  }
  if (t.startsWith(AUDIO_PREFIX)) {
    const rest = t.slice(AUDIO_PREFIX.length);
    const sep = rest.indexOf(':');
    if (sep > 0) {
      const seconds = parseInt(rest.slice(0, sep), 10);
      const url = rest.slice(sep + 1);
      if (seconds > 0 && isTrustedMediaUrl(url)) {
        return { kind: 'audio', url, seconds };
      }
    }
  }
  if (t.startsWith(FILE_PREFIX)) {
    const rest = t.slice(FILE_PREFIX.length);
    const sep = rest.indexOf(':');
    if (sep > 0) {
      const url = rest.slice(sep + 1);
      if (isTrustedMediaUrl(url)) {
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

// Private bucket for NEW chat attachments (migration 0020): objects are
// readable only by their owner, so the message carries a signed URL
// instead of a permanent public link. Old messages with `uploads` URLs
// keep working — that bucket is untouched. If the bucket/policy isn't
// applied yet, uploads fall back to the legacy public path below.
const CHAT_BUCKET = 'chat-media';
const SIGNED_TTL_SEC = 60 * 60 * 24 * 365 * 10; // 10 years

async function uploadChatObject(file, uid, name) {
  const supabase = getSupabase();
  if (!supabase || !uid) return null;
  const path = `foundators/${uid}/${name}`;
  try {
    const { error } = await supabase.storage
      .from(CHAT_BUCKET)
      .upload(path, file, { upsert: true, cacheControl: '3600' });
    if (error) throw error;
    const { data } = await supabase.storage.from(CHAT_BUCKET).createSignedUrl(path, SIGNED_TTL_SEC);
    return data?.signedUrl || null;
  } catch (err) {
    console.warn('[chat] private-bucket upload failed, using legacy path:', err?.message);
    return null;
  }
}

export async function uploadChatImage(file, uid) {
  const name = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const signed = await uploadChatObject(file, uid, name);
  if (signed) return signed;
  // Legacy fallback: public `uploads` bucket (uid-scoped path required by
  // its insert policy) with Cloudinary handled inside uploadImage.
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

  const signed = await uploadChatObject(file, uid, name);
  if (signed) return signed;

  // Legacy fallback: public `uploads` bucket, then Cloudinary.
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
// sign route can append it.
export async function uploadChatFile(file, uid) {
  const safeExt = (String(file.name || '').split('.').pop() || 'bin')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8) || 'bin';
  const base = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const name = `${base}.${safeExt}`;
  const folder = uid ? `foundators/${uid}` : 'foundators';

  const signed = await uploadChatObject(file, uid, name);
  if (signed) return signed;

  // Legacy fallback: public `uploads` bucket, then Cloudinary.
  const supabase = getSupabase();
  if (supabase && uid) {
    const path = `${folder}/${name}`;
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
      return await uploadToCloudinary(file, 'raw', folder, file.name || name);
    } catch (err) {
      console.warn('[chat] Cloudinary raw upload failed:', err?.message);
    }
  }
  throw new Error('Upload failed');
}
