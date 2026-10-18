import Stripe from 'stripe';

let stripe = null;

// Server-only Stripe SDK. Returns null until STRIPE_SECRET_KEY is set, so
// every route can degrade gracefully (503 → client falls back to the
// manual pending/admin-approval flow that shipped with 0009).
export function getStripe() {
  if (typeof window !== 'undefined') {
    throw new Error('getStripe() must never run in the browser');
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripe) stripe = new Stripe(key);
  return stripe;
}

// Stripe has confirmed the payment - flip the entry pending → approved.
//
// The guard trigger (0009) only lets admins INSERT non-pending statuses and
// is_admin() is false for the service role (auth.uid() is null), so this
// helper never inserts an approved row directly: it UPDATEs the existing
// entry (trigger is insert-only, service role bypasses RLS), and in the
// rare missing-row case inserts pending first, then updates.
// Idempotent: webhook + success-page confirmation may both run it.
export async function approvePaidEntry(admin, metadata, paidAmount) {
  if (!admin || !metadata?.challengeId || !metadata?.entryId || !metadata?.userId) {
    return false;
  }
  const amount = Number(paidAmount) || 0;
  const { data: updated, error } = await admin
    .from('challenge_entries')
    .update({ payment_status: 'approved', paid_amount: amount })
    .eq('id', metadata.entryId)
    .eq('challenge_id', metadata.challengeId)
    .eq('user_id', metadata.userId)
    .select('id');
  if (error) throw error;
  if ((updated || []).length > 0) return true;

  const { error: insErr } = await admin.from('challenge_entries').insert({
    id: metadata.entryId,
    challenge_id: metadata.challengeId,
    user_id: metadata.userId,
    payment_status: 'pending',
    paid_amount: amount,
  });
  if (insErr && insErr.code !== '23505') throw insErr;

  const { data: again, error: updErr } = await admin
    .from('challenge_entries')
    .update({ payment_status: 'approved', paid_amount: amount })
    .eq('id', metadata.entryId)
    .select('id');
  if (updErr) throw updErr;
  return (again || []).length > 0;
}
