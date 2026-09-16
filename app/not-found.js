'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';
import Logo from '@/components/Logo';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="app-shell flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-[rgba(217,172,61,0.08)] blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-72 h-72 w-72 rounded-full bg-[rgba(217,172,61,0.06)] blur-3xl" />

      <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-[rgba(217,172,61,0.2)] bg-[radial-gradient(circle,rgba(247,221,143,0.12),rgba(0,0,0,0.2)_62%,transparent_70%)]">
        <Logo size={60} />
      </div>

      <div className="mb-2 text-[64px] font-black leading-none text-gold-gradient">404</div>
      <h1 className="mb-2 text-[22px] font-extrabold">Page not found</h1>
      <p className="mb-8 max-w-[280px] text-[13px] leading-relaxed text-text2">
        This page doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
      </p>

      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 rounded-full border border-linesoft bg-card px-5 py-3 text-[12px] font-bold text-text2 transition-all active:scale-95"
        >
          <ArrowLeft size={15} /> Go back
        </button>
        <button
          onClick={() => router.push('/home')}
          className="flex items-center gap-2 rounded-full bg-gold-grad px-5 py-3 text-[12px] font-black text-[#171100] transition-all active:scale-95"
        >
          <Home size={15} /> Home
        </button>
      </div>

      <div className="mt-12 text-[10px] text-text3">
        Foundators — Ideas. People. Build.
      </div>
    </div>
  );
}
