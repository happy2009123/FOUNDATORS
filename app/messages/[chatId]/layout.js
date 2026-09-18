export function generateStaticParams() {
  return [{ chatId: '_placeholder' }];
}

export const metadata = {
  title: 'Chat — Foundators',
  description: 'Send messages and collaborate with your network.',
};

export default function Layout({ children }) {
  return children;
}
