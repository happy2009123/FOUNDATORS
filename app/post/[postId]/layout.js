export const metadata = {
  title: 'Post — Foundators',
  description: 'View post and join the conversation.',
};

export function generateStaticParams() {
  return [
    { postId: 'arjun_idea' },
    { postId: 'meera_update' },
    { postId: 'rohan_cofounder' },
    { postId: 'kabir_onboarding' },
    { postId: 'kabir_signups' },
  ];
}

export default function Layout({ children }) {
  return children;
}
