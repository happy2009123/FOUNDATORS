'use client';

import { AlertTriangle, SearchX, Wifi, FolderOpen, UserX, MessageCircle, FileText } from 'lucide-react';

const ILLUSTRATIONS = {
  error: { icon: AlertTriangle, title: 'Something went wrong', color: 'text-red' },
  notFound: { icon: SearchX, title: 'Not found', color: 'text-text3' },
  offline: { icon: Wifi, title: 'No connection', color: 'text-amber-500' },
  empty: { icon: FolderOpen, title: 'Nothing here yet', color: 'text-text3' },
  noUser: { icon: UserX, title: 'User not found', color: 'text-text3' },
  noMessages: { icon: MessageCircle, title: 'No messages yet', color: 'text-text3' },
  noPosts: { icon: FileText, title: 'No posts yet', color: 'text-text3' },
};

export default function EmptyState({ type = 'empty', title, description, action, onAction }) {
  const config = ILLUSTRATIONS[type] || ILLUSTRATIONS.empty;
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 ${config.color}`}>
        <Icon size={28} />
      </div>
      <h3 className="text-[16px] font-bold">{title || config.title}</h3>
      {description && <p className="mt-1.5 text-[13px] text-text2 max-w-[240px]">{description}</p>}
      {action && onAction && (
        <button onClick={onAction} className="mt-5 rounded-full bg-gold px-6 py-2.5 text-[13px] font-bold text-[#1a1300]">
          {action}
        </button>
      )}
    </div>
  );
}
