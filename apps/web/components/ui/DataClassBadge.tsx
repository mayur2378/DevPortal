const DC_STYLES: Record<string, string> = {
  PUBLIC:       "bg-green-900/40 text-green-400",
  INTERNAL:     "bg-slate-700 text-slate-300",
  CONFIDENTIAL: "bg-orange-900/40 text-orange-400",
  RESTRICTED:   "bg-red-900/40 text-red-400",
};

export function DataClassBadge({ classification }: { classification: string }) {
  const style = DC_STYLES[classification] ?? DC_STYLES.INTERNAL;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${style}`}>
      {classification}
    </span>
  );
}
