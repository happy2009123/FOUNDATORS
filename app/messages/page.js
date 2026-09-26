'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PenSquare, MessageCircle, AtSign, Users, MoreHorizontal, Plus, Send, Pin, Archive, Trash2, Clock, Star } from 'lucide-react';
import Logo, { Wordmark } from '@/components/Logo';
import MainScreenShell from '@/components/MainScreenShell';
import ScrollToTop from '@/components/ScrollToTop';
import EmptyState from '@/components/EmptyState';
import Avatar from '@/components/Avatar';
import { useStore } from '@/lib/store';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { subscribeToChats, deleteChat as deleteChatFS } from '@/lib/firestore';
import { useHaptics } from '@/lib/useHaptics';

const TABS = [
  { key: 'messages', label: 'All', icon: MessageCircle },
  { key: 'unread', label: 'Unread', icon: Clock },
  { key: 'groups', label: 'Groups', icon: Users },
  { key: 'archived', label: 'Archived', icon: Archive },
];

export default function MessagesPage() {
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const contacts = useStore((s) => s.contacts);
  const unreadByContact = useStore((s) => s.unreadByContact);
  const ensureContactForUser = useStore((s) => s.ensureContactForUser);
  const showToast = useStore((s) => s.showToast);
  const { vibrate, notification } = useHaptics();

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('messages');
  const [newConvo, setNewConvo] = useState('');
  const [swipedKey, setSwipedKey] = useState(null);
  const [pinned, setPinned] = useState(['sophia']);
  const [userSearch, setUserSearch] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [fsChats, setFsChats] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!profile?.id) return;
    const unsub = subscribeToChats(profile.id, (chats) => {
      setFsChats(chats);
    });
    return () => unsub();
  }, [profile?.id]);

  const unreadFor = (key, c) => (c && typeof c.unread === 'number' ? c.unread : unreadByContact[key] || 0);

  const mergedContacts = useMemo(() => {
    const merged = {};
    // Primary source of truth: Firestore conversations.
    fsChats.forEach((chat) => {
      const convId = chat.id;
      const myUnread = (chat.unreadBy && chat.unreadBy[profile?.id]) || 0;
      if (!merged[convId]) {
        const otherId = chat.isGroup ? null : (chat.participants || []).find((p) => p !== profile.id);
        const otherName = chat.participantNames && otherId
          ? chat.participantNames[otherId] || 'Chat'
          : chat.isGroup ? (chat.groupName || 'Group') : 'Chat';
        const otherAvatar = chat.participantAvatars && otherId
          ? chat.participantAvatars[otherId] || null
          : null;
        merged[convId] = {
          name: otherName,
          avatar: otherAvatar,
          online: true,
          status: 'Online',
          lastActive: 'Now',
          isGroup: !!chat.isGroup,
          messages: chat.lastMessage ? [{ text: chat.lastMessage, who: 'them' }] : [],
          chatId: convId,
          unread: myUnread,
        };
      } else {
        merged[convId] = { ...merged[convId], chatId: convId, unread: myUnread };
      }
    });
    // Fallback: local store contacts that aren't already shown as a Firestore chat.
    Object.entries(contacts).forEach(([key, c]) => {
      if (merged[key]) return;
      const covered = fsChats.some((chat) => (chat.participants || []).includes(key));
      if (covered) return;
      merged[key] = { ...c, chatId: key, unread: unreadByContact[key] || 0 };
    });
    return merged;
  }, [contacts, fsChats, profile?.id, unreadByContact]);

  const totalUnread = useMemo(
    () => Object.entries(mergedContacts).reduce((a, [key, c]) => a + unreadFor(key, c), 0),
    [mergedContacts, unreadByContact]
  );

  const rows = useMemo(() => {
    return Object.entries(mergedContacts).filter(([key, c]) => {
      if (tab === 'unread') return unreadFor(key, c) > 0;
      if (tab === 'groups') return c.isGroup;
      if (tab === 'archived') return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return c.name?.toLowerCase().includes(q) ||
        c.messages?.some(m => m.text?.toLowerCase().includes(q));
    });
  }, [mergedContacts, query, tab, unreadByContact]);

  const pinnedRows = useMemo(
    () => rows.filter(([key]) => pinned.includes(key)),
    [rows, pinned]
  );
  const unpinnedRows = useMemo(
    () => rows.filter(([key]) => !pinned.includes(key)),
    [rows, pinned]
  );

  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function fetchUsers() {
      try {
        const snap = await getDocs(collection(db, 'users'));
        if (!cancelled) {
          setAllUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      } catch {
        // silently fail
      }
    }
    fetchUsers();
    return () => { cancelled = true; };
  }, []);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return allUsers;
    const q = userSearch.toLowerCase();
    return allUsers.filter((u) =>
      u.uniqueId?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      u.handle?.toLowerCase().includes(q)
    );
  }, [userSearch, allUsers]);

  async function handleStartConvo() {
    const val = newConvo.trim();
    if (!val) {
      showToast('Type a name or ID to start a conversation');
      return;
    }
    setNewConvo('');
    const lower = val.toLowerCase();
    const matchedUser = filteredUsers.find(
      (u) => u.uniqueId?.toLowerCase() === lower || u.name?.toLowerCase().includes(lower) || u.handle?.toLowerCase().includes(lower)
    );
    if (!matchedUser) {
      showToast('Try a name or ID like FD001, FD002...');
      return;
    }

    ensureContactForUser(matchedUser.id, matchedUser);
    router.push(`/messages/${matchedUser.id}`);
  }

  function togglePin(key) {
    vibrate('light');
    setPinned((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    showToast(pinned.includes(key) ? 'Unpinned conversation' : 'Pinned to top');
  }

  function deleteConversation(key, c) {
    vibrate('light');
    const id = c.chatId || key;
    if (!window.confirm('Delete this conversation for everyone? This cannot be undone.')) {
      setSwipedKey(null);
      return;
    }
    deleteChatFS(id)
      .then((r) => {
        if (r.success) {
          showToast('Conversation deleted');
        } else {
          console.error('Delete chat failed:', r.error);
          showToast(`Delete failed: ${r.error}`);
        }
      })
      .catch(() => showToast('Could not delete conversation'));
    setSwipedKey(null);
  }

  function handleSwipe(key) {
    setSwipedKey(swipedKey === key ? null : key);
  }

  function getTypingText(key) {
    const c = contacts[key];
    if (!c || !c.online || c.isGroup) return null;
    const lastMsg = c.messages[c.messages.length - 1];
    if (lastMsg?.who === 'out') return null;
    const typingChance = key === 'sophia' || key === 'daniel';
    return typingChance ? 'typing...' : null;
  }

  return (
    <MainScreenShell>
      {/* Header */}
      <div className="flex flex-none items-center justify-between px-5 pb-1 pt-3.5">
        <button
          onClick={() => router.push('/home')}
          aria-label="Go to home"
          className="flex items-center gap-2.5"
        >
          <Logo size={26} />
          <Wordmark size="text-[17px]" />
        </button>
        <div className="flex items-center gap-3.5">
          <button onClick={() => router.push('/profile')} className="relative">
            <Avatar src={profile.avatar} name={profile.name} size={34} />
            <span className="absolute bottom-0 right-0 h-[11px] w-[11px] rounded-full border-2 border-black bg-brandgreen" />
          </button>
          <button
            onClick={() => {
              vibrate('light');
              showToast('Compose a new message');
            }}
            className="flex h-[44px] w-[44px] items-center justify-center rounded-full text-gold-hi"
          >
            <PenSquare size={19} />
          </button>
          <button
            onClick={() => {
              vibrate('light');
              setShowUserSearch((prev) => !prev);
            }}
            className={`flex h-[44px] w-[44px] items-center justify-center rounded-full transition-colors ${
              showUserSearch ? 'bg-gold text-[#1a1300]' : 'text-gold-hi'
            }`}
          >
            <AtSign size={19} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="no-scrollbar overflow-y-auto">
        {/* Search */}
        <div className="mx-[18px] mb-3 mt-2 flex items-center gap-2.5 rounded-2xl border border-linesoft bg-card px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-gold">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="flex-1 bg-transparent text-[13px] text-white placeholder:text-text3 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-text3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* User Search Overlay */}
        {showUserSearch && (
          <div className="mx-[18px] mb-3">
            <div className="rounded-2xl border border-gold/30 bg-card p-3">
              <div className="mb-2.5 flex items-center gap-2.5 rounded-xl border border-linesoft bg-[rgba(255,255,255,0.03)] px-3.5 py-2.5">
                <AtSign size={15} className="flex-none text-gold" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Enter user ID (FD001)..."
                  autoFocus
                  className="flex-1 bg-transparent text-[13px] text-white placeholder:text-text3 focus:outline-none"
                />
                {userSearch && (
                  <button onClick={() => setUserSearch('')} className="text-text3">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
              <div className="max-h-[240px] overflow-y-auto">
                {allUsers.length === 0 && (
                  <div className="py-4 text-center text-[12px] text-text3">No users found</div>
                )}
                {allUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={async () => {
                      vibrate('light');
                      setShowUserSearch(false);
                      setUserSearch('');
                      ensureContactForUser(u.id, u);
                      router.push(`/messages/${u.id}`);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <Avatar src={u.avatar} name={u.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-white">{u.name}</span>
                        <span className="rounded-full bg-gold/15 px-1.5 py-px text-[9px] font-extrabold text-gold">
                          {u.uniqueId}
                        </span>
                      </div>
                      <span className="text-[11px] text-text3">{u.handle}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-[18px] pb-3">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            const count = t.key === 'unread' ? totalUnread : t.key === 'messages' ? rows.length : 0;
            return (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); vibrate('light'); }}
                className={`flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-[12px] font-bold transition-all duration-150 ${
                  active
                    ? 'border-gold bg-[rgba(217,172,61,0.15)] text-gold'
                    : 'border-linesoft bg-transparent text-text3'
                }`}
              >
                <Icon size={13} />
                {t.label}
                {count > 0 && (
                  <span className={`ml-0.5 rounded-full px-1.5 py-px text-[10px] font-extrabold ${
                    active ? 'bg-gold text-[#1a1300]' : 'bg-white/10 text-text3'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick DMs */}
        {tab === 'messages' && !query && (
          <div className="mb-3 px-[18px]">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text3">Quick message</div>
            <div className="flex gap-3">
              {Object.entries(mergedContacts).filter(([, c]) => !c.isGroup).slice(0, 4).map(([key, c]) => {
                const unread = unreadFor(key, c);
                return (
                  <button
                    key={key}
                    onClick={() => { vibrate('light'); router.push(`/messages/${c.chatId || key}`); }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className="relative">
                      <Avatar src={c.avatar} name={c.name} size={50} />
                      {unread > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-grad px-1 text-[9px] font-extrabold text-[#1a1300]">
                          {unread}
                        </span>
                      )}
                      {c.online && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0a0a0a] bg-brandgreen" />
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-text2">{c.name?.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Conversation List */}
        <div className="flex flex-col px-[18px] pb-3">
          {pinnedRows.length === 0 && unpinnedRows.length === 0 && (
            <EmptyState icon={MessageCircle} title="No conversations yet" description="Start a conversation to connect with people." />
          )}

          {/* Pinned Section */}
          {pinnedRows.length > 0 && (
            <div className="mb-1">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text3">
                <Pin size={10} /> Pinned
              </div>
              {pinnedRows.map(([key, c]) => (
                <ConversationRow
                  key={key}
                  contactKey={key}
                  c={c}
                  unread={unreadFor(key, c)}
                  isPinned={pinned.includes(key)}
                  isSwiped={swipedKey === key}
                  typingText={getTypingText(key)}
                  onSwipe={handleSwipe}
                  onTogglePin={togglePin}
                  onDeleteChat={() => deleteConversation(key, c)}
                  onOpen={() => {
                    vibrate('light');
                    router.push(`/messages/${c.chatId || key}`);
                  }}
                />
              ))}
            </div>
          )}

          {/* All / Other conversations */}
          {unpinnedRows.length > 0 && pinnedRows.length > 0 && (
            <div className="mb-1.5 mt-2 text-[10px] font-bold uppercase tracking-wider text-text3">
              {tab === 'messages' ? 'All messages' : TABS.find((t) => t.key === tab)?.label}
            </div>
          )}
          {unpinnedRows.map(([key, c]) => (
            <ConversationRow
              key={key}
              contactKey={key}
              c={c}
              unread={unreadFor(key, c)}
              isPinned={pinned.includes(key)}
              isSwiped={swipedKey === key}
              typingText={getTypingText(key)}
              onSwipe={handleSwipe}
              onTogglePin={togglePin}
              onDeleteChat={() => deleteConversation(key, c)}
              onOpen={() => {
                vibrate('light');
                router.push(`/messages/${c.chatId || key}`);
              }}
            />
          ))}
        </div>

        {/* New conversation input */}
        <div className="mx-[18px] mb-4 flex items-center gap-2.5 rounded-2xl border border-linesoft bg-card px-3.5 py-2.5">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gold-grad text-[#1a1300]">
            <Plus size={16} />
          </div>
          <input
            type="text"
            value={newConvo}
            onChange={(e) => setNewConvo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStartConvo()}
            placeholder="Name or ID (FD001, FD002...)"
            className="flex-1 bg-transparent text-[13px] text-white placeholder:text-text3 focus:outline-none"
          />
          <button
            onClick={handleStartConvo}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-gold text-gold transition-colors hover:bg-gold hover:text-[#1a1300]"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
      <ScrollToTop scrollRef={scrollRef} />
    </MainScreenShell>
  );
}

function ConversationRow({ contactKey, c, unread, isPinned, isSwiped, typingText, onSwipe, onTogglePin, onDeleteChat, onOpen }) {
  const lastMsg = c.messages[c.messages.length - 1];
  return (
    <div className="relative mb-1.5 overflow-hidden rounded-2xl">
      {/* Action buttons revealed on swipe */}
      <div
        className={`absolute inset-0 flex items-center justify-end gap-2 rounded-2xl bg-white/5 px-4 transition-transform duration-200 ${
          isSwiped ? '-translate-x-[132px]' : 'translate-x-full'
        }`}
      >
        <button
          onClick={() => onTogglePin(contactKey)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/20 text-gold"
        >
          <Pin size={14} />
        </button>
        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-text2">
          <Archive size={14} />
        </button>
        <button onClick={onDeleteChat} className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/20 text-red-400">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Main row */}
      <button
        onClick={onOpen}
        onDoubleClick={() => onSwipe(contactKey)}
        className={`relative flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 ${
          isSwiped ? '-translate-x-[132px]' : 'translate-x-0'
        } ${
          unread > 0
            ? 'border-gold/30 bg-[rgba(217,172,61,0.06)]'
            : 'border-transparent bg-transparent hover:bg-white/[0.03]'
        }`}
      >
        {/* Avatar */}
        {c.isGroup ? (
          <div className="flex h-[50px] w-[50px] flex-none items-center justify-center rounded-full border border-line bg-[rgba(217,172,61,0.08)] text-gold">
            <Users size={20} />
          </div>
        ) : (
          <div className="relative flex-none">
            <Avatar src={c.avatar} name={c.name} size={50} />
            {c.online && (
              <span className="absolute bottom-0 right-0 h-[11px] w-[11px] rounded-full border-2 border-[#0a0a0a] bg-brandgreen" />
            )}
          </div>
        )}

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 items-center gap-1.5">
              {isPinned && <Pin size={10} className="inline text-gold" />}
              <span className={`text-[14px] ${unread > 0 ? 'font-extrabold text-white' : 'font-bold text-white/90'}`}>
                {c.name}
              </span>
            </div>
            <span className={`flex-none text-[10.5px] ${unread > 0 ? 'font-bold text-gold' : 'text-text3'}`}>
              {c.lastActive}
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className={`min-w-0 flex-1 truncate text-[12px] ${unread > 0 ? 'font-semibold text-white/80' : 'text-text2'}`}>
              {typingText ? (
                <span className="flex items-center gap-1 text-brandgreen">
                  <span className="typing-dots">
                    <span /><span /><span />
                  </span>
                  typing
                </span>
              ) : lastMsg ? (
                lastMsg.who === 'file' ? `📎 ${lastMsg.name}` :
                lastMsg.who === 'out' ? `You: ${lastMsg.text}` : lastMsg.text
              ) : 'Start a conversation'}
            </span>
            {unread > 0 && (
              <span className="flex h-[20px] min-w-[20px] flex-none items-center justify-center rounded-full bg-gold-grad px-1.5 text-[10px] font-extrabold text-[#1a1300]">
                {unread}
              </span>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
