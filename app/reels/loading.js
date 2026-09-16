'use client';

export default function ReelsSkeleton() {
  return (
    <div className="flex h-full items-center justify-center animate-pulse">
      <div className="flex flex-col items-center gap-3">
        <div className="skeleton h-[80vh] w-full max-w-[400px] rounded-3xl" />
        <div className="skeleton h-4 w-32 rounded" />
      </div>
    </div>
  );
}
