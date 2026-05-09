const STATUS_STYLES: Record<string, string> = {
  DRAFT:      "bg-slate-700 text-slate-300",
  BETA:       "bg-purple-900/50 text-purple-300",
  ACTIVE:     "bg-emerald-900/50 text-emerald-400",
  PUBLISHED:  "bg-emerald-900/50 text-emerald-400",
  DEPRECATED: "bg-amber-900/50 text-amber-400",
  RETIRED:    "bg-red-900/50 text-red-400",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-700 text-slate-300";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${style}`}>
      {status}
    </span>
  );
}
