'use client';

// ─────────────────────────────────────────────────────────────
// ADMIN → MESSAGES
// Read-only conversation monitoring. Firestore rules grant chat
// reads to participants OR admins — write operations remain
// participant-only, so this surface can never alter messages.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, X, Inbox, RotateCw } from 'lucide-react';
import { fetchChatsPage, fetchChatMessages } from '@/lib/adminData';
import { timeAgo } from '@/lib/admin';
import {
  Card, PageHeader, SearchField, TableSkeleton, EmptyState, ErrorState,
  Pagination, AvatarDot, Badge,
} from '@/components/admin/ui';

const PAGE_SIZE = 12;

export default function AdminMessagesPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState([]);
  const [nextCursor, setNextCursor] = useState(undefined);
  const [search, setSearch] = useState('');
  const [openChat, setOpenChat] = useState(null); // chat row
  const [messages, setMessages] = useState(null);
  const [msgError, setMsgError] = useState(null);

  const load = useCallback(async (stack) => {
    setLoading(true);
    setError(null);
    const cursor = stack.length ? stack[stack.length - 1] : null;
    const res = await fetchChatsPage({ cursor, pageSize: PAGE_SIZE });
    if (res.ok) {
      setRows(res.data.rows);
      setNextCursor(res.data.exhausted ? null : res.data.last);
    } else {
      setError(res.error);
      setRows([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load([]); }, [load]);

  const goNext = () => { if (!nextCursor) return; const n = [...cursors, nextCursor]; setCursors(n); setPage((p) => p + 1); load(n); };
  const goPrev = () => { if (page <= 1) return; const n = cursors.slice(0, -1); setCursors(n); setPage((p) => p - 1); load(n); };

  async function openConversation(chat) {
    setOpenChat(chat);
    setMessages(null);
    setMsgError(null);
    const res = await fetchChatMessages(chat.id, 25);
    if (res.ok) setMessages(res.data.reverse());
    else { setMsgError(res.error); setMessages([]); }
  }

  const filtered = rows
    ? rows.filter((c) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        const names = c.participantNames && typeof c.participantNames === 'object'
          ? Object.values(c.participantNames).join(' ')
          : '';
        return (c.groupName || '').toLowerCase().includes(q)
          || names.toLowerCase().includes(q)
          || (c.lastMessage || '').toLowerCase().includes(q)
          || c.id.toLowerCase().includes(q);
      })
    : [];

  return (
    <div className="animate-screen-in">
      <PageHeader
        title="Messages"
        subtitle="Read-only monitoring of platform conversations."
        actions={
          <button onClick={() => load(cursors)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[12px] font-bold text-text2 transition-colors hover:border-gold/40 hover:text-gold-hi">
            <RotateCw size={13} /> Refresh
          </button>
        }
      />

      <Card className="p-4">
        <SearchField value={search} onChange={setSearch} placeholder="Search by name, group, or message…" />
      </Card>

      <Card className="mt-4 overflow-hidden">
        {!rows ? (
          <TableSkeleton rows={6} cols={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => load(cursors)} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={search ? 'No conversations match' : 'No conversations yet'}
            body={search ? 'Try another name or message text.' : 'Chats appear here as soon as founders start talking.'}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <div className="grid grid-cols-[1.4fr_2fr_100px] gap-4 border-b border-white/10 px-5 py-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-text3">
                <span>Conversation</span>
                <span>Last message</span>
                <span className="text-right">Active</span>
              </div>
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openConversation(c)}
                  className="grid w-full grid-cols-[1.4fr_2fr_100px] items-center gap-4 border-b border-white/5 px-5 py-3.5 text-left last:border-0 hover:bg-white/[0.03]"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border ${c.isGroup ? 'border-gold/30 bg-gold/10 text-gold' : 'border-white/10 bg-white/5 text-text2'}`}>
                      <MessageCircle size={14} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-bold">
                        {c.groupName || displayName(c)}
                      </span>
                      <span className="block truncate text-[11px] text-text3">
                        {c.isGroup ? `${c.participants?.length || 0} members` : 'Direct message'}
                      </span>
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] text-text2">{c.lastMessage || 'No messages yet'}</span>
                  </span>
                  <span className="text-right text-[11.5px] text-text3">{timeAgo(c.lastMessageAt)}</span>
                </button>
              ))}
            </div>

            <div className="divide-y divide-white/5 md:hidden">
              {filtered.map((c) => (
                <button key={c.id} onClick={() => openConversation(c)} className="block w-full p-4 text-left hover:bg-white/[0.03]">
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border ${c.isGroup ? 'border-gold/30 bg-gold/10 text-gold' : 'border-white/10 bg-white/5 text-text2'}`}>
                      <MessageCircle size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-bold">{c.groupName || displayName(c)}</div>
                      <div className="truncate text-[12px] text-text3">{c.lastMessage || 'No messages yet'}</div>
                    </div>
                    <span className="flex-none text-[11px] text-text3">{timeAgo(c.lastMessageAt)}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="px-5 pb-4">
              <Pagination hasPrev={page > 1} hasNext={!!nextCursor} onPrev={goPrev} onNext={goNext} busy={loading} label={`Page ${page}`} />
            </div>
          </>
        )}
      </Card>

      {/* read-only conversation viewer */}
      {openChat && (
        <div className="fixed inset-0 z-[600] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" onClick={() => setOpenChat(null)}>
          <div
            className="flex max-h-[80vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.09)] bg-[#111] shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <div className="truncate font-display text-[15px] font-extrabold">{openChat.groupName || displayName(openChat)}</div>
                <div className="text-[11.5px] text-text3">
                  {openChat.isGroup ? `${openChat.participants?.length || 0} members` : 'Direct message'} · read-only
                </div>
              </div>
              <button onClick={() => setOpenChat(null)} aria-label="Close viewer" className="rounded-lg p-2 text-text2 hover:bg-white/5 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {messages === null && !msgError && <TableSkeleton rows={4} cols={2} />}
              {msgError && <ErrorState message={msgError} />}
              {messages && messages.length === 0 && (
                <EmptyState icon={MessageCircle} title="No messages" body="This conversation has no messages yet." />
              )}
              {messages && messages.length > 0 && (
                <div className="space-y-2.5">
                  {messages.map((m) => (
                    <div key={m.id} className="max-w-[85%] rounded-2xl border border-white/5 bg-white/5 px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <AvatarDot src={m.senderAvatar} name={m.senderName} size={20} />
                        <span className="text-[11.5px] font-bold text-gold-hi">{m.senderName}</span>
                        <span className="text-[10.5px] text-text3">{timeAgo(m.createdAt)}</span>
                        {m.edited && <Badge tone="gray">edited</Badge>}
                      </div>
                      <div className="mt-1 text-[13px] leading-relaxed text-text2">{m.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-white/10 px-5 py-3 text-[11px] text-text3">
              Admins can read conversations for moderation — message writes stay participant-only (enforced by Firestore rules).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function displayName(c) {
  const names = c.participantNames && typeof c.participantNames === 'object'
    ? Object.values(c.participantNames).filter(Boolean)
    : [];
  return names.slice(0, 3).join(', ') || c.id;
}
