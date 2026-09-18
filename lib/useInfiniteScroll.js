'use client';
import { useEffect, useRef, useCallback } from 'react';

export function useInfiniteScroll(callback, hasMore = true) {
  const observer = useRef(null);
  
  const lastElementRef = useCallback((node) => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        callback();
      }
    }, { threshold: 0.1 });
    if (node) observer.current.observe(node);
  }, [callback, hasMore]);
  
  useEffect(() => {
    return () => { if (observer.current) observer.current.disconnect(); };
  }, []);
  
  return lastElementRef;
}
