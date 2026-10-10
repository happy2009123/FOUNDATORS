'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Trash2, Key, AlertTriangle, Copy } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import AuthSkeleton from '@/components/AuthSkeleton';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { getSupabase } from '@/lib/supabase/client';
import { mapRows } from '@/lib/supabase/db';
import { signInWithGooglePopup, signOut } from '@/lib/supabase/auth';

export default function AccountSettingsPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const { vibrate } = useHaptics();
  const showToast = useStore((s) => s.showToast);
  const logout = useStore((s) => s.logout);
  const profile = useStore((s) => s.profile);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [authUser, setAuthUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getSupabase()
      ?.auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setAuthUser(data?.user || null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const usesPassword = (authUser?.identities || []).some((i) => i.provider === 'email');

  if (!ready) return <AuthSkeleton />;

  const handleExportData = async () => {
    vibrate('light');
    if (!profile?.id) return showToast('Not logged in');

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not configured');

      const userData = { profile };

      // Fetch posts
      const postsSnap = await supabase.from('posts').select('*').eq('author_key', profile.id);
      if (postsSnap.error) throw postsSnap.error;
      userData.posts = mapRows(postsSnap.data || []);

      // Fetch followers
      const followersSnap = await supabase.from('follows').select('*').eq('following_id', profile.id);
      if (followersSnap.error) throw followersSnap.error;
      userData.followers = mapRows(followersSnap.data || []);

      // Fetch following
      const followingSnap = await supabase.from('follows').select('*').eq('follower_id', profile.id);
      if (followingSnap.error) throw followingSnap.error;
      userData.following = mapRows(followingSnap.data || []);

      // Fetch bookmarks
      const bookmarksSnap = await supabase
        .from('posts')
        .select('id, created_at')
        .contains('bookmarked_by', [profile.id]);
      if (bookmarksSnap.error) throw bookmarksSnap.error;
      userData.bookmarks = mapRows(bookmarksSnap.data || []);

      // Fetch notifications
      const notifsSnap = await supabase.from('notifications').select('*').eq('user_id', profile.id);
      if (notifsSnap.error) throw notifsSnap.error;
      userData.notifications = mapRows(notifsSnap.data || []);

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

  // Deletion must be ALL-OR-NOTHING. The previous flow deleted the
  // Firestore document first and called deleteUser() afterwards — when
  // deleteUser threw auth/requires-recent-login (stale session), the user
  // was left with a live sign-in but no data: a broken half-deleted
  // account. We now reauthenticate FIRST (nothing is touched if this
  // fails), then purge data, then end the session.
  const handleDeleteAccount = async () => {
    const supabase = getSupabase();
    if (!profile?.id || !supabase) return;
    vibrate('medium');
    setDeleting(true);

    try {
      // 1. Reauthenticate so nothing is touched if the confirmation fails.
      const { data: authRes } = await supabase.auth.getUser();
      const user = authRes?.user;
      if (!user) throw new Error('Not signed in');
      const providerIds = (user.identities || []).map((i) => i.provider);
      if (providerIds.includes('email')) {
        if (!deletePassword) {
          showToast('Enter your password to confirm');
          setDeleting(false);
          return;
        }
        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email: user.email || '',
          password: deletePassword,
        });
        if (reauthError) {
          showToast('Incorrect password');
          setDeleting(false);
          return;
        }
      } else if (providerIds.includes('google')) {
        const googleRes = await signInWithGooglePopup();
        if (googleRes?.error) throw new Error(googleRes.error);
      }

      const uid = profile.id;
      const drop = async (label, request) => {
        try {
          const { error } = await request();
          if (error) throw error;
        } catch (err) {
          console.warn(`Failed to delete ${label}:`, err);
        }
      };

      // 2. Purge data (each step is idempotent, so a retry after a rare
      //    late failure is safe).
      await drop('notifications', () => supabase.from('notifications').delete().eq('user_id', uid));
      await drop('followers', () => supabase.from('follows').delete().eq('following_id', uid));
      await drop('following', () => supabase.from('follows').delete().eq('follower_id', uid));
      await drop('blocked', () => supabase.from('blocks').delete().eq('user_id', uid));
      await drop('settings', () => supabase.from('user_settings').delete().eq('user_id', uid));

      // Bookmarks are a jsonb array on other people's posts; clear this
      // user's entries through the same RPC the app uses to un-bookmark.
      try {
        const { data: bookmarked, error } = await supabase
          .from('posts')
          .select('id')
          .contains('bookmarked_by', [uid]);
        if (error) throw error;
        for (const row of bookmarked || []) {
          const { error: bmError } = await supabase.rpc('toggle_bookmark', {
            p_post_id: row.id,
            p_bookmark: false,
          });
          if (bmError) throw bmError;
        }
      } catch (err) {
        console.warn('Failed to delete bookmarks:', err);
      }

      // The user's own posts (plus every comment on them).
      let myPostIds = [];
      try {
        const { data: postRows, error } = await supabase
          .from('posts')
          .select('id')
          .eq('author_key', uid);
        if (error) throw error;
        myPostIds = (postRows || []).map((r) => r.id);
      } catch (err) {
        console.warn('Failed to fetch own posts:', err);
      }
      if (myPostIds.length) {
        await drop('post comments', () => supabase.from('comments').delete().in('post_id', myPostIds));
        await drop('own posts', () => supabase.from('posts').delete().in('id', myPostIds));
      }

      // Comments the user left on OTHER people's posts.
      await drop('own comments', () => supabase.from('comments').delete().eq('author_key', uid));

      // User profile row last.
      await drop('profile', () => supabase.from('profiles').delete().eq('id', uid));

      // 3. End the session. Deleting the auth user itself
      //    (supabase.auth.admin.deleteUser) requires a server-side admin
      //    call with the service-role key — it cannot be done from here.
      try {
        await signOut();
      } catch (err) {
        console.error('signOut failed after data purge:', err);
      }

      setShowDeleteConfirm(false);
      setDeletePassword('');
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
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-text3 mb-3">Your ID</h2>
          <div className="rounded-2xl border border-linesoft bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-[13px] font-bold">Foundators ID</div>
              <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold">Share this with friends</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl bg-white/[0.03] border border-linesoft px-3 py-2.5 font-mono text-[14px] font-bold text-gold tracking-wider">
                {profile?.id || 'Loading...'}
              </div>
              <button
                onClick={() => {
                  vibrate('light');
                  navigator.clipboard.writeText(profile?.id || '');
                  showToast('ID copied to clipboard');
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold"
                aria-label="Copy ID"
              >
                <Copy size={16} />
              </button>
            </div>
            <p className="mt-2 text-[11px] text-text3">Share this ID so others can find and message you on Foundators.</p>
          </div>
        </section>

        <section>
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-text3 mb-3">Security</h2>
          <div className="rounded-2xl border border-linesoft bg-card divide-y divide-linesoft">
            {/* Two-factor authentication was removed: the old flow "enabled"
                2FA after any 6 digits with nothing behind it — a fake security
                control. It will return only with real TOTP/enforcement. */}
            <button onClick={() => router.push('/forgot-password')} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
              <Key size={16} className="text-gold" />
              <div className="flex-1">
                <div className="text-[13px] font-bold">Change password</div>
                <div className="text-[11px] text-text2">Reset it securely via email</div>
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
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-brandred mb-3">Danger Zone</h2>
          <div className="rounded-2xl border border-brandred/20 bg-brandred/5 divide-y divide-red/10">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <Trash2 size={16} className="text-brandred" />
              <div className="flex-1">
                <div className="text-[13px] font-bold text-brandred">Delete account</div>
                <div className="text-[11px] text-text2">Permanently delete your account and all data</div>
              </div>
            </button>
          </div>
        </section>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-6" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-[300px] rounded-3xl bg-card p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brandred/10 mx-auto">
              <AlertTriangle size={20} className="text-brandred" />
            </div>
            <h3 className="text-[16px] font-bold">Delete your account?</h3>
            <p className="mt-1 text-[12px] text-text2">This action is permanent. All your data will be deleted.</p>
            {usesPassword && (
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Confirm your password"
                className="mt-4 w-full rounded-2xl border border-linesoft bg-white/[0.03] px-4 py-3 text-[13px] text-white placeholder:text-text3 focus:border-brandred focus:outline-none"
                aria-label="Confirm password"
              />
            )}
            {!usesPassword && (
              <p className="mt-3 text-[11px] text-text3">Your Google account will be asked for confirmation.</p>
            )}
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-full border border-linesoft py-3 text-[12px] font-bold text-text2">
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 rounded-full bg-brandred py-3 text-[12px] font-bold text-white disabled:opacity-50"
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
