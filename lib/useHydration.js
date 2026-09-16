'use client';

import { useEffect, useState } from 'react';
import { useStore } from './store';

export function useHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    useStore.persist.rehydrate();
    // In case hydration already finished synchronously (e.g. no persisted data yet)
    setHydrated(useStore.persist.hasHydrated());
    return unsub;
  }, []);

  return hydrated;
}
