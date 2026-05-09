"use client";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ChecklistItem { id: string; name: string; description?: string | null; required: boolean }
interface Review { checklistId: string; passed: boolean; notes?: string | null }
interface Props { apiId: string; items: ChecklistItem[]; existingReviews: Review[]; canReview: boolean }

export function ChecklistPanel({ apiId, items, existingReviews, canReview }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const submit = trpc.governance.submitReview.useMutation({ onSuccess: () => router.refresh() });
  const reviewMap = Object.fromEntries(existingReviews.map((r) => [r.checklistId, r]));

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const existing = reviewMap[item.id];
        return (
          <div key={item.id} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium text-sm">{item.name}</p>
                  {item.required && <span className="text-xs text-red-400">Required</span>}
                </div>
                {item.description && <p className="text-slate-400 text-xs mt-0.5">{item.description}</p>}
              </div>
              {existing ? (
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${existing.passed ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}`}>
                  {existing.passed ? "✓ Pass" : "✗ Fail"}
                </span>
              ) : canReview ? (
                <div className="flex items-center gap-2 shrink-0">
                  <textarea value={notes[item.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [item.id]: e.target.value }))}
                    rows={1} placeholder="Notes..." className="w-40 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white" />
                  <button type="button" onClick={() => submit.mutate({ apiId, checklistId: item.id, passed: true, notes: notes[item.id] })}
                    className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-xs text-white font-semibold">Pass</button>
                  <button type="button" onClick={() => submit.mutate({ apiId, checklistId: item.id, passed: false, notes: notes[item.id] })}
                    className="px-2 py-1 bg-red-800 hover:bg-red-700 rounded text-xs text-white font-semibold">Fail</button>
                </div>
              ) : <span className="text-slate-500 text-xs">Not reviewed</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
