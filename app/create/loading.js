export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-linesoft px-4 py-3.5">
        <div className="skeleton h-4 w-14" />
        <div className="skeleton h-5 w-20" />
        <div className="skeleton h-8 w-14 rounded-full" />
      </div>
      <div className="flex-1 p-[18px]">
        <div className="mb-3.5 flex items-center gap-2.5">
          <div className="skeleton h-10 w-10 rounded-full" />
          <div className="space-y-1.5">
            <div className="skeleton h-3.5 w-24" />
            <div className="skeleton h-2.5 w-36" />
          </div>
        </div>
        <div className="skeleton h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}
