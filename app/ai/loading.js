export default function AiLoading() {
  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <div className="flex-1 px-[18px] pt-4 animate-pulse">
        <div className="skeleton mb-3 h-10 w-32 rounded-2xl" />
        <div className="skeleton mb-3 h-16 w-3/4 rounded-2xl" />
        <div className="skeleton mb-3 h-16 w-3/4 self-end rounded-2xl" />
        <div className="skeleton mb-3 h-16 w-3/4 rounded-2xl" />
        <div className="skeleton h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
}
