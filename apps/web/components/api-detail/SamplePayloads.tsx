"use client";
import { useState } from "react";

interface SamplePayload { operationId: string; method: string; path: string; request?: any; response?: any }
interface Props { payloads: SamplePayload[] }

export function SamplePayloads({ payloads }: Props) {
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState<"request" | "response">("request");
  if (payloads.length === 0) return <p className="text-slate-500 text-sm">No sample payloads available.</p>;
  const current = payloads[selected];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {payloads.map((p, idx) => (
          <button key={p.operationId} type="button" onClick={() => setSelected(idx)}
            className={`px-2.5 py-1 rounded text-xs font-medium ${selected === idx ? "bg-sky-600 text-white" : "bg-slate-700 text-slate-400"}`}>
            {p.method} {p.path}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {(["request", "response"] as const).map((v) => (
          <button key={v} type="button" onClick={() => setView(v)}
            className={`px-3 py-1 rounded text-xs font-semibold ${view === v ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-500"}`}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
      <pre className="p-4 bg-slate-900 rounded-xl border border-slate-700/50 text-xs text-slate-300 overflow-x-auto font-mono">
        {current[view] ? JSON.stringify(current[view], null, 2) : "No sample available"}
      </pre>
    </div>
  );
}
