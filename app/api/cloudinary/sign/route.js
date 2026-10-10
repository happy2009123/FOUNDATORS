import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Supabase access tokens are verified server-side with the admin client
// (SUPABASE_SECRET_KEY); the verified user id scopes every upload path below.
async function verifyUser(jwt) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data || !data.user) return null;
  return data.user;
}

// Roots derived from the app's actual upload paths
// (lib/firestore.js uploadImage: folder = everything before the last
// path segment — e.g. 'posts/<postId>', 'stories/<uid>', 'voice/covers').
const ALLOWED_ROOTS = [
  'profile-photos',
  'cover-photos',
  'posts',
  'stories',
  'reels',
  'covers',
  'voice',
  'foundators',
];

// Spaces that are personal must be owned by the caller.
const UID_SCOPED_ROOTS = ['stories', 'reels'];

export async function POST(req) {
  try {
    // 1. Require a Supabase access token from the client (Authorization header).
    const authHeader = req.headers.authorization || '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!jwt) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await verifyUser(jwt);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const uid = user.id;

    const { resourceType = 'auto', folder = '' } = await req.json();

    // 2. Validate folder: first segment allowlist + uid binding for
    //    personal spaces. Never trust client-controlled paths verbatim.
    const segments = String(folder).split('/').filter(Boolean);
    if (segments.length === 0 || segments.length > 4 || !ALLOWED_ROOTS.includes(segments[0])) {
      return NextResponse.json({ error: `Folder "${folder}" is not allowed` }, { status: 403 });
    }
    if (UID_SCOPED_ROOTS.includes(segments[0]) && segments[1] !== uid) {
      return NextResponse.json({ error: 'Folder is not owned by this user' }, { status: 403 });
    }
    if (segments.some((s) => !/^[A-Za-z0-9_\-\.]{1,80}$/.test(s))) {
      return NextResponse.json({ error: 'Invalid folder path' }, { status: 403 });
    }
    const safeFolder = segments.join('/');

    // 3. public_id is derived server-side from the authenticated uid —
    //    the client cannot overwrite anyone else's assets.
    const serverPublicId = `${uid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Cloudinary is not configured' }, { status: 500 });
    }

    const timestamp = Math.round(Date.now() / 1000);

    // 4. Cloudinary signs over ALL upload params except file/api_key
    //    (cloud_name is in the URL, resource_type is in the URL path).
    //    folder + public_id + timestamp must all be in the signature,
    //    because the client sends them with the upload.
    const params = { folder: safeFolder, public_id: serverPublicId, timestamp };
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
      folder: safeFolder,
      publicId: serverPublicId,
      resourceType: 'auto',
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Sign failed' }, { status: 500 });
  }
}
