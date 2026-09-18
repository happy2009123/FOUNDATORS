'use client';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Code2, Coins, Filter, Search, Sparkles, UserPlus, Users } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import TopBar from '@/components/TopBar';
import PullToRefresh from '@/components/PullToRefresh';
import ScrollToTop from '@/components/ScrollToTop';
import EmptyState from '@/components/EmptyState';
import Avatar from '@/components/Avatar';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

const filters=['All','Co-founder','Programmer','Investor','Mentor','Freelancer'];

export default function DiscoverPage(){
 const router=useRouter();
 const [filter,setFilter]=useState('All');
 const [q,setQ]=useState('');
 const [near,setNear]=useState(false);
 const scrollRef=useRef(null);
 const [users, setUsers] = useState({});
 const [loading, setLoading] = useState(true);
 const handleRefresh=useCallback(()=>new Promise(r=>setTimeout(r,1200)),[]);

 useEffect(() => {
   let cancelled = false;
   async function fetchUsers() {
     try {
       const snap = await getDocs(collection(db, 'users'));
       if (!cancelled) {
         const map = {};
         snap.docs.forEach((d) => { map[d.id] = { id: d.id, ...d.data() }; });
         setUsers(map);
       }
     } catch {
       // silently fail
     } finally {
       if (!cancelled) setLoading(false);
     }
   }
   fetchUsers();
   return () => { cancelled = true; };
 }, []);

 const matches = useMemo(() => {
   return Object.values(users).map((u, i) => ({
     key: u.id,
     score: Math.max(70, 95 - i * 3),
     type: i % 3 === 0 ? 'Co-founder' : i % 3 === 1 ? 'Programmer' : 'Investor',
     reason: (u.skills || []).slice(0, 3).join(' + ') || 'General',
     need: 'Open to connect',
     location: u.location || 'Unknown',
   }));
 }, [users]);

 const list=useMemo(()=>matches.filter(m=>{
   const user = users[m.key];
   if (!user) return false;
   if (filter!=='All' && m.type!==filter) return false;
   if (q && !`${user.name||''} ${user.role||''} ${m.reason}`.toLowerCase().includes(q.toLowerCase())) return false;
   if (near && m.location!=='Bangalore') return false;
   return true;
 }),[filter,q,near,matches,users]);

 return <MainScreenShell><TopBar/>
  <PullToRefresh onRefresh={handleRefresh}>
  <div ref={scrollRef} className="no-scrollbar overflow-y-auto px-[18px] pb-5">
   <div className="page-enter pt-2">
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-gold"><Sparkles size={13}/> Foundators Match</div>
    <h1 className="mt-2 text-[25px] font-black">Find your <span className="text-gold-gradient">people.</span></h1>
    <p className="mt-1 text-[11.5px] text-text2">Match by skills, mission, experience and what you need right now.</p>
   </div>
   <div className="mt-4 flex items-center gap-2 rounded-2xl border border-linesoft bg-card px-3.5 py-3">
    <Search size={17} className="text-text3"/>
    <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search people or skills..." className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-text3"/>
    <button onClick={()=>setNear(!near)} className={`rounded-full p-2 ${near?'bg-gold-grad text-[#171100]':'bg-white/5 text-text3'}`} aria-label="Toggle nearby filter"><Filter size={14}/></button>
   </div>
   <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">{filters.map(f=><button key={f} onClick={()=>setFilter(f)} className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-[11px] font-bold ${filter===f?'border-transparent bg-gold-grad text-[#171100]':'border-linesoft text-text2'}`}>{f}</button>)}</div>
   <div className="mt-5 flex items-center justify-between">
    <div><div className="text-[14px] font-extrabold">{near?'Near you':'Top matches'}</div><div className="text-[10px] text-text3">{list.length} people ready to connect</div></div>
   </div>
   {loading ? (
    <div className="py-12 text-center text-[13px] text-text3">Loading users...</div>
   ) : list.length===0 ? (
    <EmptyState icon={Users} title="No matches found" description="Try adjusting your search or filters." />
   ) : (
    <div className="mt-3 space-y-3 stagger-children">
     {list.map(m=>{const user=users[m.key];return <MatchCard key={m.key} match={m} user={user} onOpen={()=>router.push(`/profile/${m.key}`)} onConnect={()=>router.push('/messages')} onInvite={()=>router.push('/create')}/>})}
    </div>
   )}
   <div className="mt-6 mb-2 grid grid-cols-2 gap-2.5 stagger-children">
    <Action icon={UserPlus} title="Find co-founder" onClick={()=>router.push('/match/find_cofounder')}/>
    <Action icon={Code2} title="Find programmer" onClick={()=>router.push('/match/find_programmer')}/>
    <Action icon={Coins} title="Find investor" onClick={()=>router.push('/opportunities')}/>
    <Action icon={Users} title="Find mentor" onClick={()=>router.push('/match/find_mentor')}/>
   </div>
  </div>
  </PullToRefresh>
  <ScrollToTop scrollRef={scrollRef}/>
 </MainScreenShell>
}

function MatchCard({match,user,onOpen,onConnect,onInvite}){return <div className="gold-card p-4"><div className="flex gap-3"><Avatar src={user?.avatar} name={user?.name} size={48} className="rounded-2xl" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><button onClick={onOpen} className="text-[14px] font-extrabold">{user?.name}</button><div className="text-[10.5px] text-text2">{user?.role}</div></div><div className="rounded-full bg-gold-grad px-2 py-1 text-[9.5px] font-black text-[#171100]">{match.score}%</div></div><div className="mt-2 text-[10.5px] text-gold-hi">{match.type} · {match.reason}</div><div className="mt-1 text-[10px] text-text3">{match.need}</div></div></div><div className="mt-3 flex gap-2"><button onClick={onConnect} className="flex-1 rounded-xl bg-gold-grad py-2.5 text-[10.5px] font-black text-[#171100]">Connect</button><button onClick={onInvite} className="flex-1 rounded-xl border border-line py-2.5 text-[10.5px] font-bold text-gold-hi">Invite to project</button></div></div>}

function Action({icon:Icon,title,onClick}){return <button onClick={onClick} className="glass-card flex flex-col items-center gap-2 p-3 text-center"><Icon size={18} className="text-gold"/><span className="text-[10px] font-bold text-text2">{title}</span></button>}
