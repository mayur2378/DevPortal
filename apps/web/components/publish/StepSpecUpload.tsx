"use client";
import { useState } from "react";
interface Props { value: { specKey: string; specUrl?: string; version: string }; onChange: (v: Props["value"]) => void; onNext: () => void; onBack: () => void }
export function StepSpecUpload({ value, onChange, onNext, onBack }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";
  const tabCls = (active: boolean) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${active ? "bg-slate-800 text-white border-b-2 border-sky-500" : "text-slate-400 hover:text-slate-200"}`;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try {
      const formData = new FormData();
      formData.append("spec", file);
      const res = await fetch("/api/upload-spec", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onChange({ ...value, specKey: data.key, specUrl: undefined });
    } catch (err: any) { setError(err.message); } finally { setUploading(false); }
  }

  const canContinue = mode === "upload" ? !!(value.specKey && value.version) : !!(value.specUrl && value.version);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white mb-4">Step 2 — Spec & Version</h2>

      <div className="flex gap-1 border-b border-slate-700 mb-4">
        <button type="button" className={tabCls(mode === "upload")} onClick={() => setMode("upload")}>Upload File</button>
        <button type="button" className={tabCls(mode === "url")} onClick={() => setMode("url")}>Link by URL</button>
      </div>

      {mode === "upload" ? (
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Spec file <span className="text-slate-600">(.json, .yaml, .graphql)</span></label>
          <input type="file" accept=".json,.yaml,.yml,.graphql,.sdl" onChange={handleFileChange} className="text-slate-300 text-sm" />
          {uploading && <p className="text-sky-400 text-xs mt-1">Uploading…</p>}
          {value.specKey && !uploading && <p className="text-emerald-400 text-xs mt-1">✓ Uploaded</p>}
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Spec URL <span className="text-slate-600">(https://...)</span></label>
          <input
            type="url"
            value={value.specUrl ?? ""}
            onChange={(e) => onChange({ ...value, specUrl: e.target.value, specKey: "" })}
            placeholder="https://example.com/openapi.json"
            className={inputCls}
          />
          <p className="text-xs text-slate-500 mt-1">The spec will be fetched from this URL at render time.</p>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Version <span className="text-slate-600">(semver: 1.0.0)</span></label>
        <input type="text" value={value.version} onChange={(e) => onChange({ ...value, version: e.target.value })} placeholder="1.0.0" className={inputCls} />
      </div>
      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-lg transition-colors">← Back</button>
        <button onClick={onNext} disabled={!canContinue} className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg transition-colors">Continue →</button>
      </div>
    </div>
  );
}
