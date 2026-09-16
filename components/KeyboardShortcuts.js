'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';

const SHORTCUTS = [
  { key: 'g', label: 'Go to...', description: 'Navigate quickly' },
  { key: 'h', label: 'Home', path: '/home' },
  { key: 'd', label: 'Discover', path: '/discover' },
  { key: 'm', label: 'Messages', path: '/messages' },
  { key: 'p', label: 'Profile', path: '/profile' },
  { key: 'n', label: 'New Post', path: '/create' },
  { key: '?', label: 'Help', path: '/help' },
];

export default function KeyboardShortcuts() {
  const router = useRouter();
  const isLoggedIn = useStore((s) => s.isLoggedIn);

  useEffect(() => {
    if (!isLoggedIn) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      const shortcut = SHORTCUTS.find((s) => s.key === e.key && s.path);
      if (shortcut) {
        e.preventDefault();
        router.push(shortcut.path);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, isLoggedIn]);

  return null;
}
