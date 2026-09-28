'use client';

import { useEffect, useRef } from 'react';
import { Send, Sparkles } from 'lucide-react';
import CardView from './Cards';

export function MessageList({ messages, busy, onAction, hasProject }) {
  const endRef = useRef(null);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, busy]);

  return (
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4">
      <div className="mx-auto w-full max-w-[720px] space-y-4">
        {messages.map((msg, index) => {
          const isLatestAssistant = msg.role === 'assistant' && index === messages.length - 1;
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[86%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-gold px-3.5 py-2.5 text-[13.5px] font-medium leading-relaxed text-[#171100]">
                  {msg.text}
                </div>
              </div>
            );
          }
          return (
            <div key={msg.id} className="flex justify-start">
              <div className="w-full max-w-[96%]">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-grad text-[#171100]">
                    <Sparkles size={11} />
                  </span>
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wide text-text3">Copilot</span>
                </div>
                {msg.cardType && msg.card ? (
                  <CardView
                    cardType={msg.cardType}
                    card={msg.card}
                    source={msg.source}
                    busy={busy && isLatestAssistant}
                    onAction={onAction}
                    hasProject={hasProject}
                  />
                ) : (
                  <div className="whitespace-pre-wrap rounded-2xl rounded-bl-md border border-line bg-card px-3.5 py-2.5 text-[13.5px] leading-relaxed text-text1">
                    {msg.text}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {busy ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-line bg-card px-3.5 py-2.5">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold [animation-delay:300ms]" />
              </span>
              <span className="text-[11.5px] font-semibold text-text3">Copilot is thinking…</span>
            </div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>
    </div>
  );
}

export function Composer({ value, onChange, onSend, busy, placeholder }) {
  const areaRef = useRef(null);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = 'auto';
    area.style.height = `${Math.min(area.scrollHeight, 132)}px`;
  }, [value]);

  const submit = () => {
    if (!busy && value.trim()) onSend();
  };

  return (
    <div className="border-t border-linesoft bg-card px-3 pt-2.5 chat-input-pad">
      <div className="mx-auto flex w-full max-w-[720px] items-end gap-2">
        <textarea
          ref={areaRef}
          rows={1}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="no-scrollbar max-h-[132px] min-h-[42px] flex-1 resize-none rounded-2xl border border-line bg-white/[0.04] px-3.5 py-2.5 text-[13.5px] leading-snug text-text1 outline-none placeholder:text-text3 focus:border-gold/50"
        />
        <button
          onClick={submit}
          disabled={busy || !value.trim()}
          aria-label="Send"
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-2xl bg-gold-grad text-[#171100] transition-all disabled:opacity-40 active:scale-95"
        >
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}
