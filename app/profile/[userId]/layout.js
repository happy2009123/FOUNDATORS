import { USERS } from '@/lib/data';

export const metadata = {
  title: 'Profile — Foundators',
  description: 'View user profiles, posts, and builder scores.',
};

export function generateStaticParams() {
  const userKeys = Object.keys(USERS);
  return userKeys.map((userId) => ({ userId }));
}

export default function Layout({ children }) {
  return children;
}
