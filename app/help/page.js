'use client';

import SubpageHeader from '@/components/SubpageHeader';
import FAQItem from '@/components/FAQItem';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import AuthSkeleton from '@/components/AuthSkeleton';

const FAQS = [
  {
    q: 'How do I follow another founder?',
    a: 'Open their profile from any post or the Discover tab, then tap the Follow button. Their posts will show up under Home → Following.',
  },
  {
    q: 'How do I message a founder?',
    a: 'Tap Message on their profile, or start a new conversation from the Messages tab by typing their name.',
  },
  {
    q: 'Can I edit a post after publishing?',
    a: 'Not yet — you can delete and repost for now. Editing is on our roadmap.',
  },
  {
    q: 'How does the Saved tab work?',
    a: "Tap the bookmark icon on any post to save it. Find everything you've saved under your Profile → Saved tab.",
  },
  {
    q: 'Is Foundators free to use?',
    a: 'Yes, browsing, posting, and messaging are free for every founder on the platform.',
  },
  {
    q: 'How do I create a gesture?',
    a: 'Go to Gestures → Choose a template → Customize with names and messages → Generate and share.',
  },
  {
    q: 'What are Collaborative Gestures?',
    a: 'Group cards where multiple friends sign a single greeting. Create one, share the link, and collect signatures.',
  },
  {
    q: 'How do I publish a template?',
    a: 'Use the Template Editor to create your design, then toggle "Publish to Community" to share it with others.',
  },
];

export default function HelpPage() {
  const ready = useRequireAuth();
  const showToast = useStore((s) => s.showToast);

  if (!ready) return <AuthSkeleton />;

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <SubpageHeader title="Help & Support" />
      <div className="no-scrollbar flex-1 overflow-y-auto px-[18px] py-2 pb-8">
        {FAQS.map((f, i) => (
          <FAQItem key={i} question={f.q} answer={f.a} />
        ))}

        <div className="pb-2 pt-6 text-sm font-bold">Still need help?</div>
        <div className="mt-3 rounded-2xl border border-linesoft bg-card p-4">
          <div className="text-[13px] font-extrabold">Happy Kirtania</div>
          <div className="mt-1 text-[11.5px] text-text2">Founder, Foundators</div>
          <div className="mt-3 space-y-2">
            <a href="mailto:happykirtania@gmail.com" className="flex items-center gap-2 text-[12px] text-gold hover:underline">
              <span className="font-bold">Email:</span> happykirtania@gmail.com
            </a>
            <a href="https://instagram.com/happy_kirtania" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[12px] text-gold hover:underline">
              <span className="font-bold">Instagram:</span> @happy_kirtania
            </a>
          </div>
        </div>
        <button
          onClick={() => window.location.href = 'mailto:happykirtania@gmail.com?subject=Foundators%20Support'}
          className="mt-4 w-full rounded-2xl bg-gold-grad py-[15px] text-[15px] font-extrabold text-[#1a1300]"
        >
          Contact Support
        </button>
      </div>
    </div>
  );
}
