'use client';

export default function SkeletonCard({ type = 'post' }) {
  if (type === 'post') {
    return (
      <div className="rounded-[20px] border border-linesoft bg-card p-4 animate-pulse">
        <div className="mb-3 flex items-start gap-2.5">
          <div className="h-[42px] w-[42px] rounded-full bg-white/5" />
          <div className="flex-1">
            <div className="h-3 w-24 rounded bg-white/5" />
            <div className="mt-1 h-2.5 w-16 rounded bg-white/5" />
          </div>
          <div className="h-6 w-16 rounded-full bg-white/5" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-white/5" />
          <div className="h-3 w-4/5 rounded bg-white/5" />
          <div className="h-3 w-3/5 rounded bg-white/5" />
        </div>
        <div className="mt-3 h-[150px] rounded-2xl bg-white/5" />
        <div className="mt-3 flex items-center gap-3">
          <div className="h-8 w-16 rounded-full bg-white/5" />
          <div className="h-8 w-16 rounded-full bg-white/5" />
          <div className="h-8 w-16 rounded-full bg-white/5" />
        </div>
      </div>
    );
  }

  if (type === 'message') {
    return (
      <div className="flex items-center gap-3 p-3">
        <div className="h-12 w-12 rounded-full bg-white/5" />
        <div className="flex-1">
          <div className="h-3 w-24 rounded bg-white/5" />
          <div className="mt-1.5 h-2.5 w-40 rounded bg-white/5" />
        </div>
        <div className="h-2.5 w-8 rounded bg-white/5" />
      </div>
    );
  }

  if (type === 'profile') {
    return (
      <div className="p-4">
        <div className="h-[104px] rounded-2xl bg-white/5" />
        <div className="-mt-10 flex justify-end gap-2">
          <div className="h-9 w-9 rounded-full bg-white/5" />
          <div className="h-9 w-24 rounded-full bg-white/5" />
        </div>
        <div className="mt-3 h-20 w-20 rounded-full bg-white/5 -mt-10 border-4 border-black" />
        <div className="mt-3 h-5 w-32 rounded bg-white/5" />
        <div className="mt-1 h-3 w-20 rounded bg-white/5" />
        <div className="mt-2 h-3 w-48 rounded bg-white/5" />
        <div className="mt-4 flex border-y border-linesoft">
          <div className="flex-1 py-3 text-center"><div className="h-4 w-8 mx-auto rounded bg-white/5" /><div className="mt-1 h-2.5 w-10 mx-auto rounded bg-white/5" /></div>
          <div className="flex-1 py-3 text-center border-l border-linesoft"><div className="h-4 w-8 mx-auto rounded bg-white/5" /><div className="mt-1 h-2.5 w-10 mx-auto rounded bg-white/5" /></div>
          <div className="flex-1 py-3 text-center border-l border-linesoft"><div className="h-4 w-8 mx-auto rounded bg-white/5" /><div className="mt-1 h-2.5 w-10 mx-auto rounded bg-white/5" /></div>
        </div>
      </div>
    );
  }

  if (type === 'story') {
    return (
      <div className="flex flex-none flex-col items-center gap-1">
        <div className="h-[62px] w-[62px] rounded-full bg-white/5" />
        <div className="h-2.5 w-10 rounded bg-white/5" />
      </div>
    );
  }

  if (type === 'notification') {
    return (
      <div className="flex items-center gap-3 p-4">
        <div className="h-10 w-10 rounded-full bg-white/5" />
        <div className="flex-1">
          <div className="h-3 w-40 rounded bg-white/5" />
          <div className="mt-1 h-2.5 w-20 rounded bg-white/5" />
        </div>
        <div className="h-10 w-10 rounded-xl bg-white/5" />
      </div>
    );
  }

  return null;
}
