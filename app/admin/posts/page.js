'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN → POSTS
// Latest content with moderation controls. Removal is admin-only
// (rules: delete || isAdmin), always behind a confirmation dialog,
// and is written to the adminActions audit trail.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Trash2, Heart, MessageCircle, Inbox } from 'lucide-react';
import { useStore } from '@/lib/store';
import { fetchPostsPage, removePost } from '@/lib/adminData';
import { timeAgo } from '@/lib/admin';
import {
  Card, PageHeader, TableSkeleton, EmptyState, ErrorState, Pagination,
  ConfirmDialog, AvatarDot, Badge,
} from '@/components/admin/ui';

const PAGE_SIZE = 12;

export default function AdminPostsPage() {
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);

  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState([]);
  const [nextCursor, setNextCursor] = useState(undefined);
  const [confirmPost, setConfirmPost] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (stack) => {
    setLoading(true);
    setError(null);
    const cursor = stack.length ? stack[stack.length - 1] : null;
    const res = await fetchPostsPage({ cursor, pageSize: PAGE_SIZE });
    if (res.ok) {
      setRows(res.data.rows);
      setNextCursor(res.data.exhausted ? null : res.data.last);
    } else {
      setError(res.error);
      setRows([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load([]); }, [load]);

  const goNext = () => {
    if (!nextCursor) return;
    const next = [...cursors, nextCursor];
    setCursors(next);
    setPage((p) => p + 1);
    load(next);
  };
  const goPrev = () => {
    if (page <= 1) return;
    const next = cursors.slice(0, -1);
    setCursors(next);
    setPage((p) => p - 1);
    load(next);
  };

  async function confirmRemove() {
    if (!confirmPost) return;
    setBusy(true);
    const res = await removePost(confirmPost.id);
    setBusy(false);
    setConfirmPost(null);
    if (res.ok) {
      showToast('Post removed');
      load(cursors);
    } else {
      showToast(`Failed: ${res.error || 'permission denied'}`);
    }
  }

  return (
    <div className="animate-screen-in">
      <PageHeader title="Posts" subtitle="Review and moderate platform content." />

      <Card className="overflow-hidden">
        {!rows ? (
          <TableSkeleton rows={6} cols={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => load(cursors)} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Inbox} title="No posts yet" body="Published posts appear here the moment founders share something." />
        ) : (
          <>
            <div className="hidden md:block">
              {rows.map((p) => (
                <div key={p.id} className="flex items-start gap-3 border-b border-white/5 px-5 py-4 last:border-0 hover:bg-white/[0.03]">
                  <AvatarDot src={p.authorAvatar} name={p.authorName} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-bold">{p.authorName || 'Unknown'}</span>
                      {p.tagType && <Badge tone="gold">{p.tagType}</Badge>}
                      <span className="text-[11.5px] text-text3">{timeAgo(p.createdAt)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-text2">
                      {p.text || (p.imageUrl ? 'Media post (image)' : 'Empty post')}
                    </p>
                    <div className="mt-1.5 flex items-center gap-4 text-[11.5px] text-text3">
                      <span className="inline-flex items-center gap-1"><Heart size={12} /> {p.likes || 0}</span>
                      <span className="inline-flex items-center gap-1"><MessageCircle size={12} /> {p.commentsCount || 0}</span>
                    </div>
                  </div>
                  <div className="flex flex-none gap-1.5">
                    <button
                      onClick={() => router.push(`/post/${p.id}`)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[11.5px] font-bold text-text2 hover:border-gold/40 hover:text-gold-hi"
                    >
                      <Eye size={13} /> View
                    </button>
                    <button
                      onClick={() => setConfirmPost(p)}
                      className="inline-flex items-center gap-1 rounded-lg border border-brandred/30 px-3 py-1.5 text-[11.5px] font-bold text-brandred hover:bg-brandred/10"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="divide-y divide-white/5 md:hidden">
              {rows.map((p) => (
                <div key={p.id} className="p-4">
                  <div className="flex items-center gap-2.5">
                    <AvatarDot src={p.authorAvatar} name={p.authorName} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold">{p.authorName || 'Unknown'}</div>
                      <div className="text-[11px] text-text3">{timeAgo(p.createdAt)}</div>
                    </div>
                    {p.tagType && <Badge tone="gold">{p.tagType}</Badge>}
                  </div>
                  <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-text2">
                    {p.text || (p.imageUrl ? 'Media post (image)' : 'Empty post')}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-[11.5px] text-text3">
                    <span className="inline-flex items-center gap-1"><Heart size={12} /> {p.likes || 0}</span>
                    <span className="inline-flex items-center gap-1"><MessageCircle size={12} /> {p.commentsCount || 0}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => router.push(`/post/${p.id}`)} className="flex-1 rounded-xl border border-white/10 py-2 text-[12.5px] font-bold text-text2 hover:border-gold/40 hover:text-gold-hi">
                      View
                    </button>
                    <button onClick={() => setConfirmPost(p)} className="flex-1 rounded-xl border border-brandred/30 py-2 text-[12.5px] font-bold text-brandred hover:bg-brandred/10">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 pb-4">
              <Pagination
                hasPrev={page > 1}
                hasNext={!!nextCursor}
                onPrev={goPrev}
                onNext={goNext}
                busy={loading}
                label={`Page ${page}`}
              />
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirmPost}
        title="Remove post"
        body={confirmPost ? `This deletes “${(confirmPost.text || 'media post').slice(0, 80)}” from the platform for everyone. The action is recorded in the admin audit log.` : ''}
        confirmLabel="Remove"
        danger
        busy={busy}
        onConfirm={confirmRemove}
        onCancel={() => setConfirmPost(null)}
      />
    </div>
  );
}
