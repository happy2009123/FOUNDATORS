import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getStripe, approvePaidEntry } from '@/lib/stripe/server';

export const runtime = 'nodejs';

// Stripe webhook (endpoint URL configured in the Stripe dashboard:
// https://<app>/api/stripe/webhook — events: checkout.session.completed).
// The success-page confirmation route already approves entries, so the
// webhook is a second, server-push path; approvePaidEntry is idempotent
// and both may run for the same session.
export async function POST(req) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripe();
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  let event;
  try {
    const payload = await req.text();
    const signature = req.headers.get('stripe-signature') || '';
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err?.message || err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.payment_status === 'paid') {
        const admin = getSupabaseAdmin();
        if (!admin) {
          // 500 so Stripe retries - the approval must not be lost.
          console.error('[stripe-webhook] SUPABASE_SECRET_KEY missing - cannot approve entry');
          return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
        }
        const amount = Number(session.amount_total || 0) / 100;
        await approvePaidEntry(admin, session.metadata, amount);
      }
    }
  } catch (error) {
    console.error('[stripe-webhook]', error?.message || error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
