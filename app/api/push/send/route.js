import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Fan out a just-created in-app notification as a Web Push to every device
// the recipient has subscribed. Body: { notificationId }. Requires env:
//   SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) - read recipient
//     subscriptions without their session (they are offline - that's the
//     whole point of push).
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY (+ optional
//     VAPID_SUBJECT, default mailto:hello@foundators.app).

function linkPathFor(n) {
  const t = n.link_type || n.linkType;
  const id = n.link_id || n.linkId;
  if (!id) return '/notifications';
  if (t === 'message') return `/messages/${id}`;
  if (t === 'post' || t === 'comment' || t === 'like') return `/post/${id}`;
  if (t === 'follow' || t === 'profile') return `/profile/${id}`;
  if (t === 'challenge') return `/challenges/${id}`;
  return '/notifications';
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad body' }, { status: 400 });
  }
  const notificationId = body?.notificationId;
  if (!notificationId || typeof notificationId !== 'string') {
    return NextResponse.json({ error: 'missing notificationId' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!url || !secretKey || !publicKey || !privateKey) {
    // Graceful degrade: the in-app notification still landed; device push
    // just stays off until the env vars are configured.
    return NextResponse.json({ ok: false, sent: 0, error: 'not configured' }, { status: 503 });
  }

  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:hello@foundators.app', publicKey, privateKey);
  } catch (e) {
    return NextResponse.json({ ok: false, sent: 0, error: 'invalid vapid keys' }, { status: 503 });
  }

  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: notif, error } = await admin
    .from('notifications')
    .select('*')
    .eq('id', notificationId)
    .maybeSingle();
  if (error || !notif) {
    return NextResponse.json({ error: 'notification not found' }, { status: 404 });
  }
  const recipientId = notif.user_id || notif.userId;
  const text = notif.text || '';
  if (!recipientId || !text) return NextResponse.json({ ok: true, sent: 0 });

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('user_id', recipientId);
  if (!subs || !subs.length) return NextResponse.json({ ok: true, sent: 0 });

  const payload = JSON.stringify({
    title: 'Foundators',
    body: text.length > 140 ? `${text.slice(0, 137)}...` : text,
    url: linkPathFor(notif),
  });

  const results = await Promise.allSettled(subs.map((row) => webpush.sendNotification(row.subscription, payload)));

  // Prune subscriptions that came back gone/expired (404/410).
  const stale = [];
  results.forEach((r, i) => {
    const status = r.status === 'rejected' && r.reason ? r.reason.statusCode : null;
    if (status === 404 || status === 410) stale.push(subs[i].id);
  });
  if (stale.length) {
    await admin.from('push_subscriptions').delete().in('id', stale);
  }

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  return NextResponse.json({ ok: true, sent });
}
