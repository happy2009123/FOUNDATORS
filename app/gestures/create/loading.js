export default function CreateGestureLoading() {
  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <div className="flex-1 px-[18px] pt-4 animate-pulse">
        <div className="skeleton mb-3 h-6 w-32 rounded-lg" />
        <div className="skeleton mb-3 h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-2 gap-2.5 mt-5">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      </div>
    </div>
  );
}
