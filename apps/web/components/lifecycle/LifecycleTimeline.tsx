const STATUS_ORDER = ["DRAFT", "BETA", "ACTIVE", "DEPRECATED", "RETIRED"];

interface Props { currentStatus: string }

export function LifecycleTimeline({ currentStatus }: Props) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  return (
    <div className="flex items-center gap-0">
      {STATUS_ORDER.map((status, idx) => {
        const isPast = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={status} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${isCurrent ? "bg-sky-600 text-white ring-2 ring-sky-400/50" :
                  isPast ? "bg-slate-600 text-slate-300" : "bg-slate-800 text-slate-600 border border-slate-700"}`}>
                {idx + 1}
              </div>
              <p className={`text-xs mt-1 whitespace-nowrap font-medium
                ${isCurrent ? "text-sky-400" : isPast ? "text-slate-400" : "text-slate-600"}`}>
                {status}
              </p>
            </div>
            {idx < STATUS_ORDER.length - 1 && (
              <div className={`h-0.5 w-8 mx-1 mt-[-10px] ${isPast ? "bg-slate-600" : "bg-slate-800"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
