'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Briefcase, Heart, Link2, Loader2, MapPin, Share2, Users } from 'lucide-react';
import SubpageHeader from '@/components/SubpageHeader';
import Avatar from '@/components/Avatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import AuthSkeleton from '@/components/AuthSkeleton';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { subscribeProject, fetchUsersByIds } from '@/lib/projects';

const STAGE_LABELS = { idea: 'Idea', mvp: 'MVP', building: 'Building', launched: 'Launched' };

export default function StartupProfilePage() {
  const ready = useRequireAuth();
  const { startupId } = useParams();
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const followed = useStore((s) => !!s.followedStartups[startupId]);
  const toggleFollowStartup = useStore((s) => s.toggleFollowStartup);
  const showToast = useStore((s) => s.showToast);

  const [project, setProject] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!ready || !startupId) return undefined;
    setLoaded(false);
    setLoadError(null);
    const unsub = subscribeProject(startupId, (data, err) => {
      if (err) {
        setLoadError(err);
        setProject(null);
      } else {
        setProject(data);
      }
      setLoaded(true);
    });
    return unsub;
  }, [ready, startupId]);

  useEffect(() => {
    if (!project?.members?.length) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    fetchUsersByIds(project.members).then((list) => {
      if (!cancelled) setMembers(list);
    });
    return () => {
      cancelled = true;
    };
  }, [project?.members]);

  if (!ready) return <AuthSkeleton />;

  const ownerName = project?.owner?.name || 'Founder';
  const links = Array.isArray(project?.links) ? project.links : [];

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <SubpageHeader title={project?.title || 'Startup'} />
      <div className="no-scrollbar flex-1 overflow-y-auto">
        {!loaded ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={22} className="animate-spin text-gold" />
          </div>
        ) : loadError && !project ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-[16px] font-extrabold">Could not load this startup</h2>
            <p className="mt-1.5 text-[12px] text-text2 max-w-[260px]">
              Check your connection and try again.
            </p>
            <button
              onClick={() => router.refresh()}
              className="mt-5 rounded-full border border-gold/25 bg-gold/10 px-5 py-2 text-[12px] font-bold text-gold-hi"
            >
              Retry
            </button>
          </div>
        ) : !project ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="text-5xl mb-4">🚀</div>
            <h2 className="text-[18px] font-extrabold">This startup doesn't exist</h2>
            <p className="mt-2 text-[12px] text-text2 max-w-[260px]">
              It may have been deleted, or the link is wrong.
            </p>
            <button
              onClick={() => router.push('/projects')}
              className="mt-6 rounded-full border border-gold/20 bg-[rgba(217,172,61,0.06)] px-5 py-2.5 text-[12px] font-bold text-gold"
            >
              Browse projects
            </button>
          </div>
        ) : (
          <div className="px-4 pb-8 pt-3">
            {/* Cover */}
            {project.coverUrl ? (
              <div className="relative mb-4 h-32 overflow-hidden rounded-2xl border border-line">
                <img src={project.coverUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="mb-4 h-20 rounded-2xl border border-line bg-gradient-to-r from-gold/15 to-transparent" />
            )}

            {/* Identity */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl border border-gold/25 bg-gold/10 text-gold">
                {project.coverUrl ? (
                  <img src={project.coverUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
                ) : (
                  <Briefcase size={26} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="min-w-0 truncate text-[19px] font-extrabold">{project.title}</h1>
                  <VerifiedBadge />
                </div>
                {project.tagline ? (
                  <p className="mt-0.5 text-[12.5px] text-text2">{project.tagline}</p>
                ) : null}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-text3">
                  {project.stage ? (
                    <span className="rounded-full border border-gold/25 bg-gold/10 px-2.5 py-0.5 text-gold-hi">
                      {STAGE_LABELS[project.stage] || project.stage}
                    </span>
                  ) : null}
                  {project.location ? (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} /> {project.location}
                    </span>
                  ) : null}
                  {project.remote ? <span className="text-brandgreen">Remote</span> : null}
                </div>
              </div>
            </div>

            {/* Owner + follow */}
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
              <button
                onClick={() => project.ownerId && router.push(`/profile/${project.ownerId}`)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              >
                <Avatar src={project.owner?.avatar || null} name={ownerName} size={36} />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-bold">{ownerName}</div>
                  <div className="text-[10.5px] text-text3">Founder</div>
                </div>
              </button>
              <button
                onClick={() => {
                  if (!profile?.id) return;
                  toggleFollowStartup(startupId);
                  showToast(followed ? 'Unfollowed' : `Following ${project.title}`);
                }}
                className={`flex flex-none items-center gap-1.5 rounded-full px-4 py-2 text-[11.5px] font-extrabold ${
                  followed
                    ? 'border border-gold/40 bg-gold/15 text-gold-hi'
                    : 'bg-gold-grad text-[#171100]'
                }`}
              >
                <Heart size={13} fill={followed ? 'currentColor' : 'none'} />
                {followed ? 'Following' : 'Follow'}
              </button>
            </div>

            {/* About */}
            {project.description ? (
              <section className="mt-4">
                <h2 className="mb-1.5 text-[12px] font-extrabold uppercase tracking-wide text-text3">About</h2>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-text2">{project.description}</p>
              </section>
            ) : null}

            {/* Looking for */}
            {project.lookingFor ? (
              <section className="mt-4">
                <h2 className="mb-1.5 text-[12px] font-extrabold uppercase tracking-wide text-text3">Looking for</h2>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-text2">{project.lookingFor}</p>
              </section>
            ) : null}

            {/* Skills */}
            {Array.isArray(project.skillsNeeded) && project.skillsNeeded.length ? (
              <section className="mt-4">
                <h2 className="mb-1.5 text-[12px] font-extrabold uppercase tracking-wide text-text3">Skills needed</h2>
                <div className="flex flex-wrap gap-1.5">
                  {project.skillsNeeded.map((s) => (
                    <span key={s} className="rounded-full border border-line bg-card px-2.5 py-1 text-[11px] font-semibold text-text2">
                      {s}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Links */}
            {links.length ? (
              <section className="mt-4">
                <h2 className="mb-1.5 text-[12px] font-extrabold uppercase tracking-wide text-text3">Links</h2>
                <div className="space-y-1.5">
                  {links.map((l) => (
                    <a
                      key={l.url}
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2.5 text-[12px] font-semibold text-gold active:bg-white/5"
                    >
                      <Link2 size={13} className="flex-none" />
                      <span className="min-w-0 truncate">{l.label || l.url}</span>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Members */}
            {members.length ? (
              <section className="mt-4">
                <h2 className="mb-1.5 flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide text-text3">
                  <Users size={12} /> Team ({members.length})
                </h2>
                <div className="space-y-1">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => router.push(`/profile/${m.id}`)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left active:bg-white/5"
                    >
                      <Avatar src={m.avatar || null} name={m.name || 'Member'} size={32} />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">{m.name || 'Member'}</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Share */}
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href).catch(() => {});
                showToast('Link copied');
              }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/20 bg-[rgba(217,172,61,0.06)] px-5 py-3 text-[12px] font-bold text-gold"
            >
              <Share2 size={14} />
              Share this startup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
