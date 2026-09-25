'use client';
import { useMemo, useRef, useState, useEffect } from 'react';
import { BriefcaseBusiness, Coins, Handshake, Search, Sparkles } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import SubpageHeader from '@/components/SubpageHeader';
import ScrollToTop from '@/components/ScrollToTop';
import EmptyState from '@/components/EmptyState';
import { useStore } from '@/lib/store';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

const cats = ['All', 'Jobs', 'Freelance', 'Investment', 'Funding', 'Mentorship', 'Partnerships'];
const catMap = { Jobs: 'job', Freelance: 'freelance', Investment: 'investment', Funding: 'funding', Mentorship: 'mentorship', Partnerships: 'partnership' };

export default function Opportunities() {
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');
  const showToast = useStore((s) => s.showToast);
  const scrollRef = useRef(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOpportunities() {
      try {
        const q2 = query(collection(db, 'opportunities'), orderBy('createdAt', 'desc'), limit(30));
        const snap = await getDocs(q2);
        const fetched = [];
        snap.forEach((doc) => fetched.push({ id: doc.id, ...doc.data() }));
        setItems(fetched);
      } catch (err) {
        console.error('Failed to fetch opportunities:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOpportunities();
  }, []);

  const filtered = useMemo(() => items.filter((it) => {
    if (cat !== 'All' && it.type !== catMap[cat]) return false;
    if (q) {
      const s = q.toLowerCase();
      return (it.title || '').toLowerCase().includes(s) || (it.org || '').toLowerCase().includes(s) || (it.loc || '').toLowerCase().includes(s);
    }
    return true;
  }), [items, cat, q]);

  return (
    <MainScreenShell>
      <SubpageHeader title="Opportunities" />
      <div ref={scrollRef} className="no-scrollbar flex-1 overflow-y-auto px-[18px] pb-6">
        <div className="gold-card mt-3 p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-gold"><Sparkles size={13} /> Personalized for you</div>
          <div className="mt-2 text-[19px] font-black">{items.length > 0 ? `${items.length} live opportunities` : 'No opportunities yet'}</div>
          <div className="mt-1 text-[10.5px] text-text2">{items.length > 0 ? 'Matched to your skills, mission and location.' : 'Check back soon — new opportunities appear regularly.'}</div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-linesoft bg-card px-3.5 py-3">
          <Search size={16} className="text-text3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs, funding, projects..." aria-label="Search opportunities" className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-text3" />
        </div>

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`whitespace-nowrap rounded-full border px-3 py-2 text-[10.5px] font-bold ${cat === c ? 'border-transparent bg-gold-grad text-[#171100]' : 'border-linesoft text-text2'}`}>{c}</button>)}
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title="No opportunities found" description="Check back soon — new opportunities appear regularly." />
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {filtered.map((it, i) => (
              <div key={it.id || it.title} className="glass-card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line text-gold">
                    {i % 3 === 0 ? <BriefcaseBusiness size={18} /> : i % 3 === 1 ? <Coins size={18} /> : <Handshake size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <div>
                        <div className="text-[13px] font-extrabold">{it.title}</div>
                        <div className="text-[10.5px] text-text2">{it.org}</div>
                      </div>
                      {it.match && <span className="rounded-full bg-gold-grad px-2 py-1 text-[9px] font-black text-[#171100]">{it.match}</span>}
                    </div>
                    <div className="mt-1.5 text-[10px] text-text3">{it.loc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ScrollToTop scrollRef={scrollRef} />
    </MainScreenShell>
  );
}
