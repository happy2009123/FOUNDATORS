export const metadata = {
  title: 'Browse — Foundators',
  description: 'Discover people, startups, and discussions on Foundators.',
};

export function generateStaticParams() {
  return [
    { mode: 'people' },
    { mode: 'startups' },
    { mode: 'discussions' },
  ];
}

export default function Layout({ children }) {
  return children;
}
