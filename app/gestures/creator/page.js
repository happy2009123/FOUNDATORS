'use client';

import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Star, GitFork, Users, MapPin, CheckCircle, ExternalLink, Code2, Award } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import VerifiedBadge from '@/components/VerifiedBadge';
import AuthSkeleton from '@/components/AuthSkeleton';
import { useStore } from '@/lib/store';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useHaptics } from '@/lib/useHaptics';
import { getPerson } from '@/lib/data';

const CATEGORY_BADGE = {
  hi: 'bg-[rgba(0,200,83,0.12)] text-[#00c853]',
  propose: 'bg-[rgba(233,30,99,0.12)] text-[#e91e63]',
  sorry: 'bg-[rgba(33,150,243,0.12)] text-[#2196f3]',
  birthday: 'bg-[rgba(217,172,61,0.12)] text-[#D9AC3D]',
  thankyou: 'bg-[rgba(156,39,176,0.12)] text-[#9c27b0]',
  missyou: 'bg-[rgba(255,87,34,0.12)] text-[#ff5722]',
  congrats: 'bg-[rgba(76,175,80,0.12)] text-[#4caf50]',
};

const STATUS_BADGE = {
  open: 'bg-[rgba(0,200,83,0.12)] text-[#00c853]',
  closed: 'bg-[rgba(158,158,158,0.12)] text-[#9e9e9e]',
};

function CreatorProfileInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ready = useRequireAuth();
  const { vibrate } = useHaptics();

  const creatorKey = searchParams.get('key') || 'arjun';

  const communityTemplates = useStore((s) => s.communityTemplates);
  const collabGestures = useStore((s) => s.collabGestures);
  const followedCreators = useStore((s) => s.followedCreators);
  const toggleFollowCreator = useStore((s) => s.toggleFollowCreator);
  const getCreatorStats = useStore((s) => s.getCreatorStats);

  const person = getPerson(creatorKey);
  const stats = getCreatorStats(creatorKey);
  const isFollowed = !!followedCreators[creatorKey];

  const templates = useMemo(
    () => communityTemplates.filter((t) => t.authorKey === creatorKey),
    [communityTemplates, creatorKey]
  );

  const collabs = useMemo(
    () => collabGestures.filter((c) => c.ownerKey === creatorKey),
    [collabGestures, creatorKey]
  );

  if (!ready) return <AuthSkeleton />;

  if (!person) {
    return (
      <MainScreenShell>
        <div className="flex flex-1 flex-col items-center justify-center px-[18px]">
          <div className="text-[48px]">👤</div>
          <div className="mt-4 text-[14px] font-extrabold">Creator not found</div>
          <div className="mt-1 text-[11px] text-text2">This profile doesn't exist.</div>
          <button
            onClick={() => router.back()}
            className="mt-5 rounded-full bg-gold-grad px-6 py-2.5 text-[11px] font-black text-[#1a1300]"
          >
            Go Back
          </button>
        </div>
      </MainScreenShell>
    );
  }

  return (
    <MainScreenShell>
      <div className="no-scrollbar pb-6">
        {/* Header */}
        <div className="page-enter px-[18px] pt-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-[16px] font-black">Creator Profile</h1>
          </div>
        </div>

        {/* Profile Card */}
        <div className="px-[18px] mt-4">
          <div className="glass-card p-5">
            <div className="flex items-start gap-4">
              <div className="h-[80px] w-[80px] flex-none overflow-hidden rounded-full border-2 border-[#D9AC3D]">
                <img
                  src={person.avatar}
                  alt={person.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[18px] font-black leading-tight">{person.name}</h2>
                  {person.verified && <VerifiedBadge size={16} />}
                </div>
                <div className="mt-0.5 text-[11px] text-text2">{person.handle}</div>
                <div className="mt-1 text-[11px] text-text2">{person.role}</div>
              </div>
            </div>

            {person.location && (
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-text3">
                <MapPin size={12} />
                {person.location}
              </div>
            )}

            {person.bio && (
              <p className="mt-3 text-[11px] leading-5 text-text2">{person.bio}</p>
            )}

            {person.skills && person.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {person.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-[#D9AC3D]/30 bg-[rgba(217,172,61,0.08)] px-2.5 py-1 text-[9px] font-bold text-[#D9AC3D]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="px-[18px] mt-3">
          <div className="grid grid-cols-4 gap-2">
            <div className="glass-card flex flex-col items-center py-3">
              <Code2 size={14} className="text-gold" />
              <div className="mt-1.5 text-[16px] font-black">{stats.templateCount}</div>
              <div className="mt-0.5 text-[8px] text-text3">Templates</div>
            </div>
            <div className="glass-card flex flex-col items-center py-3">
              <Star size={14} className="text-[#D9AC3D]" />
              <div className="mt-1.5 text-[16px] font-black">{stats.totalStars}</div>
              <div className="mt-0.5 text-[8px] text-text3">Stars</div>
            </div>
            <div className="glass-card flex flex-col items-center py-3">
              <GitFork size={14} className="text-text3" />
              <div className="mt-1.5 text-[16px] font-black">{stats.totalForks}</div>
              <div className="mt-0.5 text-[8px] text-text3">Forks</div>
            </div>
            <div className="glass-card flex flex-col items-center py-3">
              <Users size={14} className="text-text3" />
              <div className="mt-1.5 text-[16px] font-black">{stats.collabCount}</div>
              <div className="mt-0.5 text-[8px] text-text3">Collabs</div>
            </div>
          </div>
        </div>

        {/* Follow Button */}
        <div className="px-[18px] mt-4">
          <button
            onClick={() => { vibrate('light'); toggleFollowCreator(creatorKey); }}
            className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-[12px] font-black transition-all ${
              isFollowed
                ? 'border border-[#D9AC3D] bg-transparent text-[#D9AC3D]'
                : 'bg-gold-grad text-[#1a1300]'
            }`}
          >
            {isFollowed ? (
              <>
                <CheckCircle size={14} />
                Following
              </>
            ) : (
              <>
                <Users size={14} />
                Follow
              </>
            )}
          </button>
        </div>

        {/* Templates Section */}
        <div className="px-[18px] mt-6">
          <h3 className="text-[14px] font-black">
            Templates by {person.name}
          </h3>

          {templates.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="text-[40px]">🧩</div>
              <div className="mt-3 text-[12px] font-extrabold">No templates yet</div>
              <div className="mt-1 text-[10px] text-text2">This creator hasn't published any templates.</div>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { vibrate('light'); router.push(`/gestures/community/detail?id=${t.id}`); }}
                  className="glass-card overflow-hidden text-left"
                >
                  <div className="px-3 pt-3 pb-2">
                    <div className="text-[12px] font-extrabold leading-tight">{t.name}</div>
                    <div className="mt-1 text-[10px] leading-4 text-text2 line-clamp-2">{t.description}</div>
                  </div>
                  <div className="border-t border-linesoft px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center gap-1 text-[10px] text-text3">
                          <Star size={11} className="text-[#D9AC3D]" /> {t.stars}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-text3">
                          <GitFork size={11} /> {t.forks}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[8px] font-bold ${CATEGORY_BADGE[t.category] || 'bg-white/5 text-text3'}`}
                      >
                        {t.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center border-t border-linesoft py-2 text-[10px] font-bold text-gold">
                    <ExternalLink size={11} className="mr-1" /> View
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Collaborations Section */}
        {collabs.length > 0 && (
          <div className="px-[18px] mt-6">
            <h3 className="text-[14px] font-black">Collaborations</h3>
            <div className="mt-3 flex flex-col gap-2">
              {collabs.map((c) => (
                <div key={c.id} className="glass-card p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-extrabold leading-tight">{c.title}</div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-text3">
                        <Users size={11} />
                        {c.signatures.length} signatures
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[8px] font-bold ${
                        c.isOpen ? STATUS_BADGE.open : STATUS_BADGE.closed
                      }`}
                    >
                      {c.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {collabs.length === 0 && (
          <div className="px-[18px] mt-6">
            <h3 className="text-[14px] font-black">Collaborations</h3>
            <div className="flex flex-col items-center py-12 text-center">
              <div className="text-[40px]">🤝</div>
              <div className="mt-3 text-[12px] font-extrabold">No collaborations yet</div>
              <div className="mt-1 text-[10px] text-text2">This creator hasn't started any collabs.</div>
            </div>
          </div>
        )}
      </div>
    </MainScreenShell>
  );
}

export default function CreatorProfilePage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <CreatorProfileInner />
    </Suspense>
  );
}
