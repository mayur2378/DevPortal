"use client";
import { useState } from "react";

interface FaqItem { q: string; a: string }
interface Props { items: FaqItem[] }

export function FaqSection({ items }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="rounded-xl border border-slate-700/50 overflow-hidden">
          <button type="button" onClick={() => setOpen(open === idx ? null : idx)}
            className="w-full flex items-center justify-between px-4 py-3 text-left bg-slate-800/50 hover:bg-slate-800 transition-colors">
            <span className="text-white font-medium text-sm">{item.q}</span>
            <span className="text-slate-400 text-sm">{open === idx ? "−" : "+"}</span>
          </button>
          {open === idx && <div className="px-4 py-3 bg-slate-900/30 text-slate-300 text-sm">{item.a}</div>}
        </div>
      ))}
    </div>
  );
}
