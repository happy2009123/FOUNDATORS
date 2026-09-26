'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import ProfileView from '@/components/ProfileView';

export default function UserProfilePage() {
  const { userId } = useParams();
  return (
    <Suspense fallback={<div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-linesoft px-4 py-3.5">
        <div className="skeleton h-7 w-7 rounded-full" />
        <div className="skeleton h-5 w-20" />
        <div className="skeleton h-7 w-7 rounded-full" />
      </div>
      <div className="skeleton h-[118px]" />
      <div className="flex justify-center">
        <div className="skeleton -mt-10 h-[88px] w-[88px] rounded-full" />
      </div>
      <div className="mx-auto mt-4 space-y-2">
        <div className="skeleton h-5 w-32" />
        <div className="skeleton h-3 w-36" />
      </div>
    </div>}>
      <ProfileView userId={userId} />
    </Suspense>
  );
}
