'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import SubpageHeader from '@/components/SubpageHeader';
import ThemeToggle from '@/components/ThemeToggle';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import AuthSkeleton from '@/components/AuthSkeleton';

const NOTIF_ROWS = [
  { key: 'pushNotifications', label: 'Push notifications' },
  { key: 'emailDigest', label: 'Email digest' },
  { key: 'commentAlerts', label: 'Comment alerts' },
];
const PRIVACY_ROWS = [
  { key: 'privateProfile', label: 'Private profile' },
  { key: 'showOnlineStatus', label: 'Show online status' },
];

export default function SettingsPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const settings = useStore((s) => s.settings);
  const toggleSetting = useStore((s) => s.toggleSetting);
  const logout = useStore((s) => s.logout);
  const showToast = useStore((s) => s.showToast);

  if (!ready) return <AuthSkeleton />;

  function handleLogout() {
    logout();
    showToast('Logged out');
    router.push('/login');
  }

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <SubpageHeader title="Settings" />
      <div className="no-scrollbar flex-1 overflow-y-auto px-[18px] py-2">
        <SectionLabel>Profile</SectionLabel>
        <button
          onClick={() => router.push('/settings/edit-profile')}
          className="flex w-full items-center justify-between border-b border-linesoft py-3.5 text-[13.5px] font-semibold"
        >
          <span>Edit Profile</span>
          <ChevronRight className="h-4 w-4 text-text3" />
        </button>
        <button
          onClick={() => router.push('/bookmarks')}
          className="flex w-full items-center justify-between border-b border-linesoft py-3.5 text-[13.5px] font-semibold"
        >
          <span>Bookmarks</span>
          <ChevronRight className="h-4 w-4 text-text3" />
        </button>

        <SectionLabel>Notifications</SectionLabel>
        {NOTIF_ROWS.map((r) => (
          <SettingRow key={r.key} label={r.label} on={settings[r.key]} onToggle={() => toggleSetting(r.key)} />
        ))}

        <SectionLabel>Privacy</SectionLabel>
        {PRIVACY_ROWS.map((r) => (
          <SettingRow key={r.key} label={r.label} on={settings[r.key]} onToggle={() => toggleSetting(r.key)} />
        ))}
        <button
          onClick={() => showToast('Blocked users list coming soon')}
          className="flex w-full items-center justify-between border-b border-linesoft py-3.5 text-[13.5px] font-semibold"
        >
          <span>Blocked users</span>
          <ChevronRight className="h-4 w-4 text-text3" />
        </button>

        <SectionLabel>Appearance</SectionLabel>
        <div className="flex items-center justify-between border-b border-linesoft py-3.5 text-[13.5px] font-semibold">
          <span>Theme</span>
          <ThemeToggle />
        </div>

        <SectionLabel>Account</SectionLabel>
        <button
          onClick={() => showToast('Password reset link sent to your email')}
          className="w-full py-3.5 text-left text-[13.5px] font-semibold text-text2"
        >
          Change password
        </button>
        <button onClick={handleLogout} className="w-full py-3.5 text-left text-[13.5px] font-semibold text-brandred">
          Log Out
        </button>

        <SectionLabel>Legal</SectionLabel>
        <button
          onClick={() => router.push('/privacy')}
          className="flex w-full items-center justify-between border-b border-linesoft py-3.5 text-[13.5px] font-semibold"
        >
          <span>Privacy Policy</span>
          <ChevronRight className="h-4 w-4 text-text3" />
        </button>
        <button
          onClick={() => router.push('/terms')}
          className="flex w-full items-center justify-between border-b border-linesoft py-3.5 text-[13.5px] font-semibold"
        >
          <span>Terms of Service</span>
          <ChevronRight className="h-4 w-4 text-text3" />
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div className="pb-2 pt-4 text-xs font-extrabold uppercase tracking-wide text-text3">{children}</div>;
}

function SettingRow({ label, on, onToggle }) {
  return (
    <div className="flex items-center justify-between border-b border-linesoft py-3.5 text-[13.5px] font-semibold">
      <span>{label}</span>
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`relative h-[26px] w-11 flex-none rounded-full border transition-colors ${
          on ? 'border-gold bg-[rgba(217,172,61,0.25)]' : 'border-linesoft bg-white/[0.08]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${
            on ? 'left-5 bg-gold-grad' : 'left-0.5 bg-text2'
          }`}
        />
      </button>
    </div>
  );
}
