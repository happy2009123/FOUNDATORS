export const metadata = {
  title: 'Discussion — Foundators',
  description: 'Join the conversation on startup topics.',
};

export function generateStaticParams() {
  return [
    { discussionId: 'saas' },
    { discussionId: 'users100' },
  ];
}

export default function Layout({ children }) {
  return children;
}
