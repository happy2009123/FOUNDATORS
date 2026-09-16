'use client';

import { Search, SlidersHorizontal } from 'lucide-react';
import { useStore } from '@/lib/store';

export default function SearchBar({ placeholder, value, onChange }) {
  const showToast = useStore((s) => s.showToast);

  return (
    <div className="mx-[18px] mb-3.5 mt-1.5 flex items-center gap-2.5 rounded-full border border-line bg-card px-4 py-3 text-text2">
      <Search size={18} className="flex-none text-gold" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 bg-transparent text-sm text-white placeholder:text-text2 focus:outline-none"
      />
      <button onClick={() => showToast('Filters coming soon')} aria-label="Open filters" className="flex h-[44px] w-[44px] flex-none items-center justify-center text-gold">
        <SlidersHorizontal size={16} />
      </button>
    </div>
  );
}
