'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BriefcaseBusiness, Code2, Coins, Lightbulb, MapPin, MessageCircle, Plus, Rocket, Sparkles, Target, UserPlus, Users, Zap } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import TopBar from '@/components/TopBar';
import StoriesBar from '@/components/StoriesBar';
import PullToRefresh from '@/components/PullToRefresh';
import ScrollToTop from '@/components/ScrollToTop';
import FeedAlgorithm from '@/components/FeedAlgorithm';
import { useStore } from '@/lib/store';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';

const quick = [
  ['idea','Start a business',Lightbulb,'/ideas'], ['cofounder','Co-founder',UserPlus,'/match/find_cofounder'], ['programmer','Programmer',Code2,'/programmers'], ['funding','Funding',Coins,'/opportunities'],
  ['work','Find work',BriefcaseBusiness,'/opportunities'], ['mentor','Mentor',Users,'/match/find_mentor'], ['project','Join project',Rocket,'/projects'], ['learn','Learn',Zap,'/challenges'],
];

export default function HomePage(){
 const router=useRouter(); const profile=useStore(s=>s.profile);
 const scrollRef=useRef(null);
 const handleRefresh=useCallback(()=>new Promise(r=>setTimeout(r,1200)),[]);
 const [matches, setMatches] = useState([]);
 const [userProjects, setUserProjects] = useState([]);

 useEffect(() => {
   if (!profile?.id) return;
   let cancelled = false;

   const fetchMatches = async () => {
     try {
       const usersSnap = await getDocs(query(collection(db, 'users'), limit(5)));
       const users = [];
       usersSnap.forEach(d => {
         if (d.id !== profile.id) users.push({ id: d.id, ...d.data() });
       });
       if (!cancelled) setMatches(users.slice(0, 4));
     } catch (err) {
       console.error('Failed to fetch matches:', err);
     }
   };

   const fetchProjects = async () => {
     try {
       const postsSnap = await getDocs(query(collection(db, 'posts'), limit(5)));
       const projects = [];
       postsSnap.forEach(d => {
         const data = d.data();
         if (data.authorKey === profile.id && data.text) {
           projects.push({ id: d.id, ...data });
         }
       });
       if (!cancelled) setUserProjects(projects);
     } catch (err) {
       console.error('Failed to fetch projects:', err);
     }
   };

   fetchMatches();
   fetchProjects();
   return () => { cancelled = true; };
 }, [profile?.id]);

 const radar = matches.length > 0
   ? matches.map((u, i) => ({
       score: `${90 - i * 3}%`,
       title: 'Community member',
       name: u.name || 'Unknown',
       meta: u.role || u.bio?.slice(0, 40) || 'Founder',
       icon: UserPlus,
       href: `/profile/${u.id}`,
     }))
   : [];

 const mission = userProjects.length > 0
   ? { title: userProjects[0].text.slice(0, 40), progress: 0 }
   : null;

 return <MainScreenShell><TopBar/>
  <StoriesBar />
  <PullToRefresh onRefresh={handleRefresh}>
  <div ref={scrollRef} className="no-scrollbar pb-5">
   <div className="page-enter px-[18px] pt-2">
    <div className="gold-card relative overflow-hidden p-5"><div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[rgba(217,172,61,.12)] opacity-30"/><div className="relative"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-gold"><Sparkles size={13}/> Opportunity Radar</div><h1 className="mt-2 text-[24px] font-black leading-tight">What are you<br/><span className="text-gold-gradient">building today?</span></h1><p className="mt-2 max-w-[290px] text-[11.5px] leading-5 text-text2">Your network is ready. Find people, projects and opportunities matched to you.</p><button onClick={()=>router.push('/match')} className="mt-4 flex items-center gap-2 rounded-full bg-gold-grad px-4 py-2.5 text-[11.5px] font-black text-[#171100]">Explore matches <ArrowRight size={14}/></button></div></div>
   </div>
   <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-[18px] py-4">{quick.map(([key,label,Icon,href])=><button key={key} onClick={()=>router.push(href)} className="flex w-[82px] flex-none flex-col items-center gap-2 text-center"><span className="flex h-[50px] w-[50px] items-center justify-center rounded-2xl border border-line bg-[rgba(217,172,61,.06)] text-gold"><Icon size={19}/></span><span className="text-[10px] font-semibold leading-tight text-text2">{label}</span></button>)}</div>
   {mission && (
     <Section title="Your Project" action="View" onClick={()=>router.push('/projects')}><div className="glass-card p-4"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-grad text-[#171100]"><Target size={20}/></div><div className="min-w-0 flex-1"><div className="text-[14px] font-extrabold truncate">{mission.title}</div><div className="mt-0.5 text-[11px] text-text2">Your latest post</div></div></div></div></Section>
   )}
   <Section title="Best matches for you" action="See all" onClick={()=>router.push('/match')}>
     {radar.length === 0 ? (
       <div className="glass-card p-4 text-center">
         <p className="text-[12px] text-text2">Find people to match with.</p>
         <button onClick={()=>router.push('/match')} className="mt-2 rounded-full bg-gold-grad px-4 py-2 text-[11px] font-bold text-[#171100]">Explore matches</button>
       </div>
     ) : (
       <div className="no-scrollbar flex gap-3 overflow-x-auto">{radar.map((r)=><button key={r.name} onClick={()=>router.push(r.href)} className="gold-card min-w-[220px] p-4 text-left"><div className="flex items-center justify-between"><span className="rounded-full bg-gold-grad px-2 py-1 text-[10px] font-black text-[#171100]">{r.score} match</span><r.icon size={17} className="text-gold"/></div><div className="mt-4 text-[14px] font-extrabold">{r.title}</div><div className="mt-1 text-[12px] font-semibold">{r.name}</div><div className="mt-1 text-[10.5px] text-text2">{r.meta}</div></button>)}</div>
     )}
   </Section>
   <Section title="Build with the network" action="Open projects" onClick={()=>router.push('/projects')}><div className="grid grid-cols-2 gap-2.5"><Mini icon={Code2} title="Programmers" value="128 projects" onClick={()=>router.push('/programmers')}/><Mini icon={Users} title="Teams" value="64 looking now" onClick={()=>router.push('/projects')}/><Mini icon={Coins} title="Opportunities" value="246 live" onClick={()=>router.push('/opportunities')}/><Mini icon={MessageCircle} title="Messages" value="3 new" onClick={()=>router.push('/messages')}/></div></Section>
   <Section title="Ask the Network" action="Ask" onClick={()=>router.push('/create')}><button onClick={()=>router.push('/create')} className="glass-card flex w-full items-center gap-3 p-4 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-gold"><Plus size={18}/></span><span className="flex-1"><span className="block text-[13px] font-bold">What do you need help with?</span><span className="block text-[10.5px] text-text3">&ldquo;I need a Flutter developer in Kolkata...&rdquo;</span></span><ArrowRight size={16} className="text-text3"/></button></Section>
    <FeedAlgorithm />
    {useStore.getState().posts.length === 0 && (
      <div className="mx-[18px] mt-5 rounded-2xl border border-gold/20 bg-gold/5 p-5 text-center">
        <div className="text-[22px]">&#128640;</div>
        <div className="mt-2 text-[14px] font-extrabold">Your feed is empty</div>
        <div className="mt-1 text-[11.5px] text-text2 max-w-[260px] mx-auto">Follow founders, builders and creators to see their posts here. Start by exploring matches.</div>
        <button onClick={() => router.push('/match')} className="mt-3 rounded-full bg-gold-grad px-5 py-2.5 text-[12px] font-black text-[#171100]">Find people to follow</button>
      </div>
    )}
    <div className="mx-[18px] mt-5 rounded-2xl border border-line bg-[rgba(217,172,61,.06)] p-4 text-center"><div className="text-[12px] font-extrabold">Welcome back, {profile?.name?.split(' ')[0] || 'there'}.</div><div className="mt-1 text-[10.5px] text-text2">Keep building. Your next opportunity may be one match away.</div></div>
  </div>
  </PullToRefresh>
  <ScrollToTop scrollRef={scrollRef}/>
 </MainScreenShell>
}
function Section({title,action,onClick,children}){return <section className="mt-5"><div className="mb-2.5 flex items-center justify-between px-[18px]"><h2 className="text-[16px] font-extrabold">{title}</h2><button onClick={onClick} className="text-[11px] font-bold text-gold">{action}</button></div><div className="px-[18px]">{children}</div></section>}
function Mini({icon:Icon,title,value,onClick}){return <button onClick={onClick} className="glass-card flex min-h-[105px] flex-col justify-between p-3.5 text-left"><Icon size={18} className="text-gold"/><div><div className="text-[12px] font-extrabold">{title}</div><div className="mt-0.5 text-[10px] text-text3">{value}</div></div></button>}
