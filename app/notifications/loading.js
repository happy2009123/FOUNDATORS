export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-linesoft px-4 py-3.5">
        <div className="skeleton h-7 w-7 rounded-full" />
        <div className="skeleton h-5 w-28" />
      </div>
      <div className="px-[18px] pb-2 pt-4">
        <div className="skeleton h-3 w-16" />
      </div>
      <div className="space-y-1 px-3 pb-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-3 rounded-2xl p-2">
            <div className="skeleton h-[38px] w-[38px] rounded-full" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3 w-48" />
              <div className="skeleton h-2.5 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
