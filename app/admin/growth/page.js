'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN → GROWTH — one honest scoreboard for the growth engine:
// platform totals plus the loops this build wired up (referral
// invites issued/activated, pending collaboration requests,
// Founding 100 seats used). Server-side counts via
// getCountFromServer — no collection is ever fully downloaded.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCountFromServer,
  collection,
  collectionGroup,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Users, FolderKanban, FileText, CalendarDays, Target, Lightbulb,
  TrendingUp, UserPlus, Handshake, Award, Loader2, ArrowRight,
} from 'lucide-react';
import { Card, PageHeader } from '@/components/admin/ui';

const COUNTS = [
  { key: 'users', label: 'Founders', col: 'users', icon: Users, href: '/admin/users' },
  { key: 'projects', label: 'Projects', col: 'projects', icon: FolderKanban, href: '/admin/projects' },
  { key: 'posts', label: 'Posts', col: 'posts', icon: FileText, href: '/admin/posts' },
  { key: 'events', label: 'Events', col: 'events', icon: CalendarDays, href: '/admin/analytics' },
  { key: 'challenges', label: 'Challenges', col: 'challenges', icon: Target, href: '/admin/analytics' },
  { key: 'ideas', label: 'Ideas', col: 'ideas', icon: Lightbulb, href: '/admin/analytics' },
];

function countOf(refOrQuery) {
  return getCountFromServer(refOrQuery)
    .then((s) => s.data().count)
    .catch(() => 0);
}

export default function AdminGrowthPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const base = await Promise.all(COUNTS.map((c) => countOf(collection(db, c.col))));
        const [invitesTotal, invitesActivated, pendingCollab, founding] = await Promise.all([
          countOf(collectionGroup(db, 'invites')),
          countOf(query(collectionGroup(db, 'invites'), where('activated', '==', true))),
          countOf(query(collectionGroup(db, 'collabRequests'), where('status', '==', 'pending'))),
          countOf(collection(db, 'foundingMembers')),
        ]);
        if (on) setStats({ base, invitesTotal, invitesActivated, pendingCollab, founding });
      } catch (e) {
        if (on) setStats({ failed: true });
      }
    })();
    return () => { on = false; };
  }, []);

  const conversion =
    stats && stats.invitesTotal > 0
      ? Math.round((stats.invitesActivated / stats.invitesTotal) * 100)
      : null;

  return (
    <div>
      <PageHeader
        title="Growth"
        subtitle="Live totals and the loops that move them — invites, collaboration requests and Founding 100 seats."
      />

      {!stats ? (
        <div className="flex items-center gap-2 py-10 text-[13px] text-text3">
          <Loader2 size={16} className="animate-spin text-gold" /> Loading live counts…
        </div>
      ) : stats.failed ? (
        <Card>
          <p className="text-[13px] text-text2">
            Could not load counts — check the Firestore rules are published and try again.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {COUNTS.map((c, i) => (
              <button
                key={c.key}
                onClick={() => router.push(c.href)}
                className="rounded-2xl border border-linesoft bg-card p-4 text-left transition-colors hover:border-gold/40"
              >
                <c.icon size={16} className="text-gold" />
                <div className="mt-2 font-display text-[22px] font-black">
                  {stats.base[i].toLocaleString()}
                </div>
                <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-text3">
                  {c.label}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-gold">
              <TrendingUp size={13} /> Growth loops
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <LoopCard
                icon={UserPlus}
                title="Referral invites"
                value={`${stats.invitesTotal} issued · ${stats.invitesActivated} activated`}
                hint={
                  conversion !== null
                    ? `${conversion}% activated — activated founders post or build (+3 Builder Score each).`
                    : 'Nobody has used an invite link yet.'
                }
              />
              <LoopCard
                icon={Handshake}
                title="Collaboration requests"
                value={`${stats.pendingCollab} pending`}
                hint="Requests waiting on a recipient from Match — accept opens a chat."
              />
              <LoopCard
                icon={Award}
                title="Founding 100"
                value={`${stats.founding} of 100 claimed`}
                hint="Admin-granted permanent numbers (grant or revoke in Founding 100)."
              />
              <LoopCard
                icon={FolderKanban}
                title="Projects looking for builders"
                value={`${stats.base[1]} live projects`}
                hint="Each one can receive applications, followers and questions."
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LoopCard({ icon: Icon, title, value, hint }) {
  return (
    <div className="rounded-2xl border border-linesoft bg-card p-4">
      <div className="flex items-center gap-2 text-[12px] font-extrabold">
        <Icon size={15} className="text-gold" /> {title}
      </div>
      <div className="mt-1.5 text-[15px] font-black text-gold-hi">{value}</div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-text2">{hint}</p>
    </div>
  );
}
