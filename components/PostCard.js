'use client';

import { memo, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lightbulb,
  TrendingUp,
  Users,
  Heart,
  MessageCircle,
  Share,
  Bookmark,
  MoreHorizontal,
  Code2,
  PenTool,
  Globe,
  Pencil,
  Trash2,
  Flag,
  Copy,
  EyeOff,
  Smile,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import VerifiedBadge from './VerifiedBadge';
import Avatar from './Avatar';
import RichText from './RichText';
import { deletePost as firestoreDeletePost, updatePost as firestoreUpdatePost, getUserProfile } from '@/lib/firestore';
import { formatPostTime } from '@/lib/timeago';
import { getSupabase } from '@/lib/supabase/client';

const REACTION_EMOJIS = ['❤️', '👏', '💡', '🚀', '😂', '😮'];

const REPORT_REASONS = [
  'Spam or misleading',
  'Harassment or bullying',
  'False information',
  'Something else',
];

const TAG_META = {
  idea: { label: 'Idea', icon: Lightbulb, cls: 'bg-[rgba(217,172,61,0.14)] text-gold-hi border-[rgba(217,172,61,0.4)]' },
  update: { label: 'Update', icon: TrendingUp, cls: 'bg-[rgba(46,204,113,0.12)] text-brandgreen border-[rgba(46,204,113,0.4)]' },
  cofounder: { label: 'Looking for Co-founder', icon: Users, cls: 'bg-[rgba(91,141,255,0.14)] text-brandblue border-[rgba(91,141,255,0.4)]' },
};

async function fetchUser(key) {
  try {
    const res = await getUserProfile(key);
    return res?.success ? res.data : null;
  } catch {
    return null;
  }
}

export default memo(function PostCard({ post, reactions: reactionsProp, myReaction: myReactionProp }) {
  const router = useRouter();
  const [author, setAuthor] = useState(null);
  const likedMap = useStore((s) => s.likedPosts);
  const bookmarkedMap = useStore((s) => s.bookmarkedPosts);
  const livePost = useStore((s) => (s.posts.length ? s.posts.find((p) => p.id === post.id) : null));
  const displayPost = livePost || post;
  const localCommentCount = useStore((s) => (s.commentsByPost[post.id] || []).length);
  const commentCount = Math.max(displayPost.commentsCount ?? 0, localCommentCount);
  const [localLikeCount, setLocalLikeCount] = useState(displayPost.likes);
  useEffect(() => {
    setLocalLikeCount(displayPost.likes);
  }, [displayPost.likes]);
  const toggleLike = useStore((s) => s.toggleLike);

  // Derive the relative time from the real createdAt (serverTimestamp) so
  // the label ages ("2m ago") instead of being frozen at "Just now", and so
  // Firestore-loaded posts (which have no `meta` field at all) aren't blank.
  // Re-renders every minute to keep the label fresh; falls back to the
  // static meta while createdAt is still the pre-write null.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  const liveTime = formatPostTime(displayPost.createdAt ?? post.createdAt);
  const metaBase = String(post.meta || displayPost.meta || '').replace(/\s*·\s*Just now$/, '');
  const timeLabel = liveTime
    ? (metaBase ? `${metaBase} · ${liveTime}` : liveTime)
    : (post.meta || displayPost.meta || '');
  const toggleBookmark = useStore((s) => s.toggleBookmark);
  const showToast = useStore((s) => s.showToast);
  const hidePost = useStore((s) => s.hidePost);
  const reportItem = useStore((s) => s.reportItem);
  const { vibrate, notification } = useHaptics();
  const [showMenu, setShowMenu] = useState(false);
  const [showReportReasons, setShowReportReasons] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [localShareCount, setLocalShareCount] = useState(displayPost.shares || 0);

  useEffect(() => {
    setLocalShareCount(displayPost.shares || 0);
  }, [displayPost.shares]);

  useEffect(() => {
    setEditText(post.text);
  }, [post.text]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [likeAnimation, setLikeAnimation] = useState(false);
  const profile = useStore((s) => s.profile);
  const isOwnPost = post.authorKey === profile?.id;
  // Heart state falls back to the post's own likedBy array, so likes are
  // correct on every surface (profile tabs, search, post page) even when the
  // feed hasn't hydrated this post. null/undefined in the store means "never
  // synced"; false means the user explicitly unliked.
  const liked = likedMap[post.id] ??
    (Array.isArray(post.likedBy) && !!profile?.id && post.likedBy.includes(profile.id));
  // Same fallback pattern as likes: bookmarks only live in the store for
  // toggles made this session, so fall back to the post's own
  // bookmarkedBy array — otherwise every refresh emptied the saved hearts.
  const bookmarked = bookmarkedMap[post.id] ??
    (Array.isArray(post.bookmarkedBy) && !!profile?.id && post.bookmarkedBy.includes(profile.id));

  useEffect(() => {
    if (post.authorKey) fetchUser(post.authorKey).then(setAuthor);
  }, [post.authorKey]);

  const tagInfo = TAG_META[post.tagType];
  const TagIcon = tagInfo?.icon;

  const handleLike = useCallback(() => {
    toggleLike(post.id);
    if (!liked) {
      vibrate('light');
      notification('success');
      setLikeAnimation(true);
      setTimeout(() => setLikeAnimation(false), 600);
    }
    setLocalLikeCount((n) => (liked ? n - 1 : n + 1));
  }, [liked, toggleLike, post.id, vibrate, notification]);

  // Double-tap / double-click to like, like every major social app.
  const handleDoubleTapLike = useCallback(() => {
    if (post.noActions || liked) return;
    handleLike();
  }, [post.noActions, liked, handleLike]);

  // ---------- emoji reactions (set_post_reaction RPC) ----------
  // `reactions` prop semantics: undefined = hydrate locally (single-post
  // surfaces), null = "batch load in flight, don't fetch" (the feed passes
  // null until its batched get_post_reactions result lands).
  const [reactCounts, setReactCounts] = useState(() =>
    reactionsProp && typeof reactionsProp === 'object' ? reactionsProp : {}
  );
  const [myReaction, setMyReaction] = useState(
    () => myReactionProp ?? null
  );
  const [showReactTray, setShowReactTray] = useState(false);

  useEffect(() => {
    if (reactionsProp && typeof reactionsProp === 'object') setReactCounts(reactionsProp);
  }, [reactionsProp]);
  useEffect(() => {
    if (myReactionProp !== undefined) setMyReaction(myReactionProp);
  }, [myReactionProp]);

  // Single-post surfaces (post page, profile tabs) hydrate their own counts.
  useEffect(() => {
    if (reactionsProp !== undefined || !profile?.id) return;
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      try {
        const [aggRes, mineRes] = await Promise.all([
          supabase.rpc('get_post_reactions', { p_post_ids: [post.id] }),
          supabase.from('post_reactions').select('emoji').eq('post_id', post.id).eq('user_id', profile.id).maybeSingle(),
        ]);
        if (cancelled) return;
        const counts = {};
        (aggRes.data || []).forEach((row) => {
          if (!counts[row.post_id]) counts[row.post_id] = {};
          counts[row.post_id][row.emoji] = Number(row.cnt ?? row.count ?? 0);
        });
        setReactCounts(counts[post.id] || {});
        if (mineRes?.data?.emoji) setMyReaction(mineRes.data.emoji);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [post.id, profile?.id, reactionsProp]);

  const handleReact = useCallback(async (emoji) => {
    if (!profile?.id) { showToast('Sign in to react'); return; }
    const prev = myReaction;
    const next = prev === emoji ? null : emoji;
    setShowReactTray(false);
    setMyReaction(next);
    setReactCounts((c) => {
      const n = { ...c };
      if (prev) n[prev] = Math.max(0, (n[prev] || 0) - 1);
      if (next) n[next] = (n[next] || 0) + 1;
      return n;
    });
    try {
      const { error } = await getSupabase()?.rpc('set_post_reaction', {
        p_post_id: post.id,
        p_emoji: next,
      });
      if (error) throw error;
    } catch {
      setMyReaction(prev);
      setReactCounts((c) => {
        const n = { ...c };
        if (next) n[next] = Math.max(0, (n[next] || 0) - 1);
        if (prev) n[prev] = (n[prev] || 0) + 1;
        return n;
      });
      showToast('Could not save reaction');
    }
  }, [profile?.id, myReaction, post.id, showToast]);

  const reactionEntries = Object.entries(reactCounts || {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  function goToAuthor() {
    if (post.authorKey === profile?.id) {
      router.push('/profile');
    } else {
      router.push(`/profile/${post.authorKey}`);
    }
  }

  function handleEdit() {
    setIsEditing(true);
    setShowMenu(false);
  }

  function handleSaveEdit() {
    if (!editText.trim() || editText === post.text) {
      setIsEditing(false);
      return;
    }
    vibrate('light');
    const prevText = post.text;
    useStore.setState((s) => ({
      posts: s.posts.map((p) => p.id === post.id ? { ...p, text: editText.trim() } : p),
    }));
    setIsEditing(false);
    firestoreUpdatePost(post.id, { text: editText.trim() }).then((res) => {
      if (res?.success) {
        showToast('Post updated');
        return;
      }
      useStore.setState((s) => ({
        posts: s.posts.map((p) => p.id === post.id ? { ...p, text: prevText } : p),
      }));
      showToast(`Could not save edit${res?.error ? `: ${res.error}` : ' — check that security rules are published'}`);
    });
  }

  function handleDelete() {
    vibrate('medium');
    const removed = post;
    useStore.setState((s) => ({
      posts: s.posts.filter((p) => p.id !== post.id),
    }));
    setShowDeleteConfirm(false);
    firestoreDeletePost(post.id).then((res) => {
      if (res?.success) {
        showToast('Post deleted');
        return;
      }
      // Restore — the old code toasted "Post deleted" even when the write
      // was rejected, so the post silently reappeared on every refresh.
      useStore.setState((s) => ({ posts: [removed, ...s.posts] }));
      showToast(`Could not delete post${res?.error ? `: ${res.error}` : ' — check that security rules are published'}`);
    });
  }

  return (
    <div className="rounded-[20px] border border-linesoft bg-card p-4 gradient-border transition-all duration-200 hover:border-gold/20 hover:shadow-[0_4px_20px_rgba(212,175,55,0.06)]">
      <div className="mb-3 flex items-start justify-between">
        <button onClick={goToAuthor} className="flex gap-2.5 text-left">
          <Avatar src={author?.avatar} name={author?.name} size={42} />
          <div>
            <div className="flex items-center gap-1 text-[14.5px] font-bold">
              {author?.name}
              {author?.verified && <VerifiedBadge />}
            </div>
            <div className="mt-0.5 text-xs text-text2">{timeLabel}</div>
          </div>
        </button>
        <div className="flex items-center gap-1.5">
          {tagInfo && (
            <span className={`flex items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${tagInfo.cls}`}>
              <TagIcon size={13} />
              {tagInfo.label}
            </span>
          )}
          {!post.noActions && (
            <div className="relative">
              <button
                onClick={() => { setShowMenu(!showMenu); setShowReportReasons(false); }}
                className="flex h-[44px] w-[44px] items-center justify-center rounded-full text-text2"
                aria-label="More options"
                aria-expanded={showMenu}
              >
                <MoreHorizontal size={18} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-12 z-50 w-48 rounded-2xl border border-linesoft bg-card p-2 shadow-xl">
                  {isOwnPost ? (
                    <>
                      <button onClick={handleEdit} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-text2 hover:bg-white/5">
                        <Pencil size={14} /> Edit post
                      </button>
                      <button onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-brandred hover:bg-white/5">
                        <Trash2 size={14} /> Delete post
                      </button>
                    </>
                  ) : showReportReasons ? (
                    <>
                      <div className="px-3 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-text3">
                        Why are you reporting?
                      </div>
                      {REPORT_REASONS.map((reason) => (
                        <button
                          key={reason}
                          onClick={() => {
                            vibrate('light');
                            reportItem({
                              type: 'post',
                              targetUserId: post.authorKey,
                              reason,
                              details: `Post ${post.id}: ${(post.text || '').slice(0, 140)}`,
                            });
                            notification('success');
                            showToast('Report submitted — thanks for flagging');
                            setShowReportReasons(false);
                            setShowMenu(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-text2 hover:bg-white/5"
                        >
                          <Flag size={14} /> {reason}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowReportReasons(false)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-text3 hover:bg-white/5"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          vibrate('medium');
                          hidePost(post.id, {
                            text: (post.text || '').slice(0, 90),
                            authorName: author?.name || post.authorName || '',
                          });
                          showToast('Post hidden — find it under Settings → Blocked & Muted');
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-text2 hover:bg-white/5"
                      >
                        <EyeOff size={14} /> Hide post
                      </button>
                      <button
                        onClick={() => { setShowReportReasons(true); }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-text2 hover:bg-white/5"
                      >
                        <Flag size={14} /> Report post
                      </button>
                      <button onClick={() => { navigator.clipboard?.writeText(window.location.origin + '/post/' + post.id); showToast('Link copied'); setShowMenu(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-text2 hover:bg-white/5">
                        <Copy size={14} /> Copy link
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="mb-2.5">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full rounded-2xl border border-linesoft bg-white/[0.03] px-4 py-3 text-[15px] text-white placeholder:text-text3 focus:border-gold focus:outline-none min-h-[100px]"
            aria-label="Edit post text"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={() => setIsEditing(false)} className="flex-1 rounded-full border border-linesoft py-2 text-[12px] font-bold text-text2" aria-label="Cancel edit">
              Cancel
            </button>
            <button onClick={handleSaveEdit} className="flex-1 rounded-full bg-gold py-2 text-[12px] font-bold text-[#1a1300]" aria-label="Save edit">
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-2.5 text-[15px] font-semibold leading-snug" onDoubleClick={handleDoubleTapLike}><RichText text={post.text} /></div>
      )}

      {/* Poll */}
      {post.poll && <PostPoll postId={post.id} poll={post.poll} />}

      {post.imageUrl && (
        <img src={post.imageUrl} alt="Post image" onDoubleClick={handleDoubleTapLike} className="mb-3 w-full rounded-2xl object-cover max-h-[300px]" loading="lazy" />
      )}

      {post.cats2 && (
        <div className="mb-3 flex gap-2">
          {post.cats2.map((c) => (
            <span key={c} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-text2">
              {c}
            </span>
          ))}
        </div>
      )}

      {post.media === 'brain' && (
        <div className="relative mb-3 flex h-[150px] items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_40%,rgba(155,110,255,0.5),rgba(20,10,40,0.9)_65%)]">
          <div className="h-[70px] w-[70px] rotate-[12deg] rounded-2xl bg-gradient-to-br from-[#8a5cff] to-[#3b1f8f] shadow-[0_0_40px_6px_rgba(138,92,255,0.65)]" />
        </div>
      )}

      {post.stat && (
        <div className="mb-3 rounded-2xl border border-linesoft bg-[rgba(46,204,113,0.04)] px-3.5 py-3">
          <div className="mb-0.5 text-[11px] text-text2">{post.stat.label}</div>
          <div className="mb-0.5 text-[26px] font-extrabold">{post.stat.value}</div>
          <div className="text-xs font-bold text-brandgreen">{post.stat.delta}</div>
          <svg className="mt-1.5 h-[26px] w-full" viewBox="0 0 200 30" preserveAspectRatio="none">
            <polyline points="0,26 30,22 60,24 90,15 120,17 150,6 200,2" fill="none" stroke="#2ecc71" strokeWidth="2" />
          </svg>
        </div>
      )}

      {post.looking && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="mr-0.5 self-center text-[11px] font-bold text-gold-hi">Looking for</span>
            <RoleChip icon={Code2} label={post.looking[0]} />
            <RoleChip icon={PenTool} label={post.looking[1]} />
            <RoleChip icon={TrendingUp} label={post.looking[2]} />
          </div>
          <div className="mb-3 flex items-center gap-3 text-xs text-text2">
            <span className="h-1.5 w-1.5 rounded-full bg-brandblue" />
            {post.stage}
            {post.remote && (
              <>
                <Globe size={14} />
                Remote
              </>
            )}
          </div>
          <button
            onClick={() => showToast(`Collaboration request sent to ${author?.name?.split(' ')[0] || 'user'}`)}
            className="w-full rounded-[9px] border-[1.4px] border-brandblue py-[11px] text-sm font-bold text-brandblue active:bg-[rgba(91,141,255,0.12)]"
          >
            Collaborate
          </button>
        </>
      )}

      {reactionEntries.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {reactionEntries.slice(0, 3).map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold transition-colors ${
                myReaction === emoji
                  ? 'border-gold bg-gold/10 text-gold-hi'
                  : 'border-linesoft bg-white/5 text-text2'
              }`}
              aria-label={`React ${emoji} (${count})`}
            >
              <span className="text-[12px] leading-none">{emoji}</span> {count}
            </button>
          ))}
          {reactionEntries.length > 3 && (
            <span className="text-[10px] text-text3">+{reactionEntries.length - 3}</span>
          )}
        </div>
      )}

      {!post.noActions && (
        <div className="relative flex items-center gap-1 pt-0.5">
          <button
            onClick={handleLike}
            aria-label={liked ? 'Unlike post' : 'Like post'}
            aria-pressed={liked}
            className={`relative flex h-[44px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${liked ? 'text-brandred' : 'text-text2'}`}
          >
            <div className={`transition-transform ${likeAnimation ? 'animate-[likePop_0.4s_ease-out]' : ''}`}>
              <Heart size={19} fill={liked ? 'currentColor' : 'none'} />
            </div>
            {likeAnimation && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Heart size={28} className="fill-gold text-gold animate-[scaleIn_0.3s_ease-out_forwards] opacity-0" />
              </div>
            )}
            {localLikeCount}
          </button>
          <button
            onClick={() => router.push(`/post/${post.id}`)}
            aria-label={`${commentCount} comments`}
            className="flex h-[44px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-text2"
          >
            <MessageCircle size={19} />
            {commentCount}
          </button>
          <button
            onClick={async () => {
              notification('success');
              // Persist the share (RPC needs migration 0013; the UI bump is
              // kept either way so the count still moves in-session).
              setLocalShareCount((n) => n + 1);
              try {
                getSupabase()?.rpc('increment_post_share', { p_post_id: post.id })?.catch?.(() => {});
              } catch {}
              const url = typeof window !== 'undefined' ? window.location.origin + '/post/' + post.id : '';
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: `Post by ${author?.name || post.authorName || 'User'}`,
                    text: post.text?.slice(0, 120) || '',
                    url,
                  });
                } catch (e) {}
              } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(url);
                showToast('Link copied!');
              } else {
                showToast('Link copied!');
              }
            }}
            aria-label="Share post"
            className="flex h-[44px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-text2"
          >
            <Share size={19} />
            {localShareCount}
          </button>
          <span className="flex-1" />
          <div className="relative">
            <button
              onClick={() => setShowReactTray((v) => !v)}
              aria-label="Add reaction"
              aria-expanded={showReactTray}
              className={`flex h-[44px] w-[44px] items-center justify-center rounded-full ${myReaction ? 'text-gold' : 'text-text2'}`}
            >
              {myReaction ? (
                <span className="text-[17px] leading-none" role="img" aria-label={myReaction}>{myReaction}</span>
              ) : (
                <Smile size={19} />
              )}
            </button>
            {showReactTray && (
              <div className="absolute bottom-11 right-0 z-50 flex items-center gap-1 rounded-full border border-linesoft bg-card px-2 py-1.5 shadow-xl">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-[19px] leading-none transition-transform hover:scale-125 ${myReaction === emoji ? 'bg-gold/15' : ''}`}
                    aria-label={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => { toggleBookmark(post.id); notification('success'); }}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark post'}
            aria-pressed={bookmarked}
            className={`flex h-[44px] w-[44px] items-center justify-center rounded-full ${bookmarked ? 'text-gold' : 'text-text2'}`}
          >
            <Bookmark size={19} fill={bookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-6" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-[300px] rounded-3xl bg-card p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brandred/10 mx-auto">
              <Trash2 size={20} className="text-brandred" />
            </div>
            <h3 className="text-[16px] font-bold">Delete post?</h3>
            <p className="mt-1 text-[13px] text-text2">This action cannot be undone.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-full border border-linesoft py-3 text-[13px] font-bold text-text2" aria-label="Cancel delete">
                Cancel
              </button>
              <button onClick={handleDelete} className="flex-1 rounded-full bg-brandred py-3 text-[13px] font-bold text-white" aria-label="Confirm delete">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
})

function RoleChip({ icon: Icon, label }) {
  if (!label) return null;
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-linesoft bg-white/5 px-[11px] py-1.5 text-xs font-semibold text-text2">
      <Icon size={13} className="text-gold" />
      {label}
    </span>
  );
}

function PostPoll({ postId, poll }) {
  const votePoll = useStore((s) => s.votePoll);
  const pollVotes = useStore((s) => s.pollVotes);
  const profileId = useStore((s) => s.profile?.id);
  const myVote = pollVotes[postId];
  const hasVoted = myVote !== undefined;
  const [livePoll, setLivePoll] = useState(poll);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setLivePoll(poll); }, [poll]);

  // Hydrate tallies + my vote from the DB so a refresh shows real results.
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      try {
        const [postRes, voteRes] = await Promise.all([
          supabase.from('posts').select('poll').eq('id', postId).maybeSingle(),
          profileId
            ? supabase.from('poll_votes').select('option_index').eq('post_id', postId).eq('user_id', profileId).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        if (cancelled) return;
        if (postRes?.data?.poll) setLivePoll(postRes.data.poll);
        const opt = voteRes?.data?.option_index;
        if (opt !== undefined && opt !== null) {
          const cur = useStore.getState().pollVotes;
          if (cur[postId] === undefined) useStore.setState({ pollVotes: { ...cur, [postId]: opt } });
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [postId, profileId]);

  // DB counts (option.votes) already include my vote once vote_poll lands —
  // no +1 adjustment. Optimistic bump locally, then re-sync from the server.
  const totalVotes = (livePoll.options || []).reduce((sum, o) => sum + (o.votes || 0), 0);

  const handleVote = async (index) => {
    if (hasVoted || busy) return;
    if (!profileId) { useStore.getState().showToast('Sign in to vote'); return; }
    setBusy(true);
    setLivePoll((prev) => ({
      ...prev,
      options: (prev.options || []).map((o, i) => (i === index ? { ...o, votes: (o.votes || 0) + 1 } : o)),
    }));
    await votePoll(postId, index);
    try {
      const { data } = await getSupabase()?.from('posts').select('poll').eq('id', postId).maybeSingle();
      if (data?.poll) setLivePoll(data.poll);
    } catch {}
    setBusy(false);
  };

  return (
    <div className="mb-3 rounded-2xl border border-linesoft bg-card p-4">
      <div className="text-[13px] font-bold mb-3">{livePoll.question}</div>
      <div className="space-y-2">
        {(livePoll.options || []).map((option, i) => {
          const votes = option.votes || 0;
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isSelected = myVote === i;
          return (
            <button
              key={i}
              onClick={() => handleVote(i)}
              disabled={hasVoted || busy}
              className={`relative w-full rounded-xl border p-3 text-left transition-all ${
                hasVoted
                  ? isSelected ? 'border-gold bg-gold/10' : 'border-linesoft'
                  : 'border-linesoft hover:border-gold/50'
              }`}
            >
              {hasVoted && (
                <div className="absolute inset-0 rounded-xl overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${isSelected ? 'bg-gold/15' : 'bg-white/5'}`} style={{ width: `${pct}%` }} />
                </div>
              )}
              <div className="relative flex items-center justify-between">
                <span className="text-[12px] font-semibold">{option.text}</span>
                {hasVoted && <span className="text-[11px] font-bold text-text3">{pct}%</span>}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-[10px] text-text3">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</div>
    </div>
  );
}
