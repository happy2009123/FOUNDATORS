'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays, MapPin, Users, Clock, Share2, ChevronRight, ExternalLink,
  CheckCircle, Search, Navigation, Plus, X,
} from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import SubpageHeader from '@/components/SubpageHeader';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, query, orderBy, limit,
  doc, getDoc, updateDoc, addDoc, arrayUnion, arrayRemove, serverTimestamp,
} from 'firebase/firestore';

const FILTER_TABS = ['All', 'Today', 'This Week', 'Online', 'Free'];
const CATEGORY_OPTIONS = ['Meetup', 'Workshop', 'Hackathon', 'Pitch Night', 'Conference', 'Social'];
const CATEGORY_COLORS = {
  Meetup: 'bg-[rgba(217,172,61,0.15)] text-gold-hi',
  Workshop: 'bg-[rgba(91,141,255,0.15)] text-brandblue',
  Hackathon: 'bg-[rgba(46,204,113,0.15)] text-brandgreen',
  'Pitch Night': 'bg-[rgba(224,52,76,0.15)] text-[#ff6b6b]',
  Conference: 'bg-[rgba(155,89,182,0.15)] text-[#b380e0]',
  Social: 'bg-[rgba(217,172,61,0.15)] text-gold-hi',
};

export default function Events() {
  const showToast = useStore((s) => s.showToast);
  const profile = useStore((s) => s.profile);
  const { vibrate, notification } = useHaptics();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', date: '', location: '', category: 'Meetup', description: '' });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    async function fetchEvents() {
      try {
        const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'), limit(30));
        const snap = await getDocs(q);
        const items = [];
        snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
        setEvents(items);
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((e) => e.name?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q));
    }
    if (activeFilter === 'Today') {
      filtered = filtered.filter((e) => e.isToday || e.date?.toLowerCase().startsWith('today'));
    } else if (activeFilter === 'This Week') {
      filtered = filtered.filter((e) => e.isToday || e.date?.toLowerCase().startsWith('today') || e.date?.includes('Sat') || e.date?.includes('Sun') || e.date?.includes('Mon') || e.date?.includes('Tue') || e.date?.includes('Wed') || e.date?.includes('Thu') || e.date?.includes('Fri'));
    } else if (activeFilter === 'Online') {
      filtered = filtered.filter((e) => e.isOnline || e.location?.toLowerCase().includes('online'));
    } else if (activeFilter === 'Free') {
      filtered = filtered.filter((e) => !e.priceValue || e.priceValue === 0);
    }
    return filtered;
  }, [events, activeFilter, searchQuery]);

  async function toggleRsvp(event) {
    if (!profile?.id) { showToast('Please sign in to RSVP'); return; }
    vibrate('medium');
    const attendees = event.attendees || [];
    const isGoing = attendees.includes(profile.id);
    try {
      const eventRef = doc(db, 'events', event.id);
      await updateDoc(eventRef, {
        attendees: isGoing ? arrayRemove(profile.id) : arrayUnion(profile.id),
      });
      setEvents((prev) => prev.map((e) => {
        if (e.id !== event.id) return e;
        const updated = isGoing
          ? (e.attendees || []).filter((id) => id !== profile.id)
          : [...(e.attendees || []), profile.id];
        return { ...e, attendees: updated };
      }));
      if (isGoing) { notification('warning'); showToast(`Removed from ${event.name}`); }
      else { notification('success'); showToast(`RSVP'd to ${event.name}`); }
    } catch (err) {
      console.error('RSVP failed:', err);
      showToast('Failed to RSVP. Please try again.');
    }
  }

  function handleShare(event) {
    vibrate('light');
    const url = `${window.location.origin}/events`;
    if (navigator.share) {
      navigator.share({ title: event.name, text: `${event.name} — ${event.description || ''}`, url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast('Event link copied!'));
    } else {
      showToast('Event link copied!');
    }
  }

  function handleView(event) { vibrate('light'); setSelectedEvent(event); }

  function validateForm() {
    const errors = {};
    if (!newEvent.name.trim()) errors.name = 'Event name is required';
    if (!newEvent.date.trim()) errors.date = 'Date is required';
    if (!newEvent.location.trim()) errors.location = 'Location is required';
    if (!newEvent.description.trim()) errors.description = 'Description is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreateEvent() {
    if (!validateForm()) { vibrate('heavy'); notification('error'); showToast('Please fill in all fields'); return; }
    if (!profile?.id) { showToast('Please sign in to create events'); return; }
    setCreating(true);
    try {
      const docRef = await addDoc(collection(db, 'events'), {
        name: newEvent.name.trim(),
        description: newEvent.description.trim(),
        date: newEvent.date.trim(),
        location: newEvent.location.trim(),
        category: newEvent.category,
        isToday: newEvent.date.toLowerCase().startsWith('today'),
        isOnline: newEvent.location.toLowerCase().includes('online'),
        price: 'Free',
        priceValue: 0,
        creatorKey: profile.id,
        creatorName: profile.name,
        attendees: [profile.id],
        createdAt: serverTimestamp(),
      });
      const created = {
        id: docRef.id,
        name: newEvent.name.trim(),
        description: newEvent.description.trim(),
        date: newEvent.date.trim(),
        location: newEvent.location.trim(),
        category: newEvent.category,
        isToday: newEvent.date.toLowerCase().startsWith('today'),
        isOnline: newEvent.location.toLowerCase().includes('online'),
        price: 'Free',
        priceValue: 0,
        creatorKey: profile.id,
        creatorName: profile.name,
        attendees: [profile.id],
        categoryColor: CATEGORY_COLORS[newEvent.category] || 'bg-[rgba(217,172,61,0.15)] text-gold-hi',
      };
      vibrate('heavy'); notification('success');
      setEvents((prev) => [created, ...prev]);
      setNewEvent({ name: '', date: '', location: '', category: 'Meetup', description: '' });
      setFormErrors({}); setShowCreateForm(false);
      showToast(`"${created.name}" created successfully!`);
    } catch (err) {
      console.error('Failed to create event:', err);
      vibrate('heavy'); notification('error');
      showToast('Failed to create event. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  if (selectedEvent) {
    const attendees = selectedEvent.attendees || [];
    const isGoing = attendees.includes(profile?.id);
    return (
      <MainScreenShell>
        <SubpageHeader title="Event Details" onBack={() => setSelectedEvent(null)} />
        <div className="no-scrollbar px-[18px] pb-6">
          <div className="gold-card mt-3 p-5">
            <div className="flex items-center gap-2">
              <CalendarDays className="text-gold" size={18} />
              <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ${selectedEvent.categoryColor || CATEGORY_COLORS[selectedEvent.category] || 'bg-[rgba(217,172,61,0.15)] text-gold-hi'}`}>{selectedEvent.category}</span>
            </div>
            <h1 className="mt-3 text-[20px] font-black leading-tight">{selectedEvent.name}</h1>
            <p className="mt-2 text-[11.5px] leading-5 text-text2">{selectedEvent.description}</p>
          </div>
          <div className="mt-3 space-y-2">
            <div className="glass-card flex items-center gap-3 p-3.5"><CalendarDays size={16} className="text-gold" /><div className="text-[12.5px] font-bold">{selectedEvent.date}</div></div>
            <div className="glass-card flex items-center gap-3 p-3.5"><MapPin size={16} className="text-gold" /><div><div className="text-[12.5px] font-bold">{selectedEvent.location}</div>{selectedEvent.isOnline && <div className="text-[10px] text-text3">Virtual Event</div>}</div></div>
            <div className="glass-card flex items-center gap-3 p-3.5"><Users size={16} className="text-gold" /><div className="text-[12.5px] font-bold">{attendees.length} attending</div></div>
          </div>
          <div className="mt-4 space-y-2.5">
            <button onClick={() => toggleRsvp(selectedEvent)} className={`w-full rounded-xl py-3 text-[12px] font-black transition-all ${isGoing ? 'bg-[rgba(46,204,113,0.15)] text-brandgreen border border-brandgreen/30' : 'bg-gold-grad text-[#171100]'}`}>
              {isGoing ? 'Going ✓' : 'RSVP'}
            </button>
            <button onClick={() => handleShare(selectedEvent)} className="w-full rounded-xl border border-linesoft bg-card py-3 text-[12px] font-bold text-gold-hi">Share Event</button>
          </div>
        </div>
      </MainScreenShell>
    );
  }

  if (showCreateForm) {
    return (
      <MainScreenShell>
        <SubpageHeader title="Create Event" onBack={() => { setNewEvent({ name: '', date: '', location: '', category: 'Meetup', description: '' }); setFormErrors({}); setShowCreateForm(false); }} />
        <div className="no-scrollbar px-[18px] pb-6">
          <div className="gold-card mt-3 overflow-hidden p-5">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[rgba(217,172,61,.12)] opacity-30" />
            <div className="relative">
              <Plus className="text-gold" size={22} />
              <div className="mt-2 text-[20px] font-black">Host your own event.</div>
              <div className="mt-1 text-[10.5px] text-text2">Share meetups, workshops, or gatherings with the community.</div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-text2">Event Name</label>
              <input value={newEvent.name} onChange={(e) => setNewEvent((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Weekend Hack Session" className={`w-full rounded-xl border bg-card px-4 py-3 text-[12.5px] outline-none transition-colors placeholder:text-text3 ${formErrors.name ? 'border-red-500' : 'border-linesoft focus:border-gold'}`} />
              {formErrors.name && <p className="mt-1 text-[10px] text-red-400">{formErrors.name}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-text2">Date & Time</label>
              <input value={newEvent.date} onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))} placeholder="e.g. Tomorrow · 6:00 PM" className={`w-full rounded-xl border bg-card px-4 py-3 text-[12.5px] outline-none transition-colors placeholder:text-text3 ${formErrors.date ? 'border-red-500' : 'border-linesoft focus:border-gold'}`} />
              {formErrors.date && <p className="mt-1 text-[10px] text-red-400">{formErrors.date}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-text2">Location</label>
              <input value={newEvent.location} onChange={(e) => setNewEvent((p) => ({ ...p, location: e.target.value }))} placeholder="e.g. Online / coworking space name" className={`w-full rounded-xl border bg-card px-4 py-3 text-[12.5px] outline-none transition-colors placeholder:text-text3 ${formErrors.location ? 'border-red-500' : 'border-linesoft focus:border-gold'}`} />
              {formErrors.location && <p className="mt-1 text-[10px] text-red-400">{formErrors.location}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-text2">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button key={cat} onClick={() => setNewEvent((p) => ({ ...p, category: cat }))} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-bold transition-colors ${newEvent.category === cat ? 'border-transparent bg-gold-grad text-[#171100]' : 'border-linesoft text-text2'}`}>{cat}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-text2">Description</label>
              <textarea value={newEvent.description} onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))} placeholder="Tell people what this event is about..." rows={4} className={`w-full resize-none rounded-xl border bg-card px-4 py-3 text-[12.5px] outline-none transition-colors placeholder:text-text3 ${formErrors.description ? 'border-red-500' : 'border-linesoft focus:border-gold'}`} />
              {formErrors.description && <p className="mt-1 text-[10px] text-red-400">{formErrors.description}</p>}
            </div>
            <div className="flex gap-2.5 pt-2">
              <button onClick={() => { setNewEvent({ name: '', date: '', location: '', category: 'Meetup', description: '' }); setFormErrors({}); setShowCreateForm(false); }} className="flex-1 rounded-xl border border-linesoft bg-card py-3 text-[12px] font-bold text-text2">Cancel</button>
              <button onClick={handleCreateEvent} disabled={creating} className="flex-1 rounded-xl bg-gold-grad py-3 text-[12px] font-black text-[#171100] disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      </MainScreenShell>
    );
  }

  return (
    <MainScreenShell>
      <SubpageHeader title="Foundators Live" />
      <div className="no-scrollbar px-[18px] pb-6">
        <div className="gold-card relative mt-3 overflow-hidden p-5">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[rgba(217,172,61,.12)] opacity-30" />
          <div className="relative">
            <CalendarDays className="text-gold" size={22} />
            <div className="mt-2 text-[20px] font-black">Meet people in real life.</div>
            <div className="mt-1 text-[10.5px] text-text2">Startup meetups, coding events, pitch nights and workshops.</div>
          </div>
        </div>

        <button onClick={() => { vibrate('light'); setShowCreateForm(true); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gold/40 bg-gold/[0.06] py-3 text-[12px] font-bold text-gold transition-colors hover:bg-gold/10">
          <Plus size={16} /> Create Event
        </button>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
          {FILTER_TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveFilter(tab)} className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-[10.5px] font-bold transition-colors ${activeFilter === tab ? 'border-transparent bg-gold-grad text-[#171100]' : 'border-linesoft text-text2'}`}>{tab}</button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-linesoft bg-card px-3.5 py-3">
          <Search size={16} className="text-text3" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search events by name..." aria-label="Search events" className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-text3" />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="text-[10px] font-bold text-gold">Clear</button>}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.04]"><CalendarDays size={28} className="text-text3" /></div>
            <h3 className="text-[15px] font-extrabold">No upcoming events</h3>
            <p className="mt-1.5 text-[12px] text-text2">Create one to get the community together!</p>
            <button onClick={() => setShowCreateForm(true)} className="mt-4 rounded-full bg-gold-grad px-6 py-2.5 text-[11px] font-black text-[#171100]">Create Event</button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredEvents.map((event) => {
              const attendees = event.attendees || [];
              const isGoing = attendees.includes(profile?.id);
              return (
                <div key={event.id} className="glass-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${event.categoryColor || CATEGORY_COLORS[event.category] || 'bg-[rgba(217,172,61,0.15)] text-gold-hi'}`}>{event.category}</span>
                        {event.isOnline && <span className="rounded-full bg-brandblue/15 px-2 py-0.5 text-[9px] font-bold text-brandblue">Online</span>}
                      </div>
                      <div className="mt-2 text-[14px] font-extrabold">{event.name}</div>
                    </div>
                    <button onClick={() => handleShare(event)} className="flex h-8 w-8 items-center justify-center rounded-full text-text3"><Share2 size={14} /></button>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-text2">
                    <span className="flex items-center gap-1"><CalendarDays size={11} /> {event.date}</span>
                    <span className="flex items-center gap-1"><MapPin size={11} /> {event.location}</span>
                    <span className="flex items-center gap-1"><Users size={11} /> {attendees.length} attending</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => toggleRsvp(event)} className={`flex-1 rounded-xl py-2.5 text-[10.5px] font-black transition-all ${isGoing ? 'bg-[rgba(46,204,113,0.15)] text-brandgreen border border-brandgreen/30' : 'bg-gold-grad text-[#171100]'}`}>{isGoing ? 'Going ✓' : 'RSVP'}</button>
                    <button onClick={() => handleView(event)} className="flex-1 rounded-xl border border-linesoft py-2.5 text-[10.5px] font-bold text-gold-hi">View</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="h-6" />
      </div>
    </MainScreenShell>
  );
}
