'use client';
import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Code2, Medal, Search, Trophy, Zap } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import SubpageHeader from '@/components/SubpageHeader';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { initialsAvatar } from '@/lib/avatar';

const challenges=[['Build a payments API','60 min','+500 pts'],['AI prompt optimization','30 min','+300 pts'],['React performance sprint','45 min','+400 pts']];

export default function Programmers(){
 const router=useRouter();
 const [q,setQ]=useState('');
 const [users, setUsers] = useState([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
   let cancelled = false;
   async function fetchUsers() {
     try {
       const snap = await getDocs(collection(db, 'users'));
       if (!cancelled) {
         const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
         setUsers(list.filter((u) => {
           const role = (u.role || '').toLowerCase();
           const skills = (u.skills || []).map(s => s.toLowerCase()).join(' ');
           return role.includes('engineer') || role.includes('developer') || role.includes('builder') ||
                  role.includes('full-stack') || role.includes('programmer') ||
                  skills.includes('development') || skills.includes('ai') || skills.includes('react');
         }));
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

 const filtered = useMemo(() => {
   if (!q) return users;
   const s = q.toLowerCase();
   return users.filter((u) =>
     (u.name || '').toLowerCase().includes(s) ||
     (u.role || '').toLowerCase().includes(s) ||
     (u.skills || []).join(' ').toLowerCase().includes(s)
   );
 }, [q, users]);

 return <MainScreenShell><SubpageHeader title="Programmer Hub"/><div className="no-scrollbar px-[18px] pb-6"><div className="gold-card mt-3 p-5"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-gold"><Code2 size={14}/> Builder network</div><h1 className="mt-2 text-[25px] font-black">Build. Collaborate.<br/><span className="text-gold-gradient">Ship.</span></h1><p className="mt-2 text-[11.5px] leading-5 text-text2">Find projects, teammates and challenges that match your stack.</p><button onClick={()=>router.push('/projects')} className="mt-4 flex items-center gap-2 rounded-full bg-gold-grad px-4 py-2.5 text-[11px] font-black text-[#171100]">Find projects <ArrowRight size={14}/></button></div><div className="mt-4 flex gap-2 rounded-2xl border border-linesoft bg-card p-3"><Search size={16} className="text-text3"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search React, Python, AI..." aria-label="Search programmers" className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-text3"/></div><div className="mt-5 flex items-center justify-between"><div><h2 className="text-[15px] font-extrabold">Featured builders</h2><p className="text-[10px] text-text3">Proof of work over follower count</p></div><button onClick={()=>router.push('/match/find_programmer')} className="text-[11px] font-bold text-gold">See all</button></div>{loading ? <p className="py-10 text-center text-[12.5px] text-text3">Loading programmers...</p> : filtered.length===0 && <p className="py-10 text-center text-[12.5px] text-text2">No builders match your search.</p>}<div className="mt-3 space-y-2.5">{filtered.map((user, idx) => {const skills = (user.skills || []).slice(0,3).join(' · ');return <div key={user.id} className="glass-card p-3.5"><div className="flex gap-3"><img src={user.avatar || initialsAvatar(user.name)} alt={`${user.name}'s avatar`} className="h-12 w-12 rounded-2xl object-cover"/><div className="min-w-0 flex-1"><div className="flex justify-between"><div><div className="text-[13px] font-extrabold">{user.name}</div><div className="text-[10px] text-text2">{user.role || 'Builder'}</div></div><span className="rounded-full bg-gold-grad px-2 py-1 text-[9px] font-black text-[#171100]">{Math.max(70, 95 - idx * 3)}%</span></div><div className="mt-2 flex flex-wrap gap-1.5">{(user.skills || []).slice(0,3).map(s=><span key={s} className="rounded-full border border-linesoft px-2 py-1 text-[9px] text-text2">{s}</span>)}</div><div className="mt-2 text-[9.5px] text-text3">{user.location || 'Remote'} · Builder {user.builderScore?.score || 'N/A'}</div></div></div><div className="mt-3 flex gap-2"><button onClick={()=>router.push(`/messages/${user.id}`)} className="flex-1 rounded-xl bg-gold-grad py-2.5 text-[10.5px] font-black text-[#171100]">Connect</button><button onClick={()=>router.push(`/profile/${user.id}`)} className="flex-1 rounded-xl border border-line py-2.5 text-[10.5px] font-bold text-gold-hi">View profile</button></div></div>})}</div><div className="mt-6"><div className="flex items-center justify-between mb-3"><div><h2 className="text-[15px] font-extrabold">Challenges</h2><p className="text-[10px] text-text3">Build skills, earn points</p></div></div><div className="space-y-2">{challenges.map(([name,time,pts],i)=><div key={i} className="glass-card flex items-center gap-3 p-3.5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold"><Trophy size={16}/></div><div className="flex-1"><div className="text-[12.5px] font-extrabold">{name}</div><div className="text-[10px] text-text3">{time} · {pts}</div></div><button className="rounded-full border border-gold px-3 py-1.5 text-[10px] font-bold text-gold">Start</button></div>)}</div></div><div className="mt-6 grid grid-cols-3 gap-2.5"><Stat icon={Code2} n={users.length} l="Builders"/><Stat icon={Zap} n="12" l="Active projects"/><Stat icon={Medal} n="48" l="Challenges done"/></div></div></MainScreenShell>}

function Stat({icon:Icon,n,l}){return <div className="glass-card p-3 text-center"><Icon size={16} className="mx-auto text-gold"/><div className="mt-1 font-display text-[17px] font-black">{n}</div><div className="text-[9px] text-text3">{l}</div></div>}
