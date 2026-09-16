'use client';

import { useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BriefcaseBusiness, Code2, Coins, Lightbulb, MapPin, MessageCircle, Plus, Rocket, Sparkles, Target, UserPlus, Users, Zap } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import TopBar from '@/components/TopBar';
import StoriesBar from '@/components/StoriesBar';
import PullToRefresh from '@/components/PullToRefresh';
import ScrollToTop from '@/components/ScrollToTop';
import FeedAlgorithm from '@/components/FeedAlgorithm';
import { useStore } from '@/lib/store';

const quick = [
  ['idea','Start a business',Lightbulb,'/ideas'], ['cofounder','Co-founder',UserPlus,'/match/find_cofounder'], ['programmer','Programmer',Code2,'/programmers'], ['funding','Funding',Coins,'/opportunities'],
  ['work','Find work',BriefcaseBusiness,'/opportunities'], ['mentor','Mentor',Users,'/match/find_mentor'], ['project','Join project',Rocket,'/projects'], ['learn','Learn',Zap,'/challenges'],
];

const radar = [
  {score:'94%', title:'Co-founder match', name:'Rohan Singh', meta:'SaaS · AI · Delhi', icon:UserPlus, href:'/match/find_cofounder'},
  {score:'91%', title:'Developer project', name:'AgriFlow', meta:'React · Python · Remote', icon:Code2, href:'/projects'},
  {score:'87%', title:'Funding opportunity', name:'Seed Builder Fund', meta:'Early stage · India', icon:Coins, href:'/opportunities'},
  {score:'92%', title:'Event nearby', name:'Founder Night Kolkata', meta:'Tonight · 12 km away', icon:MapPin, href:'/events'},
];

export default function HomePage(){
 const router=useRouter(); const profile=useStore(s=>s.profile);
 const scrollRef=useRef(null);
 const handleRefresh=useCallback(()=>new Promise(r=>setTimeout(r,1200)),[]);

 return <MainScreenShell><TopBar/>
  <StoriesBar />
  <PullToRefresh onRefresh={handleRefresh}>
  <div ref={scrollRef} className="no-scrollbar pb-5">
   <div className="page-enter px-[18px] pt-2">
    <div className="gold-card relative overflow-hidden p-5"><div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[rgba(217,172,61,.12)] opacity-30"/><div className="relative"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-gold"><Sparkles size={13}/> Opportunity Radar</div><h1 className="mt-2 text-[24px] font-black leading-tight">What are you<br/><span className="text-gold-gradient">building today?</span></h1><p className="mt-2 max-w-[290px] text-[11.5px] leading-5 text-text2">Your network is ready. Find people, projects and opportunities matched to you.</p><button onClick={()=>router.push('/match')} className="mt-4 flex items-center gap-2 rounded-full bg-gold-grad px-4 py-2.5 text-[11.5px] font-black text-[#171100]">Explore matches <ArrowRight size={14}/></button></div></div>
   </div>
   <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-[18px] py-4">{quick.map(([key,label,Icon,href])=><button key={key} onClick={()=>router.push(href)} className="flex w-[82px] flex-none flex-col items-center gap-2 text-center"><span className="flex h-[50px] w-[50px] items-center justify-center rounded-2xl border border-line bg-[rgba(217,172,61,.06)] text-gold"><Icon size={19}/></span><span className="text-[10px] font-semibold leading-tight text-text2">{label}</span></button>)}</div>
   <Section title="Your 90-Day Mission" action="View plan" onClick={()=>router.push('/projects')}><div className="glass-card p-4"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-grad text-[#171100]"><Target size={20}/></div><div className="min-w-0 flex-1"><div className="text-[14px] font-extrabold">Launch my startup</div><div className="mt-0.5 text-[11px] text-text2">Prototype → first 10 customers</div></div><span className="text-[14px] font-black text-gold">68%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full w-[68%] rounded-full bg-gold-grad"/></div><div className="mt-3 flex justify-between text-[10px] text-text3"><span>Day 1 · Idea</span><span>Day 30 · Prototype</span><span>Day 90 · Launch</span></div></div></Section>
   <Section title="Best matches for you" action="See all" onClick={()=>router.push('/match')}><div className="no-scrollbar flex gap-3 overflow-x-auto">{radar.map((r)=><button key={r.title} onClick={()=>router.push(r.href)} className="gold-card min-w-[220px] p-4 text-left"><div className="flex items-center justify-between"><span className="rounded-full bg-gold-grad px-2 py-1 text-[10px] font-black text-[#171100]">{r.score} match</span><r.icon size={17} className="text-gold"/></div><div className="mt-4 text-[14px] font-extrabold">{r.title}</div><div className="mt-1 text-[12px] font-semibold">{r.name}</div><div className="mt-1 text-[10.5px] text-text2">{r.meta}</div></button>)}</div></Section>
   <Section title="Build with the network" action="Open projects" onClick={()=>router.push('/projects')}><div className="grid grid-cols-2 gap-2.5"><Mini icon={Code2} title="Programmers" value="128 projects" onClick={()=>router.push('/programmers')}/><Mini icon={Users} title="Teams" value="64 looking now" onClick={()=>router.push('/projects')}/><Mini icon={Coins} title="Opportunities" value="246 live" onClick={()=>router.push('/opportunities')}/><Mini icon={MessageCircle} title="Messages" value="3 new" onClick={()=>router.push('/messages')}/></div></Section>
   <Section title="Ask the Network" action="Ask" onClick={()=>router.push('/create')}><button onClick={()=>router.push('/create')} className="glass-card flex w-full items-center gap-3 p-4 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-gold"><Plus size={18}/></span><span className="flex-1"><span className="block text-[13px] font-bold">What do you need help with?</span><span className="block text-[10.5px] text-text3">&ldquo;I need a Flutter developer in Kolkata...&rdquo;</span></span><ArrowRight size={16} className="text-text3"/></button></Section>
   <FeedAlgorithm />
   <div className="mx-[18px] mt-5 rounded-2xl border border-line bg-[rgba(217,172,61,.06)] p-4 text-center"><div className="text-[12px] font-extrabold">Welcome back, {profile?.name?.split(' ')[0] || 'there'}.</div><div className="mt-1 text-[10.5px] text-text2">Keep building. Your next opportunity may be one match away.</div></div>
  </div>
  </PullToRefresh>
  <ScrollToTop scrollRef={scrollRef}/>
 </MainScreenShell>
}
function Section({title,action,onClick,children}){return <section className="mt-5"><div className="mb-2.5 flex items-center justify-between px-[18px]"><h2 className="text-[16px] font-extrabold">{title}</h2><button onClick={onClick} className="text-[11px] font-bold text-gold">{action}</button></div><div className="px-[18px]">{children}</div></section>}
function Mini({icon:Icon,title,value,onClick}){return <button onClick={onClick} className="glass-card flex min-h-[105px] flex-col justify-between p-3.5 text-left"><Icon size={18} className="text-gold"/><div><div className="text-[12px] font-extrabold">{title}</div><div className="mt-0.5 text-[10px] text-text3">{value}</div></div></button>}
