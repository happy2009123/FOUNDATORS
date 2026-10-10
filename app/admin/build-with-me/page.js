'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN → BUILD WITH ME
// Real collaboration content: posts tagged "cofounder" (Looking
// for Co-founder) straight from the posts table — the same
// data the feed uses. Moderation actions are shared with the
// Posts page (admin delete + audit log).
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Hammer, Eye, Trash2, Heart, MessageCircle } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { mapRows } from '@/lib/supabase/db';
import { useStore } from '@/lib/store';
import { removePost } from '@/lib/adminData';
import { timeAgo } from '@/lib/admin';
import {
  Card, PageHeader, TableSkeleton, EmptyState, ErrorState, Badge,
  ConfirmDialog, AvatarDot,
} from '@/components/admin/ui';

export default function AdminBuildWithMePage() {
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [confirmPost, setConfirmPost] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setRows(null);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('tag_type', 'cofounder')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      setRows(mapRows(data));
    } catch (e) {
      setError(e?.message || 'Failed to load listings');
      setRows([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirmRemove() {
    if (!confirmPost) return;
    setBusy(true);
    const res = await removePost(confirmPost.id);
    setBusy(false);
    setConfirmPost(null);
    if (res.ok) { showToast('Listing removed'); load(); }
    else showToast(`Failed: ${res.error || 'permission denied'}`);
  }

  return (
    <div className="animate-screen-in">
      <PageHeader title="Build With Me" subtitle="Collaboration & co-founder listings from the community." />

      <Card className="overflow-hidden">
        {!rows ? (
          <TableSkeleton rows={5} cols={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Hammer}
            title="No collaboration listings yet"
            body="When founders post “Looking for Co-founder”, they appear here for review."
          />
        ) : (
          rows.map((p) => (
            <div key={p.id} className="flex items-start gap-3 border-b border-white/5 px-5 py-4 last:border-0 hover:bg-white/[0.03]">
              <AvatarDot src={p.authorAvatar} name={p.authorName} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-bold">{p.authorName || 'Unknown'}</span>
                  <Badge tone="gold">looking for co-founder</Badge>
                  <span className="text-[11.5px] text-text3">{timeAgo(p.createdAt)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-text2">
                  {p.text || 'Collaboration post'}
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
          ))
        )}
      </Card>

      <ConfirmDialog
        open={!!confirmPost}
        title="Remove listing"
        body={confirmPost ? `Remove this collaboration listing? It disappears for everyone. Recorded in the admin audit log.` : ''}
        confirmLabel="Remove"
        danger
        busy={busy}
        onConfirm={confirmRemove}
        onCancel={() => setConfirmPost(null)}
      />
    </div>
  );
}
