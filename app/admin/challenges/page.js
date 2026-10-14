'use client';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ADMIN â†’ CHALLENGES
// Post official challenges the community can join â€” free, or paid
// with an entry fee ($, manual approval: no payment gateway yet).
// Paid entries arrive as payment_status='pending' and only become
// 'approved' from this screen (RLS + insert guard enforce it).
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { useEffect, useState, useCallback } from 'react';
import { Trophy, Plus, CheckCircle2, XCircle, Users, DollarSign } from 'lucide-react';
import { Card, PageHeader, EmptyState } from '@/components/admin/ui';
import {
  fetchOfficialChallenges,
  createOfficialChallenge,
  fetchChallengeEntries,
  setEntryPaymentStatus,
} from '@/lib/adminData';

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [entries, setEntries] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    isPaid: false,
    price: '',
    endsAt: '',
  });

  const refresh = useCallback(async () => {
    const res = await fetchOfficialChallenges();
    setChallenges(res.ok ? res.data : []);
    if (!res.ok) setNotice({ type: 'error', text: res.error || 'Could not load challenges.' });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedId) {
      setEntries(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetchChallengeEntries(selectedId);
      if (!cancelled) setEntries(res.ok ? res.data : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function handleCreate() {
    if (busy) return;
    if (!form.title.trim()) {
      setNotice({ type: 'error', text: 'Challenge title is required.' });
      return;
    }
    if (form.isPaid && (!(Number(form.price) > 0))) {
      setNotice({ type: 'error', text: 'Paid challenges need a price above 0.' });
      return;
    }
    setBusy(true);
    setNotice(null);
    const res = await createOfficialChallenge({
      title: form.title.trim(),
      description: form.description.trim(),
      isPaid: form.isPaid,
      price: form.isPaid ? Number(form.price) : 0,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    });
    if (res.ok) {
      setNotice({ type: 'ok', text: `Official challenge "${form.title.trim()}" is live.` });
      setForm({ title: '', description: '', isPaid: false, price: '', endsAt: '' });
      await refresh();
    } else {
      setNotice({ type: 'error', text: res.error || 'Create failed.' });
    }
    setBusy(false);
  }

  async function handlePayment(entry, status) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    const amount = status === 'approved' ? Number(entry.paidAmount) || 0 : 0;
    const res = await setEntryPaymentStatus(entry.id, status, amount);
    if (res.ok) {
      setNotice({ type: 'ok', text: `Entry ${status}.` });
      const refreshed = await fetchChallengeEntries(selectedId);
      setEntries(refreshed.ok ? refreshed.data : []);
    } else {
      setNotice({ type: 'error', text: res.error || 'Update failed.' });
    }
    setBusy(false);
  }

  const selected = (challenges || []).find((c) => c.id === selectedId) || null;
  const pendingCount = (entries || []).filter((e) => e.paymentStatus === 'pending').length;

  return (
    <div className="animate-screen-in">
      <PageHeader
        title="Challenges"
        subtitle="Official free & paid challenges â€” paid entries are approved manually from here."
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
        {/* â”€â”€ Create â”€â”€ */}
        <Card>
          <div className="mb-3 flex items-center gap-2 text-[13.5px] font-extrabold">
            <Plus size={16} className="text-gold" /> Post an official challenge
          </div>

          <label className="mb-1.5 block text-[11px] font-bold text-text2">Title</label>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Ship a landing page in 24h"
            className="mb-3 w-full rounded-xl border border-linesoft bg-white/[0.03] px-3 py-2.5 text-[13px] text-white placeholder:text-text3 focus:border-gold focus:outline-none"
          />

          <label className="mb-1.5 block text-[11px] font-bold text-text2">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder="What do participants build? How is it judged?"
            className="mb-3 w-full resize-none rounded-xl border border-linesoft bg-white/[0.03] px-3 py-2.5 text-[13px] text-white placeholder:text-text3 focus:border-gold focus:outline-none"
          />

          <div className="mb-3 flex items-center gap-3">
            <button
              onClick={() => setForm((f) => ({ ...f, isPaid: !f.isPaid, price: f.isPaid ? '' : f.price }))}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[12px] font-bold transition-all ${
                form.isPaid
                  ? 'border-gold/50 bg-gold/10 text-gold-hi'
                  : 'border-brandgreen/40 bg-brandgreen/10 text-brandgreen'
              }`}
            >
              {form.isPaid ? <DollarSign size={14} /> : <CheckCircle2 size={14} />}
              {form.isPaid ? 'Paid entry' : 'Free entry'}
            </button>
            {form.isPaid && (
              <div className="flex items-center gap-1.5 rounded-xl border border-linesoft bg-white/[0.03] px-3 py-2">
                <span className="text-[12px] text-text3">$</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="9.99"
                  className="w-20 bg-transparent text-[13px] text-white placeholder:text-text3 focus:outline-none"
                />
              </div>
            )}
          </div>

          <label className="mb-1.5 block text-[11px] font-bold text-text2">Ends (optional)</label>
          <input
            type="date"
            value={form.endsAt}
            onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
            className="mb-4 w-full rounded-xl border border-linesoft bg-white/[0.03] px-3 py-2.5 text-[13px] text-white focus:border-gold focus:outline-none"
          />

          <button
            onClick={handleCreate}
            disabled={busy || !form.title.trim()}
            className="w-full rounded-xl bg-gold-grad py-3 text-[12.5px] font-extrabold text-[#1a1300] transition-transform active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? 'Publishingâ€¦' : 'Publish challenge'}
          </button>
        </Card>

        {/* â”€â”€ List + entries â”€â”€ */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13.5px] font-extrabold">
              <Trophy size={16} className="text-gold" /> Official challenges
            </div>
            {pendingCount > 0 && (
              <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[11px] font-extrabold text-gold-hi">
                {pendingCount} pending payment{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {!challenges && <p className="py-4 text-center text-[12px] text-text3">Loading challengesâ€¦</p>}
          {challenges && challenges.length === 0 && (
            <EmptyState
              icon={Trophy}
              title="No official challenges yet"
              body="Post the first one â€” free, or paid with manual entry approval."
            />
          )}

          <div className="space-y-2">
            {(challenges || []).map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(active ? null : c.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all ${
                    active
                      ? 'border-gold/40 bg-gold/[0.06]'
                      : 'border-linesoft bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold">
                    <Trophy size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold">{c.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-text3">
                      <span className="flex items-center gap-1">
                        <Users size={11} /> {c.participantCount ?? 'â€”'}
                      </span>
                      {c.isPaid ? (
                        <span className="font-bold text-gold-hi">${Number(c.price).toFixed(2)} entry</span>
                      ) : (
                        <span className="font-bold text-brandgreen">Free</span>
                      )}
                    </div>
                  </div>
                  <span className="flex-none text-[10.5px] text-text3">{active ? 'Hide' : 'Entries'}</span>
                </button>
              );
            })}
          </div>

          {selectedId && (
            <div className="mt-4 border-t border-linesoft pt-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[12.5px] font-extrabold">Entries â€” {selected?.title}</div>
                {selected?.isPaid && (
                  <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[9.5px] font-extrabold text-gold-hi">
                    <DollarSign size={10} /> ${Number(selected.price).toFixed(2)}
                  </span>
                )}
              </div>
              {!entries && <p className="py-3 text-center text-[12px] text-text3">Loading entriesâ€¦</p>}
              {entries && entries.length === 0 && (
                <p className="py-3 text-center text-[12px] text-text3">Nobody has entered yet.</p>
              )}
              <div className="space-y-2">
                {(entries || []).map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 rounded-xl border border-linesoft bg-white/[0.02] px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-bold">{e.userId}</div>
                      <div className="text-[10.5px] text-text3">
                        {e.paymentStatus === 'pending' && 'Payment pending approval'}
                        {e.paymentStatus === 'approved' && `Paid $${Number(e.paidAmount || 0).toFixed(2)}`}
                        {e.paymentStatus === 'rejected' && 'Payment rejected'}
                        {!e.paymentStatus && 'Free entry'}
                      </div>
                    </div>
                    {e.paymentStatus === 'pending' ? (
                      <div className="flex flex-none gap-1.5">
                        <button
                          onClick={() => handlePayment(e, 'approved')}
                          disabled={busy}
                          className="rounded-lg bg-brandgreen/15 px-2.5 py-1.5 text-[10.5px] font-bold text-brandgreen transition-colors hover:bg-brandgreen/25 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handlePayment(e, 'rejected')}
                          disabled={busy}
                          className="rounded-lg bg-brandred/15 px-2.5 py-1.5 text-[10.5px] font-bold text-brandred transition-colors hover:bg-brandred/25 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : e.paymentStatus === 'approved' ? (
                      <span className="flex flex-none items-center gap-1 rounded-full bg-brandgreen/15 px-2.5 py-1 text-[10px] font-bold text-brandgreen">
                        <CheckCircle2 size={11} /> Approved
                      </span>
                    ) : e.paymentStatus === 'rejected' ? (
                      <span className="flex flex-none items-center gap-1 rounded-full bg-brandred/15 px-2.5 py-1 text-[10px] font-bold text-brandred">
                        <XCircle size={11} /> Rejected
                      </span>
                    ) : (
                      <span className="flex-none rounded-full border border-linesoft px-2.5 py-1 text-[10px] font-bold text-text2">
                        Free
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
