'use client';
import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Code2, Medal, Search, Trophy, Zap } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import SubpageHeader from '@/components/SubpageHeader';
import { getSupabase } from '@/lib/supabase/client';
import { mapRows } from '@/lib/supabase/db';
import { initialsAvatar } from '@/lib/avatar';
import { useStore } from '@/lib/store';

export default function Programmers(){
 const router=useRouter();
 const [q,setQ]=useState('');
 const [users, setUsers] = useState([]);
 const [loading, setLoading] = useState(true);
 const [stats, setStats] = useState({ projects: '…', done: '…' });
 const mySkillsArr = useStore((s) => s.profile?.skills);
 const mySkills = useMemo(() => new Set((mySkillsArr || []).map((x) => String(x).toLowerCase())), [mySkillsArr]);

 useEffect(() => {
   let cancelled = false;
   async function fetchUsers() {
    try {
      const supabase = getSupabase();
      if (!supabase) return;
       const { data, error } = await supabase.from('profiles').select('*').limit(100);
       if (error) throw error;
       // Real counts: total projects + challenges I've completed.
       const [{ count }, authRes] = await Promise.all([
         supabase.from('projects').select('id', { count: 'exact', head: true }),
         supabase.auth.getUser(),
       ]);
       const meId = authRes?.user?.id;
       let done = null;
       if (meId) {
         const { count: doneCount } = await supabase
           .from('user_achievements')
           .select('id', { count: 'exact', head: true })
           .eq('user_id', meId);
         done = doneCount;
       }
       if (!cancelled) {
         setStats({ projects: count ?? '…', done: done ?? '…' });
       }
      if (!cancelled) {
        const list = mapRows(data || []);
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

 return <MainScreenShell><SubpageHeader title="Programmer Hub"/><div className="no-scrollbar px-[18px] pb-6"><div className="gold-card mt-3 p-5"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-gold"><Code2 size={14}/> Builder network</div><h1 className="mt-2 text-[25px] font-black">Build. Collaborate.<br/><span className="text-gold-gradient">Ship.</span></h1><p className="mt-2 text-[11.5px] leading-5 text-text2">Find projects, teammates and challenges that match your stack.</p><button onClick={()=>router.push('/projects')} className="mt-4 flex items-center gap-2 rounded-full bg-gold-grad px-4 py-2.5 text-[11px] font-black text-[#171100]">Find projects <ArrowRight size={14}/></button></div><div className="mt-4 flex gap-2 rounded-2xl border border-linesoft bg-card p-3"><Search size={16} className="text-text3"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search React, Python, AI..." aria-label="Search programmers" className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-text3"/></div><div className="mt-5 flex items-center justify-between"><div><h2 className="text-[15px] font-extrabold">Featured builders</h2><p className="text-[10px] text-text3">Proof of work over follower count</p></div><button onClick={()=>router.push('/match/find_programmer')} className="text-[11px] font-bold text-gold">See all</button></div>{loading ? <p className="py-10 text-center text-[12.5px] text-text3">Loading programmers...</p> : filtered.length===0 && <p className="py-10 text-center text-[12.5px] text-text2">No builders match your search.</p>}<div className="mt-3 space-y-2.5">{filtered.map((user, idx) => {const skills = (user.skills || []).slice(0,3).join(' · ');const shared=(user.skills||[]).filter(s=>mySkills.has(String(s).toLowerCase())).length;return <div key={user.id} className="glass-card p-3.5"><div className="flex gap-3"><img src={user.avatar || initialsAvatar(user.name)} alt={`${user.name}'s avatar`} className="h-12 w-12 rounded-2xl object-cover"/><div className="min-w-0 flex-1"><div className="flex justify-between"><div><div className="text-[13px] font-extrabold">{user.name}</div><div className="text-[10px] text-text2">{user.role || 'Builder'}</div></div>{user.verified && <span className="rounded-full bg-gold-grad px-2 py-1 text-[9px] font-black text-[#171100]">Verified</span>}</div><div className="mt-2 flex flex-wrap gap-1.5">{(user.skills || []).slice(0,3).map(s=><span key={s} className="rounded-full border border-linesoft px-2 py-1 text-[9px] text-text2">{s}</span>)}</div><div className="mt-2 text-[9.5px] text-text3">{user.location || 'Remote'}{shared>0 ? ` · ${shared} shared skill${shared>1?'s':''}` : ''}</div></div></div><div className="mt-3 flex gap-2"><button onClick={()=>router.push(`/messages/${user.id}`)} className="flex-1 rounded-xl bg-gold-grad py-2.5 text-[10.5px] font-black text-[#171100]">Connect</button><button onClick={()=>router.push(`/profile/${user.id}`)} className="flex-1 rounded-xl border border-line py-2.5 text-[10.5px] font-bold text-gold-hi">View profile</button></div></div>})}</div><div className="mt-6 grid grid-cols-3 gap-2.5"><Stat icon={Code2} n={users.length} l="Builders"/><Stat icon={Zap} n={stats.projects} l="Projects"/><Stat icon={Medal} n={stats.done} l="Challenges done"/></div></div></MainScreenShell>}

function Stat({icon:Icon,n,l}){return <div className="glass-card p-3 text-center"><Icon size={16} className="mx-auto text-gold"/><div className="mt-1 font-display text-[17px] font-black">{n}</div><div className="text-[9px] text-text3">{l}</div></div>}
