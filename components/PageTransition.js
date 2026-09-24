'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const [isEntering, setIsEntering] = useState(false);

  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    setIsEntering(true);
    const t = setTimeout(() => setIsEntering(false), 250);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{ animation: isEntering ? 'pageSlideIn 0.25s ease-out both' : 'none' }}
    >
      {children}
    </div>
  );
}
