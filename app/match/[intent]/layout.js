import { INTENTS } from '@/lib/data';

export const metadata = {
  title: 'Match — Foundators',
  description: 'Find co-founders, programmers, mentors, and investors matched to your mission.',
};

export function generateStaticParams() {
  return INTENTS.map((i) => ({ intent: i.key }));
}

export default function Layout({ children }) {
  return children;
}
