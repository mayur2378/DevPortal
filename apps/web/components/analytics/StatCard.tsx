interface Props { label: string; value: number | string; sub?: string; color?: string }
export function StatCard({ label, value, sub, color = "text-white" }: Props) {
  return (
    <div className="p-5 bg-slate-800/50 rounded-xl border border-slate-700/50">
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      <p className="text-slate-400 text-sm mt-1">{label}</p>
      {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}
