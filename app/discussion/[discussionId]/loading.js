export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-linesoft px-4 py-3.5">
        <div className="skeleton h-7 w-7 rounded-full" />
        <div className="skeleton h-5 w-24" />
      </div>
      <div className="flex-1 p-4">
        <div className="mb-4 rounded-[20px] border border-linesoft bg-card p-4">
          <div className="skeleton mb-1 h-4 w-full" />
          <div className="skeleton h-3 w-32" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="mb-3 flex items-end gap-2">
            <div className="skeleton h-[26px] w-[26px] rounded-full" />
            <div className="skeleton h-14 w-48 rounded-2xl" />
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
