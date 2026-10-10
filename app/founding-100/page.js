'use client';

// ─────────────────────────────────────────────────────────────
// FOUNDING 100 — public roster of protected founding members.
// Numbers are admin-granted only (see /admin/founding); this page
// simply renders the foundingMembers marker collection in order.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Award, ChevronLeft, Gift } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import Avatar from '@/components/Avatar';
import { getSupabase } from '@/lib/supabase/client';
import { mapRows } from '@/lib/supabase/db';
import { useStore } from '@/lib/store';

export default function Founding100Page() {
  const router = useRouter();
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const authReady = useStore((s) => s.authReady);
  const [members, setMembers] = useState(undefined);

  useEffect(() => {
    if (!authReady || !isLoggedIn) return;
    let alive = true;
    (async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not configured');
        const { data, error } = await supabase
          .from('founding_members')
          .select('number, user_id, created_at');
        if (error) throw error;
        const rows = mapRows(data || []);
        const ids = [...new Set(rows.map((r) => r.userId).filter(Boolean))];
        const profileMap = new Map();
        if (ids.length) {
          const { data: profRows } = await supabase
            .from('profiles')
            .select('id, name, handle, avatar')
            .in('id', ids);
          (profRows || []).forEach((p) => profileMap.set(p.id, p));
        }
        if (!alive) return;
        setMembers(
          rows
            .map((r) => {
              const p = profileMap.get(r.userId);
              return {
                id: String(r.number),
                number: Number(r.number),
                uid: r.userId,
                name: p?.name || '',
                handle: p?.handle || '',
                avatar: p?.avatar || null,
              };
            })
            .sort((a, b) => a.number - b.number)
        );
      } catch {
        if (alive) setMembers([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [authReady, isLoggedIn]);

  return (
    <MainScreenShell>
      <div className="no-scrollbar flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-linesoft bg-ink/95 px-4 py-3 backdrop-blur">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-gold"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-[15px] font-extrabold">Founding 100</span>
          <button
            onClick={() => router.push('/invite')}
            className="ml-auto flex items-center gap-1.5 rounded-full border border-gold/40 px-3 py-1.5 text-[11.5px] font-bold text-gold-hi"
          >
            <Gift size={13} /> Invite
          </button>
        </div>

        {/* Hero */}
        <div className="px-4 pt-5 text-center sm:px-6">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10">
            <Award size={26} className="text-gold" />
          </span>
          <h1 className="mt-3 text-[22px] font-extrabold leading-tight">
            The first <span className="text-gold-gradient">100</span> builders
          </h1>
          <p className="mx-auto mt-2 max-w-[460px] text-[12.5px] leading-relaxed text-text2">
            Founding Members are granted a permanent number between 1 and 100 by
            the FOUNDATORS team. Numbers can never be claimed or transferred —
            this is the complete, verified roster.
          </p>
        </div>

        {/* Roster */}
        <div className="px-4 pb-10 pt-5 sm:px-6">
          {members === undefined && (
            <p className="py-8 text-center text-[13px] text-text3">
              {authReady && !isLoggedIn ? 'Sign in to view the roster.' : 'Loading roster…'}
            </p>
          )}

          {members && members.length === 0 && (
            <div className="mx-auto max-w-[420px] rounded-2xl border border-linesoft bg-card p-6 text-center">
              <p className="text-[13px] font-bold">No Founding Members yet</p>
              <p className="mt-1 text-[12px] leading-relaxed text-text3">
                The first numbers have not been granted. Early members will
                appear here with their permanent badge numbers.
              </p>
            </div>
          )}

          {members && members.length > 0 && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => router.push(`/profile/${m.uid}`)}
                  className="group flex items-center gap-3 rounded-2xl border border-gold/25 bg-gold/[0.04] px-4 py-3 text-left transition-colors hover:border-gold/50 hover:bg-gold/[0.08]"
                >
                  <span className="w-10 flex-none text-center font-display text-[19px] font-extrabold text-gold">
                    {m.number}
                  </span>
                  <Avatar src={m.avatar} name={m.name} size={42} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold group-hover:text-gold-hi">
                      {m.name || 'Member'}
                    </span>
                    <span className="block truncate text-[11.5px] text-text3">
                      {m.handle || m.uid}
                    </span>
                  </span>
                  <Award size={15} className="flex-none text-gold/70" />
                </button>
              ))}
            </div>
          )}

          {members && members.length > 0 && (
            <p className="mt-5 text-center text-[11.5px] text-text3">
              {members.length} of 100 numbers claimed
            </p>
          )}
        </div>
      </div>
    </MainScreenShell>
  );
}
