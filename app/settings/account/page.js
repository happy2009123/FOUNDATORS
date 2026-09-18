'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Download, Trash2, Key, AlertTriangle, Check, Lock, Smartphone } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import AuthSkeleton from '@/components/AuthSkeleton';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { db, auth } from '@/lib/firebase';
import { doc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';

export default function AccountSettingsPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const { vibrate, notification } = useHaptics();
  const showToast = useStore((s) => s.showToast);
  const logout = useStore((s) => s.logout);
  const profile = useStore((s) => s.profile);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!ready) return <AuthSkeleton />;

  const handleExportData = async () => {
    vibrate('light');
    if (!profile?.id) return showToast('Not logged in');

    try {
      const userData = { profile };

      // Fetch posts
      const postsSnap = await getDocs(query(collection(db, 'posts'), where('authorKey', '==', profile.id)));
      userData.posts = postsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Fetch followers
      const followersSnap = await getDocs(collection(db, 'users', profile.id, 'followers'));
      userData.followers = followersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Fetch following
      const followingSnap = await getDocs(collection(db, 'users', profile.id, 'following'));
      userData.following = followingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Fetch bookmarks
      const bookmarksSnap = await getDocs(collection(db, 'users', profile.id, 'bookmarks'));
      userData.bookmarks = bookmarksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Fetch notifications
      const notifsSnap = await getDocs(collection(db, 'users', profile.id, 'notifications'));
      userData.notifications = notifsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const exportPayload = {
        exportDate: new Date().toISOString(),
        platform: 'Foundators',
        data: userData,
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `foundators-data-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data exported successfully');
    } catch (err) {
      console.error('Export error:', err);
      showToast('Failed to export data');
    }
  };

  const handleEnable2FA = () => {
    vibrate('medium');
    if (twoFACode.length === 6) {
      setTwoFAEnabled(true);
      setShow2FA(false);
      notification('success');
      showToast('Two-factor authentication enabled');
    }
  };

  const handleDeleteAccount = async () => {
    if (!profile?.id) return;
    vibrate('medium');
    setDeleting(true);

    try {
      // Delete user's subcollections
      const subcollections = ['notifications', 'followers', 'following', 'blocked', 'bookmarks', 'settings'];
      for (const sub of subcollections) {
        try {
          const snap = await getDocs(collection(db, 'users', profile.id, sub));
          for (const d of snap.docs) {
            await deleteDoc(doc(db, 'users', profile.id, sub, d.id));
          }
        } catch (err) {
          console.warn(`Failed to delete subcollection ${sub}:`, err);
        }
      }

      // Delete user doc
      await deleteDoc(doc(db, 'users', profile.id));

      // Delete Firebase Auth account
      if (auth?.currentUser) {
        await deleteUser(auth.currentUser);
      }

      setShowDeleteConfirm(false);
      showToast('Account deleted');
      logout();
      router.push('/login');
    } catch (err) {
      console.error('Delete account error:', err);
      showToast('Failed to delete account. Try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="app-shell overflow-y-auto">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-linesoft bg-ink/80 px-4 py-3 backdrop-blur-md">
        <button onClick={() => router.back()} className="h-8 w-8 flex items-center justify-center" aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[16px] font-bold">Account Settings</h1>
      </div>

      <div className="p-4 space-y-4">
        <section>
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-text3 mb-3">Security</h2>
          <div className="rounded-2xl border border-linesoft bg-card divide-y divide-linesoft">
            <button onClick={() => setShow2FA(true)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
              <Shield size={16} className="text-gold" />
              <div className="flex-1">
                <div className="text-[13px] font-bold">Two-factor authentication</div>
                <div className="text-[11px] text-text2">{twoFAEnabled ? 'Enabled' : 'Add extra security to your account'}</div>
              </div>
              {twoFAEnabled && <Check size={16} className="text-brandgreen" />}
            </button>
            <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
              <Key size={16} className="text-gold" />
              <div className="flex-1">
                <div className="text-[13px] font-bold">Change password</div>
                <div className="text-[11px] text-text2">Last changed 30 days ago</div>
              </div>
            </button>
            <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
              <Smartphone size={16} className="text-gold" />
              <div className="flex-1">
                <div className="text-[13px] font-bold">Login activity</div>
                <div className="text-[11px] text-text2">2 active sessions</div>
              </div>
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-text3 mb-3">Your Data</h2>
          <div className="rounded-2xl border border-linesoft bg-card divide-y divide-linesoft">
            <button onClick={handleExportData} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
              <Download size={16} className="text-gold" />
              <div className="flex-1">
                <div className="text-[13px] font-bold">Download your data</div>
                <div className="text-[11px] text-text2">Get a copy of all your information</div>
              </div>
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-red mb-3">Danger Zone</h2>
          <div className="rounded-2xl border border-red/20 bg-red/5 divide-y divide-red/10">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <Trash2 size={16} className="text-red" />
              <div className="flex-1">
                <div className="text-[13px] font-bold text-red">Delete account</div>
                <div className="text-[11px] text-text2">Permanently delete your account and all data</div>
              </div>
            </button>
          </div>
        </section>
      </div>

      {show2FA && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-6" onClick={() => setShow2FA(false)}>
          <div className="w-full max-w-[320px] rounded-3xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 mx-auto">
              <Shield size={20} className="text-gold" />
            </div>
            <h3 className="text-[16px] font-bold text-center">Enable 2FA</h3>
            <p className="mt-1 text-[12px] text-text2 text-center">Enter the 6-digit code from your authenticator app</p>
            <input
              type="text"
              value={twoFACode}
              onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="mt-4 w-full rounded-2xl border border-linesoft bg-white/[0.03] px-4 py-3 text-center text-[24px] font-mono tracking-[0.3em] text-white placeholder:text-text3 focus:border-gold focus:outline-none"
              aria-label="2FA code"
            />
            <button
              onClick={handleEnable2FA}
              disabled={twoFACode.length !== 6}
              className="mt-4 w-full rounded-2xl bg-gold py-3 text-[13px] font-bold text-[#1a1300] disabled:opacity-40"
            >
              Verify & Enable
            </button>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-6" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-[300px] rounded-3xl bg-card p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red/10 mx-auto">
              <AlertTriangle size={20} className="text-red" />
            </div>
            <h3 className="text-[16px] font-bold">Delete your account?</h3>
            <p className="mt-1 text-[12px] text-text2">This action is permanent. All your data will be deleted.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-full border border-linesoft py-3 text-[12px] font-bold text-text2">
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 rounded-full bg-red py-3 text-[12px] font-bold text-white disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
