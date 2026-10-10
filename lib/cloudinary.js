'use client';

import { getSupabase } from './supabase/client';

export function isCloudinaryConfigured() {
  return !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
}

export async function uploadToCloudinary(file, resourceType = 'auto', folder = '') {
  // The sign endpoint is auth-only: attach the Supabase access token.
  // (Previously no Authorization header was sent at all, so an
  // authenticated route could never succeed.)
  let token = '';
  try {
    const { data } = (getSupabase() || { auth: null })?.auth
      ? await getSupabase().auth.getSession()
      : { data: null };
    token = data?.session?.access_token || '';
  } catch {
    token = '';
  }

  const res = await fetch('/api/cloudinary/sign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ resourceType, folder }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to sign Cloudinary upload');
  }

  const {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder: signedFolder,
    publicId,
  } = await res.json();

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  // Always use the server-signed values — they are exactly what the
  // signature covers (sending the client's original folder/public_id
  // would invalidate the signature).
  if (signedFolder) form.append('folder', signedFolder);
  if (publicId) form.append('public_id', publicId);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const uploadRes = await fetch(endpoint, { method: 'POST', body: form });
  const data = await uploadRes.json().catch(() => ({}));

  if (!uploadRes.ok || data.error) {
    throw new Error(data.error?.message || 'Cloudinary upload failed');
  }
  return data.secure_url;
}
