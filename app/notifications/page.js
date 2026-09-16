'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Users, UserPlus, TrendingUp, AtSign } from 'lucide-react';
import SubpageHeader from '@/components/SubpageHeader';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { getPerson } from '@/lib/data';
import Avatar from '@/components/Avatar';
import AuthSkeleton from '@/components/AuthSkeleton';

const TYPE_META = {
  like: { icon: Heart, cls: 'bg-[rgba(224,52,76,0.15)] text-[#ff6b6b]' },
  comment: { icon: MessageCircle, cls: 'bg-[rgba(91,141,255,0.15)] text-brandblue' },
  follow: { icon: UserPlus, cls: 'bg-[rgba(217,172,61,0.15)] text-gold-hi' },
  collab: { icon: Users, cls: 'bg-[rgba(91,141,255,0.15)] text-brandblue' },
  update: { icon: TrendingUp, cls: 'bg-[rgba(46,204,113,0.15)] text-brandgreen' },
  mention: { icon: AtSign, cls: 'bg-[rgba(217,172,61,0.15)] text-gold-hi' },
};

export default function NotificationsPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const notifications = useStore((s) => s.notifications);
  const markAllNotificationsRead = useStore((s) => s.markAllNotificationsRead);
  const showToast = useStore((s) => s.showToast);

  useEffect(() => {
    // opening the screen marks everything read, same as tapping the bell
    markAllNotificationsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return <AuthSkeleton />;

  const today = notifications.slice(0, 4);
  const earlier = notifications.slice(4);

  function handleOpen(n) {
    if (n.linkType === 'post') router.push(`/post/${n.linkId}`);
    else if (n.linkType === 'user') router.push(`/profile/${n.linkId}`);
    else if (n.linkType === 'startup') router.push(`/startup/${n.linkId}`);
    else if (n.linkType === 'discussion') router.push(`/discussion/${n.linkId}`);
    else showToast('Opening...');
  }

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <SubpageHeader
        title="Notifications"
        right={
          <button
            onClick={() => {
              markAllNotificationsRead();
              showToast('All notifications marked as read');
            }}
            className="text-xs font-bold text-gold"
          >
            Mark all read
          </button>
        }
      />
      <div className="no-scrollbar flex-1 overflow-y-auto">
        <Section label="Today" items={today} onOpen={handleOpen} />
        <Section label="Earlier" items={earlier} onOpen={handleOpen} />
      </div>
    </div>
  );
}

function Section({ label, items, onOpen }) {
  if (!items.length) return null;
  return (
    <>
      <div className="px-[18px] pb-2 pt-4 text-[11.5px] font-extrabold uppercase tracking-wide text-text3">{label}</div>
      <div className="flex flex-col gap-0.5 px-3 pb-2">
        {items.map((n) => {
          const meta = TYPE_META[n.type];
          const Icon = meta.icon;
          const actor = n.actorKey ? getPerson(n.actorKey) : null;
          return (
            <button
              key={n.id}
              onClick={() => onOpen(n)}
              className={`relative flex items-start gap-3 rounded-2xl p-2 text-left ${!n.read ? 'bg-[rgba(217,172,61,0.06)]' : ''}`}
            >
              {!n.read && <span className="absolute left-0 top-5 h-1.5 w-1.5 rounded-full bg-gold" />}
              {actor ? (
                <Avatar src={actor.avatar} name={actor.name} size={38} />
              ) : (
                <div className={`flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full ${meta.cls}`}>
                  <Icon size={17} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[13.2px] leading-snug text-[#e6e6e6]">
                  {actor && <b className="font-extrabold text-white">{actor.name} </b>}
                  {n.text}
                </div>
                <div className="mt-0.5 text-[11px] text-text3">{n.time}</div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
