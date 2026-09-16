'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div role="alert" aria-live="assertive" className="fixed left-0 right-0 top-0 z-[250] flex items-center justify-center gap-2 bg-[rgba(217,172,61,0.15)] px-4 py-2 text-[11px] font-bold text-gold backdrop-blur-md">
      <WifiOff size={13} />
      You&apos;re offline. Some features may be unavailable.
    </div>
  );
}
