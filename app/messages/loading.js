'use client';

export default function MessagesSkeleton() {
  return (
    <div className="px-[18px] pt-4 animate-pulse">
      <div className="skeleton mb-4 h-10 w-full rounded-2xl" />
      <div className="mb-4 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-8 w-16 flex-none rounded-full" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton h-12 w-12 flex-none rounded-2xl" />
            <div className="flex-1">
              <div className="skeleton mb-1 h-3 w-24 rounded" />
              <div className="skeleton h-2.5 w-40 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
