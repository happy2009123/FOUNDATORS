export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-linesoft px-4 py-3.5">
        <div className="skeleton h-7 w-7 rounded-full" />
        <div className="skeleton h-5 w-20" />
      </div>
      <div className="flex-1 p-4">
        <div className="mb-4 rounded-[20px] border border-linesoft bg-card p-4">
          <div className="mb-2 flex items-center gap-2.5">
            <div className="skeleton h-9 w-9 rounded-full" />
            <div className="space-y-1.5">
              <div className="skeleton h-3.5 w-24" />
              <div className="skeleton h-2.5 w-32" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-3/4" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-3 flex items-end gap-2">
            <div className="skeleton h-[26px] w-[26px] rounded-full" />
            <div className="skeleton h-16 w-48 rounded-2xl" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2.5 border-t border-linesoft px-3.5 py-2.5">
        <div className="skeleton h-10 flex-1 rounded-full" />
        <div className="skeleton h-10 w-10 rounded-full" />
      </div>
    </div>
  );
}
