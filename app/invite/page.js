'use client';

// ─────────────────────────────────────────────────────────────
// INVITE — your personal referral link, how the loop works and
// who joined because of you (live from users/{uid}/invites).
// Activated founders (posted or created a project) are worth
// +3 Builder Score points each.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Gift, Link2, Share2, Sparkles, UserPlus } from 'lucide-react';
import SubpageHeader from '@/components/SubpageHeader';
import Avatar from '@/components/Avatar';
import AuthSkeleton from '@/components/AuthSkeleton';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { timeAgo } from '@/lib/admin';
import { referralLinkFor, subscribeMyInvites } from '@/lib/referrals';

export default function InvitePage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const showToast = useStore((s) => s.showToast);
  const [invites, setInvites] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!profile?.id) return undefined;
    const unsub = subscribeMyInvites(profile.id, setInvites);
    return unsub;
  }, [profile?.id]);

  if (!ready) return <AuthSkeleton />;

  const link = profile?.id ? referralLinkFor(profile.id) : '';
  const activated = invites.filter((i) => i.activated).length;
  const pending = invites.length - activated;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      showToast('Invite link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      showToast('Could not copy — long-press the link instead');
    }
  }

  async function shareLink() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join me on FOUNDATORS',
          text: 'The builder network where ideas become teams — join with my invite:',
          url: link,
        });
      } else {
        copyLink();
      }
    } catch (e) {
      // user dismissed the share sheet
    }
  }

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <SubpageHeader title="Invite founders" />
      <div className="no-scrollbar flex-1 overflow-y-auto px-[18px] pb-8">
        <div className="mt-4 rounded-2xl border border-gold/30 bg-gold/[0.06] p-4">
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-gold">
            <Gift size={14} /> Your invite link
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-text2">
            Every founder who joins through your link and then{' '}
            <b className="text-text1">posts or creates a project</b> earns you{' '}
            <b className="text-gold-hi">+3 Builder Score points</b> — no points for ghost
            signups.
          </p>
          <button
            onClick={copyLink}
            className="mt-3 flex w-full items-center gap-2 rounded-xl border border-gold/40 bg-white/[0.04] px-3 py-3 text-left"
          >
            <Link2 size={15} className="flex-none text-gold" />
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-text1">{link}</span>
            {copied ? (
              <Check size={15} className="flex-none text-brandgreen" />
            ) : (
              <Copy size={15} className="flex-none text-text3" />
            )}
          </button>
          <div className="mt-2.5 flex gap-2">
            <button
              onClick={copyLink}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-grad py-2.5 text-[12.5px] font-black text-[#171100]"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy link'}
            </button>
            <button
              onClick={shareLink}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2.5 text-[12.5px] font-bold text-gold-hi"
            >
              <Share2 size={14} /> Share
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Tile n={String(invites.length)} l="Joined" />
          <Tile n={String(activated)} l="Activated" />
          <Tile n={`+${activated * 3}`} l="Score pts" gold />
        </div>

        <div className="mt-4 rounded-2xl border border-linesoft bg-card p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-text3">
            <Sparkles size={13} className="text-gold" /> How it works
          </div>
          <ol className="space-y-1.5 text-[12.5px] leading-relaxed text-text2">
            <li>1. Share your link — it carries your identity automatically.</li>
            <li>2. They sign up free — the invite is recorded to your name.</li>
            <li>3. They post or create a project — your referral activates.</li>
            <li>4. Your profile Builder Score grows, permanently.</li>
          </ol>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-text3">
            Founders you brought in
          </div>
          {invites.length === 0 ? (
            <div className="flex items-start gap-2.5 rounded-2xl border border-linesoft bg-card p-4">
              <UserPlus size={15} className="mt-0.5 flex-none text-gold" />
              <p className="text-[12px] leading-relaxed text-text3">
                No one yet — share your link in a DM or a community and their name will
                appear here the moment they join.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {invites.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => router.push(`/profile/${inv.id}`)}
                  className="flex items-center gap-2.5 rounded-2xl border border-linesoft bg-card p-3 text-left active:bg-white/5"
                >
                  <Avatar src={inv.invitedAvatar || null} name={inv.invitedName || `Founder ${inv.id.slice(0, 4)}`} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-bold">
                      {inv.invitedName || `Founder ${inv.id.slice(0, 8)}…`}
                    </div>
                    <div className="text-[10.5px] text-text3">
                      {inv.joinedAt?.toDate ? timeAgo(inv.joinedAt) : 'joined'}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${
                      inv.activated
                        ? 'bg-brandgreen/15 text-brandgreen'
                        : 'bg-white/5 text-text3'
                    }`}
                  >
                    {inv.activated ? '+3 ✓' : 'pending'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ n, l, gold }) {
  return (
    <div className={`rounded-xl py-2.5 ${gold ? 'bg-gold/10' : 'bg-white/[0.03]'}`}>
      <div className={`text-[16px] font-extrabold ${gold ? 'text-gold-hi' : ''}`}>{n}</div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-text3">{l}</div>
    </div>
  );
}
