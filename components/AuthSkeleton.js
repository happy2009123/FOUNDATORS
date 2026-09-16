'use client';

export default function AuthSkeleton() {
  return (
    <div className="flex-1 px-[18px] pt-4 pb-6 animate-pulse">
      <div className="mb-5 h-8 w-40 rounded-lg bg-white/5" />
      <div className="gold-card mb-3 h-24 rounded-2xl" />
      <div className="glass-card mb-3 h-32 rounded-2xl" />
      <div className="glass-card mb-3 h-28 rounded-2xl" />
    </div>
  );
}
