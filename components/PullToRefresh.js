'use client';

import { useCallback, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 80;
const MAX_PULL = 120;

export default function PullToRefresh({ children, onRefresh }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef(null);
  const pullRef = useRef(0);

  const handleTouchStart = useCallback((e) => {
    if (refreshing) return;
    const el = containerRef.current;
    if (el && el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!pulling.current) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      e.preventDefault();
      const dist = Math.min(delta * 0.5, MAX_PULL);
      pullRef.current = dist;
      setPullDistance(dist);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    const dist = pullRef.current;
    if (dist >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(50);
      try {
        await onRefresh?.();
      } catch {}
      setRefreshing(false);
    }
    pullRef.current = 0;
    setPullDistance(0);
  }, [onRefresh]);

  const rotation = pullDistance * 3;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative flex flex-1 flex-col overflow-hidden"
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-all"
        style={{ height: pullDistance > 0 || refreshing ? 50 : 0, opacity: pullDistance > 0 || refreshing ? 1 : 0 }}
      >
        <RefreshCw
          size={20}
          className={`text-gold ${refreshing ? 'animate-spin' : ''}`}
          style={!refreshing ? { transform: `rotate(${rotation}deg)` } : undefined}
        />
        {pullDistance >= THRESHOLD && !refreshing && (
          <span className="ml-2 text-[11px] font-bold text-gold">Release to refresh</span>
        )}
        {refreshing && (
          <span className="ml-2 text-[11px] font-bold text-gold">Refreshing...</span>
        )}
      </div>
      {children}
    </div>
  );
}
