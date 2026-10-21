'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

// One-time "Add to home screen" prompt for phone visitors (e.g. from
// Reddit). Uses the native beforeinstallprompt sheet; only shown when the
// app isn't already installed and the user hasn't dismissed it before.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('install_prompt_dismissed')) return;
      if (window.matchMedia('(display-mode: standalone)').matches) return;
      const onBip = (e) => {
        e.preventDefault();
        setDeferred(e);
        setShow(true);
      };
      window.addEventListener('beforeinstallprompt', onBip);
      return () => window.removeEventListener('beforeinstallprompt', onBip);
    } catch {}
  }, []);

  if (!show || !deferred) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-[210] w-[min(92vw,340px)] -translate-x-1/2 rounded-2xl border border-gold/40 bg-card p-3 shadow-2xl lg:bottom-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gold/15">
          <Download size={18} className="text-gold" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-extrabold text-text1">Install Foundators</div>
          <div className="text-[11px] text-text2">Add to your home screen — opens like an app.</div>
        </div>
        <button
          onClick={() => {
            try { localStorage.setItem('install_prompt_dismissed', '1'); } catch {}
            setShow(false);
          }}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-text3"
          aria-label="Dismiss install prompt"
        >
          <X size={15} />
        </button>
      </div>
      <button
        onClick={async () => {
          try {
            deferred.prompt();
            await deferred.userChoice;
          } catch {}
          setDeferred(null);
          setShow(false);
        }}
        className="mt-3 w-full rounded-xl bg-gold-grad py-2.5 text-[13px] font-black text-[#171100]"
      >
        Install
      </button>
    </div>
  );
}
