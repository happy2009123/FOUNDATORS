'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useInfiniteScroll(callback, hasMore, loading) {
  const observer = useRef(null);

  const lastElementRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            callback();
          }
        },
        { threshold: 0.1 }
      );

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, callback]
  );

  useEffect(() => {
    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, []);

  return lastElementRef;
}

export function useScrollToTop(scrollRef) {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const el = scrollRef?.current;
    if (!el) return;
    const onScroll = () => setShow(el.scrollTop > 400);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollRef]);

  const scrollToTop = React.useCallback(() => {
    scrollRef?.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [scrollRef]);

  return { show, scrollToTop };
}
