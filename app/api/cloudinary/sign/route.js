import { createHash } from 'crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { resourceType = 'auto', folder = '', publicId = '' } = await req.json();

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Cloudinary is not configured (missing env vars)' },
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