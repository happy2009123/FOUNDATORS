'use client';
import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!show || !deferredPrompt) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-card border border-linesoft rounded-2xl px-5 py-3 flex items-center gap-3 shadow-2xl max-w-[340px]">
      <Download size={18} className="text-gold flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold">Install Foundators</div>
        <div className="text-[10px] text-text3">Add to home screen for the best experience</div>
      </div>
      <button onClick={handleInstall} className="rounded-full bg-gold-grad px-3 py-1.5 text-[11px] font-bold text-[#1a1300]">
        Install
      </button>
      <button onClick={() => setShow(false)} className="text-text3" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}
