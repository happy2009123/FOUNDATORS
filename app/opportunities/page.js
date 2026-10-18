'use client';
import { useMemo, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BriefcaseBusiness, Coins, Handshake, Search, Plus, X, MapPin, ExternalLink, MessageCircle, Trash2 } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import SubpageHeader from '@/components/SubpageHeader';
import ScrollToTop from '@/components/ScrollToTop';
import EmptyState from '@/components/EmptyState';
import { useStore } from '@/lib/store';
import { getSupabase } from '@/lib/supabase/client';
import { mapRow, randomId } from '@/lib/supabase/db';
import { notifyUser } from '@/lib/notify';
import { formatPostTime } from '@/lib/timeago';

const cats = ['All', 'Jobs', 'Freelance', 'Investment', 'Funding', 'Mentorship', 'Partnerships'];
const catMap = { Jobs: 'job', Freelance: 'freelance', Investment: 'investment', Funding: 'funding', Mentorship: 'mentorship', Partnerships: 'partnership' };

const TYPE_META = {
  job: { label: 'Job', icon: BriefcaseBusiness },
  freelance: { label: 'Freelance', icon: Coins },
  investment: { label: 'Investment', icon: Coins },
  funding: { label: 'Funding', icon: Coins },
  mentorship: { label: 'Mentorship', icon: Handshake },
  partnership: { label: 'Partnership', icon: Handshake },
};

const EMPTY_FORM = { type: 'job', title: '', org: '', location: '', remote: false, compensation: '', description: '', link: '' };

export default function Opportunities() {
  const router = useRouter();
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');
  const profile = useStore((s) => s.profile);
  const showToast = useStore((s) => s.showToast);
  const ensureContactForUser = useStore((s) => s.ensureContactForUser);
  const scrollRef = useRef(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [showPost, setShowPost] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = getSupabase();
        if (!sb) return;
        const { data, error } = await sb
          .from('opportunities')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        if (!cancelled) setItems(mapRows(data || []));
      } catch (err) {
        console.error('Failed to fetch opportunities:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => items.filter((it) => {
    if (cat !== 'All' && it.type !== catMap[cat]) return false;
    if (q) {
      const s = q.toLowerCase();
      return (it.title || '').toLowerCase().includes(s) || (it.org || '').toLowerCase().includes(s) || (it.location || '').toLowerCase().includes(s);
    }
    return true;
  }), [items, cat, q]);

  async function handleApply(it) {
    if (it.link) {
      window.open(it.link, '_blank', 'noopener,noreferrer');
      return;
    }
    const me = useStore.getState().profile;
    if (!me?.id || it.createdBy === me.id) return;
    let poster = null;
    try {
      const { data } = await getSupabase().from('profiles').select('*').eq('id', it.createdBy).maybeSingle();
      if (data) poster = mapRow(data);
    } catch {}
    const key = ensureContactForUser(it.createdBy, poster || { name: it.org || 'Opportunity poster', avatar: '' });
    notifyUser(it.createdBy, {
      type: 'message',
      actorName: me.name,
      actorKey: me.id,
      text: `${me.name || 'Someone'} applied to "${it.title}"`,
      linkType: 'message',
      linkId: me.id,
    }).catch(() => {});
    setDetail(null);
    router.push(`/messages/${key}`);
  }

  async function handleClose(it) {
    const { error } = await getSupabase()
      .from('opportunities')
      .update({ status: 'closed' })
      .eq('id', it.id)
      .eq('created_by', profile?.id);
    if (error) {
      showToast('Could not close it — try again');
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    setDetail(null);
    showToast('Opportunity closed');
  }

  async function handleDelete(it) {
    const { error } = await getSupabase()
      .from('opportunities')
      .delete()
      .eq('id', it.id)
      .eq('created_by', profile?.id);
    if (error) {
      showToast('Could not delete it — try again');
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    setDetail(null);
    showToast('Opportunity deleted');
  }

  async function submitPost() {
    const title = form.title.trim();
    if (!title) {
      showToast('Add a title');
      return;
    }
    if (!profile?.id) return;
    setPosting(true);
    const row = {
      id: randomId(),
      created_by: profile.id,
      type: form.type,
      title,
      org: form.org.trim(),
      location: form.location.trim(),
      remote: form.remote,
      compensation: form.compensation.trim(),
      description: form.description.trim(),
      link: form.link.trim(),
      status: 'open',
    };
    const { error } = await getSupabase().from('opportunities').insert(row);
    setPosting(false);
    if (error) {
      showToast('Could not post — try again');
      return;
    }
    setItems((prev) => [{
      id: row.id,
      createdBy: row.created_by,
      type: row.type,
      title: row.title,
      org: row.org,
      location: row.location,
      remote: row.remote,
      compensation: row.compensation,
      description: row.description,
      link: row.link,
      status: 'open',
      createdAt: new Date().toISOString(),
    }, ...prev]);
    setForm(EMPTY_FORM);
    setShowPost(false);
    showToast('Opportunity posted');
  }

  const inputCls = 'w-full rounded-xl border border-linesoft bg-white/[0.03] px-3 py-2.5 text-[13px] text-white placeholder:text-text3 focus:outline-none focus:border-gold/50';

  return (
    <MainScreenShell>
      <SubpageHeader title="Opportunities" />
      <div ref={scrollRef} className="no-scrollbar flex-1 overflow-y-auto px-[18px] pb-6">
        <div className="gold-card mt-3 p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-gold"><BriefcaseBusiness size={13} /> Opportunity board</div>
          <div className="mt-2 text-[19px] font-black">{items.length > 0 ? `${items.length} open opportunities` : 'No open opportunities yet'}</div>
          <div className="mt-1 text-[10.5px] text-text2">Jobs, freelance work, funding and mentorship posted by the community.</div>
          <button onClick={() => setShowPost(true)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-gold-grad py-2.5 text-[11.5px] font-black text-[#171100]">
            <Plus size={14} /> Post an opportunity
          </button>
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
          <EmptyState
            icon={Search}
            title={items.length === 0 ? 'Be the first to post' : 'No opportunities found'}
            description={items.length === 0 ? 'Post a role, gig, funding round or mentorship offer for the community.' : 'Try a different search or category.'}
          />
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {filtered.map((it) => {
              const meta = TYPE_META[it.type] || TYPE_META.job;
              const Icon = meta.icon;
              const own = it.createdBy && it.createdBy === profile?.id;
              return (
                <div key={it.id} className="glass-card p-4">
                  <div className="flex items-start gap-3">
                    <button onClick={() => setDetail(it)} className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl border border-line text-gold" aria-label={`Open ${it.title}`}>
                      <Icon size={18} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2">
                        <button onClick={() => setDetail(it)} className="min-w-0 text-left">
                          <div className="text-[13px] font-extrabold">{it.title}</div>
                          <div className="text-[10.5px] text-text2">{it.org || 'Community'}</div>
                        </button>
                        <div className="flex flex-none items-center gap-1.5">
                          {own && <span className="rounded-full border border-gold/40 px-2 py-1 text-[9px] font-black text-gold">Yours</span>}
                          <span className="rounded-full bg-gold-grad px-2 py-1 text-[9px] font-black text-[#171100]">{meta.label}</span>
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-text3">
                        <span className="flex items-center gap-1"><MapPin size={10} /> {it.location || (it.remote ? 'Remote' : 'Anywhere')}</span>
                        {it.remote && it.location && <span className="rounded-full border border-linesoft px-1.5 py-0.5">Remote</span>}
                        {it.compensation && <span className="text-gold">{it.compensation}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ScrollToTop scrollRef={scrollRef} />

      {/* ── Detail sheet ── */}
      {detail && (
        <div className="fixed inset-0 z-[500] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6" onClick={() => setDetail(null)}>
          <div className="max-h-[85vh] w-full max-w-[440px] overflow-y-auto rounded-t-3xl border border-linesoft bg-card p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-gold">
                {(TYPE_META[detail.type] || TYPE_META.job).label}
                {detail.remote && <span className="rounded-full border border-gold/40 px-1.5 py-0.5 text-text2">Remote</span>}
              </div>
              <button onClick={() => setDetail(null)} className="text-text3" aria-label="Close"><X size={16} /></button>
            </div>
            <h2 className="text-[17px] font-black">{detail.title}</h2>
            <div className="mt-0.5 text-[12px] text-text2">{detail.org || 'Community'}</div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text3">
              {detail.location && <span className="flex items-center gap-1"><MapPin size={11} /> {detail.location}</span>}
              {detail.compensation && <span className="font-bold text-gold">{detail.compensation}</span>}
              {whenLabel(detail.createdAt)}
            </div>
            {detail.description && (
              <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-text2">{detail.description}</p>
            )}
            <div className="mt-5 flex gap-2">
              {detail.createdBy === profile?.id ? (
                <>
                  <button onClick={() => handleClose(detail)} className="flex-1 rounded-full border border-linesoft py-2.5 text-[12px] font-bold text-text2 hover:bg-white/5">Close posting</button>
                  <button onClick={() => handleDelete(detail)} className="flex h-10 w-10 items-center justify-center rounded-full border border-brandred/40 text-brandred" aria-label="Delete"><Trash2 size={15} /></button>
                </>
              ) : (
                <button
                  onClick={() => handleApply(detail)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gold-grad py-2.5 text-[12px] font-black text-[#171100]"
                >
                  {detail.link ? <><ExternalLink size={14} /> Apply on link</> : <><MessageCircle size={14} /> Apply — message poster</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Post form sheet ── */}
      {showPost && (
        <div className="fixed inset-0 z-[500] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6" onClick={() => !posting && setShowPost(false)}>
          <div className="max-h-[90vh] w-full max-w-[440px] overflow-y-auto rounded-t-3xl border border-linesoft bg-card p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[16px] font-black">Post an opportunity</h2>
              <button onClick={() => setShowPost(false)} className="text-text3" aria-label="Close"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-text2" htmlFor="opp-type">Type</label>
                <select id="opp-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={inputCls}>
                  {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k} className="bg-card">{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-text2" htmlFor="opp-title">Title *</label>
                <input id="opp-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. React developer for a 4-week MVP" className={inputCls} maxLength={120} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-text2" htmlFor="opp-org">Company / project</label>
                  <input id="opp-org" value={form.org} onChange={(e) => setForm((f) => ({ ...f, org: e.target.value }))} placeholder="Your startup" className={inputCls} maxLength={80} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-text2" htmlFor="opp-loc">Location</label>
                  <input id="opp-loc" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Berlin / Anywhere" className={inputCls} maxLength={80} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[12px] text-text2">
                <input type="checkbox" checked={form.remote} onChange={(e) => setForm((f) => ({ ...f, remote: e.target.checked }))} className="accent-gold" />
                Remote friendly
              </label>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-text2" htmlFor="opp-comp">Compensation</label>
                <input id="opp-comp" value={form.compensation} onChange={(e) => setForm((f) => ({ ...f, compensation: e.target.value }))} placeholder="$3k / month · Equity · Unpaid" className={inputCls} maxLength={80} />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-text2" htmlFor="opp-desc">Description</label>
                <textarea id="opp-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What is it, who you are looking for, how to apply..." rows={4} className={inputCls} maxLength={2000} />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-text2" htmlFor="opp-link">Apply link (optional)</label>
                <input id="opp-link" value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} placeholder="https://..." className={inputCls} maxLength={400} />
                <p className="mt-1 text-[10px] text-text3">Without a link, applicants message you directly.</p>
              </div>
              <button onClick={submitPost} disabled={posting || !form.title.trim()} className="w-full rounded-full bg-gold-grad py-3 text-[13px] font-black text-[#171100] disabled:opacity-40">
                {posting ? 'Posting...' : 'Post opportunity'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainScreenShell>
  );
}

function whenLabel(iso) {
  const when = formatPostTime(iso);
  return when ? <span>· {when}</span> : null;
}
