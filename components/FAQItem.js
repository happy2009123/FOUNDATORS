'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useHaptics } from '@/lib/useHaptics';

export default function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  const { vibrate } = useHaptics();

  return (
    <div className="border-b border-linesoft">
      <button
        onClick={() => { vibrate('light'); setOpen(!open); }}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="text-[13px] font-semibold pr-4">{question}</span>
        <ChevronDown
          size={16}
          className={`flex-none text-text3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 pb-4' : 'max-h-0'}`}
      >
        <p className="text-[12px] leading-5 text-text2">{answer}</p>
      </div>
    </div>
  );
}
