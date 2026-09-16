export default function MessagesChatLoading() {
  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-linesoft px-4 py-3 animate-pulse">
        <div className="skeleton h-10 w-10 rounded-full" />
        <div className="flex-1">
          <div className="skeleton mb-1 h-4 w-24 rounded-xl" />
          <div className="skeleton h-3 w-16 rounded-xl" />
        </div>
      </div>
      <div className="flex-1 px-4 pt-4 animate-pulse">
        <div className="skeleton mb-3 ml-auto h-12 w-48 rounded-2xl" />
        <div className="skeleton mb-3 h-12 w-48 rounded-2xl" />
        <div className="skeleton mb-3 ml-auto h-10 w-36 rounded-2xl" />
        <div className="skeleton h-12 w-52 rounded-2xl" />
      </div>
    </div>
  );
}
