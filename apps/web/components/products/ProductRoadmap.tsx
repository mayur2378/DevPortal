interface Props { roadmap: string }

export function ProductRoadmap({ roadmap }: Props) {
  const items = roadmap.split("\n").filter((line) => line.trim());
  return (
    <div className="space-y-2">
      {items.map((item, idx) => {
        const isHeader = item.startsWith("#");
        const isDone = item.toLowerCase().includes("[x]") || item.toLowerCase().includes("✓");
        const isNext = item.startsWith("- [ ]") || item.startsWith("•");
        if (isHeader) return <p key={idx} className="text-white font-semibold text-sm mt-3 first:mt-0">{item.replace(/^#+\s/, "")}</p>;
        return (
          <div key={idx} className={`flex items-start gap-2 text-sm ${isDone ? "text-slate-500 line-through" : "text-slate-300"}`}>
            <span className={`mt-0.5 shrink-0 ${isDone ? "text-emerald-600" : isNext ? "text-sky-400" : "text-slate-500"}`}>
              {isDone ? "✓" : isNext ? "→" : "·"}
            </span>
            <span>{item.replace(/^-\s\[.?\]\s?/, "").replace(/^[•·]\s?/, "")}</span>
          </div>
        );
      })}
    </div>
  );
}
