export function generateStaticParams() {
  return [{ userId: '_placeholder' }];
}

export const metadata = {
  title: 'Profile — Foundators',
  description: 'View user profiles, posts, and builder scores.',
};

export default function Layout({ children }) {
  return children;
}
