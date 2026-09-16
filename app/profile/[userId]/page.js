'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Share2, UserPlus, Check, Flag, Ban, MoreHorizontal, Shield } from 'lucide-react';
import SubpageHeader from '@/components/SubpageHeader';
import VerifiedBadge from '@/components/VerifiedBadge';
import BuilderScoreCard from '@/components/BuilderScoreCard';
import ModerationSheet from '@/components/ModerationSheet';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { USERS } from '@/lib/data';
import { useHaptics } from '@/lib/useHaptics';
import Avatar from '@/components/Avatar';
import AuthSkeleton from '@/components/AuthSkeleton';

export default function UserProfilePage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const { userId } = useParams();
  const user = USERS[userId];

  const following = useStore((s) => !!s.followedUsers[userId]);
  const toggleFollowUser = useStore((s) => s.toggleFollowUser);
  const ensureContactForUser = useStore((s) => s.ensureContactForUser);
  const showToast = useStore((s) => s.showToast);
  const blockUser = useStore((s) => s.blockUser);
  const reportItem = useStore((s) => s.reportItem);
  const blockedUsers = useStore((s) => s.blockedUsers);
  const isBlocked = !!blockedUsers[userId];
  const { vibrate, notification } = useHaptics();
  const [showMenu, setShowMenu] = useState(false);
  const [showModeration, setShowModeration] = useState(false);

  if (!ready) return <AuthSkeleton />;
  if (!user) {
    return (
      <div className="app-shell flex min-h-0 flex-1 flex-col">
        <SubpageHeader title="Profile" />
        <div className="flex flex-1 items-center justify-center text-sm text-text2">User not found.</div>
      </div>
    );
  }

  function handleMessage() {
    const key = ensureContactForUser(user.key, user);
    router.push(`/messages/${key}`);
  }

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <SubpageHeader title={user.handle} />
      <div className="no-scrollbar flex-1 overflow-y-auto">
        <div className="h-[104px] flex-none bg-[radial-gradient(circle_at_85%_15%,rgba(247,221,143,0.35),transparent_55%),linear-gradient(120deg,rgba(184,134,11,0.35),rgba(0,0,0,0.95)_75%)]" />
        <div className="-mt-[42px] px-5">
          <div className="flex justify-end gap-2.5 pt-3.5">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href).catch(() => {});
                showToast('Profile link copied');
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-gold"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={handleMessage}
              className="rounded-full border-[1.3px] border-gold px-[18px] py-2 text-[12.5px] font-bold text-gold-hi"
            >
              Message
            </button>
            <button
              onClick={() => { toggleFollowUser(userId); following ? vibrate('light') : notification('success'); }}
              className={`flex items-center gap-1.5 rounded-full border-[1.3px] px-[18px] py-2 text-[12.5px] font-bold ${
                following ? 'border-transparent bg-gold-grad text-[#1a1300]' : 'border-gold text-gold-hi'
              }`}
            >
              {following ? <Check size={13} /> : <UserPlus size={13} />}
              {following ? 'Following' : 'Follow'}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-gold"
                aria-label="More options"
              >
                <MoreHorizontal size={16} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-xl border border-linesoft bg-card p-1.5 shadow-lg">
                  <button
                    onClick={() => { setShowModeration(true); setShowMenu(false); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12.5px] text-text2 hover:bg-white/5"
                  >
                    <Shield size={14} /> Moderate
                  </button>
                  <button
                    onClick={() => { reportItem({ type: 'user', userId }); showToast('Report submitted'); setShowMenu(false); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12.5px] text-text2 hover:bg-white/5"
                  >
                    <Flag size={14} /> Report
                  </button>
                  <button
                    onClick={() => { blockUser(userId); showToast(isBlocked ? 'User unblocked' : 'User blocked'); setShowMenu(false); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12.5px] text-red hover:bg-white/5"
                  >
                    <Ban size={14} /> {isBlocked ? 'Unblock' : 'Block'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <Avatar src={user.avatar} name={user.name} size={82} className="-mt-10 border-4 border-black" />
          <div className="mt-3 flex items-center gap-1.5 text-[19px] font-extrabold">
            {user.name}
            {user.verified && <VerifiedBadge size={18} />}
          </div>
          <div className="mt-0.5 text-[12.5px] font-semibold text-gold-hi">{user.role}</div>
          <p className="mt-2.5 text-[13px] leading-relaxed text-text2">{user.bio}</p>

          <div className="mt-4 flex border-y border-linesoft">
            <Stat n={user.posts} l="Posts" />
            <Stat n={user.followers} l="Followers" border />
            <Stat n={user.following} l="Following" border />
          </div>

          <BuilderScoreCard builderScore={user.builderScore} />
        </div>
      </div>

      {/* Moderation sheet */}
      {showModeration && (
        <ModerationSheet
          userKey={user.key}
          userName={user.name}
          onClose={() => setShowModeration(false)}
        />
      )}
    </div>
  );
}

function Stat({ n, l, border }) {
  return (
    <div className={`flex-1 py-3.5 text-center ${border ? 'border-l border-linesoft' : ''}`}>
      <div className="text-base font-extrabold">{n}</div>
      <div className="mt-0.5 text-[10.5px] text-text2">{l}</div>
    </div>
  );
}
