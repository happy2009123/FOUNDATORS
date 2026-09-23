export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-linesoft px-4 py-3.5">
        <div className="skeleton h-8 w-8 rounded-full" />
        <div className="skeleton h-5 w-24" />
        <div className="skeleton h-8 w-8 rounded-full" />
      </div>
      <div className="skeleton h-[118px]" />
      <div className="flex justify-center">
        <div className="skeleton -mt-11 h-[94px] w-[94px] rounded-full" />
      </div>
      <div className="mx-auto mt-4 flex flex-col items-center gap-2">
        <div className="skeleton h-5 w-32" />
        <div className="skeleton h-3 w-36" />
        <div className="skeleton h-3 w-44" />
      </div>
      <div className="mx-auto mt-5 w-4/5 space-y-3">
        <div className="skeleton h-11 rounded-2xl" />
        <div className="skeleton h-16 rounded-2xl" />
      </div>
    </div>
  );
}