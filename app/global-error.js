'use client';

import { useEffect } from 'react';
import Logo from '@/components/Logo';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // In production you'd send this to an error-tracking service.
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink p-8 text-center text-white">
          <Logo size={48} />
          <h1 className="text-lg font-extrabold">Something went wrong</h1>
          <p className="max-w-xs text-sm text-text2">
            An unexpected error occurred. You can try again, or head back to the home screen.
          </p>
          <button
            onClick={() => reset()}
            className="mt-2 rounded-full bg-gold-grad px-6 py-3 text-sm font-extrabold text-[#1a1300]"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
