import { useEffect, useRef } from 'react';
import { useStore } from './store';

const CHECK_INTERVAL = 30000;
// Module-scoped so re-running the effect (auth flap, remount) never
// re-patches console a second time.
let consolePatched = false;

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

    function detectConsoleOverride() {
      // Idempotent: an auth flap (sign-out -> sign-in) re-runs this effect.
      // The old patch used configurable:false, so the second run threw
      // "Cannot redefine property: log" and crashed the page to the
      // error boundary. Keep the wrapper redefinable and never throw.
      if (consolePatched) return;
      try {
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
              writable: true,
              configurable: true,
              enumerable: true,
            });
          }
        });
        consolePatched = true;
      } catch {}
    }

    detectDevTools();
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
