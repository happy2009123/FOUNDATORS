'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Code2,
  FileText,
  Lightbulb,
  Search,
  Sparkles,
  Send,
  Mic,
  Paperclip,
  ChevronDown,
} from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';

const INITIAL_MESSAGES = [
  {
    id: 1,
    role: 'bot',
    text: "Hey! I'm your Foundators AI copilot. I can help you validate ideas, plan roadmaps, find team members, and prepare pitches. What are you working on?",
    time: '10:00 AM',
  },
];

const QUICK_ACTIONS = [
  'Validate my idea',
  'Find co-founder',
  'Plan my MVP',
  'Pitch coaching',
  'Growth strategy',
  'Tech stack advice',
];

const RESPONSES = {
  validate: {
    keywords: ['validate', 'validation', 'idea', 'concept', 'test idea', 'check idea'],
    text: "**Idea Validation Framework**\n\n**Step 1: Problem Validation**\n- Talk to 10-15 target users\n- Ask about current pain points\n- Score severity (1-10)\n\n**Step 2: Solution Validation**\n- Show mockups or prototypes\n- Would they pay for this?\n- How much would they pay?\n\n**Step 3: Market Validation**\n- Check competitors\n- Size the market (TAM/SAM/SOM)\n- Find your unfair advantage\n\n**Quick Win:** Set up a landing page and run $50 in ads to gauge interest.\n\nWant me to create a validation checklist?",
  },
  cofounder: {
    keywords: ['co-founder', 'cofounder', 'co founder', 'partner', 'team member', 'find team', 'join team', 'looking for'],
    text: "**Finding Your Co-Founder**\n\n**Where to Look:**\n- Y Combinator Co-Founder Matching\n- Indie Hackers\n- Twitter/X startup community\n- Local startup meetups\n- LinkedIn\n\n**What to Look For:**\n- Complementary skills (you tech, they business or vice versa)\n- Shared values and work ethic\n- Similar risk tolerance\n- Good communication style\n\n**Red Flags:**\n- Different commitment levels\n- Unclear equity split expectations\n- No aligned vision\n\n**Action Step:** Write a co-founder spec and post it in 3 communities this week.",
  },
  mvp: {
    keywords: ['mvp', 'minimum viable product', 'prototype', 'build', 'product', 'app', 'saas', 'platform'],
    text: "**MVP Planning Guide**\n\n**Define Your MVP:**\n- What is the ONE core problem you solve?\n- What are the 3 essential features?\n- Who is your first 10 users?\n\n**Tech Stack Recommendation:**\n- Frontend: React/Next.js or Flutter\n- Backend: Node.js + PostgreSQL\n- Auth: Clerk or Auth0\n- Payments: Stripe\n- Hosting: Vercel + Supabase\n\n**Timeline:**\n- Week 1-2: Design & wireframes\n- Week 3-6: Build core features\n- Week 7-8: Beta testing\n- Week 9-10: Launch\n\n**Budget Estimate:** $5K-15K (sweat equity) or $20K-50K (outsourced)\n\nWant me to break down any section?",
  },
  pitch: {
    keywords: ['pitch', 'investor', 'funding', 'fundraise', 'raise money', 'deck', 'presentation'],
    text: "**Pitch Deck Structure**\n\n**1. Title Slide** - Company name + one-liner\n\n**2. Problem** - What pain point are you solving?\n\n**3. Solution** - Your unique approach\n\n**4. Market** - TAM/SAM/SOM breakdown\n\n**5. Traction** - Early metrics or validation\n\n**6. Business Model** - How you make money\n\n**7. Team** - Why you're the right people\n\n**8. Financials** - Projections (3-5 years)\n\n**9. Ask** - How much you need and what for\n\n**Pro Tips:**\n- Keep it under 12 slides\n- Lead with traction\n- Know your numbers cold\n- Practice 50+ times\n\nWant me to help draft your deck?",
  },
  growth: {
    keywords: ['growth', 'scale', 'scaling', 'marketing', 'acquisition', 'users', 'customers', 'revenue'],
    text: "**Growth Strategy Playbook**\n\n**Phase 1: Foundation (Month 1-3)**\n- Define ICP (Ideal Customer Profile)\n- Set up analytics (Mixpanel/Amplitude)\n- Create content hub\n\n**Phase 2: Acquisition (Month 3-6)**\n- Content marketing + SEO\n- Paid ads ($500-2K/mo budget)\n- Partnership channels\n- Referral program\n\n**Phase 3: Retention (Month 6+)**\n- Email sequences\n- Feature announcements\n- Community building\n- Customer success playbook\n\n**Key Metrics to Track:**\n- CAC (Customer Acquisition Cost)\n- LTV (Lifetime Value)\n- Churn Rate\n- NPS Score\n\nWhat channel should we focus on first?",
  },
  techstack: {
    keywords: ['tech stack', 'technology', 'framework', 'language', 'tools', 'database', 'api', 'backend', 'frontend'],
    text: "**Tech Stack Recommendations**\n\n**For SaaS/Web Apps:**\n- Frontend: Next.js + TypeScript\n- UI: Tailwind + shadcn/ui\n- Backend: Node.js + Express\n- Database: PostgreSQL + Prisma\n- Auth: Clerk or NextAuth\n- Payments: Stripe\n- Hosting: Vercel + Railway\n\n**For Mobile Apps:**\n- Cross-platform: React Native or Flutter\n- Native: Swift (iOS) / Kotlin (Android)\n\n**For MVPs:**\n- No-code: Bubble or Softr\n- Low-code: Retool + Supabase\n- Full-code: Next.js (most flexible)\n\n**My Pick:** Next.js + Supabase + Stripe = fastest to market\n\nWhat's your use case?",
  },
  hiring: {
    keywords: ['hire', 'hiring', 'recruit', 'developer', 'designer', 'freelancer', 'contractor', 'job post'],
    text: "**Hiring Strategy**\n\n**For Your First Hire:**\n- Start with a freelancer (Upwork/Toptal)\n- Look for T-shaped skills\n- Test with a paid trial project\n\n**Where to Find Talent:**\n- Upwork / Toptal / Contra\n- LinkedIn + Twitter DMs\n- AngelList (startup-focused)\n- Local dev communities\n\n**What to Offer:**\n- Equity: 0.1-2% (early stage)\n- Competitive hourly rate\n- Flexible schedule\n- Exciting mission\n\n**Interview Process:**\n1. Portfolio review\n2. 30-min culture fit call\n3. Paid test project (2-4 hrs)\n4. Reference check\n\nWhat role are you hiring for?",
  },
  pricing: {
    keywords: ['pricing', 'price', 'charge', 'cost', 'subscription', 'revenue model', 'monetize', 'make money'],
    text: "**Pricing Strategy**\n\n**Common Models:**\n- Freemium + Premium upgrade\n- Monthly/Annual subscription\n- Usage-based (pay per use)\n- One-time purchase\n- Marketplace fees (% per transaction)\n\n**Pricing Tiers Example:**\n- Free: Basic features, limited usage\n- Pro ($19-49/mo): Full features\n- Enterprise ($99-299/mo): Custom + support\n\n**How to Set Prices:**\n1. Check competitor pricing\n2. Calculate your costs + margins\n3. Survey willingness to pay\n4. Start higher, discount later\n5. A/B test pricing pages\n\n**Rule of Thumb:** If nobody complains, your prices are too low.\n\nWhat's your business model?",
  },
  competitor: {
    keywords: ['competitor', 'competition', 'alternative', 'differentiate', 'compare', 'market'],
    text: "**Competitor Analysis**\n\n**Step 1: Identify Competitors**\n- Direct: Same solution, same market\n- Indirect: Different solution, same problem\n- Potential: Could pivot into your space\n\n**Step 2: Analyze**\n- Features & pricing\n- User reviews (what they hate)\n- Marketing channels\n- Funding & growth\n\n**Step 3: Differentiate**\n- Find gaps in their offering\n- Target underserved segments\n- Build 10x better UX\n- Create switching costs\n\n**Pro Move:** Read their 1-star reviews. That's your opportunity.\n\nWant me to analyze a specific competitor?",
  },
  funding: {
    keywords: ['fund', 'fundraising', 'investor', 'vc', 'angel', 'seed', 'series a', 'grant', 'bootstrapping'],
    text: "**Funding Landscape**\n\n**Bootstrapping:**\n- Best for: SaaS, services, lifestyle businesses\n- Pros: Full control, no dilution\n- Cons: Slower growth, limited runway\n\n**Pre-Seed ($50K-500K):**\n- Friends & family\n- Angel investors\n- Accelerators (Y Combinator, Techstars)\n\n**Seed ($500K-3M):**\n- Seed VCs\n- Angel syndicates (AngelList)\n- Crowdfunding\n\n**Series A ($3M-15M):**\n- Institutional VCs\n- Need traction + clear metrics\n\n**Grants:**\n- Government programs (SBIR, Innovate UK)\n- Corporate innovation programs\n\nWhat stage are you at?",
  },
  customer: {
    keywords: ['customer', 'user', 'target audience', 'who', 'persona', 'demographic', 'segment'],
    text: "**Customer Discovery**\n\n**Define Your ICP (Ideal Customer Profile):**\n- Demographics: Age, location, income\n- Psychographics: Values, interests, behavior\n- Pain points: What keeps them up at night?\n- Goals: What are they trying to achieve?\n\n**Research Methods:**\n- Customer interviews (10-15 minimum)\n- Surveys (Typeform/Google Forms)\n- Social media listening\n- Competitor review analysis\n\n**Personas to Consider:**\n- Decision maker (budget holder)\n- End user (daily user)\n- Champion (internal advocate)\n\n**Action:** Schedule 5 customer discovery calls this week.\n\nWant help crafting interview questions?",
  },
  metric: {
    keywords: ['metric', 'kpi', 'measure', 'analytics', 'data', 'track', 'dashboard', 'conversion'],
    text: "**Key Metrics to Track**\n\n**Acquisition Metrics:**\n- Website visitors\n- Sign-up rate\n- Cost per acquisition (CPA)\n- Channel performance\n\n**Activation Metrics:**\n- Time to first value\n- Onboarding completion rate\n- Feature adoption\n\n**Revenue Metrics:**\n- MRR / ARR\n- ARPU (Average Revenue Per User)\n- LTV:CAC ratio (aim for 3:1+)\n\n**Retention Metrics:**\n- Churn rate (<5% monthly is good)\n- DAU/MAU ratio\n- NPS score (50+ is excellent)\n\n**Tool Recommendations:**\n- Mixpanel or Amplitude (product analytics)\n- Stripe Dashboard (revenue)\n- Google Analytics (traffic)\n\nWhat's your biggest metric question?",
  },
  legal: {
    keywords: ['legal', 'incorporate', 'llc', 'corporation', 'patent', 'trademark', 'compliance', 'terms'],
    text: "**Legal Essentials**\n\n**Incorporation:**\n- Delaware C-Corp (for VC funding)\n- LLC (for bootstrapped businesses)\n- Cost: $500-2K (use Stripe Atlas or Clerky)\n\n**Must-Haves:**\n- Operating agreement / Bylaws\n- Founder vesting (4-year, 1-year cliff)\n- IP assignment agreements\n- Terms of Service + Privacy Policy\n\n**IP Protection:**\n- Trademark your brand name ($250-350)\n- Copyright automatically applies\n- Patents only if truly novel ($10K+)\n\n**Common Mistakes:**\n- No written co-founder agreement\n- Not vesting equity properly\n- Ignoring data privacy (GDPR/CCPA)\n\nWhat legal question do you have?",
  },
  burn: {
    keywords: ['burn', 'runway', 'cash', 'expense', 'cost', 'budget', 'spend'],
    text: "**Managing Your Burn Rate**\n\n**Calculate Your Runway:**\n- Monthly burn = Revenue - Expenses\n- Runway = Cash on hand ÷ Monthly burn\n- Target: 18-24 months minimum\n\n**Typical Startup Costs:**\n- Hosting: $50-500/mo\n- Tools & software: $200-500/mo\n- Marketing: $500-5K/mo\n- Contractors: $2K-10K/mo\n\n**Ways to Extend Runway:**\n- Cut non-essential expenses\n- Negotiate annual billing (savings)\n- Focus on revenue first\n- Consider revenue-based financing\n\n**Rule of Thumb:** Don't hire until you absolutely have to.\n\nWhat's your current burn rate?",
  },
  product: {
    keywords: ['product', 'feature', 'roadmap', 'prioritize', 'backlog', 'sprint', 'agile', 'development'],
    text: "**Product Strategy**\n\n**Prioritization Framework (ICE):**\n- Impact: How many users affected?\n- Confidence: How sure are we?\n- Ease: How hard to build?\n- Score = I x C x E (do highest first)\n\n**Roadmap Template:**\n- Now (1-3 months): Core features\n- Next (3-6 months): Growth features\n- Later (6-12 months): Nice-to-haves\n\n**Building Process:**\n1. Define user story\n2. Design wireframe\n3. Build MVP of feature\n4. Test with 5 users\n5. Ship or iterate\n\n**Anti-Patterns:**\n- Building before validating\n- Feature bloat\n- Ignoring user feedback\n\nWhat feature should you build next?",
  },
  default: {
    text: "Great question! Here's my advice:\n\n**Start With These Steps:**\n1. **Define** your core value proposition\n2. **Validate** with 10+ potential users\n3. **Build** a simple prototype\n4. **Test** with real users\n5. **Iterate** based on feedback\n\n**Key Principles:**\n- Ship fast, learn fast\n- Talk to users daily\n- Focus on one thing at a time\n- Revenue > vanity metrics\n\n**Resources:**\n- The Mom Test (book)\n- Y Combinator Startup School\n- Indie Hackers community\n\nWhat specific area would you like to dive deeper into?",
  },
};

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold">
        <Bot size={16} />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-linesoft bg-card px-4 py-3">
        <span className="h-2 w-2 animate-bounce rounded-full bg-gold/60 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-gold/60 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-gold/60" />
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  const renderText = (text) => {
    const lines = text.split('\n');
    return lines.map((line, lineIndex) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const rendered = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-bold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={lineIndex} className="flex gap-2 ml-1">
            <span className="text-gold">•</span>
            <span>{rendered.map((r, i) => typeof r === 'string' ? r.replace(/^[-*]\s/, '') : r)}</span>
          </div>
        );
      }

      return (
        <div key={lineIndex}>
          {lineIndex > 0 && <br />}
          {rendered}
        </div>
      );
    });
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[80%] items-end gap-3">
          <div className="flex flex-col items-end">
            <div className="rounded-2xl rounded-tr-sm bg-gold px-4 py-3 text-[12px] leading-relaxed text-[#171100]">
              {renderText(message.text)}
            </div>
            <span className="mt-1 text-[9px] text-text3">{message.time}</span>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-[#171100]">
            U
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold">
        <Bot size={16} />
      </div>
      <div className="flex max-w-[80%] flex-col">
        <div className="rounded-2xl rounded-tl-sm border-l-2 border-gold/40 bg-card px-4 py-3 text-[12px] leading-relaxed text-white">
          {renderText(message.text)}
        </div>
        <span className="mt-1 text-[9px] text-text3">{message.time}</span>
      </div>
    </div>
  );
}

export default function AIContent() {
  const showToast = useStore((s) => s.showToast);
  const { vibrate } = useHaptics();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const nextId = useRef(2);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const getResponse = (text) => {
    const lower = text.toLowerCase();

    for (const [key, data] of Object.entries(RESPONSES)) {
      if (key === 'default') continue;
      if (data.keywords.some((kw) => lower.includes(kw))) {
        return data.text;
      }
    }

    return RESPONSES.default.text;
  };

  const getNow = () => {
    const d = new Date();
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  const sendMessage = (text) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    vibrate();

    const userMsg = {
      id: nextId.current++,
      role: 'user',
      text: trimmed,
      time: getNow(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const delay = 1200 + Math.random() * 800;
    setTimeout(() => {
      const botMsg = {
        id: nextId.current++,
        role: 'bot',
        text: getResponse(trimmed),
        time: getNow(),
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, botMsg]);
      vibrate();
    }, delay);
  };

  const handleSend = () => {
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action) => {
    sendMessage(action);
  };

  return (
    <MainScreenShell>
      <div className="no-scrollbar px-[18px] pb-6">
        {/* Gold Header Card */}
        <div className="gold-card mt-3 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-grad text-[#171100]">
            <Bot size={23} />
          </div>
          <div className="mt-3 text-[23px] font-black">Foundators AI</div>
          <p className="mt-1 text-[11px] leading-5 text-text2">
            Your builder copilot. Ask anything about startups, tech, or growth.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="mt-4">
          <div className="flex items-center gap-2 text-[12px] font-extrabold text-text2">
            <Sparkles size={14} className="text-gold" />
            Quick Actions
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                onClick={() => handleQuickAction(action)}
                disabled={isTyping}
                className="rounded-xl border border-linesoft bg-card px-3 py-2.5 text-left text-[11px] font-medium text-text2 transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-50"
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="mt-5 space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 border-t border-linesoft bg-[#020202] px-[18px] py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => showToast('Voice input coming soon')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-text3 transition-colors hover:text-gold"
            aria-label="Voice input"
          >
            <Mic size={16} />
          </button>
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              disabled={isTyping}
              className="w-full rounded-full border border-linesoft bg-card px-4 py-2.5 pr-10 text-[12px] text-white placeholder:text-text3 focus:border-gold/40 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={() => showToast('Attach file coming soon')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 transition-colors hover:text-gold"
              aria-label="Attach file"
            >
              <Paperclip size={14} />
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-[#171100] transition-opacity disabled:opacity-30"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </MainScreenShell>
  );
}
