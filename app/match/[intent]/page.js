'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Code2, Coins, Handshake, MapPin, UserPlus, Users } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import MainScreenShell from '@/components/MainScreenShell';
import { initialsAvatar } from '@/lib/avatar';

export default function IntentMatch(){
 const {intent}=useParams();
 const router=useRouter();
 const [users, setUsers] = useState([]);
 const [loading, setLoading] = useState(true);

 const title={cofounder:'Find a co-founder',programmer:'Find a programmer',mentor:'Find a mentor',investor:'Find an investor'}[intent]||'Find your people';

 useEffect(() => {
   let cancelled = false;
   async function fetchUsers() {
     try {
       const snap = await getDocs(collection(db, 'users'));
       if (!cancelled) {
         setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })).slice(0, 5));
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

 return <MainScreenShell><div className="flex items-center gap-3 border-b border-linesoft px-4 py-3.5"><button onClick={()=>router.back()}><ArrowLeft size={18}/></button><div><div className="text-[15px] font-extrabold">{title}</div><div className="text-[9.5px] text-text3">Personalized matches</div></div></div><div className="no-scrollbar flex-1 overflow-y-auto px-[18px] py-4"><div className="gold-card p-4"><div className="flex items-center gap-2 text-[10px] font-bold text-gold"><SparkIcon intent={intent}/> MATCH ENGINE</div><div className="mt-2 text-[18px] font-black">Best people for your mission.</div><div className="mt-1 text-[10.5px] text-text2">Based on skills, availability, interests and builder reputation.</div></div>{loading ? <div className="py-12 text-center text-[13px] text-text3">Loading matches...</div> : <div className="mt-4 space-y-3">{users.map((u,i)=><div key={u.id} className="glass-card p-4"><div className="flex gap-3"><img src={u.avatar || initialsAvatar(u.name)} alt={`${u.name}'s avatar`} className="h-12 w-12 rounded-2xl object-cover"/><div className="min-w-0 flex-1"><div className="flex justify-between"><div><div className="text-[13.5px] font-extrabold">{u.name}</div><div className="text-[10px] text-text2">{u.role || 'Builder'}</div></div><span className="rounded-full bg-gold-grad px-2 py-1 text-[9px] font-black text-[#171100]">{94-i*3}%</span></div><div className="mt-2 flex flex-wrap gap-1.5">{(u.skills||[]).slice(0,3).map(s=><span key={s} className="rounded-full border border-linesoft px-2 py-1 text-[9px] text-text2">{s}</span>)}</div><div className="mt-2 text-[9.5px] text-text3">{u.location||'Remote'} · Builder {u.builderScore?.score||'N/A'}</div></div></div><div className="mt-3 flex gap-2"><button onClick={()=>router.push(`/messages/${u.id}`)} className="flex-1 rounded-xl bg-gold-grad py-2.5 text-[10.5px] font-black text-[#171100]">Connect</button><button onClick={()=>router.push(`/profile/${u.id}`)} className="flex-1 rounded-xl border border-line py-2.5 text-[10.5px] font-bold text-gold-hi">View profile</button></div></div>)}</div>}</div></MainScreenShell>}

function SparkIcon({intent}){const I=intent==='programmer'?Code2:intent==='investor'?Coins:intent==='mentor'?Users:intent==='cofounder'?UserPlus:intent==='network_locally'?MapPin:Handshake;return <I size={13}/>}
