'use client';

import { useState, useEffect } from 'react';

export default function SkipToContent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        setShow(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!show) return null;

  return (
    <a
      href="#main-content"
      className="fixed left-4 top-4 z-[100] rounded-lg bg-gold px-4 py-2 text-[12px] font-black text-[#1a1300] shadow-lg focus:outline-none"
      onClick={() => setShow(false)}
    >
      Skip to content
    </a>
  );
}
