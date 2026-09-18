'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Share2 } from 'lucide-react';
import PostCard from '@/components/PostCard';
import MainScreenShell from '@/components/MainScreenShell';
import VerifiedBadge from '@/components/VerifiedBadge';
import BuilderScoreCard from '@/components/BuilderScoreCard';
import Avatar from '@/components/Avatar';
import { useStore } from '@/lib/store';

const TABS = [
  { key: 'posts', label: 'Posts' },
  { key: 'idea', label: 'Ideas' },
  { key: 'update', label: 'Updates' },
  { key: 'saved', label: 'Saved' },
];

function ProfileContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'saved' ? 'saved' : 'posts';

  const profile = useStore((s) => s.profile);
  const updateBio = useStore((s) => s.updateBio);
  const posts = useStore((s) => s.posts);
  const bookmarkedPosts = useStore((s) => s.bookmarkedPosts);
  const showToast = useStore((s) => s.showToast);

  const [tab, setTab] = useState(initialTab);
  const [editing, setEditing] = useState(false);
  const [bioDraft, setBioDraft] = useState(profile.bio);

  const ownPosts = useMemo(() => posts.filter((p) => p.authorKey === profile?.id), [posts]);
  const filteredOwn = useMemo(() => {
    if (tab === 'posts' || tab === 'saved') return ownPosts;
    return ownPosts.filter((p) => p.tagType === tab);
  }, [ownPosts, tab]);

  const savedPosts = useMemo(() => posts.filter((p) => bookmarkedPosts[p.id]), [posts, bookmarkedPosts]);

  function saveBio() {
    updateBio(bioDraft.trim() || profile.bio);
    setEditing(false);
    showToast('Profile updated');
  }

  function handleEditClick() {
    if (editing) {
      saveBio();
    } else {
      setBioDraft(profile.bio);
      setEditing(true);
    }
  }

  return (
    <MainScreenShell>
      <div className="no-scrollbar">
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
              onClick={handleEditClick}
              className="rounded-full border-[1.3px] border-gold px-[18px] py-2 text-[12.5px] font-bold text-gold-hi"
            >
              {editing ? 'Save' : 'Edit Profile'}
            </button>
          </div>

          <Avatar src={profile.avatar} name={profile.name} size={82} className="-mt-10 border-4 border-black" />
          <div className="mt-3 flex items-center gap-1.5 text-[19px] font-extrabold">
            {profile.name}
            {profile.verified && <VerifiedBadge size={18} />}
          </div>
          <div className="mt-0.5 text-[12.5px] font-semibold text-gold-hi">{profile.role}</div>

          {editing ? (
            <textarea
              value={bioDraft}
              onChange={(e) => setBioDraft(e.target.value)}
              className="mt-2.5 min-h-[80px] w-full rounded-2xl border border-linesoft bg-card p-3.5 text-sm text-white focus:border-gold focus:outline-none"
            />
          ) : (
            <p className="mt-2.5 text-[13px] leading-relaxed text-text2">{profile.bio}</p>
          )}

          <div className="mt-4 flex border-y border-linesoft">
            <Stat n={profile.posts} l="Posts" />
            <Stat n={profile.followers} l="Followers" border />
            <Stat n={profile.following} l="Following" border />
          </div>

          <BuilderScoreCard builderScore={profile.builderScore} />
        </div>

        <div className="flex items-center gap-[22px] px-[18px] pb-3.5 pt-3.5 text-sm font-bold text-text2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative whitespace-nowrap pb-3 ${
                tab === t.key ? "text-white after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded after:bg-gold-grad" : ''
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 px-[18px] pb-8">
          {tab === 'saved' ? (
            savedPosts.length ? (
              savedPosts.map((p) => <PostCard key={p.id} post={p} />)
            ) : (
              <p className="py-10 text-center text-[12.5px] text-text2">
                Nothing saved yet — tap the bookmark icon on any post to save it here.
              </p>
            )
          ) : filteredOwn.length ? (
            filteredOwn.map((p) => <PostCard key={p.id} post={p} />)
          ) : (
            <p className="py-10 text-center text-[12.5px] text-text2">No posts here yet.</p>
          )}
        </div>
      </div>
    </MainScreenShell>
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

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <ProfileContent />
    </Suspense>
  );
}
