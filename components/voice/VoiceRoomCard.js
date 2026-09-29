'use client';

import { Headphones, Mic, Clock, Bell, BellRing, Lock, Radio } from 'lucide-react';
import Avatar from '@/components/Avatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import { formatRoomTime } from '@/lib/voice';

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brandred px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-white">
      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
      Live
    </span>
  );
}

export default function VoiceRoomCard({
  room,
  onJoin,
  onReminder,
  reminded = false,
  actionLabel = 'Join Room',
  footer = null,
}) {
  if (!room) return null;
  const isLive = room.status === 'live';
  const isScheduled = room.status === 'scheduled';
  const listenerCount = Math.max(0, room.participantCount || 0);
  const speakerCount = Math.max(0, room.speakerCount || 0);
  const avatars = Array.isArray(room.previewAvatars) ? room.previewAvatars.filter(Boolean).slice(0, 5) : [];
  const overflow = Math.max(0, listenerCount - avatars.length);

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card transition-all active:scale-[0.99]">
      <div className="flex items-start justify-between gap-2 px-3.5 pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-line bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-gold-hi">
            {room.category || 'Other'}
          </span>
          {room.type === 'private' ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10px] font-bold text-text3">
              <Lock size={9} /> Private
            </span>
          ) : null}
          {room.template && room.template !== 'standard' ? (
            <span className="rounded-full bg-brandblue/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brandblue">
              {room.template === 'cofounder' ? 'Co-Founder' : room.template}
            </span>
          ) : null}
        </div>
        {isLive ? <LiveBadge /> : null}
      </div>

      <div className="px-3.5 pt-2">
        <h3 className="line-clamp-2 text-[14.5px] font-extrabold leading-snug text-white">{room.title}</h3>
        {room.tags && room.tags.length ? (
          <div className="mt-1 truncate text-[11px] text-text3">{room.tags.slice(0, 4).join('  ·  ')}</div>
        ) : room.description ? (
          <div className="mt-1 line-clamp-1 text-[11.5px] text-text3">{room.description}</div>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center gap-2 px-3.5">
        <Avatar src={room.hostAvatar} name={room.hostName} size={30} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate text-[12.5px] font-bold text-text1">{room.hostName}</span>
            {room.hostVerified ? <VerifiedBadge size={12} /> : null}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-text3">
            {isScheduled ? formatRoomTime(room) : 'Host'}
          </div>
        </div>
        {isScheduled ? (
          <span className="inline-flex items-center gap-1 rounded-lg border border-line px-1.5 py-1 text-[10px] font-bold text-text2">
            <Clock size={10} />
            {formatRoomTime(room)}
          </span>
        ) : null}
      </div>

      {isLive ? (
        <div className="mt-2.5 flex items-center gap-3 px-3.5 text-[11px] font-semibold text-text2">
          <span className="inline-flex items-center gap-1.5">
            <Headphones size={12} className="text-text3" />
            {listenerCount} listening
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Mic size={12} className="text-text3" />
            {speakerCount} speaking
          </span>
        </div>
      ) : null}

      <div className="mt-2.5 flex items-center gap-2 px-3.5">
        <div className="flex -space-x-2">
          {avatars.map((src, i) => (
            <span key={`${src}-${i}`} className="rounded-full ring-2 ring-[#111111]">
              <Avatar src={src} name={`p${i}`} size={22} />
            </span>
          ))}
          {overflow > 0 ? (
            <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-white/10 px-1 text-[9.5px] font-bold text-text2 ring-2 ring-[#111111]">
              +{overflow}
            </span>
          ) : null}
        </div>
        {isScheduled && onReminder ? (
          <button
            onClick={() => onReminder(room)}
            className={`ml-auto inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10.5px] font-extrabold transition-all active:scale-95 ${
              reminded ? 'border-gold/70 bg-gold/10 text-gold-hi' : 'border-line text-text2 active:bg-white/5'
            }`}
          >
            {reminded ? <BellRing size={11} /> : <Bell size={11} />}
            {reminded ? 'Reminder set' : 'Set Reminder'}
          </button>
        ) : null}
        {footer}
      </div>

      <div className="mt-3 border-t border-linesoft p-3">
        <button
          onClick={() => onJoin && onJoin(room)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-grad py-2.5 text-[12.5px] font-black text-[#171100] transition-all active:scale-[0.98]"
        >
          {isLive ? <Headphones size={14} /> : isScheduled ? <Radio size={14} /> : <Headphones size={14} />}
          {isLive ? actionLabel : isScheduled ? 'View Room' : actionLabel}
        </button>
      </div>
    </article>
  );
}
