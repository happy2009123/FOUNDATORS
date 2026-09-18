const INTENTS = [
  { key: 'start_business', label: 'Start a business', emoji: '💡', mode: 'team' },
  { key: 'find_programmer', label: 'Find a programmer', emoji: '👨‍💻', mode: 'people', skills: ['Development', 'AI', 'SaaS'] },
  { key: 'find_cofounder', label: 'Find a co-founder', emoji: '🤝', mode: 'people', skills: ['Startups', 'Product', 'Operations'] },
  { key: 'find_job', label: 'Find a job', emoji: '💼', mode: 'opportunities', oppType: 'job' },
  { key: 'find_funding', label: 'Find funding', emoji: '💰', mode: 'opportunities', oppType: 'funding' },
  { key: 'learn_skill', label: 'Learn a skill', emoji: '🎓', mode: 'people', skills: ['Design', 'Development', 'Marketing', 'AI'] },
  { key: 'find_mentor', label: 'Find a mentor', emoji: '🧑‍🏫', mode: 'people', skills: ['Investing', 'Strategy', 'Operations'] },
  { key: 'join_project', label: 'Join a project', emoji: '🚀', mode: 'opportunities', oppType: 'project' },
  { key: 'hire_someone', label: 'Hire someone', emoji: '🛠️', mode: 'people', skills: ['Development', 'Design', 'Marketing'] },
  { key: 'network_locally', label: 'Network locally', emoji: '🌎', mode: 'local' },
];

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
