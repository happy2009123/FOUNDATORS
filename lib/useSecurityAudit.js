import { useEffect, useRef } from 'react';
import { useStore } from './store';

const CHECK_INTERVAL = 30000;

export function useSecurityAudit() {
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    function detectDevTools() {
      const threshold = 160;
      const widthCheck = window.outerWidth - window.innerWidth > threshold;
      const heightCheck = window.outerHeight - window.innerHeight > threshold;
      if (widthCheck || heightCheck) {
        console.clear();
      }
    }

    function detectTampering() {
      try {
        const stored = localStorage.getItem('foundators-storage');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.state?.isLoggedIn === true && !parsed?.state?.sessionExpiry) {
            localStorage.removeItem('foundators-storage');
            window.location.reload();
          }
        }
      } catch {}
    }

    function detectConsoleOverride() {
      const methods = ['log', 'warn', 'error', 'info', 'debug'];
      methods.forEach((m) => {
        const original = console[m];
        if (typeof original === 'function') {
          Object.defineProperty(console, m, {
            value: function (...args) {
              if (args.some(a => typeof a === 'string' && /hack|exploit|inject|xss/i.test(a))) {
                return;
              }
              return original.apply(console, args);
            },
            writable: false,
            configurable: false,
          });
        }
      });
    }

    detectDevTools();
    detectTampering();
    detectConsoleOverride();

    intervalRef.current = setInterval(() => {
      detectDevTools();
      detectTampering();
    }, CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLoggedIn]);
}
