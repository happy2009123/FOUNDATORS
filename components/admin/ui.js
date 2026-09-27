'use client';

// ─────────────────────────────────────────────────────────────
// FOUNDATORS ADMIN — shared UI kit
// ─────────────────────────────────────────────────────────────
// Desktop-first control-center primitives built from the same
// design language as the FOUNDATORS profiles: deep black canvas,
// charcoal cards, off-white type, premium gold accent, subtle
// borders, 14–20px radii, minimal shadows.
//
// The frame roots carry `bg-ink dark-surface`, which re-declares
// the light-theme inversion variables for the whole subtree (see
// globals.css) — the console stays dark regardless of the user's
// app theme, and utility classes keep their intended values.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw, Inbox, X, ChevronLeft, ChevronRight } from 'lucide-react';

const CARD = 'rounded-[18px] border border-[rgba(255,255,255,0.07)] bg-[#0e0e0e]';
const CARD_HOVER = 'transition-colors hover:border-[rgba(212,175,55,0.28)]';

export function Card({ className = '', hover = false, children, ...rest }) {
  return (
    <div className={`${CARD} ${hover ? CARD_HOVER : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function StatusBadge({ status }) {
  if (status === 'restricted' || status === 'suspended') {
    return <Badge tone="red">{status}</Badge>;
  }
  return <Badge tone="green">active</Badge>;
}

export function PageHeader({ title, subtitle, actions = null }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[22px] font-extrabold leading-tight sm:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-text2">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function SectionTitle({ title, action = null, className = '' }) {
  return (
    <div className={`mb-3 flex items-center justify-between ${className}`}>
      <h2 className="font-display text-[14px] font-extrabold uppercase tracking-[0.14em] text-text2">{title}</h2>
      {action}
    </div>
  );
}

export function Badge({ tone = 'gray', children, className = '' }) {
  const tones = {
    gold: 'border-gold/40 bg-gold/10 text-gold-hi',
    green: 'border-brandgreen/40 bg-brandgreen/10 text-brandgreen',
    red: 'border-brandred/40 bg-brandred/10 text-brandred',
    blue: 'border-brandblue/40 bg-brandblue/10 text-brandblue',
    gray: 'border-white/15 bg-white/5 text-text2',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${tones[tone] || tones.gray} ${className}`}>
      {children}
    </span>
  );
}

export function StatCard({ icon: Icon, label, value, delta, caption, loading = false }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-text3">{label}</div>
          {loading ? (
            <div className="skeleton mt-2.5 h-8 w-24" />
          ) : (
            <div className="mt-1.5 font-display text-[26px] font-extrabold leading-none sm:text-[30px]">{value}</div>
          )}
        </div>
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[14px] border border-gold/30 bg-gold/10 text-gold">
          <Icon size={18} strokeWidth={1.8} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11.5px]">
        {delta !== undefined && delta !== null && (
          <span className={`font-bold ${delta > 0 ? 'text-brandgreen' : delta < 0 ? 'text-brandred' : 'text-text3'}`}>
            {delta > 0 ? '↑' : delta < 0 ? '↓' : '·'} {Math.abs(delta)}%
          </span>
        )}
        <span className="truncate text-text3">{caption}</span>
      </div>
    </Card>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, body, actionLabel, onAction, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-text3">
        <Icon size={20} strokeWidth={1.6} />
      </div>
      <div className="mt-3.5 font-display text-[14px] font-extrabold">{title}</div>
      {body && <p className="mt-1.5 max-w-[380px] text-[12.5px] leading-relaxed text-text3">{body}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 rounded-xl border border-gold/50 px-4 py-2 text-[12.5px] font-bold text-gold-hi transition-colors hover:bg-gold/10"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brandred/40 bg-brandred/10 text-brandred">
        <AlertCircle size={20} />
      </div>
      <div className="mt-3.5 font-display text-[14px] font-extrabold">Couldn&apos;t load data</div>
      <p className="mt-1.5 max-w-[380px] text-[12.5px] text-text3">{message || 'Something went wrong while fetching this view.'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-[12.5px] font-bold text-text2 transition-colors hover:border-gold/40 hover:text-gold-hi"
        >
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="divide-y divide-[rgba(255,255,255,0.06)]">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((__, c) => (
            <div key={c} className="skeleton h-4 flex-1" style={{ maxWidth: `${40 + ((r + c) % 3) * 20}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function FilterChips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-colors ${
              active
                ? 'border-gold/50 bg-gold/10 text-gold-hi'
                : 'border-white/10 bg-white/5 text-text2 hover:border-white/20 hover:text-white'
            }`}
          >
            {opt.label}
            {typeof opt.count === 'number' && <span className="ml-1.5 opacity-60">{opt.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function SearchField({ value, onChange, placeholder = 'Search…', className = '', autoFocus = false }) {
  return (
    <div className={`relative ${className}`}>
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-[13px] text-white placeholder:text-white/40 focus:border-gold/40"
      />
      <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    </div>
  );
}

export function Pagination({ hasPrev, hasNext, onPrev, onNext, busy = false, label = '' }) {
  return (
    <div className="flex items-center justify-between gap-3 px-1 pt-4">
      <span className="text-[11.5px] text-text3">{label}</span>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={!hasPrev || busy}
          className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-[12px] font-bold text-text2 transition-colors hover:border-gold/40 hover:text-gold-hi disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <button
          onClick={onNext}
          disabled={!nextEnabled(hasNext) || busy}
          className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-[12px] font-bold text-text2 transition-colors hover:border-gold/40 hover:text-gold-hi disabled:pointer-events-none disabled:opacity-30"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function nextEnabled(hasNext) {
  return hasNext !== false;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  requireText = null,
  onConfirm,
  onCancel,
}) {
  const [typed, setTyped] = useState('');
  const confirmRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTyped('');
      const t = setTimeout(() => confirmRef.current?.focus(), 50);
      const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel?.(); };
      window.addEventListener('keydown', onKey);
      return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
    }
  }, [open, busy, onCancel]);

  if (!open) return null;
  const blocked = !!requireText && typed.trim() !== requireText;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
      onClick={() => { if (!busy) onCancel?.(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-[420px] rounded-[20px] border border-[rgba(255,255,255,0.09)] bg-[#111] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[16px] font-extrabold">{title}</h3>
          <button onClick={() => !busy && onCancel?.()} aria-label="Close" className="text-text3 transition-colors hover:text-white">
            <X size={17} />
          </button>
        </div>
        <div className="mt-2 text-[13px] leading-relaxed text-text2">{body}</div>
        {requireText && (
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={`Type "${requireText}" to confirm`}
            aria-label={`Type ${requireText} to confirm`}
            className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[13px] text-white placeholder:text-white/35 focus:border-brandred/50"
          />
        )}
        <div className="mt-5 flex gap-2.5">
          <button
            onClick={() => onCancel?.()}
            disabled={busy}
            className="flex-1 rounded-xl border border-white/15 py-2.5 text-[13px] font-bold text-text2 transition-colors hover:border-white/30 hover:text-white disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={() => onConfirm?.()}
            disabled={busy || blocked}
            className={`flex-1 rounded-xl py-2.5 text-[13px] font-extrabold transition-all disabled:opacity-40 ${
              danger
                ? 'bg-brandred text-white hover:brightness-110'
                : 'bg-gold-grad text-[#171100] hover:brightness-105'
            }`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Line chart (gold, minimal, hover readout) ───────────────

export function LineChart({ series = [], height = 190, valueLabel = 'value' }) {
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);

  if (!series.length) {
    return <EmptyState title="No data available yet" body="Once real activity accumulates, the trend appears here." />;
  }

  const W = 720;
  const H = height;
  const padL = 44;
  const padR = 14;
  const padT = 14;
  const padB = 26;
  const max = Math.max(...series.map((p) => p.value), 1);
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const x = (i) => padL + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
  const y = (v) => padT + innerH - (v / max) * innerH;

  const points = series.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');
  const area = `${padL},${padT + innerH} ${points} ${x(series.length - 1)},${padT + innerH}`;
  const yTicks = [0, Math.round(max / 2), max];

  const onMove = (e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rel = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((rel - padL) / innerW) * (series.length - 1));
    setHover(i >= 0 && i < series.length ? i : null);
  };

  const labelEvery = Math.max(1, Math.ceil(series.length / 7));

  return (
    <div ref={wrapRef} className="relative" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-gold/40 bg-[#161616] px-2.5 py-1.5 text-[11px] shadow-lg"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(series[hover].value) / H) * 100}%` }}
        >
          <span className="font-bold text-gold-hi">{series[hover].value.toLocaleString('en-US')}</span>
          <span className="ml-1.5 text-text3">{series[hover].label}</span>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img" aria-label="Trend chart">
        <defs>
          <linearGradient id="adminGoldArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(217,172,61,0.30)" />
            <stop offset="100%" stopColor="rgba(217,172,61,0)" />
          </linearGradient>
        </defs>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.40)">
              {t >= 1000 ? `${(t / 1000).toFixed(t % 1000 === 0 ? 0 : 1)}K` : t}
            </text>
          </g>
        ))}
        <polygon points={area} fill="url(#adminGoldArea)" />
        <polyline points={points} fill="none" stroke="#d9ac3d" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} stroke="rgba(217,172,61,0.35)" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(series[hover].value)} r="4" fill="#f7dd8f" stroke="#020202" strokeWidth="2" />
          </g>
        )}
        {series.map((p, i) =>
          i % labelEvery === 0 || i === series.length - 1 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9.5" fill="rgba(255,255,255,0.38)">
              {p.label}
            </text>
          ) : null
        )}
      </svg>
      <span className="sr-only">{`Trend of ${valueLabel}`}</span>
    </div>
  );
}

// ─── Small utilities ─────────────────────────────────────────

export function useClickAway(onAway) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onAway();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onAway]);
  return ref;
}

export function AvatarDot({ src, name, size = 32 }) {
  // Local minimal avatar that never flips themes (admin-scoped).
  const initials = (name || '?').trim().charAt(0).toUpperCase() || '?';
  if (!src || typeof src !== 'string') {
    return (
      <div
        className="flex flex-none items-center justify-center rounded-full bg-gold-grad font-display font-extrabold text-[#171100]"
        style={{ width: size, height: size, fontSize: size * 0.44 }}
      >
        {initials}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name || 'Avatar'}
      loading="lazy"
      className="flex-none rounded-full bg-white/10 object-cover"
      style={{ width: size, height: size }}
    />
  );
}
