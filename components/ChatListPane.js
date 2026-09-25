'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Users, Search } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useStore } from '@/lib/store';
import { subscribeToChats } from '@/lib/firestore';

export default function ChatListPane({ activeChatId = null }) {
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const contacts = useStore((s) => s.contacts);
  const unreadByContact = useStore((s) => s.unreadByContact);
  const [fsChats, setFsChats] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!profile?.id) return;
    const unsub = subscribeToChats(profile.id, (chats) => setFsChats(chats));
    return () => unsub();
  }, [profile?.id]);

  const rows = useMemo(() => {
    const merged = {};
    fsChats.forEach((chat) => {
      const convId = chat.id;
      const myUnread = (chat.unreadBy && chat.unreadBy[profile?.id]) || 0;
      const otherId = chat.isGroup ? null : (chat.participants || []).find((p) => p !== profile?.id);
      const otherName = chat.participantNames && otherId
        ? chat.participantNames[otherId] || 'Chat'
        : chat.isGroup ? (chat.groupName || 'Group') : 'Chat';
      const otherAvatar = chat.participantAvatars && otherId ? chat.participantAvatars[otherId] || null : null;
      merged[convId] = {
        name: otherName,
        avatar: otherAvatar,
        isGroup: !!chat.isGroup,
        chatId: convId,
        unread: myUnread,
        lastMessage: chat.lastMessage,
        lastActive: chat.lastActive || 'Now',
      };
    });
    Object.entries(contacts).forEach(([key, c]) => {
      if (merged[key] || (fsChats || []).some((chat) => (chat.participants || []).includes(key))) return;
      merged[key] = { ...c, chatId: key, unread: unreadByContact[key] || 0 };
    });
    let list = Object.values(merged).sort((a, b) => ((b.unread || 0) - (a.unread || 0)));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) => c.name?.toLowerCase().includes(q) || c.lastMessage?.toLowerCase().includes(q));
    }
    return list;
  }, [fsChats, contacts, profile?.id, unreadByContact, query]);

  return (
    <div className="hidden lg:flex w-[340px] flex-none flex-col border-r border-linesoft bg-card/40">
      <div className="flex flex-none items-center justify-between border-b border-linesoft px-4 py-3.5">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-gold" />
          <h2 className="text-[14px] font-extrabold">Messages</h2>
        </div>
        <button
          onClick={() => router.push('/messages/create-group')}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10 text-gold"
          aria-label="New group chat"
        >
          <Users size={14} />
        </button>
      </div>
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 rounded-xl border border-linesoft bg-white/[0.02] px-3 py-2">
          <Search size={13} className="flex-none text-text3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats..."
            className="flex-1 bg-transparent text-[12px] text-white placeholder:text-text3 focus:outline-none"
          />
        </div>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-2 pb-3">
        {rows.length === 0 && (
          <div className="py-10 text-center text-[11.5px] text-text3">No conversations yet</div>
        )}
        {rows.map((c) => {
          const active = activeChatId === c.chatId;
          const lastMsg = c.lastMessage || (c.messages && c.messages[c.messages.length - 1]?.text) || 'Start a conversation';
          return (
            <button
              key={c.chatId}
              onClick={() => router.push(`/messages/${c.chatId}`)}
              className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors ${
                active ? 'bg-gold/10' : 'hover:bg-white/[0.04]'
              }`}
            >
              <div className="relative flex-none">
                {c.isGroup ? (
                  <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-line bg-[rgba(217,172,61,0.08)] text-gold">
                    <Users size={16} />
                  </div>
                ) : (
                  <>
                    <Avatar src={c.avatar} name={c.name} size={42} />
                    {c.online && (
                      <span className="absolute bottom-0 right-0 h-[10px] w-[10px] rounded-full border-2 border-[#0a0a0a] bg-brandgreen" />
                    )}
                  </>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate text-[13px] ${c.unread > 0 ? 'font-extrabold text-white' : 'font-bold text-white/90'}`}>
                    {c.name}
                  </span>
                  <span className="flex-none text-[10px] text-text3">{c.lastActive}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span className={`min-w-0 flex-1 truncate text-[11.5px] ${c.unread > 0 ? 'font-semibold text-white/80' : 'text-text2'}`}>
                    {lastMsg}
                  </span>
                  {c.unread > 0 && (
                    <span className="flex h-[18px] min-w-[18px] flex-none items-center justify-center rounded-full bg-gold-grad px-1 text-[9.5px] font-extrabold text-[#1a1300]">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}