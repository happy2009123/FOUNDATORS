import { INITIAL_CONTACTS, USERS, KABIR } from '@/lib/data';

export const metadata = {
  title: 'Chat — Foundators',
  description: 'Send messages and collaborate with your network.',
};

export function generateStaticParams() {
  const chatIds = new Set(Object.keys(INITIAL_CONTACTS));
  Object.keys(USERS).forEach((k) => chatIds.add(k));
  if (KABIR?.key) chatIds.add(KABIR.key);
  return Array.from(chatIds).map((chatId) => ({ chatId }));
}

export default function Layout({ children }) {
  return children;
}
