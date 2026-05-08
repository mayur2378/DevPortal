"use client";
import { useState } from "react";
import { MarkdownEditor } from "./MarkdownEditor";
interface DocPageDraft { slug: string; title: string; content: string }
interface Props { pages: DocPageDraft[]; onChange: (pages: DocPageDraft[]) => void; onSubmit: () => void; onBack: () => void; submitting: boolean }
export function StepDocPages({ pages, onChange, onSubmit, onBack, submitting }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  function addPage() { const newPage: DocPageDraft = { slug: `page-${pages.length + 1}`, title: "New Page", content: "" }; onChange([...pages, newPage]); setActiveIdx(pages.length); }
  function updatePage(idx: number, field: keyof DocPageDraft, val: string) { const updated = [...pages]; updated[idx] = { ...updated[idx], [field]: val }; onChange(updated); }
  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Step 3 — Documentation <span className="text-slate-500 text-sm font-normal">(optional)</span></h2>
        <button onClick={addPage} className="text-xs bg-slate-800 hover:bg-slate-700 text-sky-400 px-3 py-1.5 rounded-lg transition-colors">+ Add page</button>
      </div>
      {pages.length > 0 && (
        <div className="flex gap-3">
          <div className="w-36 shrink-0">
            {pages.map((p, i) => (
              <button key={i} onClick={() => setActiveIdx(i)} className={`block w-full text-left text-sm px-3 py-2 rounded-lg mb-1 transition-colors ${activeIdx === i ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}>{p.title}</button>
            ))}
          </div>
          <div className="flex-1 space-y-3">
            <input type="text" value={pages[activeIdx].title} onChange={(e) => updatePage(activeIdx, "title", e.target.value)} placeholder="Page title" className={inputCls} />
            <input type="text" value={pages[activeIdx].slug} onChange={(e) => updatePage(activeIdx, "slug", e.target.value)} placeholder="page-slug" className={inputCls} />
            <MarkdownEditor value={pages[activeIdx].content} onChange={(v) => updatePage(activeIdx, "content", v)} />
          </div>
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-lg transition-colors">← Back</button>
        <button onClick={onSubmit} disabled={submitting} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg transition-colors">{submitting ? "Publishing…" : "Publish API"}</button>
      </div>
    </div>
  );
}
