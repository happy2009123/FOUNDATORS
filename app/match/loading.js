export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-linesoft px-4 py-3.5">
        <div className="skeleton h-7 w-7 rounded-full" />
        <div className="skeleton h-5 w-32" />
      </div>
      <div className="px-5 py-5">
        <div className="skeleton h-6 w-48" />
        <div className="skeleton mt-2 h-3 w-64" />
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
