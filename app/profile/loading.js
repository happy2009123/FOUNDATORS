export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-linesoft px-4 py-3.5">
        <div className="skeleton h-7 w-7 rounded-full" />
        <div className="skeleton h-5 w-24" />
      </div>
      <div className="px-5">
        <div className="skeleton h-[104px]" />
        <div className="-mt-[42px] flex justify-end gap-2.5 pt-3.5">
          <div className="skeleton h-9 w-9 rounded-full" />
          <div className="skeleton h-9 w-20 rounded-full" />
        </div>
        <div className="-mt-10 h-[82px] w-[82px] skeleton rounded-full" />
        <div className="skeleton mt-3 h-5 w-32" />
        <div className="skeleton mt-2 h-3 w-40" />
        <div className="skeleton mt-3 h-16 rounded-2xl" />
      </div>
    </div>
  );
}
