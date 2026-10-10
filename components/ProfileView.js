'use client';

import { useMemo, useState, useEffect } from 'react';
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
  Share2,
  UserPlus,
  Check,
  Flag,
  Ban,
  MoreHorizontal,
  Shield,
  Mic,
  Award,
} from 'lucide-react';
import PostCard from '@/components/PostCard';
import MainScreenShell from '@/components/MainScreenShell';
import Avatar from '@/components/Avatar';
import ModerationSheet from '@/components/ModerationSheet';
import FoundingBadge from '@/components/FoundingBadge';
import BuilderScoreCard from '@/components/BuilderScoreCard';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { subscribeToUserProfile } from '@/lib/firestore';
import { getSupabase } from '@/lib/supabase/client';
import { subscribeQuery } from '@/lib/supabase/realtime';
import { mapRows } from '@/lib/supabase/db';
import { listMyProjects } from '@/lib/copilot';
import { fetchHostRooms } from '@/lib/voice';
import VoiceRoomCard from '@/components/voice/VoiceRoomCard';

const TABS = [
  { key: 'about', label: 'About' },
  { key: 'skills', label: 'Skills' },
  { key: 'projects', label: 'Projects' },
  { key: 'build', label: 'Build With Me' },
  { key: 'voice', label: 'Voice' },
  { key: 'achievements', label: 'Achievements' },
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

export default function ProfileView({ userId = null }) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const initialTab = TABS.some((t) => t.key === requestedTab) ? requestedTab : 'about';
  const router = useRouter();
  const { vibrate, notification } = useHaptics();

  const profile = useStore((s) => s.profile);
  const posts = useStore((s) => s.posts);
  const showToast = useStore((s) => s.showToast);
  const following = useStore((s) => !!s.followedUsers[userId]);
  const toggleFollowUser = useStore((s) => s.toggleFollowUser);
  const ensureContactForUser = useStore((s) => s.ensureContactForUser);
  const blockUser = useStore((s) => s.blockUser);
  const reportItem = useStore((s) => s.reportItem);
  const blockedUsers = useStore((s) => s.blockedUsers);
  const isBlocked = !!blockedUsers[userId];

  const ownUid = profile?.id;
  const isOwn = !userId || userId === ownUid;
  const targetId = isOwn ? ownUid : userId;

  const [tab, setTab] = useState(initialTab);
  const [firestoreProfile, setFirestoreProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followerCount, setFollowerCount] = useState(isOwn ? profile?.followers || 0 : 0);
  const [followingCount, setFollowingCount] = useState(isOwn ? profile?.following || 0 : 0);
  const [copied, setCopied] = useState(false);
  const [postList, setPostList] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showModeration, setShowModeration] = useState(false);

  const uid = targetId;

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    setLoadingProfile(true);
    setNotFound(false);

    // Live profile subscription so bio/location/website/skills/counters
    // stay current for both the signed-in user and anyone viewing their profile.
    const unsubProfile = subscribeToUserProfile(uid, (row) => {
      if (cancelled) return;
      if (row) {
        setFirestoreProfile(row);
        setFollowerCount(typeof row.followers === 'number' ? row.followers : 0);
        setFollowingCount(typeof row.following === 'number' ? row.following : 0);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
      setLoadingProfile(false);
    });

    const unsubPosts = subscribeQuery({
      key: `profile-posts:${uid}`,
      table: 'posts',
      filter: `author_key=eq.${uid}`,
      queryFn: async () => {
        const { data, error } = await getSupabase()
          .from('posts')
          .select('*')
          .eq('author_key', uid)
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        return mapRows(data);
      },
      onData: (rows) => {
        if (!cancelled) setPostList(rows);
      },
    });

    return () => {
      cancelled = true;
      try { unsubProfile(); } catch (e) {}
      try { unsubPosts(); } catch (e) {}
    };
  }, [uid]);

  const p = firestoreProfile || (isOwn ? profile : null);

  const feedPosts = useMemo(
    () => posts.filter((post) => post.authorKey === uid),
    [posts, uid]
  );
  const tabPosts = tab === 'posts' ? postList : [];
  const displayPosts = tabPosts.length ? tabPosts : feedPosts;

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/home');
  }

  function handleMessage() {
    const key = ensureContactForUser(p?.id || uid, p);
    router.push(`/messages/${key}`);
  }

  function handleShare() {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    showToast('Profile link copied');
  }

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

  if (!isOwn && loadingProfile) {
    return (
      <MainScreenShell>
        <div className="flex min-h-[60vh] flex-col">
          <ProfileHeader title="Profile" onBack={goBack} />
          <div className="flex flex-1 items-center justify-center text-sm text-text3">
            Loading profile...
          </div>
        </div>
      </MainScreenShell>
    );
  }
  if (!isOwn && (notFound || !p)) {
    return (
      <MainScreenShell>
        <div className="flex min-h-[60vh] flex-col">
          <ProfileHeader title="Profile" onBack={goBack} />
          <div className="flex flex-1 items-center justify-center text-sm text-text2">
            User not found.
          </div>
        </div>
      </MainScreenShell>
    );
  }

  return (
    <MainScreenShell>
      <div className="no-scrollbar flex-1 overflow-y-auto">
        {/* ─── Top header ─── */}
        <ProfileHeader
          title={isOwn ? 'Profile' : p?.handle || p?.name || 'Profile'}
          onBack={isOwn ? () => router.push('/home') : goBack}
        >
          {isOwn ? (
            <button
              onClick={() => router.push('/settings')}
              aria-label="Settings"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-gold"
            >
              <Settings size={16} />
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                aria-label="More options"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-gold"
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
                    onClick={() => { reportItem({ type: 'user', userId: uid }); showToast('Report submitted'); setShowMenu(false); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12.5px] text-text2 hover:bg-white/5"
                  >
                    <Flag size={14} /> Report
                  </button>
                  <button
                    onClick={() => { blockUser(uid); showToast(isBlocked ? 'User unblocked' : 'User blocked'); setShowMenu(false); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12.5px] text-brandred hover:bg-white/5"
                  >
                    <Ban size={14} /> {isBlocked ? 'Unblock' : 'Block'}
                  </button>
                </div>
              )}
            </div>
          )}
        </ProfileHeader>

        {/* ─── Cover / banner ─── */}
        <div className="relative h-[118px] flex-none overflow-hidden bg-[radial-gradient(circle_at_85%_15%,rgba(247,221,143,0.35),transparent_55%),linear-gradient(120deg,rgba(184,134,11,0.35),rgba(0,0,0,0.95)_75%)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(184,134,11,0.18),transparent_70%)]" />
          <span className="absolute bottom-3 right-4 font-display text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold/60">
            Foundators
          </span>
        </div>

        <div className="px-4 sm:px-5">
          {/* ─── Avatar + camera (own only) ─── */}
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
              {isOwn && (
                <button
                  onClick={() => router.push('/settings/edit-profile')}
                  aria-label="Change profile photo"
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gold text-[#1a1300] shadow-[0_4px_14px_rgba(184,134,11,0.5)]"
                >
                  <Camera size={15} />
                </button>
              )}
            </div>
          </div>

          {/* ─── Name & handle ─── */}
          <div className="mt-3 text-center">
            <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
              <span className="text-[22px] font-extrabold leading-tight">
                {p?.name || 'User'}
              </span>
              {p?.verified && (
                <BadgeCheck size={19} className="text-gold" aria-label="Verified" />
              )}
              {p?.foundingNumber ? (
                <FoundingBadge
                  number={p.foundingNumber}
                  onClick={() => router.push('/founding-100')}
                />
              ) : null}
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
              {isOwn ? "No bio yet — tell the community what you're building." : 'No bio yet.'}
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

          {/* ─── Edit Profile (own) / Share · Message · Follow (others) ─── */}
          {isOwn ? (
            <button
              onClick={() => router.push('/settings/edit-profile')}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-[1.3px] border-gold/70 bg-gold/[0.06] py-3 text-[13px] font-extrabold text-gold-hi transition-colors active:scale-[0.98]"
            >
              Edit Profile
            </button>
          ) : (
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={handleShare}
                aria-label="Copy profile link"
                className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl border border-line text-gold"
              >
                <Share2 size={16} />
              </button>
              <button
                onClick={handleMessage}
                className="flex-1 rounded-2xl border-[1.3px] border-gold py-3 text-[13px] font-extrabold text-gold-hi"
              >
                Message
              </button>
              <button
                onClick={() => { toggleFollowUser(uid); following ? vibrate('light') : notification('success'); }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl border-[1.3px] py-3 text-[13px] font-extrabold ${
                  following ? 'border-transparent bg-gold-grad text-[#1a1300]' : 'border-gold text-gold-hi'
                }`}
              >
                {following ? <Check size={14} /> : <UserPlus size={14} />}
                {following ? 'Following' : 'Follow'}
              </button>
            </div>
          )}

          {/* ─── Stats (tap Posts → posts tab, Followers/Following → lists) ─── */}
          <div className="mt-4 flex overflow-hidden rounded-2xl border border-linesoft bg-card">
            <Stat n={postList.length || feedPosts.length || 0} l="Posts" onClick={() => setTab('posts')} />
            <Stat
              n={followerCount}
              l="Followers"
              border
              onClick={() => { if (uid) router.push(`/profile/${uid}/followers`); }}
            />
            <Stat
              n={followingCount}
              l="Following"
              border
              onClick={() => { if (uid) router.push(`/profile/${uid}/followers?tab=following`); }}
            />
          </div>

          {/* ─── Builder Score (computed from real activity, never stored) ─── */}
          {uid ? <BuilderScoreCard uid={uid} profile={p} /> : null}

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
              {isOwn
                ? 'Your permanent Foundators identity. Same on every device.'
                : 'Permanent Foundators identity. Same on every device.'}
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
            {tab === 'about' && (
              <AboutSection
                p={p}
                joined={joined}
                website={website}
                isOwn={isOwn}
                onEdit={() => router.push('/settings/edit-profile')}
              />
            )}
            {tab === 'skills' && (
              <SkillsSection skills={skills} isOwn={isOwn} onEdit={() => router.push('/settings/edit-profile')} />
            )}
        {tab === 'projects' && <ProjectsSection uid={uid} isOwn={isOwn} onCreate={() => router.push('/projects/new')} />}
        {tab === 'build' && <BuildWithMeSection uid={uid} isOwn={isOwn} onCreate={() => router.push('/create')} />}
            {tab === 'voice' && <VoiceSection uid={uid} isOwn={isOwn} />}
            {tab === 'achievements' && <AchievementsSection uid={uid} isOwn={isOwn} />}
            {tab === 'posts' && (
              <div className="flex flex-col gap-4">
                {loadingProfile && displayPosts.length === 0 ? (
                  <div className="space-y-3">
                    <div className="skeleton h-24 w-full rounded-2xl" />
                    <div className="skeleton h-24 w-full rounded-2xl" />
                    <div className="skeleton h-24 w-full rounded-2xl" />
                  </div>
                ) : displayPosts.length ? (
                  displayPosts.map((post) => <PostCard key={post.id} post={post} />)
                ) : isOwn ? (
                  <TabEmpty
                    icon={FileText}
                    title="No posts yet"
                    body="Share an idea, an update, or what you're looking for."
                    action="Create a post"
                    onAction={() => router.push('/create')}
                  />
                ) : (
                  <TabEmpty
                    icon={FileText}
                    title="No posts yet"
                    body="They haven't posted anything yet."
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModeration && p && (
        <ModerationSheet
          userKey={p.id || uid}
          userName={p.name}
          onClose={() => setShowModeration(false)}
        />
      )}
    </MainScreenShell>
  );
}

function ProfileHeader({ title, onBack, children }) {
  return (
    <div className="flex flex-none items-center justify-between border-b border-linesoft bg-ink/80 px-3 py-3 backdrop-blur-md">
      <button
        onClick={onBack}
        aria-label="Back"
        className="flex h-9 w-9 items-center justify-center rounded-full text-gold-hi"
      >
        <ChevronLeft size={22} strokeWidth={2.4} />
      </button>
      <h1 className="text-[16px] font-extrabold tracking-wide">{title}</h1>
      {children || <div className="h-9 w-9" />}
    </div>
  );
}

function Stat({ n, l, border, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 cursor-pointer py-3.5 text-center transition-colors hover:bg-white/[0.04] active:bg-white/[0.07] ${border ? 'border-l border-linesoft' : ''}`}
    >
      <div className="text-base font-extrabold">{n}</div>
      <div className="mt-0.5 text-[10.5px] uppercase tracking-wide text-text2">{l}</div>
    </button>
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

function AboutSection({ p, joined, website, isOwn, onEdit }) {
  return (
    <div className="rounded-2xl border border-linesoft bg-card">
      <div className="border-b border-linesoft px-3 py-3">
        <Row
          icon={FileText}
          label="About"
          value={p?.bio || (isOwn ? 'Add a bio to tell people who you are and what you build.' : 'No bio yet.')}
        />
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
      {isOwn && (
        <div className="px-3 py-3">
          <button
            onClick={onEdit}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gold/40 py-2.5 text-[12px] font-extrabold text-gold-hi"
          >
            <Plus size={14} />
            Complete your profile
          </button>
        </div>
      )}
    </div>
  );
}

function SkillsSection({ skills, isOwn, onEdit }) {
  if (!skills.length) {
    return (
      <TabEmpty
        icon={Sparkles}
        title="No skills yet"
        body={isOwn ? 'Add skills and interests so the right people find you to build with.' : "They haven't added skills yet."}
        action={isOwn ? 'Add skills' : null}
        onAction={isOwn ? onEdit : null}
      />
    );
  }
  return (
    <div className="rounded-2xl border border-linesoft bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-bold text-text2">Skills & Interests</span>
        {isOwn && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1 rounded-full bg-gold/10 px-3 py-1 text-[11px] font-bold text-gold"
          >
            <Plus size={11} />
            Edit
          </button>
        )}
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

function ProjectsSection({ uid, isOwn, onCreate }) {
  const router = useRouter();
  const [items, setItems] = useState(undefined);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      return undefined;
    }
    let on = true;
    const supabase = getSupabase();
    Promise.all([
      listMyProjects(uid).catch(() => []),
      supabase
        ? supabase
            .from('projects')
            .select('*')
            .contains('members', [uid])
            .limit(30)
        : Promise.resolve(null),
    ])
      .then(async ([owned, memberRes]) => {
        if (!on) return;
        const ownedList = (owned || []).map((p) => ({ ...p, _role: 'owner' }));
        const ownedIds = new Set(ownedList.map((p) => p.id));
        const teamRows = mapRows(memberRes?.data || []).filter((d) => !ownedIds.has(d.id));
        const stats = {};
        if (teamRows.length && supabase) {
          const { data: taskRows } = await supabase
            .from('project_tasks')
            .select('project_id, status')
            .in('project_id', teamRows.map((r) => r.id));
          for (const t of taskRows || []) {
            const s = stats[t.project_id] || { total: 0, done: 0 };
            s.total += 1;
            if (t.status === 'done') s.done += 1;
            stats[t.project_id] = s;
          }
        }
        if (!on) return;
        const joined = teamRows.map((r) => {
          const s = stats[r.id] || { total: 0, done: 0 };
          return {
            ...r,
            name: r.title || '',
            _role: 'team',
            tasksTotal: s.total,
            tasksDone: s.done,
            progress: s.total ? Math.round((s.done / s.total) * 100) : 0,
          };
        });
        setItems([...ownedList, ...joined]);
      })
      .catch(() => {
        if (on) setItems([]);
      });
    return () => {
      on = false;
    };
  }, [uid]);

  if (items === undefined) {
    return <div className="px-4 py-6 text-center text-[12px] text-text3">Loading projects…</div>;
  }

  if (!items.length) {
    if (!isOwn) {
      return (
        <TabEmpty
          icon={Rocket}
          title="No projects yet"
          body="They haven't shared any projects yet."
        />
      );
    }
    return (
      <TabEmpty
        icon={Rocket}
        title="No projects yet"
        body="Projects you create will appear here. Share your current build to attract collaborators."
        action="Create a project"
        onAction={onCreate}
      />
    );
  }

  return (
    <div className="space-y-3 px-4 py-4">
      {items.map((p) => (
        <button
          key={p.id}
          onClick={() => router.push(`/projects/${p.id}`)}
          className="gold-card w-full p-4 text-left"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[14px] font-extrabold text-text1">{p.name}</span>
            <span className="shrink-0 rounded-full border border-line px-2 py-1 text-[9px] font-bold text-gold">
              {p._role === 'owner' ? 'Owner' : 'Team'} · {p.stage || 'Building'}
            </span>
          </div>
          {p.description ? <div className="mt-1 text-[11.5px] text-text2">{p.description}</div> : null}
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-gold-grad" style={{ width: `${p.progress || 0}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-text3">
            <span>{p.progress || 0}% complete</span>
            <span>
              {p.tasksDone || 0}/{p.tasksTotal || 0} tasks
            </span>
          </div>
        </button>
      ))}
      {isOwn ? (
        <button
          onClick={onCreate}
          className="w-full rounded-xl border border-line py-2.5 text-[11.5px] font-bold text-gold-hi"
        >
          Create a project
        </button>
      ) : null}
    </div>
  );
}

function BuildWithMeSection({ uid, isOwn, onCreate }) {
  const [items, setItems] = useState(undefined);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      return undefined;
    }
    let on = true;
    const supabase = getSupabase();
    if (!supabase) {
      setItems([]);
      return () => { on = false; };
    }
    supabase
      .from('posts')
      .select('*')
      .eq('author_key', uid)
      .eq('tag_type', 'cofounder')
      .limit(20)
      .then(({ data }) => {
        if (on) setItems(mapRows(data));
      })
      .catch(() => {
        if (on) setItems([]);
      });
    return () => {
      on = false;
    };
  }, [uid]);

  if (items === undefined) {
    return <div className="px-4 py-6 text-center text-[12px] text-text3">Loading posts…</div>;
  }

  if (!items.length) {
    if (!isOwn) {
      return (
        <TabEmpty
          icon={FolderOpen}
          title="No collaborations yet"
          body="They haven't posted any collaborations yet."
        />
      );
    }
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

  return (
    <div className="space-y-3 px-4 py-4">
      {items.map((post) => {
        const when =
          post.createdAt && post.createdAt.toDate
            ? post.createdAt.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })
            : '';
        return (
          <div key={post.id} className="gold-card p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-gold-hi">
                <Users size={11} /> Build With Me
              </span>
              <span className="text-[10px] text-text3">{when}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-text1">
              {String(post.text || '').slice(0, 400)}
            </p>
          </div>
        );
      })}
      {isOwn ? (
        <button
          onClick={onCreate}
          className="w-full rounded-xl border border-line py-2.5 text-[11.5px] font-bold text-gold-hi"
        >
          Post a new collaboration
        </button>
      ) : null}
    </div>
  );
}

function VoiceSection({ uid, isOwn }) {
  const router = useRouter();
  const [rooms, setRooms] = useState(undefined);

  useEffect(() => {
    if (!uid) {
      setRooms([]);
      return () => {};
    }
    let dead = false;
    fetchHostRooms(uid)
      .then((r) => { if (!dead) setRooms(r); })
      .catch(() => { if (!dead) setRooms([]); });
    return () => { dead = true; };
  }, [uid]);

  if (rooms === undefined) {
    return (
      <div className="space-y-3 px-4 py-6">
        <div className="skeleton h-24 w-full rounded-2xl" />
        <div className="skeleton h-24 w-full rounded-2xl" />
      </div>
    );
  }

  const live = rooms.filter((r) => r.status === 'live');
  const upcoming = rooms
    .filter((r) => r.status === 'scheduled')
    .sort((a, b) => (a.scheduledAtMs || 0) - (b.scheduledAtMs || 0));
  const past = rooms
    .filter((r) => r.status === 'ended')
    .sort((a, b) => (b.endedAtMs || 0) - (a.endedAtMs || 0));
  const shown = [...live, ...upcoming, ...past.slice(0, 4)];

  if (!shown.length) {
    return (
      <TabEmpty
        icon={Mic}
        title={isOwn ? 'No voice rooms yet' : 'No voice rooms yet'}
        body={
          isOwn
            ? 'Host a live room to talk with founders in real time. Your sessions show up here.'
            : 'They have not hosted any voice rooms yet.'
        }
        action={isOwn ? 'Start a room' : undefined}
        onAction={isOwn ? () => router.push('/voice/create') : undefined}
      />
    );
  }

  return (
    <div className="space-y-3 px-4 py-4">
      {shown.map((room) => (
        <VoiceRoomCard
          key={room.roomId}
          room={room}
          onJoin={(r) => router.push(`/voice/room/${r.roomId}`)}
        />
      ))}
      {isOwn ? (
        <button
          onClick={() => router.push('/voice/create')}
          className="w-full rounded-xl border border-line py-2.5 text-[11.5px] font-bold text-gold-hi"
        >
          Start a voice room
        </button>
      ) : null}
    </div>
  );
}

function AchievementsSection({ uid, isOwn }) {
  const router = useRouter();
  const [items, setItems] = useState(undefined);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      return undefined;
    }
    let on = true;
    const supabase = getSupabase();
    if (!supabase) {
      setItems([]);
      return () => { on = false; };
    }
    supabase
      .from('achievements')
      .select('*')
      .eq('user_id', uid)
      .order('earned_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (on) setItems(mapRows(data));
      })
      .catch(() => {
        if (on) setItems([]);
      });
    return () => {
      on = false;
    };
  }, [uid]);

  if (items === undefined) {
    return <div className="px-4 py-6 text-center text-[12px] text-text3">Loading achievements…</div>;
  }

  if (!items.length) {
    return (
      <TabEmpty
        icon={Award}
        title="No achievements yet"
        body="Achievements are earned by completing Founder Challenges — real, permanent records of finished work, never self-assigned."
        action={isOwn ? 'Browse challenges' : undefined}
        onAction={isOwn ? () => router.push('/challenges') : undefined}
      />
    );
  }

  return (
    <div className="space-y-2.5 px-4 py-4">
      {items.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-3 rounded-2xl border border-gold/25 bg-gold/[0.04] px-4 py-3"
        >
          <Award size={18} className="flex-none text-gold" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-extrabold">{a.title}</div>
            <div className="text-[11px] text-text3">{a.source || 'achievement'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
