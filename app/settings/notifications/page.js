'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Shield, Eye, Lock, Trash2, Download, ChevronRight, LogOut, UserX, Globe } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import AuthSkeleton from '@/components/AuthSkeleton';
import { useRequireAuth } from '@/lib/useRequireAuth';

export default function NotificationSettingsPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const { vibrate } = useHaptics();
  const showToast = useStore((s) => s.showToast);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const [prefs, setPrefs] = useState({
    likes: true,
    comments: true,
    follows: true,
    mentions: true,
    messages: true,
    storyReplies: true,
    postShares: true,
    recommendation: false,
    systemUpdates: true,
    weeklyDigest: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });

  const toggle = (key) => {
    vibrate('light');
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!ready) return <AuthSkeleton />;

  const Toggle = ({ value, onChange }) => (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-gold' : 'bg-white/10'}`}
      role="switch"
      aria-checked={value}
    >
      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5.5 left-0.5' : 'translate-x-0.5'}`} />
    </button>
  );

  return (
    <div className="app-shell overflow-y-auto">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-linesoft bg-ink/80 px-4 py-3 backdrop-blur-md">
        <button onClick={() => router.back()} className="h-8 w-8 flex items-center justify-center" aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[16px] font-bold">Notification Settings</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* In-app notifications */}
        <section>
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-text3 mb-3">In-App Notifications</h2>
          <div className="rounded-2xl border border-linesoft bg-card divide-y divide-linesoft">
            {[
              { key: 'likes', label: 'Likes', desc: 'When someone likes your post' },
              { key: 'comments', label: 'Comments', desc: 'When someone comments on your post' },
              { key: 'follows', label: 'New followers', desc: 'When someone follows you' },
              { key: 'mentions', label: 'Mentions', desc: 'When someone mentions you' },
              { key: 'messages', label: 'Messages', desc: 'New direct messages' },
              { key: 'storyReplies', label: 'Story replies', desc: 'When someone replies to your story' },
              { key: 'postShares', label: 'Post shares', desc: 'When someone shares your post' },
              { key: 'recommendation', label: 'Recommendations', desc: 'Suggested content and people' },
              { key: 'systemUpdates', label: 'System updates', desc: 'App updates and announcements' },
              { key: 'weeklyDigest', label: 'Weekly digest', desc: 'Summary of your activity' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <div className="text-[13px] font-bold">{item.label}</div>
                  <div className="text-[11px] text-text2">{item.desc}</div>
                </div>
                <Toggle value={prefs[item.key]} onChange={() => toggle(item.key)} />
              </div>
            ))}
          </div>
        </section>

        {/* Quiet hours */}
        <section>
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-text3 mb-3">Quiet Hours</h2>
          <div className="rounded-2xl border border-linesoft bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[13px] font-bold">Do Not Disturb</div>
                <div className="text-[11px] text-text2">Silence notifications during set hours</div>
              </div>
              <Toggle value={prefs.quietHoursEnabled} onChange={() => toggle('quietHoursEnabled')} />
            </div>
            {prefs.quietHoursEnabled && (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1">
                  <label className="text-[10px] text-text3 block mb-1">Start</label>
                  <input
                    type="time"
                    value={prefs.quietHoursStart}
                    onChange={(e) => setPrefs((p) => ({ ...p, quietHoursStart: e.target.value }))}
                    className="w-full rounded-xl border border-linesoft bg-white/[0.03] px-3 py-2 text-[12px] text-white focus:border-gold focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-text3 block mb-1">End</label>
                  <input
                    type="time"
                    value={prefs.quietHoursEnd}
                    onChange={(e) => setPrefs((p) => ({ ...p, quietHoursEnd: e.target.value }))}
                    className="w-full rounded-xl border border-linesoft bg-white/[0.03] px-3 py-2 text-[12px] text-white focus:border-gold focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        <button
          onClick={() => { showToast('Settings saved'); }}
          className="w-full rounded-2xl bg-gold py-3.5 text-[13px] font-bold text-[#1a1300]"
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
}
