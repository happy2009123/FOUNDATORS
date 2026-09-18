'use client';

import { useState } from 'react';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useHaptics } from '@/lib/useHaptics';
import { useStore } from '@/lib/store';

async function deleteCollection(path) {
  const snap = await getDocs(collection(db, path));
  let count = 0;
  for (const d of snap.docs) {
    await deleteDoc(doc(db, path, d.id));
    count++;
    // Also delete subcollections
    const subCollections = ['followers', 'following', 'notifications', 'bookmarks'];
    for (const sub of subCollections) {
      try {
        const subSnap = await getDocs(collection(db, path, d.id, sub));
        for (const sd of subSnap.docs) {
          await deleteDoc(doc(db, path, d.id, sub, sd.id));
        }
      } catch (e) {}
    }
  }
  return count;
}

export default function ClearDataPage() {
  const ready = useRequireAuth();
  const { vibrate, notification } = useHaptics();
  const showToast = useStore((s) => s.showToast);
  const [clearing, setClearing] = useState(false);
  const [results, setResults] = useState(null);

  if (!ready) return null;

  const handleClear = async () => {
    if (!confirm('This will DELETE ALL data from Firestore. Are you sure?')) return;
    setClearing(true);
    vibrate('heavy');
    try {
      const posts = await deleteCollection('posts');
      const users = await deleteCollection('users');
      const chats = await deleteCollection('chats');
      const analytics = await deleteCollection('analytics');
      setResults({ posts, users, chats, analytics });
      notification('success');
      showToast('All Firestore data cleared!');
    } catch (e) {
      showToast('Error: ' + e.message);
    }
    setClearing(false);
  };

  return (
    <div className="app-shell flex flex-col items-center justify-center px-6">
      <div className="text-center space-y-4">
        <div className="text-[40px]">🗑️</div>
        <h1 className="text-[20px] font-black">Clear All Data</h1>
        <p className="text-[13px] text-text2 max-w-[300px]">
          This will permanently delete all users, posts, messages, and chats from Firestore.
          Your account will remain but with no data.
        </p>
        <button
          onClick={handleClear}
          disabled={clearing}
          className="mt-4 rounded-2xl bg-red-500/10 px-6 py-3 text-[14px] font-bold text-red-500 border border-red-500/20 disabled:opacity-40"
        >
          {clearing ? 'Clearing...' : 'Delete Everything'}
        </button>
        {results && (
          <div className="mt-4 text-[12px] text-text3 space-y-1">
            <div>Deleted {results.users} users</div>
            <div>Deleted {results.posts} posts</div>
            <div>Deleted {results.chats} chats</div>
            <div>Deleted {results.analytics} analytics events</div>
          </div>
        )}
      </div>
    </div>
  );
}
