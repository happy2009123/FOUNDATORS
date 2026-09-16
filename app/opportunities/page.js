'use client';
import { useMemo, useRef, useState } from 'react';
import { BriefcaseBusiness, Coins, Handshake, MapPin, Search, Sparkles } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import SubpageHeader from '@/components/SubpageHeader';
import ScrollToTop from '@/components/ScrollToTop';
import EmptyState from '@/components/EmptyState';
import { useStore } from '@/lib/store';

const items=[
 {title:'Senior React Builder',org:'AgriFlow',loc:'Remote · ₹80k–₹1.5L / month',type:'job',match:'94%'},
 {title:'Seed Partner',org:'Early-stage climate startups',loc:'India · ₹10L–₹50L',type:'investment',match:'88%'},
 {title:'Growth Partner',org:'B2B SaaS launch team',loc:'Mumbai / Remote',type:'partnership',match:'91%'},
 {title:'Mentor: Product Strategy',org:'Weekly founder sessions',loc:'Remote',type:'mentorship',match:'86%'},
];
const cats=['All','Jobs','Freelance','Investment','Funding','Mentorship','Partnerships'];
const catMap={Jobs:'job',Freelance:'freelance',Investment:'investment',Funding:'funding',Mentorship:'mentorship',Partnerships:'partnership'};

 export default function Opportunities(){
 const [cat,setCat]=useState('All');
 const [q,setQ]=useState('');
 const showToast=useStore((s)=>s.showToast);
 const scrollRef=useRef(null);
 const filtered=useMemo(()=>items.filter(it=>{
  if(cat!=='All'&&it.type!==catMap[cat]) return false;
  if(q){
   const s=q.toLowerCase();
   return it.title.toLowerCase().includes(s)||it.org.toLowerCase().includes(s)||it.loc.toLowerCase().includes(s);
  }
  return true;
 }),[cat,q]);

 return <MainScreenShell><SubpageHeader title="Opportunities"/><div ref={scrollRef} className="no-scrollbar flex-1 overflow-y-auto px-[18px] pb-6"><div className="gold-card mt-3 p-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-gold"><Sparkles size={13}/> Personalized for you</div><div className="mt-2 text-[19px] font-black">246 live opportunities</div><div className="mt-1 text-[10.5px] text-text2">Matched to your skills, mission and location.</div></div><div className="mt-3 flex items-center gap-2 rounded-2xl border border-linesoft bg-card px-3.5 py-3"><Search size={16} className="text-text3"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search jobs, funding, projects..." aria-label="Search opportunities" className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-text3"/></div><div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">{cats.map(c=><button key={c} onClick={()=>setCat(c)} className={`whitespace-nowrap rounded-full border px-3 py-2 text-[10.5px] font-bold ${cat===c?'border-transparent bg-gold-grad text-[#171100]':'border-linesoft text-text2'}`}>{c}</button>)}</div>{filtered.length===0?<EmptyState icon={Search} title="No opportunities found" description="Try adjusting your search or category filters." />:<div className="mt-5 space-y-3">{filtered.map((it,i)=><div key={it.title} className="glass-card p-4"><div className="flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line text-gold">{i%3===0?<BriefcaseBusiness size={18}/>:i%3===1?<Coins size={18}/>:<Handshake size={18}/>}</div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><div><div className="text-[13px] font-extrabold">{it.title}</div><div className="text-[10.5px] text-text2">{it.org}</div></div><span className="rounded-full bg-gold-grad px-2 py-1 text-[9px] font-black text-[#171100]">{it.match}</span></div><div className="mt-2 flex items-center gap-1 text-[10.5px] text-text3"><MapPin size={11}/>{it.loc}</div></div></div><div className="mt-3 flex justify-between items-center"><span className="text-[11px] font-bold text-gold-hi capitalize">{it.type}</span><button onClick={()=>showToast(`Applied to ${it.title}`)} className="rounded-full bg-gold-grad px-4 py-2 text-[11px] font-black text-[#171100]">Apply</button></div></div>)}</div>}</div><ScrollToTop scrollRef={scrollRef}/></MainScreenShell>
}
