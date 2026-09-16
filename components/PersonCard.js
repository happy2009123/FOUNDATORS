'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Check } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import VerifiedBadge from './VerifiedBadge';

export default memo(function PersonCard({ user, variant = 'card' }) {
  const router = useRouter();
  const { vibrate } = useHaptics();
  const following = useStore((s) => !!s.followedUsers[user.key]);
  const toggleFollowUser = useStore((s) => s.toggleFollowUser);

  function goToProfile() {
    vibrate('light');
    router.push(`/profile/${user.key}`);
  }

  const followBtn = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        vibrate('light');
        toggleFollowUser(user.key);
      }}
      aria-label={following ? `Unfollow ${user.name}` : `Follow ${user.name}`}
      aria-pressed={following}
      className={`flex h-[44px] items-center justify-center gap-1.5 rounded-full border-[1.3px] px-4 text-[12.5px] font-bold ${
        following
          ? 'border-transparent bg-gold-grad text-[#1a1300]'
          : 'border-gold text-gold-hi'
      }`}
    >
      {following ? <Check size={13} /> : <UserPlus size={13} />}
      {following ? 'Following' : 'Follow'}
    </button>
  );

  if (variant === 'row') {
    return (
      <div className="mb-3 flex items-center gap-3.5 rounded-2xl border border-linesoft bg-card p-3.5">
          <img
            src={user.avatar}
            alt={`${user.name}'s avatar`}
            onClick={goToProfile}
            className="h-[52px] w-[52px] flex-none cursor-pointer rounded-full object-cover"
          />
        <div className="min-w-0 flex-1">
          <div onClick={goToProfile} className="flex cursor-pointer items-center gap-1 text-sm font-bold">
            {user.name}
            {user.verified && <VerifiedBadge />}
          </div>
          <div className="text-[11.5px] text-text2">{user.handle}</div>
          <div className="text-[11.5px] text-text2">{user.role}</div>
        </div>
        {followBtn}
      </div>
    );
  }

  return (
    <div className="w-[150px] flex-none rounded-2xl border border-linesoft bg-card px-3.5 py-4 text-center">
      <img
        src={user.avatar}
        alt={`${user.name}'s avatar`}
        onClick={goToProfile}
        className="mx-auto mb-2.5 h-[60px] w-[60px] cursor-pointer rounded-full object-cover"
      />
      <div onClick={goToProfile} className="flex cursor-pointer items-center justify-center gap-1 text-[13.5px] font-bold">
        {user.name}
        {user.verified && <VerifiedBadge size={13} />}
      </div>
      <div className="mb-1.5 text-[11.5px] text-text2">{user.handle}</div>
      <div className="mb-1.5 min-h-[28px] text-[11.5px] leading-tight text-text2">{user.role}</div>
      <div className="mb-2.5 text-[11px] text-text3">{user.followers} followers</div>
      {followBtn}
    </div>
  );
})
