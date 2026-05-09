"use client";

import { useState, useEffect } from "react";
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

function buildExampleFromSchema(schema: any): unknown {
  if (!schema) return undefined;
  if (schema.example !== undefined) return schema.example;
  switch (schema.type) {
    case "object": {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(schema.properties ?? {})) {
        obj[k] = buildExampleFromSchema(v as any);
      }
      return obj;
    }
    case "array":
      return [buildExampleFromSchema(schema.items)];
    case "string":
      if (schema.enum) return schema.enum[0];
      if (schema.format === "uuid") return "00000000-0000-0000-0000-000000000000";
      if (schema.format === "date-time") return new Date().toISOString();
      return "string";
    case "integer":
    case "number":
      return 0;
    case "boolean":
      return true;
    default:
      return null;
  }
}

const methodColor: Record<string, string> = {
  GET: "text-emerald-400",
  POST: "text-sky-400",
  PUT: "text-amber-400",
  PATCH: "text-orange-400",
  DELETE: "text-red-400",
};

export function SpecDrivenPanel({ operations, versionId }: Props) {
  const [selected, setSelected] = useState<OperationInfo | null>(null);
  const [bodyText, setBodyText] = useState("");
  const [bodyError, setBodyError] = useState("");
  const [result, setResult] = useState<MockResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selected) { setBodyText(""); return; }
    const schema = selected.requestBody?.content?.["application/json"]?.schema;
    if (schema) {
      const example = buildExampleFromSchema(schema);
      setBodyText(JSON.stringify(example, null, 2));
    } else {
      setBodyText("");
    }
    setBodyError("");
    setResult(null);
  }, [selected]);

  async function sendRequest() {
    if (!selected) return;

    if (bodyText) {
      try { JSON.parse(bodyText); }
      catch { setBodyError("Invalid JSON"); return; }
    }

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/mock/rest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId, operationId: selected.operationId }),
      });
      const text = await res.text();
      const body = text ? JSON.parse(text) : null;
      setResult({ status: res.status, body });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const hasBody = selected && ["POST", "PUT", "PATCH"].includes(selected.method) && bodyText;

  return (
    <div className="grid grid-cols-5 gap-4 h-[600px]">
      {/* Operation list */}
      <div className="col-span-2 overflow-y-auto border border-slate-800 rounded-xl">
        {operations.length === 0 ? (
          <p className="p-4 text-slate-500 text-sm italic">No operations found in spec.</p>
        ) : (
          operations.map((op) => (
            <button
              key={op.operationId}
              onClick={() => { setSelected(op); setResult(null); setError(""); }}
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

      {/* Detail panel */}
      <div className="col-span-3 flex flex-col gap-3 overflow-y-auto">
        {selected ? (
          <>
            {/* Header */}
            <div className="bg-slate-800 rounded-xl p-4 shrink-0">
              <div className="flex items-center justify-between">
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
              {selected.summary && <p className="text-xs text-slate-400 mt-1">{selected.summary}</p>}
            </div>

            {/* Request body editor */}
            {hasBody && (
              <div className="shrink-0">
                <p className="text-xs text-slate-400 font-semibold mb-1.5 px-1">Request Body</p>
                <textarea
                  value={bodyText}
                  onChange={(e) => { setBodyText(e.target.value); setBodyError(""); }}
                  rows={8}
                  spellCheck={false}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-300 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                {bodyError && <p className="text-red-400 text-xs mt-1 px-1">{bodyError}</p>}
              </div>
            )}

            {/* Response */}
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-auto min-h-[140px]">
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
                  {result.body !== null ? (
                    <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                      {JSON.stringify(result.body, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-slate-500 text-xs italic">No body</p>
                  )}
                </>
              ) : (
                !error && <p className="text-slate-600 text-sm italic">Hit Send to see the mock response.</p>
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
