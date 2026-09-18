export function generateStaticParams() {
  return [{ startupId: '_placeholder' }];
}

export const metadata = {
  title: 'Startup — Foundators',
  description: 'View startup profiles, team, and progress.',
};

export default function Layout({ children }) {
  return children;
}
