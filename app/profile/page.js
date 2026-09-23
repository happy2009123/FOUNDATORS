'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Settings,
  Copy,
  MapPin,
  Globe,
  Users,
  FileText,
  Camera,
  Rocket,
  Sparkles,
  FolderOpen,
  Plus,
  ChevronLeft,
  BadgeCheck,
} from 'lucide-react';
import PostCard from '@/components/PostCard';
import MainScreenShell from '@/components/MainScreenShell';
import Avatar from '@/components/Avatar';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, limit, onSnapshot, doc } from 'firebase/firestore';

const TABS = [
  { key: 'about', label: 'About' },
  { key: 'skills', label: 'Skills' },
  { key: 'projects', label: 'Projects' },
  { key: 'build', label: 'Build With Me' },
  { key: 'posts', label: 'Posts' },
];

function memberYear(ts) {
  if (!ts) return null;
  try {
    if (ts?.toDate) return ts.toDate().getFullYear();
    if (ts?.seconds) return new Date(ts.seconds * 1000).getFullYear();
  } catch {}
  return null;
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const initialTab = TABS.some((t) => t.key === requestedTab) ? requestedTab : 'about';
  const router = useRouter();
  const { vibrate } = useHaptics();

  const profile = useStore((s) => s.profile);
  const posts = useStore((s) => s.posts);
  const showToast = useStore((s) => s.showToast);

  const [tab, setTab] = useState(initialTab);
  const [firestoreProfile, setFirestoreProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [followerCount, setFollowerCount] = useState(profile.followers || 0);
  const [followingCount, setFollowingCount] = useState(profile.following || 0);
  const [copied, setCopied] = useState(false);
  const [postList, setPostList] = useState([]);

  const uid = auth?.currentUser?.uid || profile?.id;

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    setLoadingProfile(true);

    // Snapshot the own user doc so bio/location/website/skills/counters stay live.
    const unsubDoc = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (!cancelled) {
          const d = snap.data();
          if (d) {
            setFirestoreProfile({ id: snap.id, ...d });
            setFollowerCount(typeof d.followers === 'number' ? d.followers : 0);
            setFollowingCount(typeof d.following === 'number' ? d.following : 0);
          }
          setLoadingProfile(false);
        }
      },
      () => {
        if (!cancelled) setLoadingProfile(false);
      }
    );

    const q = query(collection(db, 'posts'), where('authorKey', '==', uid), limit(100));
    const unsubPosts = onSnapshot(q, (snap) => {
      if (!cancelled) setPostList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      cancelled = true;
      try { unsubDoc(); } catch (e) {}
      try { unsubPosts(); } catch (e) {}
    };
  }, [uid]);

  const p = firestoreProfile || profile;

  const ownPosts = useMemo(
    () => posts.filter((p) => p.authorKey === uid),
    [posts, uid]
  );
  const tabPosts = tab === 'posts' ? postList : [];
  const displayPosts = tabPosts.length ? tabPosts : ownPosts;

  function handleCopyUid() {
    if (!uid) return;
    vibrate('light');
    navigator.clipboard?.writeText(uid).then(() => {
      setCopied(true);
      showToast('UID copied');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  const skills = Array.isArray(p?.skills) ? p.skills : [];
  const website = p?.website || '';
  const joined = memberYear(p?.createdAt);

  return (
    <MainScreenShell>
      <div className="no-scrollbar flex-1 overflow-y-auto">
        {/* ─── Top header ─── */}
        <div className="flex flex-none items-center justify-between border-b border-linesoft bg-ink/80 px-3 py-3 backdrop-blur-md">
          <button
            onClick={() => router.push('/home')}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gold-hi"
          >
            <ChevronLeft size={22} strokeWidth={2.4} />
          </button>
          <h1 className="text-[16px] font-extrabold tracking-wide">Profile</h1>
          <button
            onClick={() => router.push('/settings')}
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-gold"
          >
            <Settings size={16} />
          </button>
        </div>

        {/* ─── Cover / banner ─── */}
        <div className="relative h-[118px] flex-none overflow-hidden bg-[radial-gradient(circle_at_85%_15%,rgba(247,221,143,0.35),transparent_55%),linear-gradient(120deg,rgba(184,134,11,0.35),rgba(0,0,0,0.95)_75%)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(184,134,11,0.18),transparent_70%)]" />
          <span className="absolute bottom-3 right-4 font-display text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold/60">
            Foundators
          </span>
        </div>

        <div className="px-4 sm:px-5">
          {/* ─── Avatar + camera ─── */}
          <div className="-mt-11 flex justify-center">
            <div className="relative">
              <div className="rounded-full bg-gradient-to-br from-gold-hi via-gold to-gold-deep p-[3px]">
                <Avatar
                  src={p?.avatar}
                  name={p?.name}
                  size={88}
                  className="border-4 border-ink"
                />
              </div>
              <button
                onClick={() => router.push('/settings/edit-profile')}
                aria-label="Change profile photo"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gold text-[#1a1300] shadow-[0_4px_14px_rgba(184,134,11,0.5)]"
              >
                <Camera size={15} />
              </button>
            </div>
          </div>

          {/* ─── Name & handle ─── */}
          <div className="mt-3 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[22px] font-extrabold leading-tight">
                {p?.name || 'User'}
              </span>
              {p?.verified && (
                <BadgeCheck size={19} className="text-gold" aria-label="Verified" />
              )}
            </div>
            <div className="mt-1 text-[13px] font-bold text-gold-hi">
              {p?.handle || '@user'}
            </div>
            {p?.role && (
              <div className="mt-1 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-text2">
                {p.role}
              </div>
            )}
          </div>

          {/* ─── Bio ─── */}
          {p?.bio ? (
            <p className="mt-3 px-2 text-center text-[13px] leading-relaxed text-text2">
              {p.bio}
            </p>
          ) : (
            <p className="mt-3 px-2 text-center text-[12.5px] leading-relaxed text-text3">
              No bio yet — tell the community what you're building.
            </p>
          )}

          {/* ─── Location / Website ─── */}
          {(p?.location || website) && (
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-text3">
              {p?.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-gold" />
                  {p.location}
                </span>
              )}
              {website && (
                <a
                  href={/^https?:\/\//i.test(website) ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-semibold text-gold-hi"
                >
                  <Globe size={12} className="text-gold" />
                  <span className="max-w-[180px] truncate">{website}</span>
                </a>
              )}
            </div>
          )}

          {/* ─── Edit Profile ─── */}
          <button
            onClick={() => router.push('/settings/edit-profile')}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-[1.3px] border-gold/70 bg-gold/[0.06] py-3 text-[13px] font-extrabold text-gold-hi transition-colors active:scale-[0.98]"
          >
            Edit Profile
          </button>

          {/* ─── Stats ─── */}
          <div className="mt-4 flex overflow-hidden rounded-2xl border border-linesoft bg-card">
            <Stat n={postList.length || ownPosts.length || 0} l="Posts" />
            <Stat n={followerCount} l="Followers" border />
            <Stat n={followingCount} l="Following" border />
          </div>

          {/* ─── UID Card ─── */}
          <div className="mt-4 rounded-2xl border border-linesoft bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-bold text-text2">Unique ID</span>
              <button
                onClick={handleCopyUid}
                className="flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1.5 text-[11px] font-bold text-gold transition-colors hover:bg-gold/20"
              >
                <Copy size={12} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-linesoft bg-white/[0.03] px-3 py-2.5">
              <span className="flex-1 truncate font-mono text-[13px] font-bold tracking-wider text-gold">
                {uid || 'Loading...'}
              </span>
            </div>
            <p className="mt-2 text-[10.5px] text-text3">
              Your permanent Foundators identity. Same on every device.
            </p>
          </div>

          {/* ─── Tabs ─── */}
          <div className="no-scrollbar -mx-4 mt-5 flex gap-1 overflow-x-auto border-b border-linesoft px-4 sm:-mx-5 sm:px-5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative whitespace-nowrap px-3 pb-3 pt-1 text-[12px] font-bold transition-colors ${
                  tab === t.key
                    ? 'text-white after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded after:bg-gold-grad'
                    : 'text-text2'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ─── Tab content ─── */}
          <div className="pb-10 pt-4">
            {tab === 'about' && <AboutSection p={p} joined={joined} website={website} onEdit={() => router.push('/settings/edit-profile')} />}
            {tab === 'skills' && <SkillsSection skills={skills} onEdit={() => router.push('/settings/edit-profile')} />}
            {tab === 'projects' && <ProjectsSection onCreate={() => router.push('/create')} />}
            {tab === 'build' && <BuildWithMeSection onCreate={() => router.push('/create')} />}
            {tab === 'posts' && (
              <div className="flex flex-col gap-4">
                {loadingProfile && displayPosts.length === 0 ? (
                  <div className="space-y-3">
                    <div className="skeleton h-24 w-full rounded-2xl" />
                    <div className="skeleton h-24 w-full rounded-2xl" />
                    <div className="skeleton h-24 w-full rounded-2xl" />
                  </div>
                ) : displayPosts.length ? (
                  displayPosts.map((p) => <PostCard key={p.id} post={p} />)
                ) : (
                  <TabEmpty
                    icon={FileText}
                    title="No posts yet"
                    body="Share an idea, an update, or what you're looking for."
                    action="Create a post"
                    onAction={() => router.push('/create')}
                  />
                )}
              </div>
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
      <div className="mt-0.5 text-[10.5px] uppercase tracking-wide text-text2">{l}</div>
    </div>
  );
}

function TabEmpty({ icon: Icon, title, body, action, onAction }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-linesoft bg-white/[0.02] px-6 py-10 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold">
        <Icon size={24} />
      </div>
      <h3 className="text-[15px] font-extrabold">{title}</h3>
      {body && <p className="mt-1.5 max-w-[250px] text-[12.5px] leading-relaxed text-text2">{body}</p>}
      {action && onAction && (
        <button
          onClick={onAction}
          className="mt-5 flex items-center gap-1.5 rounded-full border-[1.3px] border-gold px-5 py-2.5 text-[12px] font-extrabold text-gold-hi"
        >
          <Plus size={13} />
          {action}
        </button>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value, href }) {
  const inner = (
    <span className="flex items-start gap-3">
      <Icon size={15} className="mt-0.5 flex-none text-gold" />
      <span className="min-w-0 flex-1">
        <span className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-text3">{label}</span>
        <span className={`mt-0.5 block text-[13px] ${value ? 'font-semibold text-white' : 'text-text3'}`}>
          {value || '—'}
        </span>
      </span>
    </span>
  );
  if (href && value) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.03]"
      >
        {inner}
      </a>
    );
  }
  return <div className="block rounded-xl px-3 py-3">{inner}</div>;
}

function AboutSection({ p, joined, website, onEdit }) {
  return (
    <div className="rounded-2xl border border-linesoft bg-card">
      <div className="border-b border-linesoft px-3 py-3">
        <Row icon={FileText} label="About" value={p?.bio || 'Add a bio to tell people who you are and what you build.'} />
      </div>
      {p?.role && (
        <div className="border-b border-linesoft px-3 py-3">
          <Row icon={Users} label="Role" value={p.role} />
        </div>
      )}
      {p?.location && (
        <div className="border-b border-linesoft px-3 py-3">
          <Row icon={MapPin} label="Location" value={p.location} />
        </div>
      )}
      {website && (
        <div className="border-b border-linesoft px-3 py-3">
          <Row
            icon={Globe}
            label="Website"
            value={website}
            href={/^https?:\/\//i.test(website) ? website : `https://${website}`}
          />
        </div>
      )}
      {joined && (
        <div className="border-b border-linesoft px-3 py-3">
          <Row icon={Sparkles} label="Member since" value={String(joined)} />
        </div>
      )}
      <div className="px-3 py-3">
        <button
          onClick={onEdit}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-gold/40 py-2.5 text-[12px] font-extrabold text-gold-hi"
        >
          <Plus size={14} />
          Complete your profile
        </button>
      </div>
    </div>
  );
}

function SkillsSection({ skills, onEdit }) {
  if (!skills.length) {
    return (
      <TabEmpty
        icon={Sparkles}
        title="No skills yet"
        body="Add skills and interests so the right people find you to build with."
        action="Add skills"
        onAction={onEdit}
      />
    );
  }
  return (
    <div className="rounded-2xl border border-linesoft bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-bold text-text2">Skills & Interests</span>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 rounded-full bg-gold/10 px-3 py-1 text-[11px] font-bold text-gold"
        >
          <Plus size={11} />
          Edit
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            key={skill}
            className="rounded-full border border-gold/30 bg-gold/[0.08] px-3 py-1.5 text-[11.5px] font-bold text-gold-hi"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProjectsSection({ onCreate }) {
  return (
    <TabEmpty
      icon={Rocket}
      title="No projects yet"
      body="Projects you create will appear here. Share your current build to attract collaborators."
      action="Share a project"
      onAction={onCreate}
    />
  );
}

function BuildWithMeSection({ onCreate }) {
  return (
    <TabEmpty
      icon={FolderOpen}
      title="No collaborations yet"
      body="Post what you're looking to build and invite others to join you."
      action="Start building"
      onAction={onCreate}
    />
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-linesoft px-4 py-3.5">
        <div className="skeleton h-7 w-7 rounded-full" />
        <div className="skeleton h-5 w-20" />
        <div className="skeleton h-7 w-7 rounded-full" />
      </div>
      <div className="skeleton h-[118px]" />
      <div className="flex justify-center">
        <div className="skeleton -mt-10 h-[88px] w-[88px] rounded-full" />
      </div>
      <div className="mx-auto mt-4 space-y-2">
        <div className="skeleton h-5 w-32" />
        <div className="skeleton h-3 w-36" />
      </div>
      <div className="mx-auto mt-5 w-4/5 space-y-3">
        <div className="skeleton h-10 rounded-2xl" />
        <div className="skeleton h-16 rounded-2xl" />
      </div>
    </div>}>
      <ProfileContent />
    </Suspense>
  );
}