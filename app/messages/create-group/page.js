'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Search, Users, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { createChat } from '@/lib/firestore';
import Avatar from '@/components/Avatar';

export default function CreateGroupPage() {
  const router = useRouter();
  const { vibrate, notification } = useHaptics();
  const showToast = useStore((s) => s.showToast);
  const profile = useStore((s) => s.profile);
  const [groupName, setGroupName] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list = [];
        snap.forEach((d) => {
          if (d.id !== profile?.id) {
            list.push({ id: d.id, ...d.data() });
          }
        });
        setUsers(list);
      } catch (e) {}
    };
    fetchUsers();
  }, [profile?.id]);

  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = useCallback((id) => {
    vibrate('light');
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    );
  }, [vibrate]);

  const createGroup = useCallback(async () => {
    if (!groupName.trim() || selected.length < 2) {
      showToast('Add a name and at least 2 members');
      return;
    }
    vibrate('medium');

    const participantNames = { [profile.id]: profile.name };
    const participantAvatars = { [profile.id]: profile.avatar };
    selected.forEach((id) => {
      const user = users.find((u) => u.id === id);
      if (user) {
        participantNames[id] = user.name;
        participantAvatars[id] = user.avatar;
      }
    });

    const result = await createChat({
      participants: [profile.id, ...selected],
      participantNames,
      participantAvatars,
      isGroup: true,
      groupName: groupName.trim(),
      lastMessage: '',
      lastMessageAt: new Date(),
      createdAt: new Date(),
    });

    if (result.success) {
      notification('success');
      showToast(`Group "${groupName}" created!`);
      router.push(`/messages/${result.data}`);
    } else {
      showToast('Failed to create group');
    }
  }, [groupName, selected, users, profile, vibrate, notification, showToast, router]);

  return (
    <div className="app-shell flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-linesoft px-4 py-3">
        <button onClick={() => router.back()} className="h-8 w-8 flex items-center justify-center" aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[16px] font-bold">New Group</h1>
      </div>

      <div className="px-4 py-3 border-b border-linesoft">
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Group name"
          className="w-full bg-transparent text-[14px] text-white placeholder:text-text3 focus:outline-none"
          aria-label="Group name"
        />
      </div>

      {selected.length > 0 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-linesoft">
          {selected.map((id) => {
            const user = users.find((u) => u.id === id);
            return (
              <div key={id} className="flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1.5 flex-none">
                <span className="text-[11px] font-bold text-gold">{user?.name?.split(' ')[0]}</span>
                <button onClick={() => toggleUser(id)} className="text-gold" aria-label={`Remove ${user?.name}`}>
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-2xl border border-linesoft bg-card px-4 py-2.5">
          <Search size={14} className="text-text3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people..."
            className="flex-1 bg-transparent text-[13px] text-white placeholder:text-text3 focus:outline-none"
            aria-label="Search people"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-1">
        {filteredUsers.map((user) => {
          const isSelected = selected.includes(user.id);
          return (
            <button
              key={user.id}
              onClick={() => toggleUser(user.id)}
              className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-white/5"
            >
              <Avatar src={user.avatar} name={user.name} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[13px] font-bold">{user.name}</span>
                </div>
                <div className="text-[11px] text-text2">{user.role || 'Member'}</div>
              </div>
              <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-gold bg-gold' : 'border-white/20'}`}>
                {isSelected && <Check size={14} className="text-[#1a1300]" />}
              </div>
            </button>
          );
        })}
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-text3 text-[13px]">No other users found</div>
        )}
      </div>

      <div className="px-4 py-4 border-t border-linesoft">
        <button
          onClick={createGroup}
          disabled={!groupName.trim() || selected.length < 2}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gold-grad py-3.5 text-[14px] font-extrabold text-[#1a1300] disabled:opacity-40"
        >
          <Users size={16} />
          Create Group ({selected.length} members)
        </button>
      </div>
    </div>
  );
}
