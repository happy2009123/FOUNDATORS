'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export default function SubpageHeader({ title, right = null, onBack }) {
  const router = useRouter();

  function handleBack() {
    if (onBack) return onBack();
    router.back();
  }

  return (
    <div className="flex flex-none items-center justify-between border-b border-linesoft px-4 py-3.5">
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="flex h-[44px] w-[44px] items-center justify-center rounded-full text-gold-hi -ml-2"
        >
          <ChevronLeft size={22} strokeWidth={2.4} />
        </button>
        <h2 className="text-[17px] font-extrabold">{title}</h2>
      </div>
      {right}
    </div>
  );
}
