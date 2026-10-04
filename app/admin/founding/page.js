'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN → FOUNDING 100
// Grant/revoke the protected Founding Member badge with its
// unique number (1–100). There is intentionally no self-service
// path anywhere in the app: only this admin screen (enforced by
// Firestore rules) can assign a number, and the marker doc makes
// each number physically unique.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Award, UserPlus, Trash2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Card, PageHeader, EmptyState } from '@/components/admin/ui';
import Avatar from '@/components/Avatar';
import {
  fetchFoundingMembers,
  grantFoundingMember,
  revokeFoundingMember,
  fetchUsersPage,
} from '@/lib/adminData';

export default function AdminFoundingPage() {
  const router = useRouter();
  const [members, setMembers] = useState(null);
  const [candidates, setCandidates] = useState(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const refresh = useCallback(async () => {
    const [founding, recent] = await Promise.all([
      fetchFoundingMembers(),
      fetchUsersPage({ search: '', pageSize: 12 }),
    ]);
    setMembers(founding.ok ? founding.data : []);
    setCandidates(recent.ok ? recent.data.rows : []);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function runSearch() {
    const res = await fetchUsersPage({ search, pageSize: 8 });
    if (res.ok) setCandidates(res.data.rows);
    else setNotice({ type: 'error', text: 'User search failed — try again.' });
  }

  async function handleGrant(user) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    const res = await grantFoundingMember(user);
    if (res.ok) {
      setNotice({
        type: 'ok',
        text: `${user.name || user.handle} is now Founding Member #${res.data}.`,
      });
      await refresh();
    } else {
      setNotice({ type: 'error', text: res.error || 'Grant failed.' });
    }
    setBusy(false);
  }

  async function handleRevoke(member) {
    if (busy) return;
    const ok = window.confirm(
      `Revoke Founding Member #${member.number} from ${member.name || member.handle || member.uid}? The number returns to the pool.`
    );
    if (!ok) return;
    setBusy(true);
    setNotice(null);
    const res = await revokeFoundingMember(member);
    if (res.ok) {
      setNotice({ type: 'ok', text: `#${member.number} revoked.` });
      await refresh();
    } else {
      setNotice({ type: 'error', text: res.error || 'Revoke failed.' });
    }
    setBusy(false);
  }

  const grantedIds = new Set((members || []).map((m) => m.uid));
  const grantedCount = (members || []).length;

  return (
    <div className="animate-screen-in">
      <PageHeader
        title="Founding 100"
        subtitle="Protected Founding Member badges — granted only here, unique numbers 1–100, impossible to self-assign."
      />

      {notice && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-[12.5px] font-bold ${
            notice.type === 'ok'
              ? 'border-brandgreen/40 bg-brandgreen/10 text-brandgreen'
              : 'border-brandred/40 bg-brandred/10 text-brandred'
          }`}
        >
          <CheckCircle2 size={15} className="flex-none" />
          {notice.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* ── Grant ── */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13.5px] font-extrabold">
              <UserPlus size={16} className="text-gold" /> Grant a member
            </div>
            <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[11px] font-extrabold text-gold-hi">
              {grantedCount}/100 granted
            </span>
          </div>

          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-linesoft bg-white/[0.03] px-3 py-2.5">
              <Search size={15} className="text-text3" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                placeholder="Search members by name…"
                className="flex-1 bg-transparent text-[13px] text-white placeholder:text-text3 focus:outline-none"
              />
            </div>
            <button
              onClick={runSearch}
              className="rounded-xl border border-gold/40 px-4 text-[12.5px] font-bold text-gold-hi transition-colors hover:bg-gold/10"
            >
              Search
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {!candidates && <p className="py-4 text-center text-[12px] text-text3">Loading users…</p>}
            {candidates && candidates.length === 0 && (
              <p className="py-4 text-center text-[12px] text-text3">No users found.</p>
            )}
            {(candidates || []).map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-xl border border-linesoft bg-white/[0.02] px-3 py-2.5"
              >
                <Avatar src={u.avatar} name={u.name} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-bold">{u.name || 'Unnamed'}</span>
                    {u.foundingNumber ? (
                      <span className="rounded-full bg-gold/15 px-1.5 py-px text-[9.5px] font-extrabold text-gold-hi">
                        #{u.foundingNumber}
                      </span>
                    ) : null}
                  </div>
                  <div className="truncate text-[11.5px] text-text3">{u.handle || u.email || u.id}</div>
                </div>
                {grantedIds.has(u.id) ? (
                  <span className="flex items-center gap-1 rounded-full bg-brandgreen/10 px-2.5 py-1 text-[11px] font-bold text-brandgreen">
                    <ShieldCheck size={12} /> Granted
                  </span>
                ) : (
                  <button
                    onClick={() => handleGrant(u)}
                    disabled={busy || grantedCount >= 100}
                    className="rounded-lg bg-gold-grad px-3 py-1.5 text-[11.5px] font-extrabold text-[#1a1300] transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {busy ? 'Granting…' : 'Grant'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* ── Roster ── */}
        <Card>
          <div className="mb-3 flex items-center gap-2 text-[13.5px] font-extrabold">
            <Award size={16} className="text-gold" /> Current members
          </div>
          {!members && <p className="py-4 text-center text-[12px] text-text3">Loading roster…</p>}
          {members && members.length === 0 && (
            <EmptyState
              icon={Award}
              title="No Founding Members yet"
              body="Nobody has been granted a number. Search for a member on the left and grant the first badge."
            />
          )}
          <div className="space-y-2">
            {(members || []).map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-gold/20 bg-gold/[0.04] px-3 py-2.5"
              >
                <span className="w-9 flex-none text-center font-display text-[15px] font-extrabold text-gold">
                  {m.number}
                </span>
                <Avatar src={m.avatar} name={m.name} size={32} />
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => router.push(`/profile/${m.uid}`)}
                    className="block max-w-full truncate text-left text-[13px] font-bold hover:text-gold-hi"
                  >
                    {m.name || 'Unnamed'}
                  </button>
                  <div className="truncate text-[11.5px] text-text3">{m.handle || m.uid}</div>
                </div>
                <button
                  onClick={() => handleRevoke(m)}
                  disabled={busy}
                  aria-label="Revoke founding member"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-brandred/40 text-brandred transition-colors hover:bg-brandred/10 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
