'use client';

import { useState, useMemo } from 'react';
import {
  CalendarDays,
  MapPin,
  Users,
  Clock,
  Share2,
  Bookmark,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  Star,
  Filter,
  Search,
  Navigation,
  Plus,
  X,
} from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import SubpageHeader from '@/components/SubpageHeader';
import Avatar from '@/components/Avatar';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';

const EVENTS = [
  {
    id: 1,
    name: 'Founder Night Kolkata',
    date: 'Today · 7:00 PM',
    isToday: true,
    location: '12 km away',
    isOnline: false,
    attendees: 184,
    category: 'Meetup',
    price: 'Free',
    priceValue: 0,
    description: 'Join fellow founders for an evening of networking, pitch practice, and genuine conversations about building startups in Kolkata. Light snacks and chai provided.',
    people: [
      { name: 'Arjun Mehta', avatar: 'https://i.pravatar.cc/100?img=1' },
      { name: 'Priya Shah', avatar: 'https://i.pravatar.cc/100?img=5' },
      { name: 'Rohan Kumar', avatar: 'https://i.pravatar.cc/100?img=8' },
      { name: 'Neha Gupta', avatar: 'https://i.pravatar.cc/100?img=9' },
      { name: 'Vikram Das', avatar: 'https://i.pravatar.cc/100?img=11' },
    ],
    categoryColor: 'bg-[rgba(217,172,61,0.15)] text-gold-hi',
  },
  {
    id: 2,
    name: 'React Builders Meetup',
    date: 'Sat · 5:30 PM',
    isToday: false,
    location: 'Online',
    isOnline: true,
    attendees: 320,
    category: 'Workshop',
    price: 'Free',
    priceValue: 0,
    description: 'Hands-on workshop covering React 19 features, server components, and the latest patterns in modern frontend development. Bring your laptop!',
    people: [
      { name: 'Sophia Chen', avatar: 'https://i.pravatar.cc/100?img=16' },
      { name: 'Daniel Kim', avatar: 'https://i.pravatar.cc/100?img=12' },
      { name: 'Aisha Patel', avatar: 'https://i.pravatar.cc/100?img=20' },
      { name: 'Marcus Lee', avatar: 'https://i.pravatar.cc/100?img=14' },
      { name: 'Olivia Brown', avatar: 'https://i.pravatar.cc/100?img=23' },
    ],
    categoryColor: 'bg-[rgba(91,141,255,0.15)] text-brandblue',
  },
  {
    id: 3,
    name: 'Startup Pitch Lab',
    date: 'Sun · 11:00 AM',
    isToday: false,
    location: 'Kolkata',
    isOnline: false,
    attendees: 96,
    category: 'Pitch Night',
    price: '₹200',
    priceValue: 200,
    description: 'Refine your pitch with expert feedback. 5-minute lightning pitches followed by investor Q&A. Top pitch wins a free co-working month at Venture Hub.',
    people: [
      { name: 'Rajesh Nair', avatar: 'https://i.pravatar.cc/100?img=30' },
      { name: 'Meera Iyer', avatar: 'https://i.pravatar.cc/100?img=25' },
      { name: 'Karan Singh', avatar: 'https://i.pravatar.cc/100?img=33' },
      { name: 'Pooja Reddy', avatar: 'https://i.pravatar.cc/100?img=28' },
      { name: 'Amit Verma', avatar: 'https://i.pravatar.cc/100?img=36' },
    ],
    categoryColor: 'bg-[rgba(224,52,76,0.15)] text-[#ff6b6b]',
  },
  {
    id: 4,
    name: 'AI/ML Hackathon',
    date: 'Next Fri · 9:00 AM',
    isToday: false,
    location: 'Bangalore',
    isOnline: false,
    attendees: 256,
    category: 'Hackathon',
    price: 'Free',
    priceValue: 0,
    description: '48-hour hackathon building AI solutions for real-world problems. Prizes worth ₹5L. Teams of 2-4. Food, WiFi, and caffeine provided.',
    people: [
      { name: 'Deepak Rao', avatar: 'https://i.pravatar.cc/100?img=40' },
      { name: 'Sanjay Menon', avatar: 'https://i.pravatar.cc/100?img=42' },
      { name: 'Ritu Agarwal', avatar: 'https://i.pravatar.cc/100?img=44' },
      { name: 'Vivek Joshi', avatar: 'https://i.pravatar.cc/100?img=46' },
      { name: 'Ananya Das', avatar: 'https://i.pravatar.cc/100?img=48' },
    ],
    categoryColor: 'bg-[rgba(46,204,113,0.15)] text-brandgreen',
  },
  {
    id: 5,
    name: 'Women in Tech Summit',
    date: 'Next Sat · 10:00 AM',
    isToday: false,
    location: 'Online',
    isOnline: true,
    attendees: 1200,
    category: 'Conference',
    price: 'Free',
    priceValue: 0,
    description: 'Full-day virtual summit featuring 20+ speakers from top tech companies. Workshops, panels, and mentorship sessions on leadership, engineering, and entrepreneurship.',
    people: [
      { name: 'Kavya Sharma', avatar: 'https://i.pravatar.cc/100?img=50' },
      { name: 'Nisha Kapoor', avatar: 'https://i.pravatar.cc/100?img=52' },
      { name: 'Divya Rajan', avatar: 'https://i.pravatar.cc/100?img=54' },
      { name: 'Swati Bose', avatar: 'https://i.pravatar.cc/100?img=56' },
      { name: 'Preeti Menon', avatar: 'https://i.pravatar.cc/100?img=58' },
    ],
    categoryColor: 'bg-[rgba(217,172,61,0.15)] text-gold-hi',
  },
];

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
  const toggleJoinEvent = useStore((s) => s.toggleJoinEvent);
  const joinedEvents = useStore((s) => s.joinedEvents);
  const { vibrate, notification } = useHaptics();

  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [userEvents, setUserEvents] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: '',
    date: '',
    location: '',
    category: 'Meetup',
    description: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const allEvents = useMemo(() => [...EVENTS, ...userEvents], [userEvents]);

  const filteredEvents = useMemo(() => {
    let filtered = allEvents;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q)
      );
    }

    if (activeFilter === 'Today') {
      filtered = filtered.filter((e) => e.isToday || e.date.toLowerCase().startsWith('today'));
    } else if (activeFilter === 'This Week') {
      filtered = filtered.filter(
        (e) =>
          e.isToday ||
          e.date.toLowerCase().startsWith('today') ||
          e.date.includes('Sat') ||
          e.date.includes('Sun') ||
          e.date.includes('Mon') ||
          e.date.includes('Tue') ||
          e.date.includes('Wed') ||
          e.date.includes('Thu') ||
          e.date.includes('Fri')
      );
    } else if (activeFilter === 'Online') {
      filtered = filtered.filter((e) => e.isOnline);
    } else if (activeFilter === 'Free') {
      filtered = filtered.filter((e) => e.priceValue === 0);
    }

    return filtered;
  }, [allEvents, activeFilter, searchQuery]);

  const myEvents = useMemo(
    () => allEvents.filter((e) => joinedEvents[e.id]),
    [allEvents, joinedEvents]
  );

  const defaultPeople = [
    { name: 'You', avatar: 'https://i.pravatar.cc/100?img=60' },
  ];

  function toggleRsvp(eventId, eventName) {
    vibrate('medium');
    toggleJoinEvent(eventId);
    if (joinedEvents[eventId]) {
      notification('warning');
      showToast(`Removed from ${eventName}`);
    } else {
      notification('success');
      showToast(`RSVP'd to ${eventName}`);
    }
  }

  function handleShare(event) {
    vibrate('light');
    showToast(`Share link copied for ${event.name}`);
  }

  function handleView(event) {
    vibrate('light');
    setSelectedEvent(event);
  }

  function handleAddToCalendar(event) {
    vibrate('medium');
    notification('success');
    showToast(`Added "${event.name}" to calendar`);
  }

  function handleGetDirections(event) {
    vibrate('light');
    showToast(`Opening directions to ${event.location}`);
  }

  function validateForm() {
    const errors = {};
    if (!newEvent.name.trim()) errors.name = 'Event name is required';
    if (!newEvent.date.trim()) errors.date = 'Date is required';
    if (!newEvent.location.trim()) errors.location = 'Location is required';
    if (!newEvent.description.trim()) errors.description = 'Description is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleCreateEvent() {
    if (!validateForm()) {
      vibrate('heavy');
      notification('error');
      showToast('Please fill in all fields');
      return;
    }

    vibrate('heavy');
    notification('success');

    const created = {
      id: `user_${Date.now()}`,
      name: newEvent.name.trim(),
      date: newEvent.date.trim(),
      isToday: newEvent.date.toLowerCase().startsWith('today'),
      location: newEvent.location.trim(),
      isOnline: newEvent.location.toLowerCase().includes('online'),
      attendees: 1,
      category: newEvent.category,
      price: 'Free',
      priceValue: 0,
      description: newEvent.description.trim(),
      people: defaultPeople,
      categoryColor: CATEGORY_COLORS[newEvent.category] || 'bg-[rgba(217,172,61,0.15)] text-gold-hi',
      isUserCreated: true,
    };

    setUserEvents((prev) => [...prev, created]);
    setNewEvent({ name: '', date: '', location: '', category: 'Meetup', description: '' });
    setFormErrors({});
    setShowCreateForm(false);
    showToast(`"${created.name}" created successfully!`);
  }

  function handleCancelCreate() {
    vibrate('light');
    setNewEvent({ name: '', date: '', location: '', category: 'Meetup', description: '' });
    setFormErrors({});
    setShowCreateForm(false);
  }

  if (selectedEvent) {
    const isGoing = !!joinedEvents[selectedEvent.id];
    return (
      <MainScreenShell>
        <SubpageHeader title="Event Details" onBack={() => setSelectedEvent(null)} />
        <div className="no-scrollbar px-[18px] pb-6">
          <div className="gold-card mt-3 p-5">
            <div className="flex items-center gap-2">
              <CalendarDays className="text-gold" size={18} />
              <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ${selectedEvent.categoryColor}`}>
                {selectedEvent.category}
              </span>
              {selectedEvent.priceValue > 0 && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9.5px] font-bold text-white">
                  {selectedEvent.price}
                </span>
              )}
              {selectedEvent.isUserCreated && (
                <span className="rounded-full bg-brandgreen/15 px-2 py-0.5 text-[9.5px] font-bold text-brandgreen">
                  Your Event
                </span>
              )}
            </div>
            <h1 className="mt-3 text-[20px] font-black leading-tight">{selectedEvent.name}</h1>
            <p className="mt-2 text-[11.5px] leading-5 text-text2">{selectedEvent.description}</p>
          </div>

          <div className="mt-3 space-y-2">
            <div className="glass-card flex items-center gap-3 p-3.5">
              <CalendarDays size={16} className="text-gold" />
              <div>
                <div className="text-[12.5px] font-bold">{selectedEvent.date}</div>
              </div>
            </div>
            <div className="glass-card flex items-center gap-3 p-3.5">
              <MapPin size={16} className="text-gold" />
              <div>
                <div className="text-[12.5px] font-bold">{selectedEvent.location}</div>
                {selectedEvent.isOnline && (
                  <div className="text-[10px] text-text3">Virtual Event</div>
                )}
              </div>
            </div>
            <div className="glass-card flex items-center gap-3 p-3.5">
              <Users size={16} className="text-gold" />
              <div>
                <div className="text-[12.5px] font-bold">{selectedEvent.attendees.toLocaleString()} attending</div>
                <div className="text-[10px] text-text3">{selectedEvent.people.length}+ speakers & organizers</div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-[13px] font-extrabold">Map</div>
            <div className="glass-card flex h-32 items-center justify-center overflow-hidden rounded-2xl">
              {selectedEvent.isOnline ? (
                <div className="text-center">
                  <ExternalLink size={24} className="mx-auto text-text3" />
                  <div className="mt-1 text-[11px] text-text3">Online Event</div>
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[rgba(217,172,61,0.06)]">
                  <div className="text-center">
                    <MapPin size={28} className="mx-auto text-gold" />
                    <div className="mt-1 text-[11px] text-text3">{selectedEvent.location}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-[13px] font-extrabold">Attendees</div>
            <div className="glass-card p-3.5">
              <div className="flex -space-x-2">
                {selectedEvent.people.map((p, i) => (
                  <Avatar key={i} src={p.avatar} name={p.name} size={36} className="ring-2 ring-card" />
                ))}
                <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-white/10 text-[10px] font-bold ring-2 ring-card">
                  +{selectedEvent.attendees - selectedEvent.people.length}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {selectedEvent.people.map((p, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Avatar src={p.avatar} name={p.name} size={28} />
                    <span className="text-[11.5px] font-bold">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            <button
              onClick={() => toggleRsvp(selectedEvent.id, selectedEvent.name)}
              className={`w-full rounded-xl py-3 text-[12px] font-black transition-all ${
                isGoing
                  ? 'bg-[rgba(46,204,113,0.15)] text-brandgreen border border-brandgreen/30'
                  : 'bg-gold-grad text-[#171100]'
              }`}
            >
              {isGoing ? 'Going ✓' : 'RSVP'}
            </button>
            <button
              onClick={() => handleAddToCalendar(selectedEvent)}
              className="w-full rounded-xl border border-linesoft bg-card py-3 text-[12px] font-bold text-gold-hi"
            >
              Add to Calendar
            </button>
            <button
              onClick={() => handleShare(selectedEvent)}
              className="w-full rounded-xl border border-linesoft bg-card py-3 text-[12px] font-bold text-gold-hi"
            >
              Share Event
            </button>
            {!selectedEvent.isOnline && (
              <button
                onClick={() => handleGetDirections(selectedEvent)}
                className="w-full rounded-xl border border-linesoft bg-card py-3 text-[12px] font-bold text-gold-hi flex items-center justify-center gap-1.5"
              >
                <Navigation size={14} />
                Get Directions
              </button>
            )}
          </div>

          <div className="mt-6">
            <div className="mb-2 text-[13px] font-extrabold">Similar Events</div>
            <div className="space-y-2.5">
              {allEvents
                .filter((e) => e.id !== selectedEvent.id && e.category === selectedEvent.category)
                .slice(0, 2)
                .map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => handleView(ev)}
                    className="glass-card w-full p-3.5 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[13px] font-extrabold">{ev.name}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-text2">
                          <span className="flex items-center gap-1">
                            <CalendarDays size={10} />
                            {ev.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={10} />
                            {ev.location}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-text3" />
                    </div>
                  </button>
                ))}
              {allEvents.filter((e) => e.id !== selectedEvent.id && e.category === selectedEvent.category)
                .length === 0 && (
                <div className="glass-card p-4 text-center text-[11.5px] text-text3">
                  No similar events found.
                </div>
              )}
            </div>
          </div>
        </div>
      </MainScreenShell>
    );
  }

  if (showCreateForm) {
    return (
      <MainScreenShell>
        <SubpageHeader title="Create Event" onBack={handleCancelCreate} />
        <div className="no-scrollbar px-[18px] pb-6">
          <div className="gold-card mt-3 overflow-hidden p-5">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[rgba(217,172,61,.12)] opacity-30" />
            <div className="relative">
              <Plus className="text-gold" size={22} />
              <div className="mt-2 text-[20px] font-black">Host your own event.</div>
              <div className="mt-1 text-[10.5px] text-text2">
                Share meetups, workshops, or gatherings with the community.
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-text2">Event Name</label>
              <input
                value={newEvent.name}
                onChange={(e) => setNewEvent((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Weekend Hack Session"
                className={`w-full rounded-xl border bg-card px-4 py-3 text-[12.5px] outline-none transition-colors placeholder:text-text3 ${
                  formErrors.name ? 'border-red-500' : 'border-linesoft focus:border-gold'
                }`}
              />
              {formErrors.name && <p className="mt-1 text-[10px] text-red-400">{formErrors.name}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-text2">Date & Time</label>
              <input
                value={newEvent.date}
                onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))}
                placeholder="e.g. Tomorrow · 6:00 PM"
                className={`w-full rounded-xl border bg-card px-4 py-3 text-[12.5px] outline-none transition-colors placeholder:text-text3 ${
                  formErrors.date ? 'border-red-500' : 'border-linesoft focus:border-gold'
                }`}
              />
              {formErrors.date && <p className="mt-1 text-[10px] text-red-400">{formErrors.date}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-text2">Location</label>
              <input
                value={newEvent.location}
                onChange={(e) => setNewEvent((p) => ({ ...p, location: e.target.value }))}
                placeholder="e.g. Online / coworking space name"
                className={`w-full rounded-xl border bg-card px-4 py-3 text-[12.5px] outline-none transition-colors placeholder:text-text3 ${
                  formErrors.location ? 'border-red-500' : 'border-linesoft focus:border-gold'
                }`}
              />
              {formErrors.location && <p className="mt-1 text-[10px] text-red-400">{formErrors.location}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-text2">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setNewEvent((p) => ({ ...p, category: cat }))}
                    className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-bold transition-colors ${
                      newEvent.category === cat
                        ? 'border-transparent bg-gold-grad text-[#171100]'
                        : 'border-linesoft text-text2'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-text2">Description</label>
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))}
                placeholder="Tell people what this event is about..."
                rows={4}
                className={`w-full resize-none rounded-xl border bg-card px-4 py-3 text-[12.5px] outline-none transition-colors placeholder:text-text3 ${
                  formErrors.description ? 'border-red-500' : 'border-linesoft focus:border-gold'
                }`}
              />
              {formErrors.description && (
                <p className="mt-1 text-[10px] text-red-400">{formErrors.description}</p>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={handleCancelCreate}
                className="flex-1 rounded-xl border border-linesoft bg-card py-3 text-[12px] font-bold text-text2"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                className="flex-1 rounded-xl bg-gold-grad py-3 text-[12px] font-black text-[#171100]"
              >
                Create Event
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
            <div className="mt-1 text-[10.5px] text-text2">
              Startup meetups, coding events, pitch nights and workshops.
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            vibrate('light');
            setShowCreateForm(true);
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gold/40 bg-gold/[0.06] py-3 text-[12px] font-bold text-gold transition-colors hover:bg-gold/10"
        >
          <Plus size={16} />
          Create Event
        </button>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-[10.5px] font-bold transition-colors ${
                activeFilter === tab
                  ? 'border-transparent bg-gold-grad text-[#171100]'
                  : 'border-linesoft text-text2'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-linesoft bg-card px-3.5 py-3">
          <Search size={16} className="text-text3" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by name..."
            aria-label="Search events"
            className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-text3"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[10px] font-bold text-gold">
              Clear
            </button>
          )}
        </div>

        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.04]">
              <Search size={28} className="text-text3" />
            </div>
            <h3 className="text-[15px] font-extrabold">No events found</h3>
            <p className="mt-1.5 text-[12px] text-text2">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredEvents.map((event) => {
              const isGoing = !!joinedEvents[event.id];
              return (
                <div key={event.id} className="glass-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${event.categoryColor}`}>
                          {event.category}
                        </span>
                        {event.isOnline && (
                          <span className="rounded-full bg-brandblue/15 px-2 py-0.5 text-[9px] font-bold text-brandblue">
                            Online
                          </span>
                        )}
                        {event.isUserCreated && (
                          <span className="rounded-full bg-brandgreen/15 px-2 py-0.5 text-[9px] font-bold text-brandgreen">
                            Your Event
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-[14px] font-extrabold">{event.name}</div>
                    </div>
                    <button
                      onClick={() => handleShare(event)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-text3"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-text2">
                    <span className="flex items-center gap-1">
                      <CalendarDays size={11} />
                      {event.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={11} />
                      {event.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={11} />
                      {event.attendees.toLocaleString()} attending
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex -space-x-1.5">
                      {event.people.slice(0, 3).map((p, i) => (
                        <Avatar key={i} src={p.avatar} name={p.name} size={24} className="ring-2 ring-card" />
                      ))}
                      {event.attendees > 3 && (
                        <div className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-white/10 text-[8px] font-bold ring-2 ring-card">
                          +{event.attendees - 3}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold ${event.priceValue > 0 ? 'text-white' : 'text-brandgreen'}`}>
                        {event.price}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => toggleRsvp(event.id, event.name)}
                      className={`flex-1 rounded-xl py-2.5 text-[10.5px] font-black transition-all ${
                        isGoing
                          ? 'bg-[rgba(46,204,113,0.15)] text-brandgreen border border-brandgreen/30'
                          : 'bg-gold-grad text-[#171100]'
                      }`}
                    >
                      {isGoing ? 'Going ✓' : 'RSVP'}
                    </button>
                    <button
                      onClick={() => handleView(event)}
                      className="flex-1 rounded-xl border border-linesoft py-2.5 text-[10.5px] font-bold text-gold-hi"
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {myEvents.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[14px] font-extrabold">My Events</div>
              <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[10px] font-bold text-gold">
                {myEvents.length} attending
              </span>
            </div>
            <div className="space-y-2.5">
              {myEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => handleView(event)}
                  className="glass-card w-full p-3.5 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle size={14} className="text-brandgreen" />
                        <span className="text-[13px] font-extrabold">{event.name}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-text2">
                        <span className="flex items-center gap-1">
                          <CalendarDays size={10} />
                          {event.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {event.location}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="mt-1 flex-none text-text3" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="h-6" />
      </div>
    </MainScreenShell>
  );
}
