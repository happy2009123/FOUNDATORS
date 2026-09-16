import { Suspense } from 'react';

export const metadata = {
  title: 'Home — Foundators',
  description: 'Your startup dashboard. See matches, opportunities, and your 90-day mission.',
};

export default function Layout({ children }) {
  return (
    <Suspense fallback={<div className="flex flex-1" />}>
      {children}
    </Suspense>
  );
}
