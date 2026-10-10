'use client';

// ─────────────────────────────────────────────────────────────
// REFERRALS — closes the half-built invite pipeline.
// Link:  /signup?ref=<uid>   (uids are already public in URLs)
// Capture: signup page remembers ?ref= in sessionStorage (survives
// the Google redirect), and the invite row is created by the
// invitee under the inviter (referral_invites: inviter_id = ref,
// invited_id = newUid, id = newUid keeps it idempotent).
// Activation: flips status to 'activated' after a meaningful action
// (first post or first project) — which is what Builder Score's
// "Activated referrals" row counts (3 points each).
// ─────────────────────────────────────────────────────────────

import { getSupabase } from '@/lib/supabase/client';
import { subscribeQuery } from '@/lib/supabase/realtime';
import { mapRows, toRow } from '@/lib/supabase/db';

const REF_KEY = 'foundators_ref';

export function rememberReferralFromUrl() {
  try {
    const p = new URLSearchParams(window.location.search);
    const ref = p.get('ref');
    if (ref) sessionStorage.setItem(REF_KEY, ref.slice(0, 128));
  } catch (e) {
    // storage unavailable
  }
}

export function readReferralCode() {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get('ref') || sessionStorage.getItem(REF_KEY) || '';
  } catch (e) {
    return '';
  }
}

function clearReferralCode() {
  try {
    sessionStorage.removeItem(REF_KEY);
  } catch (e) {
    // storage unavailable
  }
}

export function referralLinkFor(uid) {
  try {
    return `${window.location.origin}/signup?ref=${uid}`;
  } catch (e) {
    return `/signup?ref=${uid}`;
  }
}

// Called right after a NEW account's profile is created.
export async function recordInviteIfAny(newUid, invitedName) {
  try {
    const ref = readReferralCode();
    if (!ref || ref === newUid) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: inviter } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', ref)
      .maybeSingle();
    if (!inviter) return;
    const { error } = await supabase.from('referral_invites').upsert(
      toRow({
        id: newUid,
        code: `${ref}-${newUid}`,
        inviterId: ref,
        invitedId: newUid,
        status: 'pending',
      }),
      { onConflict: 'id', ignoreDuplicates: false }
    );
    if (error) throw error;
    clearReferralCode();
  } catch (e) {
    // referral recording is best-effort — never blocks signup
  }
}

// Called after a meaningful action (first post, first project).
// The invite row (invited_id = uid) IS the old users/{uid}.invitedBy link.
export async function activateInviteIfNeeded(uid) {
  try {
    if (!uid) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const { data, error } = await supabase
      .from('referral_invites')
      .select('id, status, activated_at')
      .eq('invited_id', uid)
      .limit(1);
    if (error) throw error;
    const invite = data && data[0];
    if (!invite || invite.status === 'activated' || invite.activated_at) return;
    const { error: updateError } = await supabase
      .from('referral_invites')
      .update({ status: 'activated', activated_at: new Date().toISOString() })
      .eq('id', invite.id);
    if (updateError) throw updateError;
  } catch (e) {
    // activation is best-effort
  }
}

export function subscribeMyInvites(uid, cb) {
  return subscribeQuery({
    key: `invites:${uid}`,
    table: 'referral_invites',
    filter: `inviter_id=eq.${uid}`,
    queryFn: async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('referral_invites')
        .select('*')
        .eq('inviter_id', uid)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = mapRows(data);
      const invitedIds = [...new Set(rows.map((r) => r.invitedId).filter(Boolean))];
      let invitedProfiles = [];
      if (invitedIds.length) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, avatar')
          .in('id', invitedIds);
        if (profilesError) throw profilesError;
        invitedProfiles = profiles || [];
      }
      const byId = {};
      invitedProfiles.forEach((p) => { byId[p.id] = p; });
      // Old shape: { id: invitee uid, invitedName, invitedAvatar, joinedAt, activated }
      return rows.map((r) => {
        const invited = byId[r.invitedId];
        return {
          id: r.invitedId || r.id,
          invitedUid: r.invitedId || null,
          invitedName: invited?.name || '',
          invitedAvatar: invited?.avatar || '',
          joinedAt: r.createdAt,
          activated: r.status === 'activated' || Boolean(r.activatedAt),
          status: r.status || 'pending',
          code: r.code,
        };
      });
    },
    onData: cb,
    onError: () => cb([]),
  });
}
