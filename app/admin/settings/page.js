'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN → SETTINGS
// Admin profile (same FOUNDATORS profile language), security,
// session info, working preferences (persisted + applied), and
// the guarded danger zone. No decorative controls: every toggle
// persists to users/{uid}/settings/admin and changes behavior
// on reload; every button performs a real action.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  Shield, KeyRound, MonitorSmartphone, Save, BadgeCheck, ExternalLink,
  LogOut, Rows3, LayoutGrid, Clock,
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { useStore } from '@/lib/store';
import { signOutFully } from '@/lib/authActions';
import {
  Card, PageHeader, SectionTitle, Badge, ConfirmDialog, ErrorState,
} from '@/components/admin/ui';
import AdminDangerZone from '@/components/admin/DangerZone';

const DEFAULT_PREFS = { compactTables: false, defaultPeriod: '7D' };

export default function AdminSettingsPage() {
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const showToast = useStore((s) => s.showToast);

  const [prefs, setPrefs] = useState(null);
  const [prefsErr, setPrefsErr] = useState(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const prefsRef = db ? doc(db, 'users', profile?.id || 'x', 'settings', 'admin') : null;

  const loadPrefs = useCallback(async () => {
    if (!prefsRef || !profile?.id) return;
    setPrefsErr(null);
    try {
      const snap = await getDoc(prefsRef);
      setPrefs(snap.exists() ? { ...DEFAULT_PREFS, ...snap.data() } : { ...DEFAULT_PREFS });
    } catch (e) {
      setPrefsErr(e?.message || 'Could not load preferences');
      setPrefs({ ...DEFAULT_PREFS });
    }
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadPrefs(); }, [loadPrefs]);

  async function togglePref(key) {
    const next = { ...(prefs || DEFAULT_PREFS), [key]: !prefs?.[key] };
    setPrefs(next);
    try {
      await setDoc(prefsRef, next, { merge: true });
      showToast('Preference saved');
    } catch (e) {
      showToast(`Save failed: ${e?.message || 'permission denied'}`);
      loadPrefs();
    }
  }

  async function setPeriodPref(value) {
    const next = { ...(prefs || DEFAULT_PREFS), defaultPeriod: value };
    setPrefs(next);
    try {
      await setDoc(prefsRef, next, { merge: true });
      showToast('Default dashboard period saved');
    } catch (e) {
      showToast(`Save failed: ${e?.message || 'permission denied'}`);
      loadPrefs();
    }
  }

  async function sendReset() {
    const email = auth?.currentUser?.email;
    if (!email) { showToast('No email on this account'); return; }
    setResetBusy(true);
    try {
      await sendPasswordResetEmail(auth, email);
      showToast(`Reset link sent to ${email}`);
    } catch (e) {
      showToast(`Failed: ${e?.message || 'try again later'}`);
    }
    setResetBusy(false);
  }

  const meta = auth?.currentUser?.metadata;
  const provider = auth?.currentUser?.providerData?.[0]?.providerId || 'password';

  return (
    <div className="animate-screen-in">
      <PageHeader title="Settings" subtitle="Admin profile, security, and console preferences." />

      {/* ─── Admin profile (FOUNDATORS profile language) ─── */}
      <Card className="overflow-hidden">
        <div className="relative h-[92px] overflow-hidden bg-[radial-gradient(circle_at_85%_15%,rgba(247,221,143,0.35),transparent_55%),linear-gradient(120deg,rgba(184,134,11,0.35),rgba(0,0,0,0.95)_75%)]">
          <span className="absolute bottom-3 right-4 font-display text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold/60">
            Foundators Admin
          </span>
        </div>
        <div className="px-5 pb-5">
          <div className="-mt-9 flex items-end gap-4">
            <div className="rounded-full bg-gradient-to-br from-gold-hi via-gold to-gold-deep p-[3px]">
              <img
                src={profile?.avatar || ''}
                alt=""
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                className="h-[74px] w-[74px] rounded-full border-4 border-[#0e0e0e] bg-[#1a1a1a] object-cover"
              />
            </div>
            <div className="min-w-0 pb-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-display text-[19px] font-extrabold">{profile?.name || 'Admin'}</span>
                <BadgeCheck size={17} className="flex-none text-gold" />
              </div>
              <div className="truncate text-[13px] font-bold text-gold-hi">{profile?.handle}</div>
              <div className="mt-1"><Badge tone="gold">Administrator</Badge></div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => router.push('/profile')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gold/50 bg-gold/[0.06] px-4 py-2 text-[12.5px] font-extrabold text-gold-hi transition-colors hover:bg-gold/10"
            >
              <ExternalLink size={14} /> View public profile
            </button>
            <button
              onClick={() => setSignOutOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2 text-[12.5px] font-bold text-text2 transition-colors hover:border-brandred/50 hover:text-brandred"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* ─── Security ─── */}
        <Card className="p-5">
          <SectionTitle title="Security" />
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3.5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
                <KeyRound size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold">Password reset</div>
                <div className="text-[11.5px] text-text3">Emails a secure reset link to {auth?.currentUser?.email || 'your account email'}</div>
              </div>
              <button
                onClick={sendReset}
                disabled={resetBusy}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-[11.5px] font-bold text-text2 transition-colors hover:border-gold/40 hover:text-gold-hi disabled:opacity-40"
              >
                {resetBusy ? 'Sending…' : 'Send link'}
              </button>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3.5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-brandblue/30 bg-brandblue/10 text-brandblue">
                <Shield size={15} />
              </span>
              <div>
                <div className="text-[13px] font-bold">Server-side authorization</div>
                <div className="text-[11.5px] leading-relaxed text-text3">
                  Admin powers are enforced by Firestore rules via the <code className="text-gold-hi">admins/&#123;uid&#125;</code> allowlist — not by the frontend. Sensitive credentials are never displayed here.
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ─── Sessions ─── */}
        <Card className="p-5">
          <SectionTitle title="Session" />
          <div className="space-y-2.5">
            <InfoRow icon={MonitorSmartphone} label="Signed in as" value={auth?.currentUser?.email || '—'} />
            <InfoRow icon={Shield} label="Provider" value={provider === 'google.com' ? 'Google' : 'Email & password'} />
            <InfoRow icon={Clock} label="First sign-in" value={meta?.creationTime ? new Date(meta.creationTime).toLocaleString() : '—'} />
            <InfoRow icon={Clock} label="Last sign-in" value={meta?.lastSignInTime ? new Date(meta.lastSignInTime).toLocaleString() : '—'} />
          </div>
          <p className="mt-4 border-t border-white/5 pt-3 text-[11px] leading-relaxed text-text3">
            Sign out ends this session on this device. To revoke every device, change the password — sessions using the old credential are invalidated on next token refresh.
          </p>
        </Card>
      </div>

      {/* ─── Preferences ─── */}
      <Card className="mt-5 p-5">
        <SectionTitle title="Console Preferences" />
        {prefsErr ? (
          <ErrorState message={prefsErr} onRetry={loadPrefs} />
        ) : !prefs ? (
          <div className="space-y-3"><div className="skeleton h-12 w-full" /><div className="skeleton h-12 w-full" /></div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3.5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
                {prefs.compactTables ? <Rows3 size={15} /> : <LayoutGrid size={15} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold">Compact tables</div>
                <div className="text-[11.5px] text-text3">Denser rows in Users &amp; Messages tables. Applies across reloads.</div>
              </div>
              <button
                role="switch"
                aria-checked={!!prefs.compactTables}
                onClick={() => togglePref('compactTables')}
                className={`toggle-switch flex-none ${prefs.compactTables ? 'active' : ''}`}
                aria-label="Toggle compact tables"
              />
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3.5">
              <div className="text-[13px] font-bold">Default dashboard period</div>
              <div className="text-[11.5px] text-text3">Used when you open the dashboard next time.</div>
              <div className="mt-2.5 flex gap-1.5">
                {['7D', '30D', '90D', '1Y'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriodPref(p)}
                    className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-colors ${
                      prefs.defaultPeriod === p
                        ? 'border-gold/50 bg-gold/10 text-gold-hi'
                        : 'border-white/10 bg-white/5 text-text2 hover:border-white/20'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-[11px] text-text3">
                <Save size={11} className="mr-1 inline" />
                Saved automatically to your private admin settings.
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ─── Danger zone ─── */}
      <div className="mt-5">
        <AdminDangerZone onChanged={loadPrefs} />
      </div>

      <ConfirmDialog
        open={signOutOpen}
        title="Sign out"
        body="End this admin session on this device?"
        confirmLabel="Sign out"
        danger
        onConfirm={async () => { setSignOutOpen(false); await signOutFully(); router.replace('/login'); }}
        onCancel={() => setSignOutOpen(false)}
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
      <span className="text-gold"><Icon size={15} /></span>
      <span className="text-[12px] text-text3">{label}</span>
      <span className="ml-auto max-w-[60%] truncate text-[12.5px] font-bold text-white">{value}</span>
    </div>
  );
}
