'use client';

export function isCloudinaryConfigured() {
  return !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
}

export async function uploadToCloudinary(file, resourceType = 'auto', folder = '', publicId = '') {
  const res = await fetch('/api/cloudinary/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceType, folder, publicId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to sign Cloudinary upload');
  }

  const { cloudName, apiKey, timestamp, signature } = await res.json();

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  if (folder) form.append('folder', folder);
  if (publicId) form.append('public_id', publicId);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const uploadRes = await fetch(endpoint, { method: 'POST', body: form });
  const data = await uploadRes.json().catch(() => ({}));

  if (!uploadRes.ok || data.error) {
    throw new Error(data.error?.message || 'Cloudinary upload failed');
  }
  return data.secure_url;
}