'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Bookmark, MoreHorizontal, Trash2, Edit3 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import AuthSkeleton from '@/components/AuthSkeleton';
import { useRequireAuth } from '@/lib/useRequireAuth';

const DEFAULT_COLLECTIONS = [
  { id: 'all', name: 'All Saved', count: 12, icon: '📌' },
  { id: 'inspiration', name: 'Inspiration', count: 5, icon: '💡' },
  { id: 'tutorials', name: 'Tutorials', count: 3, icon: '📚' },
  { id: 'tools', name: 'Tools & Resources', count: 4, icon: '🛠️' },
];

export default function SavedCollectionsPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const { vibrate } = useHaptics();
  const showToast = useStore((s) => s.showToast);
  const [collections, setCollections] = useState(DEFAULT_COLLECTIONS);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');

  if (!ready) return <AuthSkeleton />;

  const createCollection = () => {
    if (!newName.trim()) return;
    vibrate('light');
    setCollections((prev) => [...prev, { id: `c_${Date.now()}`, name: newName.trim(), count: 0, icon: '📁' }]);
    setNewName('');
    setShowNew(false);
    showToast('Collection created');
  };

  const deleteCollection = (id) => {
    vibrate('light');
    setCollections((prev) => prev.filter((c) => c.id !== id));
    showToast('Collection deleted');
  };

  return (
    <div className="app-shell overflow-y-auto">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-linesoft bg-ink/80 px-4 py-3 backdrop-blur-md">
        <button onClick={() => router.back()} className="h-8 w-8 flex items-center justify-center" aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-[16px] font-bold">Saved Collections</h1>
        <button onClick={() => setShowNew(true)} className="text-gold" aria-label="New collection">
          <Plus size={20} />
        </button>
      </div>

      {/* New collection input */}
      {showNew && (
        <div className="px-4 py-3 border-b border-linesoft">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Collection name..."
              autoFocus
              className="flex-1 bg-transparent text-[14px] text-white placeholder:text-text3 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && createCollection()}
              aria-label="Collection name"
            />
            <button onClick={createCollection} className="text-gold text-[13px] font-bold">Create</button>
            <button onClick={() => setShowNew(false)} className="text-text3 text-[13px]">Cancel</button>
          </div>
        </div>
      )}

      {/* Collections */}
      <div className="p-4 space-y-3">
        {collections.map((col) => (
          <div
            key={col.id}
            className="flex items-center gap-4 rounded-2xl border border-linesoft bg-card p-4 active:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-2xl">
              {col.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold">{col.name}</div>
              <div className="text-[11px] text-text2">{col.count} saved posts</div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); deleteCollection(col.id); }} className="text-text3" aria-label="Delete collection">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
