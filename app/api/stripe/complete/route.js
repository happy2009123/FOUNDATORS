import { NextResponse } from 'next/server';
import { getTokenVerifier, isAuthVerifierConfigured, getSupabaseAdmin } from '@/lib/supabase/server';
import { getStripe, approvePaidEntry } from '@/lib/stripe/server';
import { clientIp, rateLimit, retryAfterHeaders } from '@/lib/apiRateLimit';

export const runtime = 'nodejs';

async function verifyUser(jwt) {
  const supabase = getTokenVerifier();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data || !data.user) return null;
  return data.user;
}

// Success-page confirmation: the browser comes back from Stripe with
// ?checkout=success&session_id=... and the client posts it here. The server
// re-verifies the payment directly against Stripe (never trusts the client),
// so entries are approved even before a webhook is configured.
export async function POST(req) {
  const rl = rateLimit(`stripe:complete:${clientIp(req)}`, { limit: 30, windowMs: 60000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: retryAfterHeaders(rl) });
  }
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured', reason: 'stripe-not-configured' }, { status: 503 });
    }
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Server not configured', reason: 'admin-not-configured' }, { status: 503 });
    }
    if (!isAuthVerifierConfigured()) {
      return NextResponse.json({ error: 'Unauthorized', reason: 'no-supabase-key' }, { status: 401 });
    }
    const authHeader = req.headers.get('authorization') || '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!jwt) {
      return NextResponse.json({ error: 'Unauthorized', reason: 'no-token' }, { status: 401 });
    }
    const user = await verifyUser(jwt);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', reason: 'invalid-token' }, { status: 401 });
    }

    const { sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('cs_') || sessionId.length > 120) {
      return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      return NextResponse.json({ approved: false, reason: 'not-paid' });
    }
    if (session.metadata?.userId !== user.id) {
      return NextResponse.json({ error: 'Session does not belong to you' }, { status: 403 });
    }

    const amount = Number(session.amount_total || 0) / 100;
    const approved = await approvePaidEntry(admin, session.metadata, amount);
    return NextResponse.json({
      approved,
      amount,
      challengeId: session.metadata?.challengeId || null,
    });
  } catch (error) {
    console.error('[stripe-complete]', error?.message || error);
    return NextResponse.json({ error: 'Confirmation failed' }, { status: 500 });
  }
}
