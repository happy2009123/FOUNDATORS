'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Eye, Lock, Plus, Users, ChevronUp, ChevronDown,
  MessageCircle, Share2, Bookmark, Filter, TrendingUp, Clock,
  CheckCircle, Lightbulb, Star, X, Send, Heart,
} from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import SubpageHeader from '@/components/SubpageHeader';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';

const STAGE_COLORS = {
  MVP: '#22c55e',
  Concept: '#3b82f6',
  Prototype: '#f59e0b',
  Launched: '#a855f7',
};

const AUTHORS = {
  arjun: { name: 'Arjun', avatar: 'https://i.pravatar.cc/160?img=11' },
  meera: { name: 'Meera', avatar: 'https://i.pravatar.cc/160?img=16' },
  rohan: { name: 'Rohan', avatar: 'https://i.pravatar.cc/160?img=12' },
  sophia: { name: 'Sophia', avatar: 'https://i.pravatar.cc/160?img=5' },
  daniel: { name: 'Daniel', avatar: 'https://i.pravatar.cc/160?img=8' },
  me: { name: 'Kabir', avatar: 'https://i.pravatar.cc/160?img=1' },
};

const INITIAL_IDEAS = [
  {
    id: 'idea_1',
    name: 'AgriFlow',
    tagline: 'Rent agricultural machinery without owning it.',
    stage: 'MVP',
    authorKey: 'arjun',
    votes: 124,
    createdAt: '2026-08-20',
    description:
      'AgriFlow is a peer-to-peer rental platform that connects small-scale farmers with owners of agricultural machinery. Instead of investing lakhs in tractors, harvesters, and tillers, farmers can rent equipment exactly when they need it, dramatically reducing costs and improving access to modern farming tools.\n\nThe platform handles scheduling, payment escrow, equipment verification, and provides insurance coverage for both parties. GPS tracking ensures machinery is returned on time and in good condition.',
    problem:
      'Small-scale farmers across India cannot afford modern agricultural machinery. A single tractor costs 5-10 lakhs, making it unaffordable for most marginal farmers who cultivate less than 2 acres. This leads to manual labor dependency, lower yields, and economic inequality.',
    solution:
      'A ride-sharing model for farm equipment. Farmers list their machinery with photos and availability. Nearby farmers can browse, compare rates, and book equipment by the hour or day. Payment is held in escrow until the rental period completes successfully.',
    audience: 'Small-scale farmers (1-5 acres), farm equipment owners, rural cooperatives, agricultural service providers.',
    tech: 'React Native mobile app, Node.js backend, PostgreSQL, Stripe payments, GPS tracking, IoT integration for machinery health monitoring.',
    comments: [
      { id: 'c1', authorKey: 'meera', text: 'Brilliant idea! This could transform rural economies. Have you considered adding a maintenance scheduling feature?', time: '2h ago', likes: 5 },
      { id: 'c2', authorKey: 'sophia', text: 'Love the escrow model. Builds trust between parties. What about insurance partnerships?', time: '5h ago', likes: 3 },
      { id: 'c3', authorKey: 'rohan', text: 'I built something similar for construction equipment. Happy to share learnings!', time: '1d ago', likes: 8 },
    ],
  },
  {
    id: 'idea_2',
    name: 'LocalSkill',
    tagline: 'Connect skilled local workers with nearby businesses.',
    stage: 'Concept',
    authorKey: 'meera',
    votes: 89,
    createdAt: '2026-08-25',
    description:
      'LocalSkill is a hyperlocal marketplace that connects businesses with skilled workers in their immediate vicinity. Think of it as a professional matchmaking service for carpenters, electricians, plumbers, painters, and other skilled tradespeople.\n\nThe platform verifies skills through a rating and review system, provides work history, and ensures timely payments. Businesses can post jobs and receive instant quotes from verified local workers.',
    problem:
      'Finding reliable skilled workers for small businesses is time-consuming and unreliable. Most workers rely on word-of-mouth and lack visibility. Meanwhile, businesses spend hours calling contacts to find available help.',
    solution:
      'A real-time marketplace where businesses post job descriptions and verified workers bid with quotes. Includes skill verification, background checks, and a secure payment system with holdback protection.',
    audience: 'Small businesses, restaurants, shops, offices needing maintenance work, skilled tradespeople seeking consistent work.',
    tech: 'Flutter app, Firebase backend, real-time bidding system, location-based matching, integrated payment gateway, SMS/WhatsApp notifications.',
    comments: [
      { id: 'c4', authorKey: 'arjun', text: 'This fills a massive gap. Have you looked at Urban Company as a reference?', time: '3h ago', likes: 4 },
      { id: 'c5', authorKey: 'daniel', text: 'Great concept. Could also work for freelance professionals beyond trades.', time: '8h ago', likes: 2 },
    ],
  },
  {
    id: 'idea_3',
    name: 'StudyLoop',
    tagline: 'Peer accountability network for students.',
    stage: 'Prototype',
    authorKey: 'rohan',
    votes: 67,
    createdAt: '2026-08-28',
    description:
      'StudyLoop creates small accountability groups of 3-5 students preparing for similar exams. Members commit to daily study goals, share progress, and hold each other accountable through regular check-ins and virtual study rooms.\n\nThe app tracks study hours, provides motivational nudges, and creates friendly competition through leaderboards. AI-powered suggestions help optimize study schedules based on individual performance patterns.',
    problem:
      'Self-study motivation is the biggest barrier to exam success. Students preparing for competitive exams (JEE, NEET, UPSC) often lose consistency within weeks. Loneliness and lack of accountability lead to dropout rates of over 60% for self-prepared candidates.',
    solution:
      'Algorithmically matched study groups with shared goals. Daily check-ins, virtual co-working sessions, progress dashboards, and AI-suggested break times. Social features create healthy competition and emotional support.',
    audience: 'Students preparing for competitive exams, college students with shared academic goals, self-study enthusiasts.',
    tech: 'Next.js frontend, Python FastAPI backend, Redis for real-time features, WebRTC for study rooms, TensorFlow for AI scheduling recommendations.',
    comments: [
      { id: 'c6', authorKey: 'sophia', text: 'I would have loved this during my NEET prep. The accountability aspect is key.', time: '1h ago', likes: 6 },
      { id: 'c7', authorKey: 'meera', text: 'How do you handle timezone differences for remote study groups?', time: '4h ago', likes: 3 },
      { id: 'c8', authorKey: 'arjun', text: 'The AI schedule optimization sounds interesting. What data does it use?', time: '6h ago', likes: 4 },
      { id: 'c9', authorKey: 'daniel', text: 'Could integrate with existing study platforms like Unacademy.', time: '12h ago', likes: 2 },
    ],
  },
  {
    id: 'idea_4',
    name: 'EcoTrack',
    tagline: 'Carbon footprint tracker for small businesses.',
    stage: 'MVP',
    authorKey: 'sophia',
    votes: 203,
    createdAt: '2026-08-15',
    description:
      'EcoTrack helps small businesses measure, understand, and reduce their carbon footprint without needing expensive consultants. The platform automates data collection from utility bills, transportation logs, and supply chain records to generate actionable sustainability reports.\n\nThe app provides industry benchmarks, recommends cost-effective reduction strategies, and helps businesses earn green certifications that attract environmentally conscious customers.',
    problem:
      'Small businesses produce 44% of global emissions but lack affordable tools to measure their impact. Existing enterprise solutions cost thousands annually and require dedicated sustainability teams that small businesses cannot afford.',
    solution:
      'An affordable SaaS platform that connects to existing business tools (accounting software, fuel cards, utility accounts) to automatically calculate emissions. Provides simple dashboards, reduction roadmaps, and certification pathways.',
    audience: 'Small to medium businesses (10-200 employees), restaurants, retail stores, offices, manufacturers, eco-conscious entrepreneurs.',
    tech: 'React app, Python backend with FastAPI, PostgreSQL, integration APIs for utility providers, emission factor databases, PDF report generation.',
    comments: [
      { id: 'c10', authorKey: 'rohan', text: 'Brilliant. The automatic data collection is what makes this scalable.', time: '30m ago', likes: 7 },
      { id: 'c11', authorKey: 'arjun', text: 'Have you thought about gamification? Businesses love competing on sustainability.', time: '2h ago', likes: 5 },
      { id: 'c12', authorKey: 'daniel', text: 'Would love to see integration with GST data for supply chain tracking.', time: '4h ago', likes: 4 },
      { id: 'c13', authorKey: 'meera', text: 'The certification angle is smart - creates a tangible business benefit.', time: '8h ago', likes: 3 },
    ],
  },
  {
    id: 'idea_5',
    name: 'MediConnect',
    tagline: 'Telemedicine platform for rural areas.',
    stage: 'Concept',
    authorKey: 'daniel',
    votes: 156,
    createdAt: '2026-08-22',
    description:
      'MediConnect brings specialist medical consultations to rural India through a telemedicine platform optimized for low-bandwidth connections. The platform supports video calls, voice calls, and even text-based consultations for areas with poor internet connectivity.\n\nPatients can upload medical records, get prescriptions, and connect with pharmacies for medicine delivery. The platform also supports offline-first functionality for initial symptom logging and record keeping.',
    problem:
      '70% of India lives in rural areas but has access to only 30% of healthcare resources. Specialist doctors are concentrated in cities, forcing rural patients to travel hours for consultations that could be done remotely.',
    solution:
      'A low-bandwidth telemedicine platform with offline-first design. Patients log symptoms offline, sync when connected, and get matched with appropriate specialists. Video consultations adapt to connection quality with audio fallback.',
    audience: 'Rural populations, primary health centers, PHC doctors, specialist doctors in cities, pharmacies, health insurance providers.',
    tech: 'Progressive Web App with service workers, WebRTC with adaptive bitrate, MongoDB for patient records, FHIR compliance, WhatsApp API integration for notifications.',
    comments: [
      { id: 'c14', authorKey: 'sophia', text: 'The offline-first approach is critical for rural areas. Well thought through.', time: '1h ago', likes: 9 },
      { id: 'c15', authorKey: 'meera', text: 'Have you considered integrating with existing government health schemes?', time: '3h ago', likes: 6 },
      { id: 'c16', authorKey: 'arjun', text: 'This could save thousands of lives. What about language support?', time: '6h ago', likes: 4 },
    ],
  },
];

const FILTER_TABS = [
  { key: 'trending', label: 'Trending', icon: TrendingUp },
  { key: 'recent', label: 'Recent', icon: Clock },
  { key: 'mine', label: 'My Ideas', icon: Star },
];

const EMPTY_FORM = {
  name: '',
  tagline: '',
  stage: 'Concept',
  description: '',
  problem: '',
  solution: '',
  audience: '',
  tech: '',
};

export default function Ideas() {
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);
  const ideaVotes = useStore((s) => s.ideaVotes);
  const toggleIdeaVote = useStore((s) => s.toggleIdeaVote);
  const { vibrate } = useHaptics();

  const [ideas, setIdeas] = useState(INITIAL_IDEAS);
  const [filter, setFilter] = useState('trending');
  const [openId, setOpenId] = useState(null);
  const [comments, setComments] = useState(() => {
    const map = {};
    INITIAL_IDEAS.forEach((idea) => {
      map[idea.id] = [...idea.comments];
    });
    return map;
  });
  const [newComment, setNewComment] = useState('');
  const [commentLikes, setCommentLikes] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const openIdea = useCallback(
    (id) => {
      vibrate('light');
      setOpenId(id);
    },
    [vibrate],
  );

  const closeIdea = useCallback(() => {
    vibrate('light');
    setOpenId(null);
    setNewComment('');
  }, [vibrate]);

  const handleVote = useCallback(
    (ideaId) => {
      vibrate('medium');
      toggleIdeaVote(ideaId);
    },
    [toggleIdeaVote, vibrate],
  );

  const handleAddComment = useCallback(() => {
    if (!newComment.trim()) return;
    vibrate('light');
    const ideaId = openId;
    const comment = {
      id: `c_${Date.now()}`,
      authorKey: 'me',
      text: newComment.trim(),
      time: 'Just now',
      likes: 0,
    };
    setComments((prev) => ({
      ...prev,
      [ideaId]: [...(prev[ideaId] || []), comment],
    }));
    setNewComment('');
  }, [newComment, openId, vibrate]);

  const handleLikeComment = useCallback(
    (ideaId, commentId) => {
      vibrate('light');
      setCommentLikes((prev) => {
        const key = `${ideaId}_${commentId}`;
        return { ...prev, [key]: !prev[key] };
      });
    },
    [vibrate],
  );

  const handleSubmitIdea = useCallback(() => {
    if (!form.name.trim() || !form.tagline.trim() || !form.description.trim()) {
      showToast('Please fill in name, tagline, and description');
      return;
    }
    vibrate('medium');
    const newIdea = {
      id: `user_${Date.now()}`,
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      stage: form.stage,
      authorKey: 'me',
      votes: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      description: form.description.trim(),
      problem: form.problem.trim(),
      solution: form.solution.trim(),
      audience: form.audience.trim(),
      tech: form.tech.trim(),
      comments: [],
    };
    setIdeas((prev) => [newIdea, ...prev]);
    setComments((prev) => ({ ...prev, [newIdea.id]: [] }));
    setForm(EMPTY_FORM);
    setShowForm(false);
    showToast('Idea published!');
  }, [form, vibrate, showToast]);

  const getVote = (ideaId) => !!ideaVotes[ideaId];

  const sortedIdeas = [...ideas].sort((a, b) => {
    if (filter === 'trending') return b.votes - a.votes;
    if (filter === 'recent') return new Date(b.createdAt) - new Date(a.createdAt);
    return a.authorKey === 'me' ? -1 : b.authorKey === 'me' ? 1 : 0;
  });

  const openIdeaData = ideas.find((i) => i.id === openId);
  const openComments = openId ? comments[openId] || [] : [];

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <MainScreenShell>
      <SubpageHeader title="Ideas" />
      <div className="no-scrollbar px-[18px] pb-6">
        <button
          onClick={() => {
            vibrate('light');
            setShowForm(true);
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gold-grad py-3 text-[11px] font-black text-[#171100]"
        >
          <Plus size={15} /> Submit Idea
        </button>

        {/* Filter Tabs */}
        <div className="mt-5 flex gap-2">
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  vibrate('light');
                  setFilter(tab.key);
                }}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-bold transition-all ${
                  active
                    ? 'bg-gold-grad text-[#171100]'
                    : 'border border-line bg-[rgba(255,255,255,.03)] text-text2'
                }`}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Ideas List */}
        <div className="mt-5 space-y-3">
          {sortedIdeas.map((idea) => {
            const author = AUTHORS[idea.authorKey];
            const voted = getVote(idea.id);
            return (
              <div key={idea.id} className="glass-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-extrabold">{idea.name}</span>
                      <span
                        className="rounded-full border px-2 py-0.5 text-[9px] font-bold"
                        style={{
                          borderColor: STAGE_COLORS[idea.stage],
                          color: STAGE_COLORS[idea.stage],
                        }}
                      >
                        {idea.stage}
                      </span>
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: STAGE_COLORS[idea.stage] }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] leading-5 text-text2">{idea.tagline}</div>
                  </div>
                </div>

                {/* Author + Stats Row */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={author.avatar}
                      alt={author.name}
                      className="h-5 w-5 rounded-full object-cover"
                    />
                    <span className="text-[10px] text-text2">{author.name}</span>
                    <span className="text-[9px] text-text2">·</span>
                    <span className="text-[9px] text-text2">{idea.createdAt}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-text2">
                    <span className="flex items-center gap-1">
                      <MessageCircle size={11} />
                      {comments[idea.id]?.length || 0}
                    </span>
                  </div>
                </div>

                {/* Action Row */}
                <div className="mt-3 flex items-center gap-2">
                  {/* Vote Buttons */}
                  <div className="flex items-center rounded-xl border border-line bg-[rgba(255,255,255,.03)]">
                    <button
                      onClick={() => handleVote(idea.id)}
                      className={`flex items-center gap-1 rounded-l-xl px-3 py-2 transition-all ${
                        voted ? 'text-[#D9AC3D]' : 'text-text2 hover:text-gold-hi'
                      }`}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <span className="border-x border-line px-2 py-2 text-[10px] font-bold text-text2">
                      {idea.votes + (voted ? 1 : 0)}
                    </span>
                    <button
                      onClick={() => handleVote(idea.id)}
                      className={`flex items-center gap-1 rounded-r-xl px-3 py-2 transition-all ${
                        voted ? 'text-red-400' : 'text-text2 hover:text-red-400'
                      }`}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  <button
                    onClick={() => openIdea(idea.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2.5 text-[10px] font-bold text-gold-hi"
                  >
                    <Eye size={12} /> View
                  </button>

                  <button
                    onClick={() => {
                      vibrate('light');
                      showToast('Idea shared!');
                    }}
                    className="rounded-xl border border-line p-2.5 text-text2 transition-colors hover:text-gold-hi"
                  >
                    <Share2 size={13} />
                  </button>

                  <button
                    onClick={() => {
                      vibrate('light');
                      router.push('/match/find_programmer');
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-gold-grad px-3 py-2.5 text-[10px] font-black text-[#171100]"
                  >
                    Build team <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Idea Vault */}
        <div className="mt-5 rounded-2xl border border-line bg-[rgba(217,172,61,.05)] p-4">
          <div className="flex items-center gap-2 text-[12px] font-extrabold">
            <Lock size={15} className="text-gold" /> Idea Vault
          </div>
          <p className="mt-1 text-[10.5px] leading-5 text-text2">
            Keep ideas private, track versions and invite only the people you trust.
          </p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[9px] font-bold text-gold">
            Coming soon
          </div>
        </div>

        {/* Submit Idea Form Overlay */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#020202]">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <button onClick={() => { vibrate('light'); setShowForm(false); }} className="p-1 text-text2">
                <X size={20} />
              </button>
              <span className="text-[13px] font-extrabold">Submit Idea</span>
              <button
                onClick={handleSubmitIdea}
                className="rounded-lg bg-gold-grad px-3 py-1.5 text-[10px] font-black text-[#171100]"
              >
                Publish
              </button>
            </div>

            <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
              {/* Name */}
              <label className="mt-2 block text-[10px] font-bold text-text2">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Your idea name"
                className="mt-1 w-full rounded-xl border border-line bg-[rgba(255,255,255,.03)] px-3 py-2.5 text-[11px] text-text placeholder:text-text2 focus:border-gold/50 focus:outline-none"
              />

              {/* Tagline */}
              <label className="mt-3 block text-[10px] font-bold text-text2">Tagline *</label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => updateField('tagline', e.target.value)}
                placeholder="One-liner pitch"
                className="mt-1 w-full rounded-xl border border-line bg-[rgba(255,255,255,.03)] px-3 py-2.5 text-[11px] text-text placeholder:text-text2 focus:border-gold/50 focus:outline-none"
              />

              {/* Stage */}
              <label className="mt-3 block text-[10px] font-bold text-text2">Stage</label>
              <div className="mt-1 flex gap-2">
                {Object.keys(STAGE_COLORS).map((stage) => (
                  <button
                    key={stage}
                    onClick={() => {
                      vibrate('light');
                      updateField('stage', stage);
                    }}
                    className={`flex-1 rounded-xl border px-3 py-2 text-[10px] font-bold transition-all ${
                      form.stage === stage
                        ? 'bg-gold-grad text-[#171100]'
                        : 'border-line bg-[rgba(255,255,255,.03)] text-text2'
                    }`}
                  >
                    {stage}
                  </button>
                ))}
              </div>

              {/* Description */}
              <label className="mt-3 block text-[10px] font-bold text-text2">Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe your idea in detail"
                rows={3}
                className="mt-1 w-full rounded-xl border border-line bg-[rgba(255,255,255,.03)] px-3 py-2.5 text-[11px] text-text placeholder:text-text2 focus:border-gold/50 focus:outline-none resize-none"
              />

              {/* Problem */}
              <label className="mt-3 block text-[10px] font-bold text-text2">Problem</label>
              <textarea
                value={form.problem}
                onChange={(e) => updateField('problem', e.target.value)}
                placeholder="What problem does this solve?"
                rows={2}
                className="mt-1 w-full rounded-xl border border-line bg-[rgba(255,255,255,.03)] px-3 py-2.5 text-[11px] text-text placeholder:text-text2 focus:border-gold/50 focus:outline-none resize-none"
              />

              {/* Solution */}
              <label className="mt-3 block text-[10px] font-bold text-text2">Solution</label>
              <textarea
                value={form.solution}
                onChange={(e) => updateField('solution', e.target.value)}
                placeholder="How does your idea solve it?"
                rows={2}
                className="mt-1 w-full rounded-xl border border-line bg-[rgba(255,255,255,.03)] px-3 py-2.5 text-[11px] text-text placeholder:text-text2 focus:border-gold/50 focus:outline-none resize-none"
              />

              {/* Audience */}
              <label className="mt-3 block text-[10px] font-bold text-text2">Target Audience</label>
              <input
                type="text"
                value={form.audience}
                onChange={(e) => updateField('audience', e.target.value)}
                placeholder="Who will use this?"
                className="mt-1 w-full rounded-xl border border-line bg-[rgba(255,255,255,.03)] px-3 py-2.5 text-[11px] text-text placeholder:text-text2 focus:border-gold/50 focus:outline-none"
              />

              {/* Tech Stack */}
              <label className="mt-3 block text-[10px] font-bold text-text2">Tech Stack</label>
              <input
                type="text"
                value={form.tech}
                onChange={(e) => updateField('tech', e.target.value)}
                placeholder="Technologies you plan to use"
                className="mt-1 w-full rounded-xl border border-line bg-[rgba(255,255,255,.03)] px-3 py-2.5 text-[11px] text-text placeholder:text-text2 focus:border-gold/50 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Idea Detail Overlay */}
        {openIdeaData && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#020202]">
            {/* Detail Header */}
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <button onClick={closeIdea} className="p-1 text-text2">
                <X size={20} />
              </button>
              <span className="text-[13px] font-extrabold">{openIdeaData.name}</span>
              <div className="w-6" />
            </div>

            {/* Detail Content */}
            <div className="no-scrollbar px-4 py-4">
              {/* Title + Stage */}
              <div className="flex items-center gap-2">
                <span className="text-[18px] font-black">{openIdeaData.name}</span>
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    borderColor: STAGE_COLORS[openIdeaData.stage],
                    color: STAGE_COLORS[openIdeaData.stage],
                  }}
                >
                  {openIdeaData.stage}
                </span>
              </div>

              {/* Author */}
              <div className="mt-3 flex items-center gap-2">
                <img
                  src={AUTHORS[openIdeaData.authorKey].avatar}
                  alt={AUTHORS[openIdeaData.authorKey].name}
                  className="h-7 w-7 rounded-full object-cover"
                />
                <div>
                  <div className="text-[11px] font-bold text-text">
                    {AUTHORS[openIdeaData.authorKey].name}
                  </div>
                  <div className="text-[9px] text-text2">Published {openIdeaData.createdAt}</div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-4">
                <h3 className="text-[12px] font-extrabold text-gold-hi">Description</h3>
                <p className="mt-1 text-[11px] leading-5 text-text2">
                  {openIdeaData.description}
                </p>
              </div>

              {/* Problem */}
              <div className="mt-4">
                <h3 className="flex items-center gap-1.5 text-[12px] font-extrabold text-gold-hi">
                  <Lightbulb size={13} /> Problem Statement
                </h3>
                <p className="mt-1 text-[11px] leading-5 text-text2">
                  {openIdeaData.problem}
                </p>
              </div>

              {/* Solution */}
              <div className="mt-4">
                <h3 className="flex items-center gap-1.5 text-[12px] font-extrabold text-gold-hi">
                  <CheckCircle size={13} /> Proposed Solution
                </h3>
                <p className="mt-1 text-[11px] leading-5 text-text2">
                  {openIdeaData.solution}
                </p>
              </div>

              {/* Target Audience */}
              <div className="mt-4">
                <h3 className="flex items-center gap-1.5 text-[12px] font-extrabold text-gold-hi">
                  <Users size={13} /> Target Audience
                </h3>
                <p className="mt-1 text-[11px] leading-5 text-text2">
                  {openIdeaData.audience}
                </p>
              </div>

              {/* Tech Requirements */}
              <div className="mt-4">
                <h3 className="flex items-center gap-1.5 text-[12px] font-extrabold text-gold-hi">
                  <Filter size={13} /> Tech Requirements
                </h3>
                <p className="mt-1 text-[11px] leading-5 text-text2">{openIdeaData.tech}</p>
              </div>

              {/* Vote Row */}
              <div className="mt-5 flex items-center gap-3">
                <div className="flex items-center rounded-xl border border-line bg-[rgba(255,255,255,.03)]">
                  <button
                    onClick={() => handleVote(openIdeaData.id)}
                    className={`flex items-center gap-1 rounded-l-xl px-4 py-2.5 transition-all ${
                      getVote(openIdeaData.id) ? 'text-[#D9AC3D]' : 'text-text2 hover:text-gold-hi'
                    }`}
                  >
                    <ChevronUp size={16} />
                  </button>
                  <span className="border-x border-line px-3 py-2.5 text-[11px] font-bold text-text2">
                    {openIdeaData.votes + (getVote(openIdeaData.id) ? 1 : 0)}
                  </span>
                  <button
                    onClick={() => handleVote(openIdeaData.id)}
                    className={`flex items-center gap-1 rounded-r-xl px-4 py-2.5 transition-all ${
                      getVote(openIdeaData.id) ? 'text-red-400' : 'text-text2 hover:text-red-400'
                    }`}
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    vibrate('light');
                    showToast('Idea shared!');
                  }}
                  className="rounded-xl border border-line p-2.5 text-text2 transition-colors hover:text-gold-hi"
                >
                  <Share2 size={15} />
                </button>

                <button
                  onClick={() => {
                    vibrate('light');
                    router.push('/match/find_programmer');
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-grad py-2.5 text-[11px] font-black text-[#171100]"
                >
                  Build team <ArrowRight size={13} />
                </button>
              </div>

              {/* Comments Section */}
              <div className="mt-5 border-t border-line pt-4">
                <h3 className="flex items-center gap-1.5 text-[12px] font-extrabold text-gold-hi">
                  <MessageCircle size={13} /> Comments ({openComments.length})
                </h3>

                {/* Add Comment */}
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Add a comment..."
                    className="flex-1 rounded-xl border border-line bg-[rgba(255,255,255,.03)] px-3 py-2.5 text-[11px] text-text placeholder:text-text2 focus:border-gold/50 focus:outline-none"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="rounded-xl bg-gold-grad p-2.5 text-[#171100] transition-opacity disabled:opacity-30"
                  >
                    <Send size={14} />
                  </button>
                </div>

                {/* Comment List */}
                <div className="mt-3 space-y-3">
                  {openComments.map((comment) => {
                    const cAuthor = AUTHORS[comment.authorKey];
                    const liked = commentLikes[`${openId}_${comment.id}`];
                    return (
                      <div key={comment.id} className="rounded-xl bg-[rgba(255,255,255,.03)] p-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={cAuthor.avatar}
                            alt={cAuthor.name}
                            className="h-5 w-5 rounded-full object-cover"
                          />
                          <span className="text-[10px] font-bold text-text">{cAuthor.name}</span>
                          <span className="text-[9px] text-text2">· {comment.time}</span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-4 text-text2">{comment.text}</p>
                        <div className="mt-2 flex items-center gap-3">
                          <button
                            onClick={() => handleLikeComment(openId, comment.id)}
                            className={`flex items-center gap-1 text-[10px] transition-colors ${
                              liked ? 'text-[#D9AC3D]' : 'text-text2 hover:text-gold-hi'
                            }`}
                          >
                            <Heart size={11} fill={liked ? '#D9AC3D' : 'none'} />
                            {comment.likes + (liked ? 1 : 0)}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainScreenShell>
  );
}
