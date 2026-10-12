'use client';

import { uploadImage } from './firestore';
import { uploadToCloudinary } from './cloudinary';

// chat_messages has a single `text` column (no media columns), so chat
// media is encoded inside the text itself:
//   media:image:<url>
//   media:audio:<seconds>:<url>
// The renderer parses these prefixes; anything else is plain text. This
// keeps images and voice notes working across deploys with no schema
// change and no migration ordering risk.

const IMAGE_PREFIX = 'media:image:';
const AUDIO_PREFIX = 'media:audio:';

export function buildImageText(url) {
  return `${IMAGE_PREFIX}${url}`;
}

export function buildAudioText(url, seconds) {
  return `${AUDIO_PREFIX}${Math.max(1, Math.round(seconds))}:${url}`;
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
  return null;
}

function fmtDuration(s) {
  const sec = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
}

// Human label for conversation previews, replies and forwarded quotes.
export function chatMediaLabel(text) {
  const media = parseChatMedia(text);
  if (media?.kind === 'image') return 'Photo';
  if (media?.kind === 'audio') return `Voice message (${fmtDuration(media.seconds)})`;
  return typeof text === 'string' ? text : '';
}

export async function uploadChatImage(file) {
  const name = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const res = await uploadImage(file, `foundators/chat/${name}`);
  if (!res || !res.success || !res.data) throw new Error(res?.error || 'Image upload failed');
  return res.data;
}

export async function uploadChatAudio(blob) {
  const type = blob.type || '';
  const ext = type.includes('ogg') ? 'ogg' : type.includes('mp4') || type.includes('m4a') ? 'm4a' : 'webm';
  const name = `voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const file = new File([blob], name, { type: type || 'audio/webm' });
  // Cloudinary stores audio under the `video` resource type.
  return uploadToCloudinary(file, 'video', 'foundators/voice');
}
