import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getTokenVerifier, isAuthVerifierConfigured } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';
import { clientIp, rateLimit, retryAfterHeaders } from '@/lib/apiRateLimit';

export const runtime = 'nodejs';

async function verifyUser(jwt) {
  const supabase = getTokenVerifier();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data || !data.user) return null;
  return data.user;
}

// DB access as the signed-in caller (their JWT = authenticated role), so
// this route works even without SUPABASE_SECRET_KEY on the server: it only
// reads the challenge and writes the caller's OWN pending entry - both of
// which RLS already allows for the owner.
function userClient(jwt) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, jwt, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function POST(req) {
  const rl = rateLimit(`stripe:checkout:${clientIp(req)}`, { limit: 10, windowMs: 60000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: retryAfterHeaders(rl) });
  }
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured', reason: 'stripe-not-configured' }, { status: 503 });
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
    const uid = user.id;

    const { challengeId } = await req.json();
    if (!challengeId || typeof challengeId !== 'string' || challengeId.length > 64) {
      return NextResponse.json({ error: 'Invalid challenge' }, { status: 400 });
    }

    const db = userClient(jwt);
    const { data: challenge, error: cErr } = await db
      .from('challenges')
      .select('id,title,price,currency,is_paid,status')
      .eq('id', challengeId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!challenge || !challenge.is_paid || !(Number(challenge.price) > 0)) {
      return NextResponse.json({ error: 'Not a paid challenge' }, { status: 400 });
    }
    if (challenge.status && challenge.status !== 'active') {
      return NextResponse.json({ error: 'Challenge is not active' }, { status: 409 });
    }

    // The entry must exist (pending) BEFORE checkout so the webhook /
    // success confirmation can approve it by id.
    let entryId = null;
    const { data: existing, error: eErr } = await db
      .from('challenge_entries')
      .select('id, payment_status')
      .eq('challenge_id', challengeId)
      .eq('user_id', uid)
      .maybeSingle();
    if (eErr) throw eErr;
    if (existing) {
      if (existing.payment_status === 'approved') {
        return NextResponse.json({ error: 'Entry already paid' }, { status: 409 });
      }
      entryId = existing.id;
    } else {
      entryId = randomUUID();
      const { error: iErr } = await db.from('challenge_entries').insert({
        id: entryId,
        challenge_id: challengeId,
        user_id: uid,
        payment_status: 'pending',
        paid_amount: challenge.price,
      });
      if (iErr && iErr.code !== '23505') throw iErr;
      if (iErr?.code === '23505') {
        const { data: race } = await db
          .from('challenge_entries')
          .select('id')
          .eq('challenge_id', challengeId)
          .eq('user_id', uid)
          .maybeSingle();
        if (!race) throw iErr;
        entryId = race.id;
      }
    }

    // Absolute URLs for Stripe redirects. Server-side constant only — a
    // client-controlled Origin/Host header would let an attacker point
    // post-payment redirects at a phishing site behind a real Stripe page.
    const origin = (process.env.NEXT_PUBLIC_APP_URL || 'https://foundators-flame.vercel.app').replace(/\/+$/, '');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: String(challenge.currency || 'USD').toLowerCase(),
            unit_amount: Math.round(Number(challenge.price) * 100),
            product_data: { name: `Challenge entry — ${challenge.title || 'Foundators'}` },
          },
          quantity: 1,
        },
      ],
      metadata: { challengeId, entryId, userId: uid },
      client_reference_id: uid,
      success_url: `${origin}/challenges?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/challenges?checkout=cancel`,
    });
    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[stripe-checkout]', error?.message || error);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
