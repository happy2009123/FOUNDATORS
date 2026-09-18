'use client';
import { useState, useEffect, useCallback } from 'react';

const DRAFT_KEY = 'foundators_drafts';

export function useDrafts() {
  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setDrafts(JSON.parse(saved));
    } catch {}
  }, []);

  const saveDraft = useCallback((draft) => {
    const newDraft = {
      id: `draft_${Date.now()}`,
      text: draft.text || '',
      imageUrl: draft.imageUrl || null,
      createdAt: new Date().toISOString(),
    };
    setDrafts(prev => {
      const updated = [newDraft, ...prev].slice(0, 20);
      localStorage.setItem(DRAFT_KEY, JSON.stringify(updated));
      return updated;
    });
    return newDraft.id;
  }, []);

  const deleteDraft = useCallback((id) => {
    setDrafts(prev => {
      const updated = prev.filter(d => d.id !== id);
      localStorage.setItem(DRAFT_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { drafts, saveDraft, deleteDraft };
}
