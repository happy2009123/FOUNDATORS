export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="skeleton h-8 w-40" />
      <div className="skeleton h-10 w-full rounded-full" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-8 w-16 rounded-full" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="gold-card p-4">
            <div className="flex gap-3">
              <div className="skeleton h-12 w-12 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-28" />
                <div className="skeleton h-3 w-40" />
                <div className="skeleton h-3 w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
