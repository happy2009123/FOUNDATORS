import { createHash } from 'crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

async function verifyIdToken(idToken) {
  const key =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    (await import('@/lib/firebaseConfig')).firebaseConfig.apiKey;
  if (!key) return { error: 'missing-key' };
  if (!idToken) return { error: 'missing-token' };
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) {
      let detail = '';
      try {
        const errJson = await res.json();
        detail = (errJson.error && errJson.error.message) || '';
      } catch (e) {
        detail = '';
      }
      return { error: `lookup-${res.status}${detail ? `:${detail}` : ''}` };
    }
    const json = await res.json();
    const user = json && json.users && json.users[0];
    if (!user || !user.localId) return { error: 'no-user' };
    return { user: { uid: user.localId, email: user.email || '' } };
  } catch (err) {
    return { error: `network:${err.message}` };
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { resourceType = 'auto', folder = '', publicId = '', idToken } = body;

    const auth = await verifyIdToken(idToken);
    if (auth.error) {
      return NextResponse.json({ error: `Unauthorized: ${auth.error}` }, { status: 401 });
    }

    // Client-side config uses the NEXT_PUBLIC_ var — accept either name so a
    // deploy that only sets one of them still signs uploads correctly.
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      const missing = [];
      if (!cloudName) missing.push('CLOUDINARY_CLOUD_NAME');
      if (!apiKey) missing.push('CLOUDINARY_API_KEY');
      if (!apiSecret) missing.push('CLOUDINARY_API_SECRET');
      return NextResponse.json(
        { error: `Cloudinary is not configured (missing: ${missing.join(', ')})` },
        { status: 500 }
      );
    }

    const timestamp = Math.round(Date.now() / 1000);
    const params = {};
    if (folder) params.folder = folder;
    if (publicId) params.public_id = publicId;
    if (resourceType && resourceType !== 'auto') params.resource_type = resourceType;
    params.timestamp = timestamp;

    const sorted = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');

    const signature = createHash('sha1').update(`${sorted}${apiSecret}`).digest('hex');

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder,
      publicId,
      resourceType,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}