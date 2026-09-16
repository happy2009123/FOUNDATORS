export default function GesturesLoading() {
  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <div className="flex-1 px-[18px] pt-4 animate-pulse">
        <div className="skeleton mb-3 h-10 w-40 rounded-2xl" />
        <div className="no-scrollbar flex gap-2.5 overflow-x-auto mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-9 w-20 flex-none rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-48 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
