export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-linesoft px-4 py-3.5">
        <div className="skeleton h-7 w-7 rounded-full" />
        <div className="skeleton h-5 w-28" />
      </div>
      <div className="px-[18px] py-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border-b border-linesoft py-3.5">
            <div className="skeleton h-3.5 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
