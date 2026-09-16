export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="skeleton h-8 w-40" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-[20px] border border-linesoft bg-card p-4">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="skeleton h-[42px] w-[42px] rounded-full" />
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
        ))}
      </div>
    </div>
  );
}
