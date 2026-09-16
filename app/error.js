'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

export default function ErrorBoundary({ error, reset }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <Logo size={48} />
      <h1 className="text-lg font-extrabold">Something went wrong</h1>
      <p className="max-w-xs text-sm text-text2">
        This screen hit an unexpected error. You can try again, or head back to the home screen.
      </p>
      <div className="mt-2 flex gap-3">
        <button
          onClick={() => reset()}
          className="rounded-full border-[1.3px] border-gold px-5 py-2.5 text-sm font-bold text-gold-hi"
        >
          Try again
        </button>
        <button
          onClick={() => router.push('/home')}
          className="rounded-full bg-gold-grad px-5 py-2.5 text-sm font-extrabold text-[#1a1300]"
        >
          Go home
        </button>
      </div>
    </div>
  );
}
