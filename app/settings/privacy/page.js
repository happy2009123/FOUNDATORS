'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Eye, Lock, Globe, MessageCircle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import AuthSkeleton from '@/components/AuthSkeleton';
import { useRequireAuth } from '@/lib/useRequireAuth';

export default function PrivacySettingsPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const { vibrate } = useHaptics();
  const showToast = useStore((s) => s.showToast);
  const settings = useStore((s) => s.settings);

  const [prefs, setPrefs] = useState({
    privateProfile: false,
    showOnlineStatus: true,
    showReadReceipts: true,
    showTypingIndicator: true,
    allowTagging: 'everyone',
    allowMentions: 'everyone',
    allowMessageRequests: 'everyone',
    storySharing: 'followers',
    activityStatus: true,
    searchEngineIndexing: true,
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

  const SelectGroup = ({ value, onChange, options }) => (
    <div className="flex gap-1.5 mt-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => { onChange(opt.key); vibrate('light'); }}
          className={`flex-1 rounded-xl py-2 text-[10px] font-bold transition-all ${
            value === opt.key ? 'bg-gold text-[#1a1300]' : 'bg-white/5 text-text3'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="app-shell overflow-y-auto">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-linesoft bg-ink/80 px-4 py-3 backdrop-blur-md">
        <button onClick={() => router.back()} className="h-8 w-8 flex items-center justify-center" aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[16px] font-bold">Privacy Settings</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Account privacy */}
        <section>
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-text3 mb-3">Account Privacy</h2>
          <div className="rounded-2xl border border-linesoft bg-card divide-y divide-linesoft">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Lock size={16} className="text-gold" />
                <div>
                  <div className="text-[13px] font-bold">Private account</div>
                  <div className="text-[11px] text-text2">Only followers can see your posts</div>
                </div>
              </div>
              <Toggle value={prefs.privateProfile} onChange={() => toggle('privateProfile')} />
            </div>
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-3 mb-1">
                <Eye size={16} className="text-gold" />
                <div className="text-[13px] font-bold">Activity status</div>
              </div>
              <div className="text-[11px] text-text2 ml-7">Show when you&apos;re active</div>
              <Toggle value={prefs.activityStatus} onChange={() => toggle('activityStatus')} />
            </div>
          </div>
        </section>

        {/* Visibility */}
        <section>
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-text3 mb-3">Visibility</h2>
          <div className="rounded-2xl border border-linesoft bg-card divide-y divide-linesoft">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <div className="text-[13px] font-bold">Online status</div>
                <div className="text-[11px] text-text2">Show when you&apos;re online</div>
              </div>
              <Toggle value={prefs.showOnlineStatus} onChange={() => toggle('showOnlineStatus')} />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <div className="text-[13px] font-bold">Read receipts</div>
                <div className="text-[11px] text-text2">Show when you&apos;ve read messages</div>
              </div>
              <Toggle value={prefs.showReadReceipts} onChange={() => toggle('showReadReceipts')} />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <div className="text-[13px] font-bold">Typing indicator</div>
                <div className="text-[11px] text-text2">Show when you&apos;re typing</div>
              </div>
              <Toggle value={prefs.showTypingIndicator} onChange={() => toggle('showTypingIndicator')} />
            </div>
            <div className="px-4 py-3.5">
              <div className="text-[13px] font-bold mb-1">Search engine indexing</div>
              <div className="text-[11px] text-text2 mb-2">Allow search engines to link to your profile</div>
              <Toggle value={prefs.searchEngineIndexing} onChange={() => toggle('searchEngineIndexing')} />
            </div>
          </div>
        </section>

        {/* Interactions */}
        <section>
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-text3 mb-3">Interactions</h2>
          <div className="rounded-2xl border border-linesoft bg-card divide-y divide-linesoft">
            <div className="px-4 py-3.5">
              <div className="text-[13px] font-bold mb-1">Who can tag you</div>
              <SelectGroup
                value={prefs.allowTagging}
                onChange={(v) => setPrefs((p) => ({ ...p, allowTagging: v }))}
                options={[{ key: 'everyone', label: 'Everyone' }, { key: 'followers', label: 'Followers' }, { key: 'none', label: 'Nobody' }]}
              />
            </div>
            <div className="px-4 py-3.5">
              <div className="text-[13px] font-bold mb-1">Who can mention you</div>
              <SelectGroup
                value={prefs.allowMentions}
                onChange={(v) => setPrefs((p) => ({ ...p, allowMentions: v }))}
                options={[{ key: 'everyone', label: 'Everyone' }, { key: 'followers', label: 'Followers' }, { key: 'none', label: 'Nobody' }]}
              />
            </div>
            <div className="px-4 py-3.5">
              <div className="text-[13px] font-bold mb-1">Message requests</div>
              <SelectGroup
                value={prefs.allowMessageRequests}
                onChange={(v) => setPrefs((p) => ({ ...p, allowMessageRequests: v }))}
                options={[{ key: 'everyone', label: 'Everyone' }, { key: 'followers', label: 'Followers' }, { key: 'none', label: 'Nobody' }]}
              />
            </div>
            <div className="px-4 py-3.5">
              <div className="text-[13px] font-bold mb-1">Story sharing</div>
              <SelectGroup
                value={prefs.storySharing}
                onChange={(v) => setPrefs((p) => ({ ...p, storySharing: v }))}
                options={[{ key: 'everyone', label: 'Everyone' }, { key: 'followers', label: 'Followers' }, { key: 'close', label: 'Close' }]}
              />
            </div>
          </div>
        </section>

        <button
          onClick={() => showToast('Privacy settings saved')}
          className="w-full rounded-2xl bg-gold py-3.5 text-[13px] font-bold text-[#1a1300]"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
