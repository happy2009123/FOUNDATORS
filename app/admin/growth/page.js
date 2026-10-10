'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN → GROWTH — one honest scoreboard for the growth engine:
// platform totals plus the loops this build wired up (referral
// invites issued/activated, pending collaboration requests,
// Founding 100 seats used). Server-side counts via Postgres
// aggregates — no table is ever fully downloaded. Loops whose
// rows are hidden from admins by row-level security are shown
// as unavailable instead of as invented platform numbers.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import {
  Users, FolderKanban, FileText, CalendarDays, Target, Lightbulb,
  TrendingUp, UserPlus, Handshake, Award, Loader2,
} from 'lucide-react';
import { Card, PageHeader } from '@/components/admin/ui';

const COUNTS = [
  { key: 'users', label: 'Founders', table: 'profiles', icon: Users, href: '/admin/users' },
  { key: 'projects', label: 'Projects', table: 'projects', icon: FolderKanban, href: '/admin/projects' },
  { key: 'posts', label: 'Posts', table: 'posts', icon: FileText, href: '/admin/posts' },
  { key: 'events', label: 'Events', table: 'events', icon: CalendarDays, href: '/admin/analytics' },
  { key: 'challenges', label: 'Challenges', table: 'challenges', icon: Target, href: '/admin/analytics' },
  { key: 'ideas', label: 'Ideas', table: 'ideas', icon: Lightbulb, href: '/admin/analytics' },
];

async function countOf(table) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return count || 0;
}

export default function AdminGrowthPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const base = await Promise.all(COUNTS.map((c) => countOf(c.table)));
        if (on) setStats({ base });
      } catch (e) {
        if (on) setStats({ failed: true, error: e?.message });
      }
    })();
    return () => { on = false; };
  }, []);

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
            Could not load counts — check that Supabase is configured and the migration has run, then try again.
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
                value="Not available client-side"
                hint="referral_invites rows are visible only to their own participants under row-level security — platform-wide issued/activated totals must be read from the Supabase dashboard."
              />
              <LoopCard
                icon={Handshake}
                title="Collaboration requests"
                value="Not available client-side"
                hint="collab_requests rows are visible only to their own participants under row-level security — the platform pending total must be read from the Supabase dashboard."
              />
              <LoopCard
                icon={Award}
                title="Founding 100"
                value="Not in this schema"
                hint="The Supabase schema ships no founding members table yet, so seats claimed cannot be counted or granted here."
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
