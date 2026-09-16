import { STARTUPS } from '@/lib/data';

export const metadata = {
  title: 'Startup — Foundators',
  description: 'View startup profiles, team, and progress.',
};

export function generateStaticParams() {
  return Object.keys(STARTUPS).map((startupId) => ({ startupId }));
}

export default function Layout({ children }) {
  return children;
}
