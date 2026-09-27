'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN → USERS
// Cursor-paginated directory with search, status filters, and
// moderation actions. Restricting/verifying writes the `status`
// / `verified` fields — only an admin can (enforced by rules).
// Permanent deletion is deliberately not offered here; if ever
// added it must go through an explicit confirmation workflow.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, ShieldOff, ShieldCheck, BadgeCheck, Users as UsersIcon, SearchX } from 'lucide-react';
import { useStore } from '@/lib/store';
import { fetchUsersPage, setUserStatus, setUserVerified } from '@/lib/adminData';
import { formatDate } from '@/lib/admin';
import {
  Card, PageHeader, SearchField, FilterChips, TableSkeleton, EmptyState,
  ErrorState, Pagination, ConfirmDialog, AvatarDot, StatusBadge,
} from '@/components/admin/ui';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'suspended', label: 'Suspended' },
];

const PAGE_SIZE = 12;

export default function AdminUsersPage() {
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);

  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState([]); // cursor used to fetch current page (null = first)
  const [nextCursor, setNextCursor] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null); // { user, kind: 'restrict'|'activate'|'verify'|'unverify' }

  const load = useCallback(async (cursorStack, searchQ) => {
    setLoading(true);
    setError(null);
    const cursor = cursorStack.length ? cursorStack[cursorStack.length - 1] : null;
    const res = await fetchUsersPage({ cursor, pageSize: PAGE_SIZE, search: searchQ });
    if (res.ok) {
      setRows(res.data.rows);
      setNextCursor(res.data.exhausted ? null : res.data.last);
    } else {
      setError(res.error);
      setRows([]);
    }
    setLoading(false);
  }, []);

  // Debounced search resets pagination; also performs the initial load.
  useEffect(() => {
    const t = setTimeout(() => {
      setCursors([]);
      setPage(1);
      load([], search);
    }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, load]);

  const goNext = () => {
    if (!nextCursor) return;
    const next = [...cursors, nextCursor];
    setCursors(next);
    setPage((p) => p + 1);
    load(next, search);
  };
  const goPrev = () => {
    if (page <= 1) return;
    const next = cursors.slice(0, -1);
    setCursors(next);
    setPage((p) => p - 1);
    load(next, search);
  };

  const filtered = rows
    ? rows.filter((r) => status === 'all' || (r.status || 'active') === status)
    : [];

  async function confirmAction() {
    if (!dialog) return;
    const { user, kind } = dialog;
    setBusy(true);
    let res;
    if (kind === 'restrict') res = await setUserStatus(user.id, 'restricted', 'manual restriction');
    else if (kind === 'activate') res = await setUserStatus(user.id, 'active', 'restored');
    else if (kind === 'verify') res = await setUserVerified(user.id, true);
    else if (kind === 'unverify') res = await setUserVerified(user.id, false);
    setBusy(false);
    if (res?.ok) {
      showToast(
        kind === 'restrict' ? `${user.name} restricted`
        : kind === 'activate' ? `${user.name} restored`
        : kind === 'verify' ? `${user.name} verified`
        : `Verification removed from ${user.name}`
      );
      setDialog(null);
      load(cursors, search);
    } else {
      showToast(`Failed: ${res?.error || 'permission denied'}`);
      setDialog(null);
    }
  }

  const labels = {
    restrict: { title: 'Restrict user', body: (u) => `${u.name} will be marked as restricted. Their profile stays online, but moderation can follow. This is reversible.`, confirm: 'Restrict', danger: true },
    activate: { title: 'Restore user', body: (u) => `${u.name} will return to active standing.`, confirm: 'Restore', danger: false },
    verify: { title: 'Verify user', body: (u) => `Grant the verified badge to ${u.name}. Only do this for confirmed identities.`, confirm: 'Verify', danger: false },
    unverify: { title: 'Remove verification', body: (u) => `Remove the verified badge from ${u.name}.`, confirm: 'Remove', danger: true },
  };

  return (
    <div className="animate-screen-in">
      <PageHeader
        title="Users"
        subtitle="Search, review, and moderate founder accounts."
        actions={
          <div className="flex items-center gap-2 text-[12.5px] text-text3">
            <UsersIcon size={15} className="text-gold" />
            {rows ? `${rows.length} loaded` : ''}
          </div>
        }
      />

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchField value={search} onChange={setSearch} placeholder="Search by name…" className="sm:max-w-[300px] sm:flex-1" />
          <FilterChips options={STATUS_FILTERS} value={status} onChange={setStatus} />
        </div>
      </Card>

      <Card className="mt-4 overflow-hidden">
        {!rows ? (
          <TableSkeleton rows={6} cols={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => load(cursors, search)} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={search ? SearchX : UsersIcon}
            title={search ? `No users match “${search}”` : status === 'all' ? 'No users yet' : `No ${status} users`}
            body={search ? 'Try a different name.' : 'New founders appear here as soon as they sign up.'}
          />
        ) : (
          <>
            {/* desktop table */}
            <table className="hidden w-full text-left md:table">
              <thead>
                <tr className="border-b border-white/10 text-[10.5px] font-bold uppercase tracking-[0.14em] text-text3">
                  <th className="px-5 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-white/[0.03]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <AvatarDot src={u.avatar} name={u.name} size={34} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[13.5px] font-bold">{u.name || 'User'}</span>
                            {u.verified ? <BadgeCheck size={14} className="flex-none text-gold" /> : null}
                          </div>
                          <div className="truncate text-[11.5px] text-text3">{u.handle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-text2">{u.role || '—'}</td>
                    <td className="px-4 py-3.5 text-[12.5px] text-text2">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={u.status} /></td>
                    <td className="px-5 py-3.5">
                      <RowActions user={u} onView={() => router.push(`/profile/${u.id}`)} onAct={(kind) => setDialog({ user: u, kind })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* mobile stacked cards */}
            <div className="divide-y divide-white/5 md:hidden">
              {filtered.map((u) => (
                <div key={u.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <AvatarDot src={u.avatar} name={u.name} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[14px] font-bold">{u.name || 'User'}</span>
                        {u.verified && <BadgeCheck size={14} className="flex-none text-gold" />}
                      </div>
                      <div className="truncate text-[12px] text-text3">{u.handle} · {u.role || 'No role'}</div>
                    </div>
                    <StatusBadge status={u.status} />
                  </div>
                  <div className="mt-2 text-[11.5px] text-text3">Joined {formatDate(u.createdAt)}</div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => router.push(`/profile/${u.id}`)} className="flex-1 rounded-xl border border-white/10 py-2 text-[12.5px] font-bold text-text2 hover:border-gold/40 hover:text-gold-hi">
                      View
                    </button>
                    <RowActions user={u} stacked onAct={(kind) => setDialog({ user: u, kind })} />
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 pb-4">
              <Pagination
                hasPrev={page > 1}
                hasNext={!!nextCursor}
                onPrev={goPrev}
                onNext={goNext}
                busy={loading}
                label={`Page ${page}`}
              />
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!dialog}
        title={dialog ? labels[dialog.kind].title : ''}
        body={dialog ? labels[dialog.kind].body(dialog.user) : ''}
        confirmLabel={dialog ? labels[dialog.kind].confirm : 'Confirm'}
        danger={dialog ? labels[dialog.kind].danger : false}
        busy={busy}
        onConfirm={confirmAction}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

function RowActions({ user, onView, onAct, stacked = false }) {
  const restricted = user.status === 'restricted' || user.status === 'suspended';
  const btn = 'rounded-lg border border-white/10 px-3 py-1.5 text-[11.5px] font-bold transition-colors hover:border-gold/40 hover:text-gold-hi';
  if (stacked) {
    return (
      <>
        <button onClick={() => onAct(restricted ? 'activate' : 'restrict')} className={`${btn} flex-1 ${restricted ? 'text-brandgreen' : 'text-brandred'}`}>
          {restricted ? 'Restore' : 'Restrict'}
        </button>
        <button onClick={() => onAct(user.verified ? 'unverify' : 'verify')} className={`${btn} flex-1`}>
          {user.verified ? 'Unverify' : 'Verify'}
        </button>
      </>
    );
  }
  return (
    <div className="flex items-center justify-end gap-1.5">
      {onView && (
        <button onClick={onView} className={`${btn} inline-flex items-center gap-1`} title="View profile">
          <Eye size={13} /> View
        </button>
      )}
      <button onClick={() => onAct(restricted ? 'activate' : 'restrict')} className={`${btn} inline-flex items-center gap-1 ${restricted ? 'text-brandgreen' : 'text-brandred'}`}>
        {restricted ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
        {restricted ? 'Restore' : 'Restrict'}
      </button>
      <button onClick={() => onAct(user.verified ? 'unverify' : 'verify')} className={`${btn} inline-flex items-center gap-1`} title={user.verified ? 'Remove verification' : 'Verify user'}>
        <BadgeCheck size={13} /> {user.verified ? 'Unverify' : 'Verify'}
      </button>
    </div>
  );
}
