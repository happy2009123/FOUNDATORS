'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTop({ scrollRef }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = scrollRef?.current;
    if (!el) return;
    const onScroll = () => setVisible(el.scrollTop > 400);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollRef]);

  if (!visible) return null;

  return (
    <button
      onClick={() => scrollRef?.current?.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-24 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-linesoft bg-card/90 text-gold shadow-lg backdrop-blur-md transition-transform hover:scale-110 active:scale-95"
      aria-label="Scroll to top"
    >
      <ArrowUp size={18} />
    </button>
  );
}
