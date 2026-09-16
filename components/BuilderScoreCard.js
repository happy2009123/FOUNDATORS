import { Star } from 'lucide-react';

const CONTRIB_COLOR = {
  High: 'text-brandgreen',
  Medium: 'text-gold-hi',
  Low: 'text-text2',
};

export default function BuilderScoreCard({ builderScore }) {
  if (!builderScore) return null;
  const contribColor = CONTRIB_COLOR[builderScore.contribution] || 'text-text2';

  return (
    <div className="mt-4 rounded-2xl border border-linesoft bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Star size={18} className="text-gold" fill="currentColor" />
        <span className="text-lg font-extrabold">{builderScore.score.toFixed(1)}</span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-text3">Builder Score</span>
      </div>
      <div className="grid grid-cols-2 gap-y-2.5 text-[12.5px]">
        <Metric label="Projects completed" value={builderScore.projects} />
        <Metric label="Collaborations" value={builderScore.collaborations} />
        <Metric label="Skills verified" value={builderScore.skillsVerified} />
        <Metric label="Successful referrals" value={builderScore.referrals} />
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-linesoft pt-2.5 text-[12.5px]">
        <span className="text-text2">Community contribution</span>
        <span className={`font-bold ${contribColor}`}>{builderScore.contribution}</span>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <div className="font-extrabold">{value}</div>
      <div className="text-[11px] text-text2">{label}</div>
    </div>
  );
}
