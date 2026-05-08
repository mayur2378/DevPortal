"use client";

import { useState } from "react";
import type { OperationInfo } from "@/lib/spec-utils";
import { cn } from "@/lib/utils";

interface Props {
  operations: OperationInfo[];
  versionId: string;
  specType: "REST" | "GRAPHQL";
}

interface MockResult {
  status: number;
  body: unknown;
}

export function SpecDrivenPanel({ operations, versionId }: Props) {
  const [selected, setSelected] = useState<OperationInfo | null>(null);
  const [result, setResult] = useState<MockResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendRequest() {
    if (!selected) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/mock/rest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId, operationId: selected.operationId }),
      });
      const body = await res.json();
      setResult({ status: res.status, body });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const methodColor: Record<string, string> = {
    GET: "text-emerald-400",
    POST: "text-sky-400",
    PUT: "text-amber-400",
    PATCH: "text-orange-400",
    DELETE: "text-red-400",
  };

  return (
    <div className="grid grid-cols-5 gap-4 h-[520px]">
      <div className="col-span-2 overflow-y-auto border border-slate-800 rounded-xl">
        {operations.length === 0 ? (
          <p className="p-4 text-slate-500 text-sm italic">No operations found in spec.</p>
        ) : (
          operations.map((op) => (
            <button
              key={op.operationId}
              onClick={() => { setSelected(op); setResult(null); }}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-slate-800 hover:bg-slate-800 transition-colors",
                selected?.operationId === op.operationId ? "bg-slate-800" : ""
              )}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className={cn("text-xs font-bold font-mono", methodColor[op.method] ?? "text-slate-400")}>
                  {op.method}
                </span>
                <span className="text-xs text-slate-500 font-mono truncate">{op.path}</span>
              </div>
              {op.summary && <p className="text-xs text-slate-400 truncate">{op.summary}</p>}
            </button>
          ))
        )}
      </div>

      <div className="col-span-3 flex flex-col gap-3">
        {selected ? (
          <>
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-bold font-mono", methodColor[selected.method] ?? "text-slate-400")}>
                    {selected.method}
                  </span>
                  <span className="text-sm text-slate-300 font-mono">{selected.path}</span>
                </div>
                <button
                  onClick={sendRequest}
                  disabled={loading}
                  className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
                >
                  {loading ? "Sending…" : "Send"}
                </button>
              </div>
              {selected.summary && <p className="text-xs text-slate-400">{selected.summary}</p>}
            </div>

            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-auto">
              {error && <p className="text-red-400 text-sm">{error}</p>}
              {result ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded",
                      result.status < 300 ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400"
                    )}>
                      {result.status}
                    </span>
                    <span className="text-xs text-slate-500">Mock response</span>
                  </div>
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                    {JSON.stringify(result.body, null, 2)}
                  </pre>
                </>
              ) : (
                <p className="text-slate-600 text-sm italic">Hit Send to see the mock response.</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-600 text-sm italic border border-slate-800 rounded-xl">
            Select an operation from the list
          </div>
        )}
      </div>
    </div>
  );
}
