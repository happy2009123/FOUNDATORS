'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [pathname]);

  return (
    <div
      key={animKey}
      className="flex min-h-0 flex-1 flex-col"
      style={{ animation: 'pageSlideIn 0.25s ease-out both' }}
    >
      {children}
    </div>
  );
}
