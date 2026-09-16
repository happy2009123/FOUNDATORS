'use client';

import { useRouter } from 'next/navigation';

export default function RichText({ text }) {
  const router = useRouter();
  if (!text) return null;

  const parts = text.split(/(#[\w]+|@[\w]+)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('#')) {
          return (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/search?q=${encodeURIComponent(part)}`);
              }}
              className="font-bold text-gold hover:underline"
            >
              {part}
            </button>
          );
        }
        if (part.startsWith('@')) {
          const handle = part.slice(1);
          return (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/profile/${handle}`);
              }}
              className="font-bold text-brandblue hover:underline"
            >
              {part}
            </button>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
