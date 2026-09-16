'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2, Clock, Send } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';

export default function DraftsPage() {
  const router = useRouter();
  const { vibrate } = useHaptics();
  const showToast = useStore((s) => s.showToast);
  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('post_drafts') || '[]');
      setDrafts(saved);
    } catch { setDrafts([]); }
  }, []);

  const deleteDraft = (id) => {
    vibrate('light');
    const updated = drafts.filter((d) => d.id !== id);
    setDrafts(updated);
    localStorage.setItem('post_drafts', JSON.stringify(updated));
    showToast('Draft deleted');
  };

  const useDraft = (draft) => {
    vibrate('light');
    localStorage.setItem('editing_draft', JSON.stringify(draft));
    router.push('/create');
  };

  return (
    <div className="app-shell overflow-y-auto">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-linesoft bg-ink/80 px-4 py-3 backdrop-blur-md">
        <button onClick={() => router.back()} className="h-8 w-8 flex items-center justify-center" aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[16px] font-bold">Drafts ({drafts.length})</h1>
      </div>

      <div className="p-4 space-y-3">
        {drafts.length === 0 ? (
          <div className="py-16 text-center">
            <Pencil size={32} className="text-text3 mx-auto mb-3" />
            <div className="text-[14px] font-bold text-text2">No drafts yet</div>
            <div className="mt-1 text-[12px] text-text3">Start writing and save as draft</div>
            <button onClick={() => router.push('/create')} className="mt-4 rounded-full bg-gold px-6 py-2.5 text-[12px] font-bold text-[#1a1300]" aria-label="Create new post">
              Create post
            </button>
          </div>
        ) : (
          drafts.map((draft) => (
            <div key={draft.id} className="rounded-2xl border border-linesoft bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold line-clamp-3">{draft.text || 'Untitled draft'}</div>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-text3">
                    <Clock size={10} />
                    Saved {new Date(draft.savedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => useDraft(draft)} className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-gold py-2.5 text-[11px] font-bold text-[#1a1300]" aria-label="Use draft">
                  <Send size={12} /> Use draft
                </button>
                <button onClick={() => deleteDraft(draft.id)} className="flex h-10 w-10 items-center justify-center rounded-full border border-linesoft text-red" aria-label="Delete draft">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
