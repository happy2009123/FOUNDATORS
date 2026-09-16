'use client';

export default function HomeSkeleton() {
  return (
    <div className="px-[18px] pt-4 animate-pulse">
      {/* Stories skeleton */}
      <div className="mb-4 flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-none flex-col items-center gap-1">
            <div className="skeleton h-[62px] w-[62px] rounded-full" />
            <div className="skeleton h-2 w-10 rounded" />
          </div>
        ))}
      </div>
      {/* Hero card */}
      <div className="skeleton mb-3 h-40 w-full rounded-2xl" />
      {/* Quick actions */}
      <div className="mb-4 flex gap-2.5 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-16 w-20 flex-none rounded-2xl" />
        ))}
      </div>
      {/* Sections */}
      <div className="skeleton mb-3 h-24 w-full rounded-2xl" />
      <div className="skeleton mb-3 h-32 w-full rounded-2xl" />
      <div className="skeleton mb-3 h-20 w-full rounded-2xl" />
      <div className="skeleton h-32 w-full rounded-2xl" />
    </div>
  );
}
