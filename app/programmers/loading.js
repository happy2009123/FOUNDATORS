export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="skeleton h-8 w-32" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-linesoft bg-card p-3">
            <div className="skeleton h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3.5 w-28" />
              <div className="skeleton h-2.5 w-40" />
            </div>
            <div className="skeleton h-8 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
