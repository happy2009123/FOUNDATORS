'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Share2, Copy, MapPin, Briefcase, Users, FileText, Settings, Loader2 } from 'lucide-react';
import PostCard from '@/components/PostCard';
import MainScreenShell from '@/components/MainScreenShell';
import VerifiedBadge from '@/components/VerifiedBadge';
import Avatar from '@/components/Avatar';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';

const TABS = [
  { key: 'posts', label: 'Posts' },
  { key: 'idea', label: 'Ideas' },
  { key: 'update', label: 'Updates' },
  { key: 'saved', label: 'Saved' },
];

function ProfileContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'saved' ? 'saved' : 'posts';
  const router = useRouter();
  const { vibrate } = useHaptics();

  const profile = useStore((s) => s.profile);
  const posts = useStore((s) => s.posts);
  const bookmarkedPosts = useStore((s) => s.bookmarkedPosts);
  const showToast = useStore((s) => s.showToast);

  const [tab, setTab] = useState(initialTab);
  const [firestoreProfile, setFirestoreProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [postCount, setPostCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const uid = auth?.currentUser?.uid || profile?.id;

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    setLoadingProfile(true);

    getDoc(doc(db, 'users', uid)).then((snap) => {
      if (!cancelled && snap.exists()) {
        setFirestoreProfile({ id: snap.id, ...snap.data() });
      }
      setLoadingProfile(false);
    }).catch(() => {
      if (!cancelled) setLoadingProfile(false);
    });

    return () => { cancelled = true; };
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const unsubs = [];

    const postsQ = query(collection(db, 'posts'), where('authorKey', '==', uid));
    unsubs.push(onSnapshot(postsQ, (snap) => {
      if (!snap.empty) setPostCount(snap.size);
    }));

    unsubs.push(onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setFollowerCount(d.followers || 0);
        setFollowingCount(d.following || 0);
      }
    }));

    return () => unsubs.forEach((u) => { try { u(); } catch (e) {} });
  }, [uid]);

  const p = firestoreProfile || profile;

  const ownPosts = useMemo(() => posts.filter((p) => p.authorKey === uid), [posts, uid]);
  const filteredOwn = useMemo(() => {
    if (tab === 'posts' || tab === 'saved') return ownPosts;
    return ownPosts.filter((p) => p.tagType === tab);
  }, [ownPosts, tab]);

  const savedPosts = useMemo(() => posts.filter((p) => bookmarkedPosts[p.id]), [posts, bookmarkedPosts]);

  function handleCopyUid() {
    if (!uid) return;
    vibrate('light');
    navigator.clipboard?.writeText(uid).then(() => {
      setCopied(true);
      showToast('UID copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <MainScreenShell>
      <div className="no-scrollbar flex-1 overflow-y-auto">
        {/* Cover */}
        <div className="h-[100px] flex-none bg-[radial-gradient(circle_at_85%_15%,rgba(247,221,143,0.35),transparent_55%),linear-gradient(120deg,rgba(184,134,11,0.35),rgba(0,0,0,0.95)_75%)]" />

        <div className="-mt-[36px] px-4 sm:px-5">
          {/* Actions row */}
          <div className="flex justify-end gap-2 pt-3">
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
              onClick={() => router.push('/settings/edit-profile')}
              className="rounded-full border-[1.3px] border-gold px-4 py-2 text-[12px] font-bold text-gold-hi"
            >
              Edit Profile
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-gold"
            >
              <Settings size={16} />
            </button>
          </div>

          {/* Avatar */}
          <div className="flex justify-center">
            <Avatar src={p?.avatar} name={p?.name} size={86} className="-mt-11 border-4 border-black" />
          </div>

          {/* Name & Handle */}
          <div className="mt-3 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[20px] font-extrabold leading-tight">{p?.name || 'User'}</span>
              {p?.verified && <VerifiedBadge size={18} />}
            </div>
            <div className="mt-0.5 text-[13px] font-semibold text-gold-hi">{p?.role || 'Founder'}</div>
            {p?.handle && (
              <div className="mt-0.5 text-[12px] text-text3">{p.handle}</div>
            )}
          </div>

          {/* Bio */}
          {p?.bio && (
            <p className="mt-3 text-[13px] leading-relaxed text-text2 text-center px-2">{p.bio}</p>
          )}

          {/* Location */}
          {p?.location && (
            <div className="mt-2 flex items-center justify-center gap-1 text-[12px] text-text3">
              <MapPin size={12} />
              {p.location}
            </div>
          )}

          {/* Stats */}
          <div className="mt-4 flex rounded-2xl border border-linesoft bg-card overflow-hidden">
            <Stat n={postCount || p?.postsCount || ownPosts.length} l="Posts" />
            <Stat n={followerCount || p?.followers || 0} l="Followers" border />
            <Stat n={followingCount || p?.following || 0} l="Following" border />
          </div>

          {/* UID Card */}
          <div className="mt-4 rounded-2xl border border-linesoft bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold text-text2">Unique ID</span>
              <button
                onClick={handleCopyUid}
                className="flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1.5 text-[11px] font-bold text-gold transition-colors hover:bg-gold/20"
              >
                <Copy size={12} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] border border-linesoft px-3 py-2.5">
              <span className="font-mono text-[13px] font-bold text-gold tracking-wider truncate flex-1">
                {uid || 'Loading...'}
              </span>
            </div>
          </div>

          {/* Skills */}
          {p?.skills && p.skills.length > 0 && (
            <div className="mt-4 rounded-2xl border border-linesoft bg-card p-4">
              <span className="text-[12px] font-bold text-text2">Skills</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-gold/10 px-3 py-1 text-[11px] font-bold text-gold-hi">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="mt-5 flex gap-5 border-b border-linesoft text-sm font-bold text-text2">
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

          {/* Posts */}
          <div className="flex flex-col gap-4 pb-8 pt-4">
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
