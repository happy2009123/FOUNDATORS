export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="skeleton h-8 w-32" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-[20px] border border-linesoft bg-card p-4">
            <div className="skeleton h-4 w-48" />
            <div className="mt-2 skeleton h-3 w-full" />
            <div className="mt-2 flex gap-2">
              <div className="skeleton h-7 w-20 rounded-full" />
              <div className="skeleton h-7 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
