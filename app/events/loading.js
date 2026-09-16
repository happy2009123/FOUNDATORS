export default function EventsLoading() {
  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <div className="flex-1 px-[18px] pt-4 animate-pulse">
        <div className="skeleton mb-3 h-10 w-40 rounded-2xl" />
        <div className="skeleton mb-3 h-12 w-full rounded-2xl" />
        <div className="skeleton mb-3 h-32 w-full rounded-2xl" />
        <div className="skeleton mb-3 h-32 w-full rounded-2xl" />
        <div className="skeleton h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}
