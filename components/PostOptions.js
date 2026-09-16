'use client';

import { useState, useCallback } from 'react';
import { Hash, AtSign, BarChart3, Smile, Clock, Globe, Users, Lock, ChevronDown } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';

const AUDIENCE_OPTIONS = [
  { key: 'public', label: 'Everyone', icon: Globe, desc: 'Anyone can see this post' },
  { key: 'followers', label: 'Followers', icon: Users, desc: 'Only your followers can see' },
  { key: 'close', label: 'Close Friends', icon: Lock, desc: 'Only your close friends' },
];

const SCHEDULE_OPTIONS = [
  { key: 'now', label: 'Post now' },
  { key: '1h', label: 'In 1 hour' },
  { key: 'tomorrow', label: 'Tomorrow 9am' },
  { key: 'custom', label: 'Custom time' },
];

export default function PostOptions({ audience, setAudience, schedule, setSchedule, onPollCreate }) {
  const { vibrate } = useHaptics();
  const [showAudience, setShowAudience] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const addPollOption = useCallback(() => {
    if (pollOptions.length < 6) {
      setPollOptions((prev) => [...prev, '']);
      vibrate('light');
    }
  }, [pollOptions.length, vibrate]);

  const removePollOption = useCallback((index) => {
    if (pollOptions.length > 2) {
      setPollOptions((prev) => prev.filter((_, i) => i !== index));
    }
  }, [pollOptions.length]);

  const createPoll = useCallback(() => {
    if (!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2) {
      return;
    }
    onPollCreate?.({
      question: pollQuestion.trim(),
      options: pollOptions.filter((o) => o.trim()),
    });
    setShowPoll(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    vibrate('medium');
  }, [pollQuestion, pollOptions, onPollCreate, vibrate]);

  return (
    <div className="space-y-2">
      {/* Audience selector */}
      <div className="relative">
        <button
          onClick={() => setShowAudience(!showAudience)}
          className="flex items-center gap-2 rounded-full border border-linesoft px-3 py-2 text-[11px] font-bold text-text2"
        >
          {AUDIENCE_OPTIONS.find((a) => a.key === audience)?.icon && 
            (() => { const Icon = AUDIENCE_OPTIONS.find((a) => a.key === audience).icon; return <Icon size={12} />; })()
          }
          {AUDIENCE_OPTIONS.find((a) => a.key === audience)?.label}
          <ChevronDown size={10} />
        </button>
        {showAudience && (
          <div className="absolute top-full mt-1 left-0 z-50 w-56 rounded-2xl border border-linesoft bg-card p-2 shadow-xl">
            {AUDIENCE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  onClick={() => { setAudience(opt.key); setShowAudience(false); vibrate('light'); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${audience === opt.key ? 'bg-gold/10 text-gold' : 'text-text2 hover:bg-white/5'}`}
                >
                  <Icon size={14} />
                  <div>
                    <div className="text-[12px] font-bold">{opt.label}</div>
                    <div className="text-[10px] text-text3">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule selector */}
      <div className="relative">
        <button
          onClick={() => setShowSchedule(!showSchedule)}
          className="flex items-center gap-2 rounded-full border border-linesoft px-3 py-2 text-[11px] font-bold text-text2"
        >
          <Clock size={12} />
          {SCHEDULE_OPTIONS.find((s) => s.key === schedule)?.label}
          <ChevronDown size={10} />
        </button>
        {showSchedule && (
          <div className="absolute top-full mt-1 left-0 z-50 w-48 rounded-2xl border border-linesoft bg-card p-2 shadow-xl">
            {SCHEDULE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => { setSchedule(opt.key); setShowSchedule(false); vibrate('light'); }}
                className={`flex w-full items-center rounded-xl px-3 py-2.5 text-[12px] font-bold text-left ${schedule === opt.key ? 'bg-gold/10 text-gold' : 'text-text2 hover:bg-white/5'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Poll creator */}
      <button
        onClick={() => setShowPoll(!showPoll)}
        className="flex items-center gap-2 rounded-full border border-linesoft px-3 py-2 text-[11px] font-bold text-text2"
      >
        <BarChart3 size={12} />
        {showPoll ? 'Close poll' : 'Add poll'}
      </button>

      {showPoll && (
        <div className="rounded-2xl border border-linesoft bg-card p-4 space-y-3">
          <input
            type="text"
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            placeholder="Ask a question..."
            className="w-full rounded-xl border border-linesoft bg-white/[0.03] px-3 py-2.5 text-[13px] text-white placeholder:text-text3 focus:border-gold focus:outline-none"
            aria-label="Poll question"
          />
          {pollOptions.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[11px] text-text3 w-4">{i + 1}</span>
              <input
                type="text"
                value={opt}
                onChange={(e) => {
                  const newOpts = [...pollOptions];
                  newOpts[i] = e.target.value;
                  setPollOptions(newOpts);
                }}
                placeholder={`Option ${i + 1}`}
                className="flex-1 rounded-xl border border-linesoft bg-white/[0.03] px-3 py-2.5 text-[12px] text-white placeholder:text-text3 focus:border-gold focus:outline-none"
                aria-label={`Poll option ${i + 1}`}
              />
              {pollOptions.length > 2 && (
                <button onClick={() => removePollOption(i)} className="text-text3 text-[16px]" aria-label="Remove option">×</button>
              )}
            </div>
          ))}
          {pollOptions.length < 6 && (
            <button onClick={addPollOption} className="text-[11px] font-bold text-gold">+ Add option</button>
          )}
          <button
            onClick={createPoll}
            disabled={!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2}
            className="w-full rounded-xl bg-gold py-2.5 text-[12px] font-bold text-[#1a1300] disabled:opacity-40"
          >
            Create Poll
          </button>
        </div>
      )}
    </div>
  );
}
