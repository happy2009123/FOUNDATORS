'use client';

import { useEffect, useState } from 'react';
import { Star, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { computeBuilderScore, HOW_BUILDER_SCORE_WORKS } from '@/lib/builderScore';

export default function BuilderScoreCard({ uid, profile = null }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHow, setShowHow] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    computeBuilderScore(uid, profile)
      .then((res) => {
        if (alive) setData(res);
      })
      .catch(() => {
        if (alive) setData(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  return (
    <div className="mt-4 rounded-2xl border border-linesoft bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star size={18} className="text-gold" fill="currentColor" />
          <span className="text-lg font-extrabold">
            {loading ? '…' : data ? data.score : '—'}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-text3">
            Builder Score
          </span>
        </div>
        <button
          onClick={() => setShowHow(!showHow)}
          className="flex items-center gap-1 rounded-full border border-linesoft px-2.5 py-1 text-[10.5px] font-bold text-text2 transition-colors hover:border-gold/40 hover:text-gold-hi"
        >
          <Info size={11} />
          How it works
          {showHow ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {!loading && data && data.active.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {data.active.map((row) => (
            <span
              key={row.key}
              className="rounded-full bg-gold/10 px-2 py-0.5 text-[10.5px] font-bold text-gold-hi"
              title={`${row.value} × ${row.label}`}
            >
              {row.label} +{row.points}
            </span>
          ))}
        </div>
      )}

      {!loading && data && data.active.length === 0 && (
        <p className="mt-2 text-[11.5px] leading-relaxed text-text3">
          No scored activity yet. Ship a project, organize an event or join a
          challenge to start building your score.
        </p>
      )}

      {!loading && !data && (
        <p className="mt-2 text-[11.5px] text-text3">
          Score unavailable right now — try again shortly.
        </p>
      )}

      {showHow && (
        <div className="mt-3 border-t border-linesoft pt-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-text3">
            How Builder Score works
          </p>
          <ul className="space-y-2">
            {HOW_BUILDER_SCORE_WORKS.map((item) => (
              <li key={item.label} className="text-[11.5px] leading-relaxed">
                <span className="font-bold text-gold-hi">{item.label}:</span>{' '}
                <span className="text-text2">{item.text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[10.5px] leading-relaxed text-text3">
            Calculated live from real Firestore activity — never stored, never
            editable, identical for everyone who views this profile.
          </p>
        </div>
      )}
    </div>
  );
}
