'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, X, Gift } from 'lucide-react';
import SubpageHeader from '@/components/SubpageHeader';
import ThemeToggle from '@/components/ThemeToggle';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { signOutFully } from '@/lib/authActions';
import { sendPasswordReset } from '@/lib/supabase/auth';
import { submitFeedback } from '@/lib/feedback';
import { isPushSupported, enablePushNotifications, disablePushNotifications } from '@/lib/push';
import AuthSkeleton from '@/components/AuthSkeleton';

const NOTIF_ROWS = [
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
  const showToast = useStore((s) => s.showToast);
  const [showFeedback, setShowFeedback] = useState(false);
  const [fbCategory, setFbCategory] = useState('general');
  const [fbMessage, setFbMessage] = useState('');
  const [fbSending, setFbSending] = useState(false);
  const [pushState, setPushState] = useState('unknown'); // unknown | on | off | denied | unsupported
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setPushState('unsupported');
      return;
    }
    if (Notification.permission === 'granted') setPushState('on');
    else if (Notification.permission === 'denied') setPushState('denied');
    else setPushState('off');
  }, []);

  async function handlePushToggle() {
    if (pushBusy) return;
    if (pushState === 'on') {
      setPushBusy(true);
      await disablePushNotifications();
      setPushBusy(false);
      setPushState('off');
      return;
    }
    if (pushState !== 'off') return;
    setPushBusy(true);
    const r = await enablePushNotifications();
    setPushBusy(false);
    if (r.ok) {
      setPushState('on');
      showToast('Push notifications enabled on this device');
    } else if (r.error === 'denied') {
      setPushState('denied');
      showToast('Notifications are blocked - allow them in your browser settings');
    } else {
      showToast('Could not enable push notifications');
    }
  }

  if (!ready) return <AuthSkeleton />;

  async function handleLogout() {
    await signOutFully();
    showToast('Logged out');
    router.push('/login');
  }

  async function handleFeedbackSubmit() {
    if (!fbMessage.trim() || fbSending) return;
    setFbSending(true);
    const result = await submitFeedback({ category: fbCategory, message: fbMessage });
    setFbSending(false);
    if (result.success) {
      showToast('Feedback sent — thank you!');
      setShowFeedback(false);
      setFbMessage('');
      setFbCategory('general');
    } else {
      showToast(result.error || 'Could not send feedback');
    }
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
        <button
          onClick={() => router.push('/invite')}
          className="flex w-full items-center justify-between border-b border-linesoft py-3.5 text-[13.5px] font-semibold"
        >
          <span className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-gold" /> Invite friends
          </span>
          <ChevronRight className="h-4 w-4 text-text3" />
        </button>

        <SectionLabel>Notifications</SectionLabel>
        <SettingRow
          label={pushState === 'denied' ? 'Push notifications (blocked)' : pushState === 'unsupported' ? 'Push notifications (unsupported)' : 'Push notifications'}
          on={pushState === 'on'}
          onToggle={handlePushToggle}
        />
        {NOTIF_ROWS.map((r) => (
          <SettingRow key={r.key} label={r.label} on={settings[r.key]} onToggle={() => toggleSetting(r.key)} />
        ))}

        <SectionLabel>Privacy</SectionLabel>
        {PRIVACY_ROWS.map((r) => (
          <SettingRow key={r.key} label={r.label} on={settings[r.key]} onToggle={() => toggleSetting(r.key)} />
        ))}
        <button
          onClick={() => router.push('/settings/blocked')}
          className="flex w-full items-center justify-between border-b border-linesoft py-3.5 text-[13.5px] font-semibold"
        >
          <span>Blocked users</span>
          <ChevronRight className="h-4 w-4 text-text3" />
        </button>

        <SectionLabel>Support</SectionLabel>
        <button
          onClick={() => setShowFeedback(true)}
          className="flex w-full items-center justify-between border-b border-linesoft py-3.5 text-[13.5px] font-semibold"
        >
          <span>Send feedback</span>
          <ChevronRight className="h-4 w-4 text-text3" />
        </button>

        <SectionLabel>Appearance</SectionLabel>
        <div className="flex items-center justify-between border-b border-linesoft py-3.5 text-[13.5px] font-semibold">
          <span>Theme</span>
          <ThemeToggle />
        </div>

        <SectionLabel>Account</SectionLabel>
        <button
          onClick={async () => {
            const email = useStore.getState().profile?.email;
            if (!email) {
              showToast('No email on this account');
              return;
            }
            showToast('Sending reset link...');
            const { error } = await sendPasswordReset(email);
            if (error) showToast(`Could not send reset link: ${error}`);
            else showToast(`Password reset link sent to ${email}`);
          }}
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

      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
          <div className="flex w-full max-w-md flex-col rounded-t-3xl border border-linesoft bg-card p-4 sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[14px] font-extrabold">Send feedback</span>
              <button onClick={() => setShowFeedback(false)} className="text-text3" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="mb-3 flex gap-2">
              {[['bug', 'Bug'], ['idea', 'Idea'], ['general', 'General']].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFbCategory(key)}
                  className={`rounded-full border px-3.5 py-1.5 text-[11.5px] font-bold transition-colors ${
                    fbCategory === key
                      ? 'border-gold bg-gold/15 text-gold-hi'
                      : 'border-linesoft text-text2 hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <textarea
              value={fbMessage}
              onChange={(e) => setFbMessage(e.target.value)}
              placeholder="Tell us what's on your mind..."
              rows={5}
              maxLength={2000}
              className="mb-3 resize-none rounded-xl border border-linesoft bg-white/5 px-3.5 py-2.5 text-[13px] text-white placeholder:text-text3 focus:border-gold focus:outline-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text3">{fbMessage.length}/2000</span>
              <button
                onClick={handleFeedbackSubmit}
                disabled={fbSending || !fbMessage.trim()}
                className="rounded-full bg-gold-grad px-5 py-2 text-[12.5px] font-bold text-[#1a1300] disabled:opacity-40"
              >
                {fbSending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
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
