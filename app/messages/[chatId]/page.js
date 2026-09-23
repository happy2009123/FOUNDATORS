'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Phone, Video, Plus, Smile, Send, FileText, Download, Check, CheckCheck, Copy, Reply, Trash2, X, Image, Mic, Sticker, Pause, Play, Camera } from 'lucide-react';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, onSnapshot } from 'firebase/firestore';
import { subscribeToMessages, sendMessage as sendFS, deleteMessage as deleteFS, conversationIdFor } from '@/lib/firestore';
import { useHaptics } from '@/lib/useHaptics';
import Avatar from '@/components/Avatar';
import CallScreen from '@/components/CallScreen';
import AuthSkeleton from '@/components/AuthSkeleton';

const EMOJI_SHORTCUTS = { ':)': '😊', ':(': '😢', ':D': '😃', '<3': '❤️', ':+1': '👍', '🔥': '🔥', '🎉': '🎉', '💡': '💡' };

function formatMsgTime(timestamp) {
  if (!timestamp) return 'Now';
  if (typeof timestamp === 'string') return timestamp;
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const { chatId } = useParams();
  const profile = useStore((s) => s.profile);
  const contact = useStore((s) => s.contacts[chatId]);
  const markContactRead = useStore((s) => s.markContactRead);
  const showToast = useStore((s) => s.showToast);
  const { vibrate, notification } = useHaptics();

  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [typing, setTyping] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [messageReactions, setMessageReactions] = useState({});
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voiceMessages, setVoiceMessages] = useState({});
  const [showImagePreview, setShowImagePreview] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [directions, setDirections] = useState(null);
  const [chatData, setChatData] = useState(null);
  const [fsMessages, setFsMessages] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const recordingInterval = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (chatId) markContactRead(chatId);
  }, [chatId, markContactRead]);

  const messages = fsMessages !== null ? fsMessages : (contact?.messages || []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, typing]);

  // Resolve the deterministic conversation ID for this route.
  // The route param is either a user UID (from profile "Message" or search)
  // or a chat doc ID (from the converstion list). We map both to the SAME
  // canonical conversation so every open lands on one persistent chat.
  useEffect(() => {
    if (!chatId || !profile?.id || !db) return;
    let cancelled = false;
    async function resolveDirection() {
      try {
        // Case A: param is a user UID → deterministic pair ID.
        const userSnap = await getDoc(doc(db, 'users', chatId));
        if (cancelled) return;
        if (userSnap.exists()) {
          const other = userSnap.data();
          const convId = conversationIdFor(profile.id, chatId);
          setDirections({
            type: 'dm',
            convId,
            otherUid: chatId,
            other,
          });
          return;
        }
        // Case B: param is a chat doc ID (e.g. reopened from the list).
        const chatSnap = await getDoc(doc(db, 'chats', chatId));
        if (cancelled) return;
        if (chatSnap.exists()) {
          const data = chatSnap.data();
          const participants = data.participants || [];
          const otherUid = !data.isGroup
            ? participants.find((p) => p !== profile.id)
            : null;
          const other = otherUid
            ? {
                name: (data.participantNames && data.participantNames[otherUid]) || 'User',
                avatar: (data.participantAvatars && data.participantAvatars[otherUid]) || null,
              }
            : null;
          setDirections({
            type: data.isGroup ? 'group' : 'dm',
            convId: chatId,
            otherUid,
            other,
            participants,
            participantNames: data.participantNames || {},
            participantAvatars: data.participantAvatars || {},
          });
        }
      } catch (err) {
        console.warn('Failed to resolve chat direction:', err);
      }
    }
    resolveDirection();
    return () => { cancelled = true; };
  }, [chatId, profile?.id, db]);

  const convId = directions?.convId || null;
  const otherUid = directions?.otherUid || null;
  const other = directions?.other || null;

  const sendPayload = useCallback(() => {
    if (!convId || !profile?.id) return null;
    const isGroup = directions?.type === 'group';
    const participants = isGroup
      ? (directions?.participants || [])
      : (otherUid ? [profile.id, otherUid] : []);
    if (!isGroup && !otherUid) return null;
    const names = directions?.participantNames || (otherUid && other
      ? { [profile.id]: profile.name, [otherUid]: other.name || 'User' }
      : {});
    const avatars = directions?.participantAvatars || (otherUid && other
      ? { [profile.id]: profile.avatar || '', [otherUid]: other.avatar || '' }
      : {});
    return { convId, participants, participantNames: names, participantAvatars: avatars };
  }, [convId, profile, otherUid, other, directions]);

  useEffect(() => {
    if (!convId || !profile?.id) return;
    const markRead = async () => {
      try {
        const unreadQ = query(
          collection(db, 'chats', convId, 'messages'),
          where('read', '==', false)
        );
        const snap = await getDocs(unreadQ);
        snap.docs.forEach(async (d) => {
          const data = d.data();
          if (data.senderKey === profile.id) return;
          await updateDoc(doc(db, 'chats', convId, 'messages', d.id), { read: true });
        });
        await updateDoc(doc(db, 'chats', convId), { [`unreadBy.${profile.id}`]: 0 });
      } catch (err) {
        console.warn('Failed to mark messages read:', err);
      }
    };
    markRead();
  }, [convId, profile?.id]);

  useEffect(() => {
    if (!convId || !db) return;
    const unsub = onSnapshot(doc(db, 'chats', convId), (snap) => {
      const data = snap.data();
      const typingData = data?.typing || {};
      const otherTyping = Object.entries(typingData).find(
        ([uid, ts]) => uid !== profile?.id && Date.now() - ts < 3000
      );
      setTyping(!!otherTyping);
    });
    return () => unsub();
  }, [convId, profile?.id]);

  useEffect(() => {
    if (!convId || !db) return;
    let cancelled = false;
    async function fetchChatMeta() {
      try {
        const chatSnap = await getDoc(doc(db, 'chats', convId));
        if (cancelled) return;
        if (chatSnap.exists()) {
          const data = chatSnap.data();
          const participants = data.participants || [];
          const uidField = !data.isGroup ? participants.find((p) => p !== profile.id) : null;
          setChatData({
            name: data.isGroup
              ? data.groupName
              : (uidField && data.participantNames && data.participantNames[uidField]) || other?.name || 'Chat',
            avatar: data.isGroup
              ? null
              : (uidField && data.participantAvatars && data.participantAvatars[uidField]) || other?.avatar || null,
            online: true,
            status: 'Online',
            isGroup: !!data.isGroup,
            groupName: data.groupName || '',
            participants,
            participantNames: data.participantNames || {},
            participantAvatars: data.participantAvatars || {},
          });
        }
      } catch (err) {
        console.warn('Failed to load chat metadata:', err);
      }
    }
    fetchChatMeta();
    return () => { cancelled = true; };
  }, [convId, profile?.id, profile.name, profile.avatar, other?.name, other?.avatar]);

  useEffect(() => {
    if (!convId || !db) return;
    const unsub = subscribeToMessages(convId, (msgs) => {
      setFsMessages(msgs.map((m) => ({
        ...m,
        time: formatMsgTime(m.createdAt),
      })));
    });
    return () => unsub();
  }, [convId]);

  const handleSend = useCallback(() => {
    const val = input.trim();
    if (!val) return;
    setInput('');
    setReplyTo(null);
    setShowEmoji(false);
    const p = sendPayload();
    if (p) {
      sendFS(p.convId, {
        text: val,
        senderKey: profile.id,
        senderName: profile.name,
        senderAvatar: profile.avatar,
        participants: p.participants,
        participantNames: p.participantNames,
        participantAvatars: p.participantAvatars,
      })
        .then((r) => {
          if (!r.success) {
            console.error('Send failed:', r.error);
            showToast(`Message not sent: ${r.error}`);
          }
        })
        .catch((err) => {
          console.error('Send error:', err);
          showToast('Message not sent — check Firestore rules');
        });
    }
    notification('success');
  }, [input, sendPayload, profile, sendFS, showToast, notification]);

  const handleInputChange = useCallback((e) => {
    setInput(e.target.value);
    if (convId && profile?.id) {
      updateDoc(doc(db, 'chats', convId), { [`typing.${profile.id}`]: Date.now() }).catch(() => {});
    }
  }, [convId, profile?.id]);

  const handleCopy = useCallback((text) => {
    navigator.clipboard?.writeText(text);
    showToast('Copied to clipboard');
    setCtxMenu(null);
  }, [showToast]);

  const handleReply = useCallback((msg) => {
    setReplyTo(msg);
    setCtxMenu(null);
    inputRef.current?.focus();
  }, []);

  const handleDelete = useCallback(() => {
    if (ctxMenu) {
      const msg = messages[ctxMenu.index];
      if (msg?.id && convId && db) {
        deleteFS(convId, msg.id).catch(() => {});
      }
      vibrate('light');
    }
    setCtxMenu(null);
  }, [ctxMenu, convId, messages, vibrate]);

  const handleReaction = useCallback((msgIndex, emoji) => {
    vibrate('light');
    setMessageReactions((prev) => ({
      ...prev,
      [msgIndex]: prev[msgIndex] === emoji ? null : emoji,
    }));
    setShowReactionPicker(null);
  }, [vibrate]);

  const startRecording = useCallback(() => {
    vibrate('medium');
    setIsRecording(true);
    setRecordingTime(0);
    recordingInterval.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  }, [vibrate]);

  const stopRecording = useCallback(() => {
    vibrate('light');
    setIsRecording(false);
    clearInterval(recordingInterval.current);
    if (recordingTime > 0) {
      const voiceText = `🎤 Voice message (${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')})`;
      const p = sendPayload();
      if (p) {
        sendFS(p.convId, {
          text: voiceText,
          senderKey: profile.id,
          senderName: profile.name,
          senderAvatar: profile.avatar,
          participants: p.participants,
          participantNames: p.participantNames,
          participantAvatars: p.participantAvatars,
        }).catch(() => {});
      }
      notification('success');
    }
    setRecordingTime(0);
  }, [recordingTime, sendPayload, profile, sendFS, notification, vibrate]);

  const cancelRecording = useCallback(() => {
    vibrate('light');
    setIsRecording(false);
    clearInterval(recordingInterval.current);
    setRecordingTime(0);
  }, [vibrate]);

  const handleImageSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Only images are allowed');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setShowImagePreview(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [showToast]);

  const sendImage = useCallback(() => {
    if (!showImagePreview) return;
    setShowImagePreview(null);
    const p = sendPayload();
    if (p) {
      sendFS(p.convId, {
        text: '📷 Image',
        senderKey: profile.id,
        senderName: profile.name,
        senderAvatar: profile.avatar,
        participants: p.participants,
        participantNames: p.participantNames,
        participantAvatars: p.participantAvatars,
      }).catch(() => {});
    }
    notification('success');
  }, [showImagePreview, sendPayload, profile, sendFS, notification]);

  const insertEmoji = useCallback((emoji) => {
    setInput((prev) => prev + emoji);
    inputRef.current?.focus();
  }, []);

  const applyShortcuts = useCallback((text) => {
    let result = text;
    for (const [shortcut, emoji] of Object.entries(EMOJI_SHORTCUTS)) {
      result = result.replaceAll(shortcut, emoji);
    }
    return result;
  }, []);

  function openContactProfile() {
    if (chatData?.isGroup) {
      showToast('Group info coming soon');
      return;
    }
    const pid = otherUid || chatId;
    if (pid) router.push(`/profile/${pid}`);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!ready) return <AuthSkeleton />;

  const displayContact = contact || (chatData ? {
    ...chatData,
    messages: messages,
    lastActive: 'Now',
  } : (other ? {
    name: other.name || 'Chat',
    avatar: other.avatar || null,
    online: true,
    status: 'Online',
    lastActive: 'Now',
    isGroup: false,
    messages: messages,
  } : null));

  if (!displayContact) {
    return (
      <div className="app-shell flex min-h-0 flex-1 flex-col">
        <div className="flex flex-none items-center gap-3 border-b border-linesoft px-4 py-3.5">
          <button onClick={() => router.push('/messages')} className="flex h-[44px] w-[44px] items-center justify-center rounded-full text-gold-hi">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h2 className="text-[15px] font-extrabold">Conversation not found</h2>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-text2">
          This conversation doesn&apos;t exist or has been removed.
        </div>
      </div>
    );
  }

  const groupedMessages = [];
  let lastDate = '';
  messages.forEach((m, i) => {
    const dateLabel = m.time?.includes('Yesterday') ? 'Yesterday' :
                      m.time?.includes('Mon') ? 'Monday' :
                      m.time?.includes('Tue') ? 'Tuesday' :
                      m.time?.includes('Wed') ? 'Wednesday' :
                      m.time?.includes('Thu') ? 'Thursday' :
                      m.time?.includes('Fri') ? 'Friday' :
                      m.time?.includes('Sat') ? 'Saturday' :
                      m.time?.includes('Sun') ? 'Sunday' : 'Today';
    if (dateLabel !== lastDate) {
      groupedMessages.push({ type: 'date', label: dateLabel, key: `date-${i}` });
      lastDate = dateLabel;
    }
    groupedMessages.push({ type: 'msg', msg: m, key: `msg-${i}`, index: i });
  });

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <div className="flex flex-none items-center gap-3 border-b border-linesoft px-4 py-3">
        <button
          onClick={() => router.push('/messages')}
          className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-full text-gold-hi"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button onClick={openContactProfile} className="relative flex-none">
          {displayContact.isGroup ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-[rgba(217,172,61,0.1)] text-gold">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </div>
          ) : (
            <>
              <Avatar src={displayContact.avatar} name={displayContact.name} size={40} />
              {displayContact.online && (
                <span className="absolute bottom-0 right-0 h-[11px] w-[11px] rounded-full border-2 border-black bg-brandgreen" />
              )}
            </>
          )}
        </button>
        <button onClick={openContactProfile} className="min-w-0 flex-1 text-left">
          <div className="truncate text-[15px] font-extrabold">{displayContact.name}</div>
          <div className={`text-[11px] font-semibold ${displayContact.online ? 'text-brandgreen' : 'text-text3'}`}>
            {displayContact.online ? 'Online now' : displayContact.status}
          </div>
        </button>
        <div className="flex flex-none gap-1">
          <button onClick={() => setActiveCall('voice')} className="flex h-[44px] w-[44px] items-center justify-center rounded-full text-gold-hi" aria-label="Voice call">
            <Phone size={17} />
          </button>
          <button onClick={() => setActiveCall('video')} className="flex h-[44px] w-[44px] items-center justify-center rounded-full text-gold-hi" aria-label="Video call">
            <Video size={17} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="no-scrollbar flex-1 overflow-y-auto px-3.5 py-3">
        <div className="mb-4 flex items-center justify-center gap-1.5 text-[10px] text-text3">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          Messages are end-to-end encrypted
        </div>

        {groupedMessages.map((item) => {
          if (item.type === 'date') {
            return (
              <div key={item.key} className="mb-3 flex items-center gap-2.5">
                <div className="h-px flex-1 bg-linesoft" />
                <span className="whitespace-nowrap rounded-full border border-line px-3 py-1 text-[10px] font-semibold text-text3">{item.label}</span>
                <div className="h-px flex-1 bg-linesoft" />
              </div>
            );
          }

          const m = item.msg;
          const isOut = m.who === 'out' || (!!profile?.id && m.senderKey === profile.id);
          const isFile = m.who === 'file' || !!m.isFile;

          if (isFile) {
            return (
              <div key={item.key} className="mb-2 flex flex-col items-end">
                <div
                  className="flex max-w-[78%] items-center gap-3 rounded-2xl border border-linesoft bg-card p-3"
                  onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ index: item.index, x: e.clientX, y: e.clientY }); }}
                >
                  <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-gold-grad text-[#1a1300]">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-bold">{m.name}</div>
                    <div className="text-[10.5px] text-text3">{m.size}</div>
                  </div>
                  <button className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-gold text-gold">
                    <Download size={14} />
                  </button>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[9.5px] text-text3">
                  {m.time} <CheckCheck size={13} className="text-gold" />
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.key}
              className={`mb-1.5 flex items-end gap-2 ${isOut ? 'justify-end' : ''}`}
              onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ index: item.index, x: e.clientX, y: e.clientY }); }}
              onClick={() => setShowReactionPicker(showReactionPicker === item.index ? null : item.index)}
            >
              {!isOut && !displayContact.isGroup && (
                <Avatar src={displayContact.avatar} name={displayContact.name} size={24} className="flex-none" />
              )}
              <div className={`group relative max-w-[76%] rounded-[18px] px-3.5 py-[10px] text-[13.5px] leading-snug ${
                isOut
                  ? 'rounded-br-[4px] bg-gold-grad font-medium text-[#1a1300]'
                  : 'rounded-bl-[4px] border border-linesoft bg-card'
              }`}>
                {m.text}
                <div className={`mt-0.5 flex items-center justify-end gap-1 ${isOut ? 'opacity-60' : ''}`}>
                  <span className={`text-[9.5px] ${isOut ? 'text-[#1a1300]' : 'text-text3'}`}>{m.time}</span>
                  {isOut && (
                    <span className="text-[10px] text-[#1a1300]">
                      {m.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
                {messageReactions[item.index] && (
                  <div className={`absolute -bottom-2 ${isOut ? 'left-2' : 'right-2'} flex h-5 items-center justify-center rounded-full bg-card border border-linesoft px-1.5 text-[11px]`}>
                    {messageReactions[item.index]}
                  </div>
                )}
              </div>

              {showReactionPicker === item.index && (
                <div className="absolute bottom-full mb-1 z-40 flex gap-1 rounded-full border border-linesoft bg-card p-1.5 shadow-xl">
                  {['❤️', '🔥', '👏', '😂', '😮', '😢'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={(e) => { e.stopPropagation(); handleReaction(item.index, emoji); }}
                      className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/10 text-lg transition-transform hover:scale-125"
                      aria-label={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {typing && (
          <div className="mb-2 flex items-center gap-2">
            <Avatar src={displayContact.avatar} name={displayContact.name} size={24} className="flex-none" />
            <div className="flex items-center gap-1 rounded-2xl border border-linesoft bg-card px-4 py-2.5">
              <span className="typing-dots">
                <span /><span /><span />
              </span>
            </div>
          </div>
        )}
      </div>

      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setCtxMenu(null)} />
          <div
            className="fixed z-50 min-w-[160px] rounded-2xl border border-linesoft bg-card p-1.5 shadow-xl"
            style={{ top: Math.min(ctxMenu.y, window.innerHeight - 180), left: Math.min(ctxMenu.x, window.innerWidth - 180) }}
          >
            <button onClick={() => handleReply(messages[ctxMenu.index])} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12.5px] text-white hover:bg-white/5">
              <Reply size={14} className="text-gold" /> Reply
            </button>
            <button onClick={() => handleCopy(messages[ctxMenu.index].text || '')} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12.5px] text-white hover:bg-white/5">
              <Copy size={14} className="text-gold" /> Copy
            </button>
            <button onClick={handleDelete} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12.5px] text-red-400 hover:bg-red-500/10">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </>
      )}

      {replyTo && (
        <div className="flex items-center gap-2 border-t border-linesoft bg-card px-4 py-2">
          <Reply size={14} className="flex-none text-gold" />
          <div className="min-w-0 flex-1 truncate text-[11.5px] text-text2">
            Replying to: <span className="text-white">{replyTo.text?.slice(0, 60)}</span>
          </div>
          <button onClick={() => setReplyTo(null)} className="flex-none text-text3">
            <X size={14} />
          </button>
        </div>
      )}

      {showEmoji && (
        <div className="flex gap-2 border-t border-linesoft bg-card px-4 py-2.5">
          {['😊', '😂', '❤️', '🔥', '👍', '🎉', '💡', '🚀', '💪', '✨', '🙏', '😍'].map((e) => (
            <button key={e} onClick={() => insertEmoji(e)} className="text-xl">{e}</button>
          ))}
        </div>
      )}

      {showImagePreview && (
        <div className="flex items-center gap-2 border-t border-linesoft bg-card px-4 py-2">
          <div className="relative">
            <img src={showImagePreview} alt="Preview" className="h-20 rounded-xl object-cover" />
            <button onClick={() => setShowImagePreview(null)} className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white" aria-label="Remove image">
              <X size={10} />
            </button>
          </div>
          <div className="flex-1 text-[11px] text-text2">Image ready to send</div>
          <button onClick={sendImage} className="rounded-full bg-gold px-4 py-2 text-[11px] font-bold text-[#1a1300]" aria-label="Send image">
            Send
          </button>
        </div>
      )}

      {isRecording && (
        <div className="flex items-center gap-3 border-t border-linesoft bg-card px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-red animate-pulse" />
          <span className="text-[13px] font-bold text-red">
            Recording {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
          </span>
          <div className="flex-1" />
          <button onClick={cancelRecording} className="rounded-full border border-linesoft px-3 py-1.5 text-[11px] font-bold text-text2" aria-label="Cancel recording">
            Cancel
          </button>
          <button onClick={stopRecording} className="rounded-full bg-gold px-4 py-1.5 text-[11px] font-bold text-[#1a1300]" aria-label="Send voice message">
            Send
          </button>
        </div>
      )}

      <div className="safe-bottom flex flex-none items-end gap-2 border-t border-linesoft px-3 py-2.5">
        <div className="relative">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-full border border-line text-gold"
            aria-label="Share image"
          >
            <Camera size={17} strokeWidth={2.2} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
        </div>
        <div className="flex flex-1 items-end gap-2 rounded-2xl border border-linesoft bg-card px-3.5 py-2">
          <button onClick={() => setShowEmoji(!showEmoji)} className={`mb-0.5 flex-none ${showEmoji ? 'text-gold' : 'text-text3'}`} aria-label="Toggle emoji picker">
            <Smile size={18} />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            aria-label="Type a message"
            rows={1}
            className="max-h-20 flex-1 resize-none bg-transparent text-[13.5px] text-white placeholder:text-text3 focus:outline-none"
            style={{ minHeight: '20px' }}
          />
        </div>
        {input.trim() ? (
          <button
            onClick={handleSend}
            className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-full bg-gold-grad text-[#1a1300] transition-all duration-150"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        ) : (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex h-[44px] w-[44px] flex-none items-center justify-center rounded-full transition-all duration-150 ${
              isRecording ? 'bg-red text-white animate-pulse' : 'bg-white/10 text-text3'
            }`}
            aria-label={isRecording ? 'Stop recording' : 'Record voice message'}
          >
            {isRecording ? <Pause size={18} /> : <Mic size={18} />}
          </button>
        )}
      </div>

      {activeCall && otherUid && (
        <CallScreen
          userId={otherUid}
          type={activeCall}
          onClose={() => setActiveCall(null)}
        />
      )}
    </div>
  );
}
