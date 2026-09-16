export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="skeleton h-8 w-32" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-36 rounded-[20px]" />
        ))}
      </div>
    </div>
  );
}
