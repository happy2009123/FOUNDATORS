export default function EditProfileLoading() {
  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <div className="flex-1 px-[18px] pt-4 animate-pulse">
        <div className="skeleton mb-4 h-20 w-full rounded-2xl" />
        <div className="skeleton mb-3 h-10 w-full rounded-xl" />
        <div className="skeleton mb-3 h-10 w-full rounded-xl" />
        <div className="skeleton mb-3 h-24 w-full rounded-xl" />
        <div className="skeleton mb-3 h-10 w-full rounded-xl" />
        <div className="skeleton h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}
