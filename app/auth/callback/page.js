'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';

// OAuth / email-link landing page.
// - popup=1: exchanged inside the Google popup, session postMessage'd to the
//   opener, then the popup closes itself.
// - otherwise (email confirm / recovery / magic link): exchange the PKCE
//   code client-side (same-origin verifier) and redirect to `next`.
export default function AuthCallbackPage() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const supabase = getSupabase();
    const params = new URL(window.location.href).searchParams;
    const code = params.get('code');
    const errorDescription = params.get('error_description');
    const popup = params.get('popup') === '1';
    const nextRaw = params.get('next') || '/home';
    const next = nextRaw.startsWith('/') ? nextRaw : '/home';

    (async () => {
      if (errorDescription) {
        setError(errorDescription);
        return;
      }
      let exchangeError = null;
      if (code && supabase) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) exchangeError = exErr.message;
      }
      if (popup && window.opener && !window.opener.closed) {
        let session = null;
        try {
          const { data } = await supabase?.auth.getSession();
          session = data?.session || null;
        } catch {
          session = null;
        }
        try {
          window.opener.postMessage(
            {
              type: 'foundators:supabase-oauth',
              session,
              error: exchangeError || (session ? null : 'Sign-in failed'),
            },
            window.location.origin
          );
        } catch {
          // opener gone — nothing to notify
        }
        window.close();
        return;
      }
      if (exchangeError) {
        setError(exchangeError);
        return;
      }
      window.location.replace(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07070a] text-white">
      <div className="text-center space-y-3">
        {error ? (
          <>
            <p className="text-red-400 text-sm">{error}</p>
            <a href="/login" className="text-xs text-zinc-400 underline">
              Back to login
            </a>
          </>
        ) : (
          <p className="text-zinc-400 text-sm">Completing sign-in…</p>
        )}
      </div>
    </div>
  );
}
