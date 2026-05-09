"use client";
import { useState } from "react";
import { CurlExample } from "@/lib/curl-generator";

interface Props { examples: CurlExample[] }

export function CurlExamples({ examples }: Props) {
  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(examples[selected].curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (examples.length === 0) return <p className="text-slate-500 text-sm">No cURL examples available.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {examples.map((ex, idx) => (
          <button key={ex.operationId} type="button" onClick={() => setSelected(idx)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${selected === idx ? "bg-sky-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}>
            <span className={`mr-1 ${ex.method === "GET" ? "text-emerald-400" : ex.method === "POST" ? "text-sky-400" : ex.method === "DELETE" ? "text-red-400" : "text-amber-400"}`}>
              {ex.method}
            </span>
            {ex.path}
          </button>
        ))}
      </div>
      <div className="relative">
        <pre className="p-4 bg-slate-900 rounded-xl border border-slate-700/50 text-xs text-slate-300 overflow-x-auto font-mono whitespace-pre-wrap">
          {examples[selected].curl}
        </pre>
        <button type="button" onClick={copy}
          className="absolute top-2 right-2 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
