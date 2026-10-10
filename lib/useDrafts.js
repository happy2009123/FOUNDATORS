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
      // Date.now() alone collides when two drafts are saved within the same
      // millisecond (duplicate React keys + overwrite ambiguity) — add a
      // random suffix like every other id generator in the app.
      id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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
