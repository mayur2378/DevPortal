interface Props { score: number | null; passed: number; total: number }

export function GovernanceScoreCard({ score, passed, total }: Props) {
  const color = score === null ? "text-slate-400" : score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";
  const ring = score === null ? "border-slate-600" : score >= 80 ? "border-emerald-500" : score >= 60 ? "border-amber-500" : "border-red-500";
  return (
    <div className={`flex items-center gap-4 p-5 bg-slate-800/50 rounded-xl border ${ring}`}>
      <div className={`text-4xl font-black ${color}`}>
        {score !== null ? `${score}` : "—"}
        {score !== null && <span className="text-xl font-normal text-slate-500">%</span>}
      </div>
      <div>
        <p className="text-white font-semibold">Governance Score</p>
        <p className="text-slate-400 text-sm">{passed}/{total} checks passed</p>
      </div>
    </div>
  );
}
