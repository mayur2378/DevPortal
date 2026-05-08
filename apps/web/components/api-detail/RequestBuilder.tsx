"use client";

import { useState } from "react";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

interface Header { key: string; value: string }

export function RequestBuilder() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("https://");
  const [headers, setHeaders] = useState<Header[]>([{ key: "Content-Type", value: "application/json" }]);
  const [body, setBody] = useState("");
  const [result, setResult] = useState<{ status: number; body: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addHeader() { setHeaders([...headers, { key: "", value: "" }]); }
  function updateHeader(i: number, field: keyof Header, val: string) {
    const updated = [...headers];
    updated[i] = { ...updated[i], [field]: val };
    setHeaders(updated);
  }

  async function send() {
    setLoading(true); setError(""); setResult(null);
    try {
      const hdrs: Record<string, string> = {};
      for (const h of headers) { if (h.key) hdrs[h.key] = h.value; }
      const res = await fetch(url, {
        method,
        headers: hdrs,
        body: ["POST", "PUT", "PATCH"].includes(method) ? body : undefined,
      });
      const text = await res.text();
      setResult({ status: res.status, body: text });
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  const inputCls = "bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sky-400 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          {METHODS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className={`${inputCls} flex-1 font-mono`}
          placeholder="https://api.example.com/endpoint"
        />
        <button
          onClick={send}
          disabled={loading}
          className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold px-5 rounded-lg transition-colors text-sm"
        >
          {loading ? "…" : "Send"}
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-slate-400">Headers</p>
          <button onClick={addHeader} className="text-xs text-sky-400 hover:text-sky-300">+ Add</button>
        </div>
        <div className="space-y-2">
          {headers.map((h, i) => (
            <div key={i} className="flex gap-2">
              <input value={h.key} onChange={(e) => updateHeader(i, "key", e.target.value)} placeholder="Key" className={`${inputCls} flex-1`} />
              <input value={h.value} onChange={(e) => updateHeader(i, "value", e.target.value)} placeholder="Value" className={`${inputCls} flex-1`} />
            </div>
          ))}
        </div>
      </div>

      {["POST", "PUT", "PATCH"].includes(method) && (
        <div>
          <p className="text-xs font-medium text-slate-400 mb-2">Body (JSON)</p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className={`${inputCls} w-full font-mono`}
            placeholder='{"key": "value"}'
          />
        </div>
      )}

      {(result || error) && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {result && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  result.status < 300 ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400"
                }`}>
                  {result.status}
                </span>
              </div>
              <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-auto max-h-60">
                {(() => { try { return JSON.stringify(JSON.parse(result.body), null, 2); } catch { return result.body; } })()}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
