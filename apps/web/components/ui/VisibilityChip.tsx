const VISIBILITY_STYLES: Record<string, string> = {
  PUBLIC:   "bg-sky-900/50 text-sky-300 border border-sky-700/50",
  PARTNER:  "bg-violet-900/50 text-violet-300 border border-violet-700/50",
  INTERNAL: "bg-slate-700/50 text-slate-400 border border-slate-600/50",
};

export function VisibilityChip({ visibility }: { visibility: string }) {
  const style = VISIBILITY_STYLES[visibility] ?? VISIBILITY_STYLES.INTERNAL;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {visibility}
    </span>
  );
}
